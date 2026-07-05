// L2 — Smoke render (ADR-0004): every (Tenant, Space) entry route returns 200
// and renders content without erroring. The target list is derived at build time
// from the manifests (ADR-0014), so new Spaces are covered automatically.
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { expand, loadManifests } from '../../shared/expand.ts'

const cols = expand(loadManifests())
const entryRoutes = [
  ...new Set(cols.filter((c) => c.type === 'page').map((c) => `/t/${c.tenant}/${c.space}`)),
].sort()

describe('L2 smoke render — entry routes', async () => {
  await setup({ rootDir: fileURLToPath(new URL('../..', import.meta.url)) })

  for (const route of entryRoutes) {
    it(`renders ${route}`, async () => {
      const html = await $fetch(route) // throws on non-2xx
      expect(html).toMatch(/<h1[ >]/)
      expect(html).not.toContain('No document at')
    })
  }

  // The journal Tenant's layer replaces the generic Space landing with an
  // overview dashboard (state + recent activity + Skill catalogue).
  it('renders the journal overview dashboard', async () => {
    const html = await $fetch('/t/journal/current')
    expect(html).toContain('Recent activity')
    expect(html).toContain('Friction signal')
    expect(html).toContain('Platform Skills')
  })

  // Session cards are expand-on-click disclosures — sessions are a `data`
  // collection with no route of their own, so the full log is revealed inline.
  // Assert the control is wired (SSR-collapsed) and the detail data is delivered.
  it('renders session cards as expandable disclosures', async () => {
    const html = await $fetch('/t/journal/current')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toMatch(/role="button"/)
  })

  // Digests expand inline on the landing (like the session cards): the body is
  // preloaded for zero-request expansion, and the standalone page route still works.
  it('shows daily digests inline and keeps the digest route', async () => {
    const html = await $fetch('/t/journal/current')
    expect(html).toContain('Daily digests')
    expect(html).toContain('went from empty repo') // the Digest body, preloaded inline
    const digest = await $fetch('/t/journal/current/digests/2026-07-04')
    expect(digest).toMatch(/<h1[ >]/) // the standalone route still renders
  })

  // Standalone Document pages (#25) must render in the journal theme via the
  // Tenant's own `[space]/[...slug]` override, NOT fall through to the Platform's
  // unstyled catch-all. Assert the `.jd` wrapper + breadcrumb are present so it
  // can't silently regress to the generic renderer.
  it('renders standalone journal documents in the Tenant theme', async () => {
    for (const url of ['/t/journal/current/about', '/t/journal/current/digests/2026-07-04']) {
      const html = await $fetch(url)
      expect(html).toContain('class="jd"') // themed wrapper, not system-ui catch-all
      expect(html).toContain('aria-label="Breadcrumb"')
      expect(html).toContain('jd-prose')
      expect(html).not.toContain('No document at')
    }
  })

  // The archived Space's Document routes are served by the SAME themed override
  // (not the generic catch-all) AND stay isolated: `/t/journal/archived/about`
  // has no document, so it renders a *themed* not-found and must not leak
  // `current`'s about body.
  it('serves archived Document routes themed and isolated', async () => {
    const html = await $fetch('/t/journal/archived/about')
    expect(html).toContain('class="jd"') // themed override reaches archived
    expect(html).toContain('aria-label="Breadcrumb"')
    expect(html).toContain('No document at') // no such doc in archived
    expect(html).not.toContain('single SQLite database') // did NOT leak current/about
  })

  // A Space with no sessions (archived) must render the same dashboard without
  // erroring — the empty-state paths are exercised, isolation preserved.
  it('renders a session-less Space gracefully', async () => {
    const html = await $fetch('/t/journal/archived')
    expect(html).toContain('No sessions logged in this Space yet.')
    expect(html).not.toContain('No document at')
  })
})
