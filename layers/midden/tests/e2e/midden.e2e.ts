// L2 e2e assertions specific to the **midden** Tenant. Registered by the
// platform smoke spec so it shares that spec's single `setup()`/Nuxt build —
// NOT a standalone `*.spec.ts` (a second spec re-runs `setup()` → another full
// build; ADR-0004 amendment, tests/README.md).
//
// Content covers the real `trench` Space (7 catalogued Sites, 31 Artifacts)
// plus the Tenant-root `/t/midden` foreword page (issue #515). Assertions
// here target ROUTES, not files on disk — mirroring
// `layers/atlas/tests/e2e/atlas.e2e.ts`'s no-context shape (a plain
// `register…(): void`, not `journal.e2e.ts`'s `ctx`-taking variant): every
// assertion below is self-contained via `$fetch`/`renderAndCollectErrors`, so
// there's nothing from the caller's suite this module needs threaded in.
import { describe, expect, it } from 'vitest'
import { $fetch } from '@nuxt/test-utils/e2e'
import { expectCleanHydration } from '../../../../tests/support/e2e.ts'

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

    // Post-MVP simplification (owner-directed, this branch): `/t/midden` and
    // `/t/midden/trench` render the SAME merged landing (mirror, not a redirect).
    // The generic platform sweep covers the trench route's 200/<h1>/hydration
    // shape; this pins the merged landing's own authored content — the foreword
    // masthead ("The Midden") plus a real dig-report title from the site list
    // (`the-generated-map.md`'s `title`) — which the sweep can't know to assert.
    // The final merged design (owner-directed) removed the condition legend from
    // the landing, so no grade definition text may render here — that text lives
    // only in the dig-report page's condition key now (next test).
    it('mirrors the merged landing at both routes with its authored content', async () => {
      for (const route of ['/t/midden', '/t/midden/trench']) {
        const html = await $fetch(route)
        expect(html).toContain('The Midden')
        expect(html).toContain('The Generated Map')
        expect(html).not.toContain('Condition key')
        // A definition string from utils/condition.ts's single-homed table.
        expect(html).not.toContain('Discarded so recently the edges are still sharp')
      }
    })

    // The dig-report page carries the condition key (owner-directed final
    // design): a sticky sidebar defining ONLY the grades present in this
    // report's finds. `the-generated-map`'s finds grade intact/dissolved/lost —
    // so those definitions render and an absent grade's (fresh) must not.
    it('renders the condition key on a dig report, scoped to present grades', async () => {
      const html = await $fetch('/t/midden/trench/the-generated-map')
      expect(html).toContain('Condition key')
      expect(html).toContain('Whole and legible, but settled')
      expect(html).toContain('Gone without trace')
      expect(html).not.toContain('Discarded so recently the edges are still sharp')
    })

    it('hydrates the trench landing with no unresolved components', async () => {
      await expectCleanHydration('/t/midden/trench')
    })
  })
}
