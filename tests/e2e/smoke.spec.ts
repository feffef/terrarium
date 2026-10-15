// L2 — Smoke render (ADR-0004): every (Tenant, Space) entry route returns 200,
// renders content, and — in a REAL browser — hydrates with no console/page
// errors. The target list is derived at test time from the manifests
// (ADR-0014), so new Spaces are covered automatically.
//
// This file is the Platform spec: the cross-Tenant entry-route sweep, the root
// page and the mermaid sweep. Tenant-SPECIFIC L2 assertions live in each layer
// (`layers/<tenant>/tests/e2e/<tenant>.spec.ts`).
//
// Every e2e spec calls `setupL2()` and never builds. The one build is the gate's
// `pnpm build`; the e2e project's globalSetup (tests/support/e2e-global-setup.ts)
// reuses it and builds only if `.output` is stale (tests/README.md).
//
// A real browser (`createPage`) loads each route: the server-rendered document
// is checked from the navigation's response, and the client bundle actually
// executes. That is the half CLAUDE.md warns a string match on SSR HTML cannot
// prove — uncaught errors and hydration throws surface as console.error /
// pageerror, which the listeners assert stay empty.
import { describe, expect, it } from 'vitest'
import { $fetch, createPage, fetch, url } from '@nuxt/test-utils/e2e'
import { attrs, entryRoutes, expectCleanHydration, expectHydrated, mermaidPageRoutes, setupL2, withRendered } from '../support/e2e.ts'
import { CONDITION_GRADES } from '../../layers/midden/app/utils/condition.ts'

describe('L2 smoke render', async () => {
  await setupL2()

  // ── Platform: every (Tenant, Space) entry route ─────────────────────────────
  describe('entry routes', () => {
    // Every entry route is loaded in Chromium. The navigation's server-rendered
    // document must be 2xx with an <h1> and not the 404 page; then the client
    // bundle runs and we assert (a) an <h1> exists in the *rendered DOM*, (b)
    // nothing logged a console error or threw during hydration, and (c) no
    // unresolved auto-import component silently rendered as an unknown custom
    // element (issue #212) — vue-tsc and (a)/(b) all stay green on that failure
    // mode, so it needs its own assertion.
    for (const route of entryRoutes) {
      it(`hydrates ${route} in a browser with no console/page errors`, async () => {
        await expectCleanHydration(route)
      })
    }
  })

  // ── Platform: the root index page (`/`) ─────────────────────────────────────
  // Not a Tenant/Space route, so — like a Tenant-root front door (ADR-0016) —
  // it's outside the manifest-derived `entryRoutes` sweep above and asserted
  // here directly.
  describe('root index page', () => {
    // Card order is asserted by the title-link test below; raw-HTML indexOf would
    // trip over a digest or teaser that happens to name a Tenant first.
    it('renders the hero', async () => {
      const html = await $fetch('/')
      expect(html).toMatch(/<h1[ >]/)
      expect(html).toMatch(/<title>terrarium · [^<]+<\/title>/)
    })

    it('hydrates in a browser with no console/page errors', async () => {
      await expectCleanHydration('/')
    })

    it('navigates home client-side from the server payload, without the client DB (ADR-0028)', async () => {
      const page = await createPage()
      try {
        await page.goto(url('/t/blog'), { waitUntil: 'hydration' })
        const requests: string[] = []
        page.on('request', (request) => requests.push(request.url()))
        await page.locator('a[href="/"]').first().click()

        await page.locator('.root h1').waitFor({ timeout: 8000 })
        expect(requests.some((u) => new URL(u).pathname === '/_payload.json')).toBe(true)
        expect(requests.filter((u) => u.includes('.wasm') || u.includes('sql_dump.txt'))).toEqual([])
      } finally {
        await page.close()
      }
    })

    it('ships only the timeline entries the home page shows (#1702)', async () => {
      const payload = await $fetch('/_payload.json', { responseType: 'text' })
      // devalue escapes `/` as \u002F.
      expect(payload).toMatch(/\\u002Ft\\u002Fjournal\\u002F[a-z]+\\u002Fdigests\\u002F\d{4}-\d{2}-\d{2}/)
      expect(payload).not.toContain('#session-')
    })

    it('404s a missing document or Tenant, with a link back home', async () => {
      for (const route of ['/t/journal/current/nope', '/t/commons/search/nope', '/t/nope/nothing', '/t/nope', '/t/__proto__']) {
        expect((await fetch(route)).status, route).toBe(404)
      }
      const html = await (await fetch('/t/nope/nothing', { headers: { accept: 'text/html' } })).text()
      expect(html).toContain('Back to the terrarium')
    })

    it('links each showcase card to its Tenant front door, in order', async () => {
      const page = await createPage()
      try {
        await page.goto(url('/'), { waitUntil: 'hydration' })
        const hrefs = await attrs(page.locator('.explore-grid a.title-link'), 'href')
        expect(hrefs).toEqual(['/t/blog', '/t/midden', '/t/atlas', '/t/tinkerfund'])
      } finally {
        await page.close()
      }
    })

    it('shows Tinkerfund’s two Spaces and a Campaign of the day in its own colours', async () => {
      const page = await createPage()
      try {
        await page.goto(url('/'), { waitUntil: 'hydration' })
        const tile = page.locator('.tile--tinkerfund')
        const rooms = await attrs(tile.locator('a.room'), 'href')
        expect(rooms).toEqual(['/t/tinkerfund/prod', '/t/tinkerfund/qa'])
        const campaign = tile.locator('a.campaign')
        expect(await campaign.getAttribute('href')).toMatch(/^\/t\/tinkerfund\/prod\/campaigns\/[a-z0-9-]+$/)
        expect(await campaign.textContent()).toMatch(/TF-\d{4}[\s\S]*\d+% funded/)
        // The --tf-* tokens resolve inside the tile only (theme.css's `.tf-tokens`).
        expect(await tile.evaluate((el) => getComputedStyle(el).getPropertyValue('--tf-accent'))).not.toBe('')
        expect(await page.locator('.root').evaluate((el) => getComputedStyle(el).getPropertyValue('--tf-accent'))).toBe('')
      } finally {
        await page.close()
      }
    })

    it('explains the Midden find’s condition stamp by tap, from the condition table (#1464)', async () => {
      const page = await createPage()
      try {
        await page.goto(url('/'), { waitUntil: 'hydration' })
        const find = page.locator('.tile--midden .find')
        const stamp = find.locator('button.find-stamp')
        const label = (await stamp.textContent())!.trim()
        const grade = CONDITION_GRADES.find((c) => c.label === label)!
        expect(await find.locator('.find-stamp-def').isVisible()).toBe(false)
        await stamp.click()
        expect(await stamp.getAttribute('aria-expanded')).toBe('true')
        expect(await find.locator('.find-stamp-def').textContent()).toBe(grade.definition)
        expect(await find.locator('a.find-title').getAttribute('href')).toMatch(/^\/t\/midden\/trench.*#artifact-/)
      } finally {
        await page.close()
      }
    })
  })

  // ── Platform: every content page with a fenced ```mermaid block (#469) ──────
  // Discovered from the manifests + real content — mirrors `entryRoutesFrom`
  // (shared/expand.ts) — so a new mermaid diagram on ANY page, in ANY Tenant,
  // gets render coverage automatically instead of shipping untested. Diagrams
  // are now pre-rendered to committed, theme-adaptive SVGs (issue #379,
  // ADR-0024): the page must show the inline SVG AND ship NO mermaid JS — a real
  // browser is what proves the network trace stays mermaid-free.
  describe('mermaid diagrams', () => {
    it('discovers at least one mermaid page to sweep', () => {
      expect(mermaidPageRoutes.length).toBeGreaterThan(0)
    })

    for (const route of mermaidPageRoutes) {
      it(`renders a pre-rendered mermaid SVG and ships no mermaid JS on ${route}`, async () => {
        await withRendered(route, async (page, requests) => {
          // Also the hydration check for the Documents' deeper routes, which the
          // entry-route sweep never visits (issue #212).
          await expectHydrated(page, route)
          await page.locator('.mermaid-diagram svg').first().waitFor({ state: 'attached', timeout: 10_000 })
          expect(await page.locator('.mermaid-diagram svg').count()).toBeGreaterThan(0)
          // The whole point of #379: the ~600 KB mermaid renderer must never be
          // fetched. No requested URL may name mermaid.
          const mermaidRequests = requests.filter((u) => /mermaid/i.test(u))
          expect(mermaidRequests, `mermaid JS was fetched on ${route}:\n${mermaidRequests.join('\n')}`).toEqual([])
        })
      })
    }
  })
})
