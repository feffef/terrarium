// L2 e2e assertions specific to the **midden** Tenant. Registered by the
// platform smoke spec so it shares that spec's single `setup()`/Nuxt build —
// NOT a standalone `*.spec.ts` (a second spec re-runs `setup()` → another full
// build; ADR-0004 amendment, tests/README.md).
//
// Content covers the real `trench` Space (14 catalogued Sites, 37 Artifacts), the
// `stores` Space (10 Artifacts held off display, no Sites — CONTEXT.md's "The
// Stores"), plus the Tenant-root `/t/midden` foreword page (issue #515). Assertions
// here target ROUTES, not files on disk — mirroring
// `layers/atlas/tests/e2e/atlas.e2e.ts`'s no-context shape (a plain
// `register…(): void`): every assertion below is self-contained via `$fetch`
// or its own page, so there's nothing from the caller's suite to thread in.
import { describe, expect, it } from 'vitest'
import { $fetch, createPage, fetch, url } from '@nuxt/test-utils/e2e'

/** Register the midden Tenant's L2 assertions under the caller's active suite. */
export function registerMiddenE2E(): void {
  describe('midden Tenant', () => {
    // The Tenant-root foreword (`/t/midden`) is a Tenant-root layer route, not
    // a Space — like the Atlas front door, it is deliberately outside the
    // manifest/routing map, so it is NOT in `entryRoutes` and the platform
    // sweep in `tests/e2e/smoke.spec.ts` never reaches it (ADR-0016 — "should
    // assert it in its own way"). This is that assertion, in the same
    // `$fetch`-SSR-string style `atlas.e2e.ts`'s front-door check uses.
    it('renders the Midden front door', async () => {
      const html = await $fetch('/t/midden')
      expect(html).toMatch(/<h1[ >]/)
      expect(html).not.toContain('No document at')
      expect(html.toLowerCase()).toContain('midden')
    })

    // `/t/midden` is the front door (foreword + a doorway per Space) and
    // `/t/midden/trench` the trench landing (its own intro + the dig reports) —
    // distinct pages, like the Atlas front door and its wings. Neither carries
    // the condition legend: that lives only in the dig-report condition key.
    it('keeps the front door and the trench landing distinct', async () => {
      const front = await $fetch('/t/midden')
      expect(front).toContain('The Midden')
      expect(front).toContain('/t/midden/trench')
      expect(front).toContain('/t/midden/stores')
      expect(front).not.toContain('The Generated Map')
      const trench = await $fetch('/t/midden/trench')
      expect(trench).toContain('The Trench')
      expect(trench).toContain('The Generated Map')
      expect(trench).toContain('/t/midden/stores')
      for (const html of [front, trench]) {
        expect(html).not.toContain('Condition key')
        // A definition string from utils/condition.ts's single-homed table.
        expect(html).not.toContain('Discarded so recently the edges are still sharp')
      }
    })

    // The front door's count must match the trench's actual list (the Space
    // index document is not a dig report).
    it('counts the dig reports on the front door correctly', async () => {
      const listed = ((await $fetch('/t/midden/trench')) as string).match(/class="midden-sites__item"/g)?.length ?? 0
      expect(listed).toBeGreaterThan(0)
      expect(await $fetch('/t/midden')).toContain(`the open excavation — ${listed} dig report${listed === 1 ? '' : 's'}`)
    })

    it('shows three latest finds, each deep-linked to its card', async () => {
      const html = (await $fetch('/t/midden')) as string
      expect(html.match(/class="[^"]*midden-latest__link/g)?.length).toBe(3)
      expect(html).toMatch(/href="\/t\/midden\/trench\/[a-z0-9-]+#artifact-[a-z0-9-]+"/)
    })

    it('404s an unknown Midden Space', async () => {
      expect((await fetch('/t/midden/no-such-space')).status).toBe(404)
    })

    // The dig-report page carries the condition key (owner-directed final
    // design): a sticky sidebar defining ONLY the grades present in this
    // report's finds. `the-generated-map`'s three finds grade intact/dissolved —
    // so those definitions render and an absent grade's (fresh, lost) must not.
    it('renders the condition key on a dig report, scoped to present grades', async () => {
      const html = await $fetch('/t/midden/trench/the-generated-map')
      expect(html).toContain('Condition key')
      expect(html).toContain('Whole and legible, but settled')
      expect(html).toContain('Nearly gone')
      expect(html).not.toContain('Discarded so recently the edges are still sharp')
      expect(html).not.toContain('Gone without trace')
    })

    // The stores register (CONTEXT.md's "The Stores"): the Midden's second Space,
    // reached from the trench landing. It renders every stored find WHOLE — a
    // demotion is not an abridgement — grouped by Dig season, with no Sites of
    // its own. Pins the two properties that distinguish it from a dig report:
    // real catalogNote prose is present, and no `::midden-artifact` embed is used
    // (the register has its own quieter entry markup, so no specimen-slip stamp).
    it('renders the stores register, grouped by season, with whole records', async () => {
      const html = await $fetch('/t/midden/stores')
      expect(html).toContain('The Stores')
      // A season heading from the single-homed DIG_SEASONS table (strata.ts).
      expect(html).toContain('the Routing Excavation')
      // A verbatim fragment of a stored find's authored catalogNote — proof the
      // whole record travels, not a truncated stub.
      expect(html).toContain('pnpm gen')
      expect(html).toContain('Condition key')
      expect(html).not.toContain('midden-find__stamp')
    })

    // Jargon glosses (issue #1463): first use only, shared across the prose and
    // the finds' notes, opened by a real click in the rendered DOM.
    it('glosses first uses of Platform jargon on a dig report', async () => {
      const page = await createPage()
      try {
        await page.goto(url('/t/midden/trench/the-buried'), { waitUntil: 'hydration' })
        const terms = page.locator('.midden-gloss__term')
        expect(await terms.allTextContents()).toEqual(expect.arrayContaining(['Tenant', 'Space', 'isolation', 'sync', 'ADR-0008']))
        expect(await page.locator('.midden-gloss__term', { hasText: /^Tenant$/ }).count()).toBe(1)
        const tenant = page.locator('.midden-gloss', { hasText: /^Tenant/ })
        await expect.poll(() => tenant.locator('.midden-gloss__def').isVisible()).toBe(false)
        await tenant.locator('button').click()
        await expect.poll(() => tenant.locator('.midden-gloss__def').isVisible()).toBe(true)
      } finally {
        await page.close()
      }
    })
  })
}
