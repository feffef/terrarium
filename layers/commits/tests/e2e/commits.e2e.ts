// L2 e2e assertion specific to the **commits** Tenant. Registered by the platform
// smoke spec so it shares that spec's single `setup()`/Nuxt build — NOT a
// standalone `*.spec.ts` (a second spec re-runs `setup()` → another full build;
// ADR-0004 amendment, tests/README.md).
//
// This is the PoC's proof-of-capability. The platform entry-route sweep already
// renders `/t/commits/poc` and asserts clean hydration — but the endpoint
// degrades to a quiet `{ ok: false }` fallback on any git failure (by design, so
// a git-less runtime can't break the clean-hydration gate), and that fallback is
// ALSO console-error-free with the `<h1>` still present from index.md. So the
// sweep passes whether or not git actually ran. This assertion closes that gap:
// it proves the endpoint really read the commit at runtime on the CI runner — the
// large-font subject is present and the error fallback is absent. If a runtime
// ever can't run git, THIS is the test that goes red (intentional coupling).
import { describe, expect, it } from 'vitest'
import { renderAndCollectErrors } from '../../../../tests/support/e2e.ts'

/** Register the commits Tenant's L2 assertion under the caller's active suite. */
export function registerCommitsE2E(): void {
  describe('commits Tenant', () => {
    it('reads and renders the latest commit at runtime (not the fallback)', async () => {
      const { page, errors } = await renderAndCollectErrors('/t/commits/poc')
      try {
        const subject = page.locator('.commit-poc__subject')
        await subject.waitFor({ state: 'attached', timeout: 10_000 })

        // The OK branch rendered its large-font subject with real content …
        expect((await subject.textContent())?.trim()).toBeTruthy()
        // … and the `{ ok: false }` fallback did NOT — i.e. git actually ran.
        expect(await page.locator('.commit-poc__error').count()).toBe(0)
        expect(errors, `console/page errors on /t/commits/poc:\n${errors.join('\n')}`).toEqual([])
      } finally {
        await page.close()
      }
    })
  })
}
