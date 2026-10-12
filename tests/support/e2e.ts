// Shared L2 e2e support, imported by the Platform specs
// (`tests/e2e/*.spec.ts`) and by each Tenant's e2e spec
// (`layers/<tenant>/tests/e2e/<tenant>.spec.ts`). Not a spec itself (no `.spec.ts`
// suffix), so vitest never collects it. Every spec calls `setupL2()`, which
// serves the build that the e2e project's globalSetup made sure exists
// (tests/README.md; ADR-0004's 2026-10-12 amendment).
import { copyFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Locator, Page, Response } from 'playwright-core'
import { afterAll, expect } from 'vitest'
import { createPage, fetch, setup, url } from '@nuxt/test-utils/e2e'
import { findPreinstalledChromium, findSystemChrome } from '../../scripts/chromium-path.ts'
import { entryRoutesFrom, expand, loadManifests } from '../../shared/expand.ts'
import { mermaidRoutes } from './mermaid-pages.ts'

const root = fileURLToPath(new URL('../..', import.meta.url))

// The browser is located, not resolved by playwright's own pinned revision:
// first a Chromium under PLAYWRIGHT_BROWSERS_PATH (the agent sandbox's
// pre-installed build, or the one CI provisions there), then the system
// Chrome/Chromium. Both lookups are single-homed in scripts/chromium-path.ts,
// shared with scripts/screenshot.ts and ad-hoc probes (issue #202). CI pins a
// Playwright-managed Chromium via the first path for determinism; the
// system-Chrome fallback keeps every other environment provisioning-free
// (issue #97).
const chromiumPath = findPreinstalledChromium() ?? findSystemChrome()

/**
 * Await inside a spec's top-level `describe`: serves `.output` and opens a browser. Never builds.
 * Each spec's server gets its own Nuxt Content SQLite file: servers sharing
 * `.output/server/contents.sqlite` raced to import the dumps and answered 500s.
 * The copy is of the build's already-imported DB, so the server skips the
 * import; a stale or missing one just means it imports into the copy.
 */
export async function setupL2(): Promise<void> {
  const dbDir = mkdtempSync(join(tmpdir(), 'terrarium-e2e-'))
  afterAll(() => rmSync(dbDir, { recursive: true, force: true }))
  const builtDb = join(root, '.data/content/contents.sqlite')
  if (existsSync(builtDb)) copyFileSync(builtDb, join(dbDir, 'contents.sqlite'))
  await setup({
    rootDir: root,
    build: false,
    nuxtConfig: { nitro: { output: { dir: join(root, '.output') } } },
    env: { NUXT_CONTENT_DATABASE_FILENAME: join(dbDir, 'contents.sqlite') },
    browser: true,
    browserOptions: {
      type: 'chromium',
      launch: {
        ...(chromiumPath ? { executablePath: chromiumPath } : {}),
        args: ['--no-sandbox', '--disable-gpu'],
      },
    },
  })
}

// Both target lists are derived at test-time from the SAME expanded manifests
// (ADR-0014), so new Spaces/pages are covered automatically with no hard-coding.
const expandedCollections = expand(loadManifests())

// The L2 target list, derived at test-time from the manifests (ADR-0014) so new
// Spaces are covered automatically. Single-homed in `shared/expand.ts` so the
// build-time routing module and this test-time list can't drift.
export const entryRoutes = entryRoutesFrom(expandedCollections)

// Every content page, across every Tenant, whose body contains a fenced
// ```mermaid block — the L2 sweep target list for issue #469.
export const mermaidPageRoutes = mermaidRoutes(expandedCollections)

/**
 * Navigate to `route` in a fresh page, capturing every console *error*, uncaught
 * page error, and requested URL from before navigation until the network
 * settles. Returns the page (for DOM assertions), the collected error strings,
 * and every request URL (so a test can assert what did — or, for #379's
 * zero-mermaid-JS guarantee, did NOT — get fetched), plus the navigation's
 * response (the server-rendered document).
 */
async function renderAndCollectErrors(
  route: string,
): Promise<{ page: Page; errors: string[]; requests: string[]; response: Response | null }> {
  const errors: string[] = []
  const requests: string[] = []
  // Un-navigated page (createPage() with no path skips its own goto), so the
  // listeners are attached BEFORE the client bundle runs and can see hydration
  // errors that fire on first paint.
  const page = await createPage()
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`)
  })
  page.on('pageerror', (err) => {
    errors.push(`pageerror: ${err.message}`)
  })
  page.on('request', (req) => {
    requests.push(req.url())
  })
  // waitUntil: 'hydration' blocks until Nuxt reports isHydrating === false, so a
  // throw during hydration surfaces as a pageerror we then assert on.
  const response = await page.goto(url(route), { waitUntil: 'hydration' })
  await page.waitForLoadState('networkidle')
  return { page, errors, requests, response }
}

/**
 * Returns the deduped, lowercased tag names of any `HTMLUnknownElement`s in
 * `page`'s live DOM — the signature of a typo'd or renamed auto-imported Vue
 * component: Vue emits the unresolved tag as-is, the browser parses it as a
 * custom element, and the page renders around the gap silently (issue #212).
 * An empty array is the passing case; the repo has no genuine custom elements
 * to allowlist today.
 */
export async function collectUnknownElementTags(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...new Set(
      [...document.querySelectorAll('*')]
        .filter((e) => Object.getPrototypeOf(e).constructor.name === 'HTMLUnknownElement')
        .map((e) => e.tagName.toLowerCase()),
    )],
  )
}

/**
 * Renders `route` and runs `fn` against the page, then asserts no console/page
 * error fired (also the requests seen, for #379's zero-mermaid-JS guarantee).
 * Closes the page itself (success or failure) so call sites don't each repeat
 * the try/finally.
 */
export async function withRendered(
  route: string,
  fn: (page: Page, requests: string[], response: Response | null) => Promise<void>,
): Promise<void> {
  const { page, errors, requests, response } = await renderAndCollectErrors(route)
  try {
    await fn(page, requests, response)
    expect(errors, `console/page errors on ${route}:\n${errors.join('\n')}`).toEqual([])
  } finally {
    await page.close()
  }
}

/** Asserts (a) an `<h1>` exists in the rendered DOM and (b) no unresolved
 *  auto-import component rendered as an `HTMLUnknownElement` (issue #212). */
export async function expectHydrated(page: Page, route: string): Promise<void> {
  expect(await page.locator('h1').count()).toBeGreaterThan(0)
  const unknownTags = await collectUnknownElementTags(page)
  expect(unknownTags, `unresolved components on ${route}: ${unknownTags.join(', ')}`).toEqual([])
}

/** Asserts the navigation's server-rendered document is a 2xx page with an `<h1>`, not the 404 page. */
async function expectServerRendered(response: Response | null, route: string): Promise<void> {
  expect(response, `no navigation response for ${route}`).not.toBeNull()
  expect(response!.ok(), `${route} answered ${response!.status()}`).toBe(true)
  const html = await response!.text()
  expect(html).toMatch(/<h1[ >]/)
  // Match the 404 markup, not the phrase: a session log quoting the 404 page
  // renders into the Journal and tripped the plain substring (PR #1690).
  expect(html).not.toMatch(/No document at <code[\s>]/)
}

/** `withRendered` + the server-rendered and hydrated checks, for a route that needs no other assertion. */
export const expectCleanHydration = (route: string): Promise<void> =>
  withRendered(route, async (page, _requests, response) => {
    await expectServerRendered(response, route)
    await expectHydrated(page, route)
  })

/** Asserts `from` answers a 302 to `to` (no redirect followed). */
export async function expectRedirect(from: string, to: string): Promise<void> {
  const res = await fetch(from, { redirect: 'manual' })
  expect(res.status).toBe(302)
  expect(res.headers.get('location')).toBe(to)
}

/** The `name` attribute of every element `loc` matches, '' when absent. */
export const attrs = (loc: Locator, name: string): Promise<string[]> =>
  loc.evaluateAll((els, n) => els.map((el) => el.getAttribute(n) ?? ''), name)
