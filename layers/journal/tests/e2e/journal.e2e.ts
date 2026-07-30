// L2 e2e assertions specific to the **journal** Tenant — its custom Space
// dashboard, inline session/digest disclosures, themed Document routes, and
// archived-Space isolation. These are the journal-only half of the smoke gate;
// the cross-Tenant entry-route sweep stays in `tests/e2e/smoke.spec.ts`.
//
// This is NOT a standalone spec (no `.spec.ts` suffix). It exports a `register`
// function that the platform smoke spec calls INSIDE its single `describe`, so
// these tests share the one `setup()`/Nuxt build the smoke spec owns. Do NOT
// promote this to its own `*.e2e.spec.ts`: a second spec file re-runs `setup()`
// → another full `nuxt build`, multiplying the gate's slowest step per Tenant
// (ADR-0004 amendment; tests/README.md).
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseYaml } from 'yaml'
import { describe, expect, it } from 'vitest'
import { $fetch } from '@nuxt/test-utils/e2e'
import type { Locator, Page } from 'playwright-core'
import { expectCleanHydration } from '../../../../tests/support/e2e.ts'
import type { renderAndCollectErrors } from '../../../../tests/support/e2e.ts'
import { DIGESTS_DIR, SESSIONS_DIR } from '../../../../scripts/digest.ts'
import { PIN_SETTLED_EVENT } from '../../app/utils/expandTransition.ts'
import type { PinRecord } from '../../app/utils/expandTransition.ts'

// The `current` Space's Digest dates, oldest first — read live rather than
// hardcoded so these assertions stay valid regardless of which dates
// scripts/archive-journal-content.ts has moved out to `archived` (issue: the
// retention sweep ages a hardcoded date like 2026-07-04 out of `current` over
// time).
const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url))
function currentDigestDates(): string[] {
  return readdirSync(join(repoRoot, DIGESTS_DIR))
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
    .map((f) => f.slice(0, -'.md'.length))
    .sort()
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
  const dir = join(repoRoot, SESSIONS_DIR)
  let external: string | undefined
  let ordinary: string | undefined
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.yml'))) {
    const raw = parseYaml(readFileSync(join(dir, f), 'utf8')) as Record<string, unknown>
    const goal = String(raw?.goal ?? '')
    if (!goal) continue
    if (raw?.external === true) external ??= goal
    else ordinary ??= goal
    if (external && ordinary) break
  }
  if (!ordinary) throw new Error('journal.e2e: no ordinary session found in current to assert the ribbon is absent from')
  return { external, ordinary }
}

/** A short, distinctive run of plain prose from a Digest's BODY (never its
 *  frontmatter `summary`, which the collapsed row already shows) — proves the
 *  body specifically preloads inline, not just the row's own headline. */
function digestBodySnippet(date: string): string {
  const raw = readFileSync(join(repoRoot, DIGESTS_DIR, `${date}.md`), 'utf8')
  const body = raw.replace(/^---[\s\S]*?---\s*/, '').replace(/^#.*\n+/, '')
  const firstParagraph = (body.split(/\n\s*\n/)[0] ?? '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  const snippet = firstParagraph.replace(/\s+/g, ' ').trim().split(' ').slice(0, 6).join(' ')
  if (snippet.length < 15) throw new Error(`journal.e2e: could not extract a body snippet for digest ${date}`)
  return snippet
}

export interface JournalE2EContext {
  entryRoutes: string[]
  renderAndCollectErrors: typeof renderAndCollectErrors
}

/** Open `control`, wait for `readyFor` to become visible, and return what the app's
 *  scroll-pin did.
 *
 *  Deep on purpose: arming the one-shot PIN_SETTLED_EVENT listener, dispatching the
 *  open, and reading the record back are one indivisible step, so an open that starts
 *  a pin nobody waits out is not expressible here — including one done only as setup.
 *  A pin still running from an earlier open keeps counter-scrolling the page (moving a
 *  baseline measured under it) and fires the settle event a later open's listener is
 *  waiting on; that cross-talk is the mechanism behind #750's ~2800px failure.
 *
 *  Awaiting the event beats polling a timeout (issue #450), and its record makes an
 *  intermittent failure attributable from CI output alone (issue #750) — hence arming
 *  before the open that fires it. The open is a dispatched event, not `locator.click()`:
 *  click() auto-scrolls the target into view, shifting the card before the app reads its
 *  pin baseline where no scroll anchoring absorbs it (issue #450;
 *  docs/agents/verifying-ui-changes.md — click auto-scroll), and a real click also
 *  focuses the control, whose focus-scroll lands asynchronously (issue #750). */
type PinSettledWindow = Window & { __pinSettled?: Promise<PinRecord> }
async function openAndAwaitPin(page: Page, control: Locator, readyFor: Locator): Promise<PinRecord> {
  await page.evaluate((event) => {
    const w = window as PinSettledWindow
    w.__pinSettled = new Promise((resolve) => {
      window.addEventListener(event, (e) => resolve((e as CustomEvent<PinRecord>).detail), { once: true })
    })
  }, PIN_SETTLED_EVENT)
  await control.dispatchEvent('click')
  await readyFor.waitFor({ state: 'visible' })
  return page.evaluate(() => (window as PinSettledWindow).__pinSettled!)
}

// The tolerance the "held its position" assertions allow, and the viewport offset
// the clicked item is parked at before the click. Note the direction: the pin
// counter-scrolls UP when content above the item collapses, and `scrollY` is
// `docTop - PARK_TOP_PX` — so a LARGER park top leaves LESS upward headroom, not
// more. 600 is just a reproducible mid-viewport resting place; that the headroom
// was actually sufficient is asserted directly, by `pin.clipped === false`.
const HOLD_TOLERANCE_PX = 15
const PARK_TOP_PX = 600
// `window.scrollTo` lands on a whole device pixel, so a park computed from a
// fractional element offset settles a sub-pixel away from its target.
const PARK_PRECISION_PX = 2

// Below the digests+Sparks band's two-column breakpoint (see the `.digests-sparks`
// media queries) the digests column is the sole driver of its own height, so
// collapsing a digest reflows everything under it. Above the breakpoint the taller
// Sparks column sets the row height and a digest expands into existing slack,
// displacing nothing — which is what made the sibling-collapse guard vacuous at the
// gate's default 1280x720 viewport (issue #750).
const SINGLE_COLUMN_WIDTH = 900
// A width comfortably inside the two-column regime, for the guard that asserts
// WHICH column drives the band there (issue #760).
const TWO_COLUMN_WIDTH = 1280

interface BandGeometry {
  /** The whole `.digests-sparks` band — one grid row, so this is the row height. */
  band: number
  digests: number
  sparks: number
  /** The tallest collapsed digest row: how much one more digest day would add. */
  tallestDigestRow: number
  gridTemplateColumns: string
  alignItems: string
}
function bandGeometryOf(page: Page): Promise<BandGeometry> {
  return page.evaluate(() => {
    const band = document.querySelector('.digests-sparks')!
    const heightOf = (selector: string) => band.querySelector(selector)!.getBoundingClientRect().height
    const style = getComputedStyle(band)
    return {
      band: band.getBoundingClientRect().height,
      digests: heightOf(':scope > .digests'),
      sparks: heightOf(':scope > .sparks'),
      tallestDigestRow: Math.max(
        ...[...band.querySelectorAll(':scope > .digests .digest')].map((r) => r.getBoundingClientRect().height),
      ),
      gridTemplateColumns: style.gridTemplateColumns,
      alignItems: style.alignItems,
    }
  })
}

// Chromium's own scroll anchoring also absorbs a collapse above the clicked item,
// and it gets there first — with it on, the item holds its position whether or not
// `pinTopAcrossTransition` scrolls at all, so the guard cannot tell a working pin
// from a removed one. Opting the document out isolates the app's counter-scroll,
// which is the only thing that holds the item in the cases anchoring does not
// cover — and is what this test exists to guard (issue #750).
//
// The residual gap that buys, stated plainly: the sibling-collapse guard no longer
// asserts the end-to-end outcome in the browser configuration the gate itself runs
// (anchoring on). A regression that breaks the hold ONLY when anchoring is active —
// the pin over-correcting and fighting the anchor — would go uncaught here. That is
// hard to construct, because the pin is closed-loop (it re-measures the residual
// every frame, so it no-ops once anchoring has absorbed the collapse rather than
// double-correcting), but it is a real cost, not a free win.
const DISABLE_SCROLL_ANCHORING = '* { overflow-anchor: none }'

interface ItemGeometry {
  /** The item's top edge relative to the viewport. */
  top: number
  /** The item's top edge relative to the document — moves only when content above it reflows. */
  docTop: number
  scrollY: number
}
function geometryOf(page: Page, id: string): Promise<ItemGeometry> {
  return page.evaluate((itemId) => {
    const { top } = document.getElementById(itemId)!.getBoundingClientRect()
    return { top, docTop: top + window.scrollY, scrollY: window.scrollY }
  }, id)
}

/** Everything needed to attribute a scroll-pin failure to a mechanism from CI
 *  output alone, with no local repro (issue #750): where the page and the item
 *  were before and after, how far the sibling collapsed, and what the pin did. */
function pinEvidence(facts: {
  before: ItemGeometry
  after: ItemGeometry
  pin: PinRecord
  siblingHeight?: number
  displacement?: number
}): string {
  return `\n${JSON.stringify(facts, null, 2)}`
}

/** Scroll the item's top edge to `top` in one explicit step — no alignment pass
 *  whose outcome depends on how much of the element Chromium finds out of view. */
function parkItemAt(page: Page, id: string, top: number): Promise<void> {
  return page.evaluate(([itemId, parkTop]) => {
    const el = document.getElementById(itemId as string)!
    window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - (parkTop as number))
  }, [id, top] as const)
}

/** Register the journal Tenant's L2 assertions under the caller's active suite. */
export function registerJournalE2E({ entryRoutes, renderAndCollectErrors }: JournalE2EContext): void {
  describe('journal Tenant', () => {
    // The journal Tenant's layer replaces the generic Space landing with an
    // overview dashboard (state + recent activity + Skill Inventory).
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
        expect(html).toContain('class="jd"') // themed wrapper, not system-ui catch-all
        expect(html).toContain('aria-label="Breadcrumb"')
        expect(html).toContain('jd-prose')
        expect(html).not.toContain('No document at')
      }
    })

    // The entry-route sweep in `tests/e2e/smoke.spec.ts` only reaches the Space
    // landing (`/t/journal/<space>`) — a standalone Document is a deeper route
    // the sweep never visits. Cover one representative Document here so a
    // typo'd/renamed auto-import component on that page can't ship silently
    // (issue #212).
    it('hydrates a standalone document with no unresolved components', async () => {
      await expectCleanHydration('/t/journal/current/architecture')
    })

    // The archived Space's Document routes are served by the SAME themed override
    // (not the generic catch-all) AND stay isolated: `/t/journal/archived/architecture`
    // has no document, so it renders a *themed* not-found and must not leak
    // `current`'s architecture body.
    it('serves archived Document routes themed and isolated', async () => {
      const html = await $fetch('/t/journal/archived/architecture')
      expect(html).toContain('class="jd"') // themed override reaches archived
      expect(html).toContain('aria-label="Breadcrumb"')
      expect(html).toContain('No document at') // no such doc in archived
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
      expect(html).not.toContain('No document at')
    })

    // `how-it-works`'s ```mermaid render coverage now lives in the platform-wide
    // sweep (`tests/e2e/smoke.spec.ts`, issue #469), not a hard-coded test here.

    // ── Tier 2: interaction — expand-on-click renders in the live DOM ──────────
    // The digest body ships only in the useAsyncData payload until a click mounts
    // it (the accordion defaults closed) — this is precisely the case the SSR-string
    // "went from empty repo" check above CANNOT prove renders. Click a real row
    // and assert the body becomes *visible* in the DOM.
    it('expands a journal digest on click (live DOM, not payload)', async () => {
      const route = '/t/journal/current'
      expect(entryRoutes).toContain(route)
      const { page, errors } = await renderAndCollectErrors(route)
      try {
        const firstRow = page.locator('.digest .drow').first()
        expect(await firstRow.count()).toBeGreaterThan(0)
        expect(await page.locator('.digest-body').count()).toBe(0) // collapsed: not mounted
        await firstRow.click()
        const body = page.locator('.digest-body').first()
        await body.waitFor({ state: 'visible' })
        expect(await body.isVisible()).toBe(true)
        expect(errors, `console/page errors on ${route}:\n${errors.join('\n')}`).toEqual([])
      } finally {
        await page.close()
      }
    })

    // Both feeds are one page-wide accordion: opening a session card collapses an
    // already-open digest (and vice versa), so at most one item is ever expanded.
    it('keeps a single item open across both feeds (accordion)', async () => {
      const route = '/t/journal/current'
      const { page, errors } = await renderAndCollectErrors(route)
      try {
        await page.locator('.digest .drow').first().click()
        await page.locator('.digest-body').first().waitFor({ state: 'visible' })
        expect(await page.locator('.digest-body').count()).toBe(1)
        // Opening a session card must collapse the open digest.
        await page.locator('.feed .card .head').first().click()
        await page.locator('.feed .card .detail').first().waitFor({ state: 'visible' })
        await expect.poll(() => page.locator('.digest-body').count()).toBe(0)
        expect(await page.locator('.feed .card.open').count()).toBe(1)
        expect(errors, `console/page errors on ${route}:\n${errors.join('\n')}`).toEqual([])
      } finally {
        await page.close()
      }
    })

    // Opening an item must not move it on screen: the click didn't move the
    // user's eye, so the item they just acted on shouldn't jump. Park a card
    // mid-viewport (nothing else is open, so nothing above it can reflow when
    // it opens its own body below itself) and assert its top holds.
    it('holds a newly opened item at its pre-click viewport position', async () => {
      const route = '/t/journal/current'
      const { page, errors } = await renderAndCollectErrors(route)
      try {
        const card = page.locator('.feed .card').first()
        const id = (await card.getAttribute('id'))!
        // Park the card deep in the viewport, then measure `before` (openAndAwaitPin
        // opens without a scroll, so it matches the app's pin baseline).
        await parkItemAt(page, id, PARK_TOP_PX)
        const before = await geometryOf(page, id)
        // With no sibling reflowing above it, opening must leave the card's top put.
        const pin = await openAndAwaitPin(
          page,
          card.locator('.head'),
          page.locator('.feed .card.open .detail').first(),
        )
        const after = await geometryOf(page, id)
        const evidence = pinEvidence({ before, after, pin })

        expect(Math.abs(before.top - PARK_TOP_PX), `park was not reproducible${evidence}`)
          .toBeLessThan(PARK_PRECISION_PX)
        // Precondition: this case's whole point is that nothing above the card
        // moves, so the card's own document offset must be unchanged.
        expect(Math.abs(after.docTop - before.docTop), `content above the card reflowed${evidence}`)
          .toBeLessThan(1)
        expect(after.top, `card did not hold its position${evidence}`).toBeGreaterThan(before.top - HOLD_TOLERANCE_PX)
        expect(after.top, `card did not hold its position${evidence}`).toBeLessThan(before.top + HOLD_TOLERANCE_PX)
        expect(errors, `console/page errors on ${route}:\n${errors.join('\n')}`).toEqual([])
      } finally {
        await page.close()
      }
    })

    // The accordion is one-at-a-time, so opening this session card collapses an
    // already-open digest ABOVE it, shrinking the page above the card. Assert the
    // just-clicked card's own top still holds at its pre-click position — the
    // sibling's collapse is exactly what the counter-scroll must absorb.
    //
    // The scenario only exists below the single-column breakpoint, and the test
    // proves it holds rather than assuming it: it measures how far the collapse
    // moved the card in DOCUMENT space (which no counter-scroll can hide) and
    // fails unless that clears DOUBLE the tolerance, i.e. if a passing run would
    // prove nothing (issue #750). Double, not 1×, so the premise and the hold
    // can't both be satisfied marginally — at 1× a displacement a pixel over
    // tolerance would satisfy the premise while a fully-broken pin missed the
    // hold by a pixel. The real displacement is ~318px, so the margin is ample.
    it('holds the clicked item at its pre-click position when a sibling above it collapses', async () => {
      const route = '/t/journal/current'
      const { page, errors } = await renderAndCollectErrors(route)
      try {
        await page.setViewportSize({ width: SINGLE_COLUMN_WIDTH, height: 720 })
        await page.addStyleTag({ content: DISABLE_SCROLL_ANCHORING })
        // Setup: open the digest that will later collapse. This open starts a pin of
        // its own, which openAndAwaitPin waits out before anything below is measured.
        await openAndAwaitPin(
          page,
          page.locator('.digest .drow').first(),
          page.locator('.digest-body').first(),
        )

        const card = page.locator('.feed .card').first()
        const id = (await card.getAttribute('id'))!
        const siblingHeight = await page.evaluate(() => {
          const clip = document.querySelector('.digest-body-clip')
          return clip ? clip.getBoundingClientRect().height : 0
        })
        // Park deep in the viewport, measure `before` — opened without a scroll,
        // see the previous test.
        await parkItemAt(page, id, PARK_TOP_PX)
        const before = await geometryOf(page, id)
        // The pin settles only after both this card's expand and the sibling's
        // collapse above it finish — so waiting on it also waits out the reflow.
        const pin = await openAndAwaitPin(
          page,
          card.locator('.head'),
          page.locator('.feed .card.open .detail').first(),
        )
        await page.locator('.digest-body').first().waitFor({ state: 'detached' })
        expect(await page.locator('.digest-body').count()).toBe(0) // sibling digest collapsed
        const after = await geometryOf(page, id)
        // How far the collapse moved the card with no counter-scroll applied.
        const displacement = before.docTop - after.docTop
        const evidence = pinEvidence({ before, after, pin, siblingHeight, displacement })

        expect(Math.abs(before.top - PARK_TOP_PX), `park was not reproducible${evidence}`)
          .toBeLessThan(PARK_PRECISION_PX)
        expect(
          displacement,
          `premise no longer holds: the sibling's collapse displaced the card by only ${displacement}px, `
          + `not clear of the ±${HOLD_TOLERANCE_PX}px tolerance by the required margin (need >${2 * HOLD_TOLERANCE_PX}px) `
          + `— this guard would pass, or all but pass, with the pin removed. `
          + `Restore a layout where the digests column drives its own height (see SINGLE_COLUMN_WIDTH)${evidence}`,
        ).toBeGreaterThan(2 * HOLD_TOLERANCE_PX)
        expect(pin.scrolls, `the pin issued no counter-scroll, so nothing was compensated${evidence}`)
          .toBeGreaterThan(0)
        expect(pin.clipped, `a counter-scroll target was clamped at the page top — park the card deeper${evidence}`)
          .toBe(false)
        expect(after.top, `card did not hold its position${evidence}`).toBeGreaterThan(before.top - HOLD_TOLERANCE_PX)
        expect(after.top, `card did not hold its position${evidence}`).toBeLessThan(before.top + HOLD_TOLERANCE_PX)
        expect(errors, `console/page errors on ${route}:\n${errors.join('\n')}`).toEqual([])
      } finally {
        await page.close()
      }
    })

    // The other half of the guard above: that one runs below the breakpoint
    // because ABOVE it the Sparks column is the taller one, so a digest expands
    // into existing slack and displaces nothing. Issue #760 accepted that as the
    // layout's real behaviour rather than restoring #597's digests-drives-the-row
    // invariant — at desktop width collapsing a digest moves nothing, so there is
    // genuinely nothing for the scroll-pin to hold, and the absence of desktop pin
    // coverage is correct rather than a gap.
    //
    // What #760 did NOT accept is leaving that unmonitored. Which column is taller
    // depends on content volume, so if Sparks ever shrinks below digests the driver
    // flips back, collapsing a digest starts displacing content at desktop width
    // again, and the desktop pin path becomes live AND untested — silently, because
    // nothing else here would notice. This guard turns that drift into a failure.
    it('keeps Sparks the driver of the digests+Sparks band height at desktop width', async () => {
      const route = '/t/journal/current'
      const { page, errors } = await renderAndCollectErrors(route)
      try {
        await page.setViewportSize({ width: TWO_COLUMN_WIDTH, height: 720 })
        const band = await bandGeometryOf(page)
        const evidence = `\n${JSON.stringify(band, null, 2)}`
        const headroom = band.sparks - band.digests

        // Preconditions: with one track the columns are stacked, and with stretched
        // items they are equal by force — either way the comparison below is vacuous.
        expect(
          band.gridTemplateColumns.split(' ').length,
          `the band is not two-column at ${TWO_COLUMN_WIDTH}px, so it has no height-driver to assert${evidence}`,
        ).toBe(2)
        expect(
          band.alignItems,
          `the columns are stretched, so their heights say nothing about which one drives the row${evidence}`,
        ).toBe('start')

        expect(
          headroom,
          `the band's height driver has FLIPPED BACK to digests at ${TWO_COLUMN_WIDTH}px: `
          + `digests is ${band.digests}px against Sparks' ${band.sparks}px. Collapsing a digest now displaces `
          + `the content below it at desktop width again, and the scroll-pin that absorbs that is only exercised `
          + `at ${SINGLE_COLUMN_WIDTH}px (the guard above) — so the desktop pin path is live and untested. `
          + `Read issue #760 before relaxing this${evidence}`,
        ).toBeGreaterThan(0)
        expect(
          band.band - band.sparks,
          `the band is taller than both its columns, so neither drives it — this layout no longer works the way `
          + `issue #760's decision assumed${evidence}`,
        ).toBeLessThan(1)
        // Fire before the flip, not at it: one more digest day's worth of growth
        // must still leave Sparks the taller column.
        expect(
          headroom,
          `Sparks leads digests by only ${headroom}px at ${TWO_COLUMN_WIDTH}px — less than one more digest row `
          + `(${band.tallestDigestRow}px), so the next digest flips the band's height driver back. `
          + `See issue #760 for what flips with it${evidence}`,
        ).toBeGreaterThan(band.tallestDigestRow)
        expect(errors, `console/page errors on ${route}:\n${errors.join('\n')}`).toEqual([])
      } finally {
        await page.close()
      }
    })

    // Deep-linking: loading the page with an item's anchor as the URL hash opens
    // that item on the client (the server never sees the fragment) AND scrolls it
    // into the viewport. Targets the oldest Digest still on `current` (read live,
    // not hardcoded — scripts/archive-journal-content.ts ages old dates out) —
    // it's last in the list, so it's below the fold on load, and the assertion
    // that `window.scrollY` actually moved proves the target genuinely needed
    // scrolling rather than being coincidentally already visible. The `<li>`'s id
    // is the anchor, so the deep-linked digest body is scoped by id here.
    it('opens the item named in the URL hash on load and scrolls it into view (deep-link)', async () => {
      const oldest = currentDigestDates()[0]!
      const anchorId = `digest-${oldest}`
      const route = `/t/journal/current#${anchorId}`
      const { page, errors } = await renderAndCollectErrors(route)
      try {
        const body = page.locator(`#${anchorId} .digest-body`)
        await body.waitFor({ state: 'visible' })
        expect(await body.isVisible()).toBe(true)
        // Poll past the (async, possibly animated) scroll: the row's top edge
        // must settle within the viewport.
        await expect
          .poll(() =>
            page.evaluate((id) => {
              const el = document.getElementById(id)
              if (!el) return false
              const { top } = el.getBoundingClientRect()
              return top >= 0 && top <= window.innerHeight
            }, anchorId),
          )
          .toBe(true)
        // The target must have genuinely required scrolling — otherwise this
        // test would silently stop exercising the scroll-into-view behavior it
        // exists to cover (e.g. if a future retention change left `current`
        // with so few digests the oldest is already visible on load).
        expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
        expect(errors, `console/page errors on ${route}:\n${errors.join('\n')}`).toEqual([])
      } finally {
        await page.close()
      }
    })

    // The open item is mirrored to the URL hash so it can be shared, and the hash
    // clears when the item is collapsed — the two halves of the deep-link contract.
    it('mirrors the open item to the URL hash and clears it on collapse', async () => {
      const route = '/t/journal/current'
      const { page, errors } = await renderAndCollectErrors(route)
      try {
        const firstRow = page.locator('.digest .drow').first()
        await firstRow.click()
        await page.locator('.digest-body').first().waitFor({ state: 'visible' })
        await expect.poll(() => page.evaluate(() => location.hash)).toMatch(/^#digest-/)
        await firstRow.click() // collapse
        await expect.poll(() => page.evaluate(() => location.hash)).toBe('')
        expect(errors, `console/page errors on ${route}:\n${errors.join('\n')}`).toEqual([])
      } finally {
        await page.close()
      }
    })
  })
}
