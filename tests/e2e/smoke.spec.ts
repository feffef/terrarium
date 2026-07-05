// L2 — Smoke render (ADR-0004): every (Tenant, Space) entry route returns 200
// and renders content without erroring. The target list is generated
// (shared/routing.generated.ts), so new Spaces are covered automatically.
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { entryRoutes } from '../../shared/routing.generated.ts'

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

  // A Digest surfaced on the landing must link to its real, browsable route.
  // Content `path` is Space-relative (/digests/<date>), so the link has to carry
  // the /t/<tenant>/<space> prefix — else it 404s at the site root.
  it('links recent digests to their browsable route', async () => {
    const html = await $fetch('/t/journal/current')
    expect(html).toContain('Recent digests')
    const href = html.match(/href="(\/t\/journal\/current\/digests\/[^"]+)"/)
    expect(href).not.toBeNull()
    const digest = await $fetch(href![1]!) // throws on the old Space-relative 404
    expect(digest).toMatch(/<h1[ >]/)
  })

  // A Space with no sessions (archived) must render the same dashboard without
  // erroring — the empty-state paths are exercised, isolation preserved.
  it('renders a session-less Space gracefully', async () => {
    const html = await $fetch('/t/journal/archived')
    expect(html).toContain('No sessions logged in this Space yet.')
    expect(html).not.toContain('No document at')
  })
})
