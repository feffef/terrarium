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
// collapsing a digest reflows everything under it.
const SINGLE_COLUMN_WIDTH = 900
// A width comfortably inside the two-column regime, where the two columns share a
// grid row and the taller of them drives its height.
const TWO_COLUMN_WIDTH = 1280

// Above the breakpoint the band's height driver is whichever column is taller,
// and that is a property of the day's content, not of the layout: the Sparks feed
// is windowed to the last SPARK_FEED_DAYS days and capped at SPARK_FEED_LIMIT
// ideas, so it swings from a single row on a quiet window to fifteen wrapped rows
// several times the digests column's height on a busy one. Both directions are
// routinely reachable, which is why nothing here asserts one of them (issue #906,
// after issue #760 pinned Sparks as the driver and ordinary `/digest` runs kept
// flipping it back).
//
// The desktop pin path still needs deterministic coverage, so the guard below
// CONSTRUCTS the only regime in which there is anything to pin — digests taller,
// so collapsing one reflows the content under the band — instead of waiting for
// the content to land that way. Bounding the Sparks column is the smallest lever
// that does it: the column stays in flow and sticky, so the real desktop grid
// (two tracks, `align-items: start`, sticky col 2) is what gets exercised.
// `!important` is required — the SFC's scoped rule carries a `[data-v-…]`
// attribute selector on top of the same two classes, so it outranks a plain
// injected rule.
const FORCE_DIGESTS_DRIVE_BAND
  = '.digests-sparks .sparks { max-height: 120px !important; overflow: hidden !important }'

interface BandGeometry {
  /** The whole `.digests-sparks` band — one grid row, so this is the row height. */
  band: number
  digests: number
  sparks: number
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
        // Opening a session card must collapse the open digest. Click the head
        // via its `.goal` heading — never `.head` itself: a real click aims at
        // the target's bounding-box CENTER, and the head's center is content-
        // shaped — one session log with enough PR chips and skill names wrapped
        // `.foot` tall enough that the center landed on a PR chip, whose
        // @click.stop suppressed the toggle and navigated the page to GitHub,
        // redding the gate as a silent 30s timeout (issue #768). `.goal` is
        // schema-required on every card and never interactive.
        const head = page.locator('.feed .card .head').first()
        await head.locator('.goal').click()
        // Fail fast and attributably if the click ever stops toggling again:
        // the toggle flips aria-expanded on the head within a frame, and a
        // click that landed on a link navigates the page off the route.
        await expect.poll(() => head.getAttribute('aria-expanded')).toBe('true')
        expect(
          new URL(page.url()).pathname,
          'the head click navigated the page instead of toggling the card (issue #768)',
        ).toBe(route)
        await page.locator('.feed .card .detail').first().waitFor({ state: 'visible' })
        await expect.poll(() => page.locator('.digest-body').count()).toBe(0)
        expect(await page.locator('.feed .card.open').count()).toBe(1)
        expect(errors, `console/page errors on ${route}:\n${errors.join('\n')}`).toEqual([])
      } finally {
        await page.close()
      }
    })

    // The regression guard for issue #768's actual mechanism. What looked like
    // "an oversized log's card never renders its detail" was the accordion
    // test's real click landing on content: a click aims at its target's
    // bounding-box center, the head's center position is a function of how the
    // log's PR chips and skill names wrap, and for one 11.3KB log it fell on a
    // PR chip — a link that swallows the toggle (@click.stop) and navigates
    // away. The expand transition itself handles a panel that tall (both
    // scroll-pin tests open the same card and its detail becomes visible).
    //
    // So the guard is not "an oversized document opens" — any document opens
    // once the click lands on the toggle — but that the designated click
    // target (`.goal`) stays hit-testable on EVERY card in the live feed, no
    // matter what shape future logs take. Playwright's own click hit-test is
    // reproduced per card (scroll to it, elementFromPoint at the goal's
    // center), so a card whose goal a link or overlay would intercept fails
    // here by name instead of as a silent 30s waitFor timeout.
    it('keeps every session card head clickable at its goal, whatever the log size (issue #768)', async () => {
      const route = '/t/journal/current'
      const { page, errors } = await renderAndCollectErrors(route)
      try {
        expect(await page.locator('.feed .card .head .goal').count()).toBeGreaterThan(0)
        const intercepted = await page.evaluate(() => {
          const bad: string[] = []
          for (const goal of document.querySelectorAll('.feed .card .head .goal')) {
            goal.scrollIntoView({ block: 'center' })
            const r = goal.getBoundingClientRect()
            const at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
            if (at !== goal && !goal.contains(at)) {
              const card = goal.closest('.card')
              bad.push(`${card?.id ?? '(no id)'}: goal center hits <${at?.tagName.toLowerCase()} class="${(at as HTMLElement | null)?.className ?? ''}">`)
            }
          }
          return bad
        })
        expect(intercepted, `cards whose toggle target is covered:\n${intercepted.join('\n')}`).toEqual([])
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
    // The test proves the scenario exists rather than assuming it: it measures how
    // far the collapse moved the card in DOCUMENT space (which no counter-scroll
    // can hide) and fails unless that clears DOUBLE the tolerance, i.e. if a
    // passing run would prove nothing (issue #750). Double, not 1×, so the premise
    // and the hold can't both be satisfied marginally — at 1× a displacement a
    // pixel over tolerance would satisfy the premise while a fully-broken pin
    // missed the hold by a pixel. The real displacement is several hundred px, so
    // the margin is ample.
    async function expectSiblingCollapseHeld(
      width: number,
      bandStyle?: string,
    ): Promise<void> {
      const route = '/t/journal/current'
      const { page, errors } = await renderAndCollectErrors(route)
      try {
        await page.setViewportSize({ width, height: 720 })
        await page.addStyleTag({ content: DISABLE_SCROLL_ANCHORING })
        if (bandStyle) await page.addStyleTag({ content: bandStyle })
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
          `premise no longer holds at ${width}px: the sibling's collapse displaced the card by only ${displacement}px, `
          + `not clear of the ±${HOLD_TOLERANCE_PX}px tolerance by the required margin (need >${2 * HOLD_TOLERANCE_PX}px) `
          + `— this guard would pass, or all but pass, with the pin removed. The digests column must drive its own `
          + `height for a collapse to reflow anything below it${evidence}`,
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
    }

    // Below the breakpoint the band is one column, so the digests column drives its
    // own height unconditionally and the scenario is the page's real behaviour.
    it('holds the clicked item at its pre-click position when a sibling above it collapses', async () => {
      await expectSiblingCollapseHeld(SINGLE_COLUMN_WIDTH)
    })

    // The same hold in the two-column desktop layout, whose sticky second column and
    // shared grid row are a genuinely different reflow path from the stacked one
    // above — and one the pin used to have no coverage of at all (issue #760).
    //
    // Whether a collapse displaces anything here depends on which column is taller,
    // which is a daily property of the content rather than of the layout (see
    // FORCE_DIGESTS_DRIVE_BAND). So this constructs the case that has something to
    // pin instead of depending on the day: bound Sparks, and digests drives. When
    // live content puts Sparks on top instead, a digest expands into existing slack
    // and nothing moves — no bug, and nothing for the pin to do. Both regimes are
    // therefore correct, which is exactly what issue #906 replaced #760's
    // "Sparks must stay the driver" invariant with.
    it('holds the clicked item when a sibling collapses in the two-column desktop band', async () => {
      await expectSiblingCollapseHeld(TWO_COLUMN_WIDTH, FORCE_DIGESTS_DRIVE_BAND)
    })

    // The desktop guard above is only worth its runtime if it runs in the real
    // two-column regime — a moved breakpoint or a renamed column class would leave
    // it silently duplicating the single-column one, or bounding nothing. Assert
    // the shape it assumes, with the same fixture applied.
    it('exercises the desktop pin guard against the real two-column band', async () => {
      const route = '/t/journal/current'
      const { page, errors } = await renderAndCollectErrors(route)
      try {
        await page.setViewportSize({ width: TWO_COLUMN_WIDTH, height: 720 })
        await page.addStyleTag({ content: FORCE_DIGESTS_DRIVE_BAND })
        const band = await bandGeometryOf(page)
        const evidence = `\n${JSON.stringify(band, null, 2)}`

        expect(
          band.gridTemplateColumns.split(' ').length,
          `the band is not two-column at ${TWO_COLUMN_WIDTH}px, so the desktop guard is testing the stacked `
          + `layout the ${SINGLE_COLUMN_WIDTH}px one already covers${evidence}`,
        ).toBe(2)
        expect(
          band.alignItems,
          `the columns are stretched to equal heights, so neither drives the row and bounding Sparks cannot `
          + `create the displacement the desktop guard needs${evidence}`,
        ).toBe('start')
        expect(
          band.digests - band.sparks,
          `FORCE_DIGESTS_DRIVE_BAND no longer makes digests the taller column — check that its selector still `
          + `matches the Sparks column and still outranks the SFC's scoped rule${evidence}`,
        ).toBeGreaterThan(0)
        expect(
          band.band - band.digests,
          `the band is taller than both its columns, so neither drives it and a collapse would reflow nothing`
          + `${evidence}`,
        ).toBeLessThan(1)
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
