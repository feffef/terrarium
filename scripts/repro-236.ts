// Repro harness for issue #236: "components occasionally render empty until
// reload (client content-DB load)".
//
// Reproduces the bug with a GENUINE trigger — no request mocking, no injected
// aborts: a real production server is stopped and restarted (exactly what a
// rolling deploy / container replace does) while a real browser tab performs a
// real client-side navigation whose lazy collection-dump fetch lands in the
// downtime window. The assertion is the user's exact symptom: the About
// section on /t/blog/david stays empty on every later navigation even after
// the server is healthy again, and only a full reload fixes it.
//
// Usage:
//   pnpm exec tsx scripts/repro-236.ts <output-dir>
//     <output-dir>  a production build dir, e.g. .output-unpatched (expected
//                   RED: bug reproduces, exit 1) or .output-patched (expected
//                   GREEN: recovers on next navigation, exit 0).
//
// Producing the two builds (the interim fix is a committed pnpm patch, so a
// plain `pnpm build` is the PATCHED build; the unpatched one needs the patch
// reverse-applied in node_modules first, then restored). Park the builds
// OUTSIDE the repo tree — an extra .output-* dir in the root breaks `pnpm lint`:
//   patch -R -p1 -d node_modules/@nuxt/content < patches/@nuxt__content@3.15.0.patch
//   rm -rf .output .nuxt && pnpm build && mv .output /tmp/repro-236-unpatched
//   patch -p1 -d node_modules/@nuxt/content < patches/@nuxt__content@3.15.0.patch
//   rm -rf .output .nuxt && pnpm build && mv .output /tmp/repro-236-patched
// Sanity check: `grep -l 'retryDelay:300' <dir>/public/_nuxt/*.js` matches in
// the patched build only.
//
// Exit codes: 1 = bug reproduced (permanent-until-reload empty), 0 = no bug
// (content recovers once the server is back), 2 = harness invalid (the
// scenario didn't unfold as designed — see output).
import { spawn, type ChildProcess } from 'node:child_process'
import { chromium, type Page } from 'playwright-core'
import { resolveChromiumPath } from './chromium-path'

const outputDir = process.argv[2]
if (!outputDir) {
  console.error('Usage: pnpm exec tsx scripts/repro-236.ts <output-dir>')
  process.exit(2)
}

const PORT = 3123
const BASE = `http://127.0.0.1:${PORT}`

let server: ChildProcess | null = null

async function startServer(): Promise<void> {
  server = spawn('node', [`${outputDir}/server/index.mjs`], {
    env: { ...process.env, PORT: String(PORT), NITRO_PORT: String(PORT), HOST: '127.0.0.1' },
    stdio: 'ignore',
  })
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/t/blog/karen`)
      if (res.ok) return
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('server did not come up within 20s')
}

/** Real downtime: SIGTERM the server process and wait for it to exit. */
function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    const proc = server
    server = null
    if (!proc || proc.exitCode !== null) return resolve()
    proc.once('exit', () => resolve())
    proc.kill('SIGTERM')
  })
}

async function snapshot(page: Page, label: string) {
  const hasAbout = (await page.locator('aside.about').count()) > 0
  const posts = await page.locator('.feed .post-link').count()
  const emptyMsg = (await page.locator('p.empty').count()) > 0
  console.log(`  [${label}] about=${hasAbout} posts=${posts} emptyMsg=${emptyMsg}`)
  return { hasAbout, posts, emptyMsg }
}

async function clickNav(page: Page, selector: string, urlPattern: RegExp, settleMs: number) {
  await page.locator(selector).first().click()
  await page.waitForURL(urlPattern, { timeout: 10_000 })
  await page.waitForTimeout(settleMs)
}

;(async () => {
  const evidence: string[] = []
  console.log(`repro-236 against build: ${outputDir}`)

  console.log('step 1: start production server (deploy A live)')
  await startServer()

  const browser = await chromium.launch({
    executablePath: resolveChromiumPath(),
    args: ['--no-sandbox', '--disable-gpu'],
  })
  try {
    const page = await browser.newPage()
    page.on('console', (m) => {
      if (m.type() === 'warning' || m.type() === 'error') evidence.push(`[console.${m.type()}] ${m.text()}`)
    })
    page.on('pageerror', (e) => evidence.push(`[pageerror] ${e.message}`))
    page.on('requestfailed', (r) => evidence.push(`[requestfailed] ${r.method()} ${r.url()} → ${r.failure()?.errorText}`))
    page.on('request', (r) => {
      if (r.url().includes('sql_dump')) evidence.push(`[request] ${r.url().replace(BASE, '')}`)
    })

    console.log('step 2: open /t/blog/karen (SSR + hydrate — a tab left open before the deploy)')
    await page.goto(`${BASE}/t/blog/karen`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    console.log('step 3: client-nav to a karen post (initializes the client WASM DB while server is up)')
    const karenDump = page.waitForResponse((res) => res.url().includes('/__nuxt_content/blog_karen_pages/sql_dump.txt'), { timeout: 10_000 })
    await clickNav(page, '.feed .post-link', /\/t\/blog\/karen\/.+/, 800)
    await karenDump
    console.log('  karen collection dump fetched — WASM DB live in the tab')

    console.log('step 4: server goes down (real SIGTERM — the deploy window)')
    await stopServer()

    console.log('step 5: user clicks the "David" link in the blog network footer (client-side nav during the window)')
    await clickNav(page, '.net-links a[href="/t/blog/david"]', /\/t\/blog\/david$/, 4000)
    const duringOutage = await snapshot(page, 'during outage')
    if (duringOutage.hasAbout) {
      console.log('HARNESS INVALID: About rendered during the outage — dump fetch did not fail as designed')
      process.exitCode = 2
      return
    }

    console.log('step 6: deploy completes — server back up and healthy')
    await startServer()

    console.log('step 7: user navigates away (karen) and back (david) — server healthy the whole time')
    await clickNav(page, '.net-links a[href="/t/blog/karen"]', /\/t\/blog\/karen$/, 800)
    await clickNav(page, '.net-links a[href="/t/blog/david"]', /\/t\/blog\/david$/, 4000)
    const afterRecovery = await snapshot(page, 'after recovery nav')

    console.log('step 8: full page reload (the user folk-remedy)')
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    const afterReload = await snapshot(page, 'after reload')

    console.log('\n--- evidence (dump requests + failures) ---')
    for (const line of evidence.filter((l) => l.includes('sql_dump') || l.includes('pageerror') || l.includes('console.'))) {
      console.log(`  ${line}`)
    }

    console.log('\n--- verdict ---')
    if (!afterReload.hasAbout) {
      console.log('HARNESS INVALID: even a full reload did not render About — something else is broken')
      process.exitCode = 2
    } else if (!afterRecovery.hasAbout) {
      console.log('RED — BUG REPRODUCED: About stayed empty on navigation AFTER the server was healthy again;')
      console.log('only a full reload fixed it. (Poisoned dbPromises cache — issue #236.)')
      process.exitCode = 1
    } else {
      console.log('GREEN — NO BUG: About recovered on the first navigation after the server came back.')
      process.exitCode = 0
    }
  } finally {
    await browser.close()
    await stopServer()
  }
})().catch((err) => {
  console.error('harness error:', err)
  stopServer()
  process.exit(2)
})
