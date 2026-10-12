// L2 e2e assertions specific to the **journal** Tenant — its custom Space
// dashboard, inline session/digest disclosures, themed Document routes, and
// archived-Space isolation. These are the journal-only half of the smoke gate;
// the cross-Tenant entry-route sweep stays in `tests/e2e/entry-routes.spec.ts`.
// The accordion and scroll-pin tests are in journal-accordion.spec.ts, so the
// two run in parallel.
//
// Its own spec file: it serves the gate's build via `setupL2()` and never
// builds (ADR-0004 amendment; tests/README.md).
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { describe, expect, it } from 'vitest'
import { $fetch, fetch, url } from '@nuxt/test-utils/e2e'
import { expectCleanHydration, expectRedirect, setupL2, withRendered } from '../../../../tests/support/e2e.ts'
import { DIGESTS_DIR } from '../../../../scripts/digest.ts'
import { SESSIONS_DIR } from '../../../../scripts/session-logs.ts'
import { currentDigestDates, repoRoot } from './journal-support.ts'

// Only a cloud `session_…` id gets a link; a local CLI's bare UUID has no claude.ai page.
const SESSION_URL = /^https:\/\/claude\.ai\/code\/session_/

function currentSessions(): Record<string, unknown>[] {
  const dir = join(repoRoot, SESSIONS_DIR)
  return readdirSync(dir)
    .filter((f) => f.endsWith('.yml'))
    .map((f) => parseYaml(readFileSync(join(dir, f), 'utf8')) as Record<string, unknown>)
}

// Pick one `external: true` session's `goal` text (if any) and one ordinary
// session's, live from `current`, rather than hardcoding a specific session id
// — the same "read live" fix as currentDigestDates() above, for the same
// reason: the retention sweep (scripts/archive-journal-content.ts) can move
// any given session out to `archived`. `external` is genuinely rare (only
// created when a fork PR lands, ADR-0009 amendment) and can age out of the
// window entirely with no replacement yet landed — the fork-PR #631 salvage
// session did exactly that on 2026-07-28 — so callers must treat a missing
// `external` as "nothing to assert today," not an error.
function currentSessionGoals(): { external: string | undefined; ordinary: string } {
  let external: string | undefined
  let ordinary: string | undefined
  for (const raw of currentSessions()) {
    const goal = String(raw?.goal ?? '')
    if (!goal) continue
    if (raw?.external === true) external ??= goal
    else ordinary ??= goal
    if (external && ordinary) break
  }
  if (!ordinary) throw new Error('journal.spec: no ordinary session found in current to assert the ribbon is absent from')
  return { external, ordinary }
}

/** One idea from an ordinary `current` session, if any exists today — read live
 *  for the same retention reason as currentSessionGoals(). */
function currentSessionNotes(): { ordinaryIdea: string | undefined } {
  for (const raw of currentSessions()) {
    const idea = Array.isArray(raw?.ideas) ? raw.ideas[0] : undefined
    if (raw?.external !== true && typeof idea === 'string' && !/[<>&"']/.test(idea)) return { ordinaryIdea: idea }
  }
  return { ordinaryIdea: undefined }
}

/** A short, distinctive run of plain prose from a Digest's BODY (never its
 *  frontmatter `summary`, which the collapsed row already shows) — proves the
 *  body specifically preloads inline, not just the row's own headline. */
function digestBodySnippet(date: string): string {
  const raw = readFileSync(join(repoRoot, DIGESTS_DIR, `${date}.md`), 'utf8')
  const body = raw.replace(/^---[\s\S]*?---\s*/, '').replace(/^#.*\n+/, '')
  const firstParagraph = (body.split(/\n\s*\n/)[0] ?? '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  const snippet = firstParagraph.replace(/\s+/g, ' ').trim().split(' ').slice(0, 6).join(' ')
  if (snippet.length < 15) throw new Error(`journal.spec: could not extract a body snippet for digest ${date}`)
  return snippet
}

describe('journal Tenant', async () => {
  await setupL2()

  it('redirects the Tenant root /t/journal to its main Space', () =>
    expectRedirect('/t/journal', '/t/journal/current'))

  // The journal Tenant's layer replaces the generic Space landing with an
  // overview dashboard, linking out to its Skills and Ideas & learnings pages.
  // Session cards are expand-on-click disclosures — sessions are a `data`
  // collection with no route of their own, so the full log is revealed inline.
  // Assert the control is wired (SSR-collapsed) and the detail data is delivered.
  it('renders the journal overview dashboard, with session cards as expandable disclosures', async () => {
    const html = await $fetch('/t/journal/current')
    expect(html).toContain('Recent activity')
    expect(html).toContain('Frictions surfaced')
    expect(html).toContain('href="/t/journal/current/skills"')
    expect(html).toContain('href="/t/journal/current/ideas"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toMatch(/role="button"/)
  })

  // The Claude Code session link is maintainer-only: absent for a visitor,
  // revealed by `?maintainer`, kept for the tab in sessionStorage, cleared by
  // `?maintainer=0`. SSR never ships it, so hydration has nothing to mismatch.
  // The flag is read where a session card mounts, i.e. the Space landing.
  it('hides the Claude Code session link from a visitor, in the server HTML and once hydrated', async () => {
    const route = '/t/journal/current'
    expect(await $fetch(route)).not.toContain('chip session')
    await withRendered(route, async (page) => {
      expect(await page.locator('.feed .card .chip.session').count()).toBe(0)
    })
  })

  it('reveals the Claude Code session link with ?maintainer, keeps it for the tab, and clears it with ?maintainer=0', async () => {
    const route = '/t/journal/current'
    await withRendered(`${route}?maintainer`, async (page) => {
      const chip = page.locator('.feed .card .chip.session').first()
      await chip.waitFor()
      expect(await chip.getAttribute('href')).toMatch(SESSION_URL)
      // The flag outlives the URL: a plain load in the same tab keeps the view.
      await page.goto(url(route), { waitUntil: 'hydration' })
      await page.locator('.feed .card .chip.session').first().waitFor()
      await page.goto(url(`${route}?maintainer=0`), { waitUntil: 'hydration' })
      await page.waitForLoadState('networkidle')
      expect(await page.locator('.feed .card .chip.session').count()).toBe(0)
      await page.goto(url(route), { waitUntil: 'hydration' })
      await page.waitForLoadState('networkidle')
      expect(await page.locator('.feed .card .chip.session').count()).toBe(0)
    })
  })

  // A link inside the role="button" head must follow its own Enter instead of
  // toggling the card (the row's key handlers act only on the row itself).
  it('lets Enter on the Claude Code chip follow the link without toggling the card', async () => {
    await withRendered('/t/journal/current?maintainer', async (page) => {
      await page.route('https://claude.ai/**', (r) => r.fulfill({ status: 200, body: 'stub' }))
      const card = page.locator('.feed .card').filter({ has: page.locator('.chip.session') }).first()
      await card.locator('.chip.session').waitFor()
      await card.locator('.chip.session').focus()
      expect(await card.locator('.head').getAttribute('aria-expanded')).toBe('false')
      await page.keyboard.press('Enter')
      await page.waitForURL(SESSION_URL)
    })
  })

  // The sub pages are static segments beside `[...slug].vue`; each must win
  // that route, in every Space, and read only its own Space's collections.
  it('serves the Skills and Ideas & learnings pages in both Spaces', async () => {
    for (const space of ['current', 'archived']) {
      const skills = await $fetch(`/t/journal/${space}/skills`)
      expect(skills).toMatch(/class="jd[\s"]/)
      expect(skills).toContain('Platform Skills')
      expect(skills).not.toMatch(/No document at <code[\s>]/)
      const ideas = await $fetch(`/t/journal/${space}/ideas`)
      expect(ideas).toContain('Ideas &amp; learnings')
      expect(ideas).toContain('Learnings')
      expect(ideas).not.toMatch(/No document at <code[\s>]/)
    }
    const { ordinaryIdea } = currentSessionNotes()
    if (ordinaryIdea) expect(await $fetch('/t/journal/current/ideas')).toContain(ordinaryIdea)
  })

  it('hydrates the sub pages with no unresolved components', async () => {
    await expectCleanHydration('/t/journal/current/skills')
    await expectCleanHydration('/t/journal/current/ideas')
  })

  // When a real `external: true` session (ADR-0009 amendment) is currently
  // within the 7-day retention window, assert its card carries the
  // "external" marking (ribbon + `.card.external`) and an ordinary
  // session's card does not, so `SessionCardView.external` can't silently
  // default `true` for every card. External sessions are rare (only
  // created when a fork PR lands) and aren't exempt from the retention
  // sweep, so the positive half degrades to a no-op on a day with none in
  // `current` — the negative half (no false positive on an ordinary
  // session) still runs unconditionally.
  it('marks only the externally-authored session with the "external" ribbon', async () => {
    const html = await $fetch('/t/journal/current')
    const { external, ordinary } = currentSessionGoals()

    if (external) {
      expect(html).toContain('class="ribbon"')
      const externalGoalIdx = html.indexOf(external)
      expect(externalGoalIdx).toBeGreaterThan(-1)
      const externalCardStart = html.lastIndexOf('<article', externalGoalIdx)
      expect(html.slice(externalCardStart, externalGoalIdx)).toMatch(/class="card[^"]*\bexternal\b/)
    }

    const ownGoalIdx = html.indexOf(ordinary)
    expect(ownGoalIdx).toBeGreaterThan(-1)
    const ownCardStart = html.lastIndexOf('<article', ownGoalIdx)
    expect(html.slice(ownCardStart, ownGoalIdx)).not.toMatch(/class="card[^"]*\bexternal\b/)
  })

  // Digests expand inline on the landing (like the session cards): the body is
  // preloaded for zero-request expansion, and the standalone page route still works.
  it('shows daily digests inline and keeps the digest route', async () => {
    const newest = currentDigestDates().at(-1)!
    const html = await $fetch('/t/journal/current')
    expect(html).toContain('Daily digests')
    expect(html).toContain(digestBodySnippet(newest)) // the Digest body, preloaded inline
    const digest = await $fetch(`/t/journal/current/digests/${newest}`)
    expect(digest).toMatch(/<h1[ >]/) // the standalone route still renders
  })

  // Standalone Document pages (#25) must render in the journal theme via the
  // Tenant's own `[space]/[...slug]` override, NOT fall through to the Platform's
  // unstyled catch-all. Assert the `.jd` wrapper + breadcrumb are present so it
  // can't silently regress to the generic renderer.
  it('renders standalone journal documents in the Tenant theme', async () => {
    const newest = currentDigestDates().at(-1)!
    for (const url of ['/t/journal/current/architecture', `/t/journal/current/digests/${newest}`]) {
      const html = await $fetch(url)
      expect(html).toMatch(/class="jd[\s"]/) // themed wrapper, not system-ui catch-all
      expect(html).toContain('aria-label="Breadcrumb"')
      expect(html).toContain('jd-prose')
      expect(html).not.toMatch(/No document at <code[\s>]/)
    }
  })

  // The on-ramp pages chain into a short tour in the landing's card order.
  it('ends each on-ramp page with a numbered Read-next step', async () => {
    const first = await $fetch('/t/journal/current/architecture')
    expect(first).toContain('Start here · 1 of 5')
    expect(first).toMatch(/<a[^>]*href="\/t\/journal\/current\/how-it-works"[^>]*rel="next"|<a[^>]*rel="next"[^>]*href="\/t\/journal\/current\/how-it-works"/)
    const last = await $fetch('/t/journal/current/real-and-invented')
    expect(last).toContain('Start here · 5 of 5')
    expect(last).toContain('back to the Journal')
    const digest = await $fetch(`/t/journal/current/digests/${currentDigestDates().at(-1)!}`)
    expect(digest).not.toContain('Start here ·')
  })

  // The archived Space's Document routes are served by the SAME themed override
  // (not the generic catch-all) AND stay isolated: `/t/journal/archived/architecture`
  // has no document, so it renders a *themed* 404 and must not leak
  // `current`'s architecture body.
  it('serves archived Document routes themed and isolated', async () => {
    const res = await fetch('/t/journal/archived/architecture')
    expect(res.status).toBe(404)
    const html = await res.text()
    expect(html).toMatch(/class="jd[\s"]/) // themed override reaches archived
    expect(html).toContain('aria-label="Breadcrumb"')
    expect(html).toMatch(/No document at <code[\s>]/) // no such doc in archived
    expect(html).not.toContain('Nuxt Content fits this experiment') // did NOT leak current/architecture
  })

  // The archived Space dashboard must render cleanly on the same component
  // as `current` — no crash, no fallthrough to a not-found. Once
  // scripts/archive-journal-content.ts moves real sessions/digests in,
  // `archived` is no longer reliably empty, so this doesn't assert the
  // specific empty-state copy anymore (that would need a synthetic/mocked
  // fixture — this repo has no component-test infra for that yet).
  it('renders the archived Space dashboard without erroring', async () => {
    const html = await $fetch('/t/journal/archived')
    expect(html).toContain('Recent activity')
    expect(html).not.toContain('live snapshot') // archived is retired, not live
  })

  // `how-it-works`'s ```mermaid render coverage now lives in the platform-wide
  // sweep (`tests/e2e/smoke.spec.ts`, issue #469), not a hard-coded test here.
})
