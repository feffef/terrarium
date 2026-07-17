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

    // `/t/midden/trench` IS a manifest-derived Space entry route, so the
    // platform sweep already covers its generic 200/<h1>/clean-hydration
    // shape — this checks the trench landing's actual authored content
    // (`layers/midden/content/trench/pages/index.md`'s `title: The Trench`),
    // which the generic sweep can't know to assert.
    it('renders the trench landing with its real title', async () => {
      const html = await $fetch('/t/midden/trench')
      expect(html).toContain('The Trench')
    })

    it('hydrates the trench landing with no unresolved components', async () => {
      await expectCleanHydration('/t/midden/trench')
    })
  })
}
