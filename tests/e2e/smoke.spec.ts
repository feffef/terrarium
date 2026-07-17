// L2 — Smoke render (ADR-0004): every (Tenant, Space) entry route returns 200,
// renders content, and — in a REAL browser — hydrates with no console/page
// errors. The target list is derived at build time from the manifests
// (ADR-0014), so new Spaces are covered automatically.
//
// This file is the Platform half: the cross-Tenant entry-route sweep that
// applies to every Tenant uniformly. Tenant-SPECIFIC L2 assertions live in each
// layer (`layers/<tenant>/tests/e2e/*.e2e.ts`) and are pulled in here via their
// `register…()` export so they run under this file's single `setup()`/build.
//
// ⚠️ Keep this ONE spec file with ONE `setup()`. A second e2e `*.spec.ts` re-runs
// `setup()` → another full `nuxt build`, multiplying the gate's slowest step per
// Tenant. That is why tenant assertions are imported modules, not sibling specs —
// do not "clean this up" into per-Tenant spec files (ADR-0004 amendment;
// tests/README.md).
//
// Two layered tiers, cheapest-first (the gate's own design principle, ADR-0004):
//   Tier 1 — fast SSR `$fetch`: the route serves 200 and the server-rendered
//            HTML carries the expected structure.
//   Tier 2 — real browser (`createPage`): the client bundle actually executes.
//            This is the half CLAUDE.md warns a string match on SSR HTML cannot
//            prove — uncaught errors and hydration throws surface as
//            console.error / pageerror, which the listeners assert stay empty.
//
// The browser is located, not resolved by playwright's own pinned revision:
// first a Chromium under PLAYWRIGHT_BROWSERS_PATH (the agent sandbox's
// pre-installed build, or the one CI provisions there), then the system
// Chrome/Chromium. Both lookups are single-homed in scripts/chromium-path.ts,
// shared with scripts/screenshot.ts and ad-hoc probes (issue #202). CI pins a
// Playwright-managed Chromium via the first path for determinism; the
// system-Chrome fallback keeps every other environment provisioning-free
// (issue #97).
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { entryRoutes, expectCleanHydration, mermaidPageRoutes, renderAndCollectErrors } from '../support/e2e.ts'
import { findPreinstalledChromium, findSystemChrome } from '../../scripts/chromium-path.ts'
import { registerJournalE2E } from '../../layers/journal/tests/e2e/journal.e2e.ts'
import { registerBlogE2E } from '../../layers/blog/tests/e2e/blog.e2e.ts'
import { registerAtlasE2E } from '../../layers/atlas/tests/e2e/atlas.e2e.ts'
import { registerCommitsE2E } from '../../layers/commits/tests/e2e/commits.e2e.ts'
import { registerMiddenE2E } from '../../layers/midden/tests/e2e/midden.e2e.ts'
import { registerMarqueeE2E } from '../../layers/marquee/tests/e2e/marquee.e2e.ts'

const chromiumPath = findPreinstalledChromium() ?? findSystemChrome()

describe('L2 smoke render', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('../..', import.meta.url)),
    browser: true,
    browserOptions: {
      type: 'chromium',
      launch: {
        ...(chromiumPath ? { executablePath: chromiumPath } : {}),
        args: ['--no-sandbox', '--disable-gpu'],
      },
    },
  })

  // ── Platform: every (Tenant, Space) entry route ─────────────────────────────
  describe('entry routes', () => {
    // Tier 1: fast SSR checks (cheap first tier).
    for (const route of entryRoutes) {
      it(`renders ${route}`, async () => {
        const html = await $fetch(route) // throws on non-2xx
        expect(html).toMatch(/<h1[ >]/)
        expect(html).not.toContain('No document at')
      })
    }

    // Tier 2: real browser render — hydrates cleanly and the DOM is present.
    // Every entry route is loaded in Chromium, the client bundle runs, and we
    // assert (a) an <h1> exists in the *rendered DOM* (not the SSR string), (b)
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

  // ── Platform: every content page with a fenced ```mermaid block (#469) ──────
  // Discovered from the manifests + real content — mirrors `entryRoutesFrom`
  // (shared/expand.ts) — so a new mermaid diagram on ANY page, in ANY Tenant,
  // gets render coverage automatically instead of shipping untested. Only a real
  // browser can prove the client-only `<MermaidDiagram>` (issue #364) actually
  // replaced its fallback `<pre>` with an inline SVG.
  describe('mermaid diagrams', () => {
    it('discovers at least one mermaid page to sweep', () => {
      expect(mermaidPageRoutes.length).toBeGreaterThan(0)
    })

    for (const route of mermaidPageRoutes) {
      it(`renders a mermaid diagram as an inline SVG on ${route}`, async () => {
        const { page, errors } = await renderAndCollectErrors(route)
        try {
          await page.locator('.mermaid-diagram svg').first().waitFor({ state: 'attached', timeout: 10_000 })
          expect(await page.locator('.mermaid-diagram svg').count()).toBeGreaterThan(0)
          expect(errors, `console/page errors on ${route}:\n${errors.join('\n')}`).toEqual([])
        } finally {
          await page.close()
        }
      })
    }
  })

  // ── Per-Tenant assertions, homed in each layer, sharing this one build ───────
  registerJournalE2E({ entryRoutes, renderAndCollectErrors })
  registerBlogE2E()
  registerAtlasE2E()
  registerCommitsE2E()
  registerMiddenE2E()
  registerMarqueeE2E()
})
