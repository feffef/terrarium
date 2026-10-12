// L2 e2e for the journal Tenant's page-wide accordion: one open item across both
// feeds, the scroll-pin hold, and the URL-hash deep link. Split from
// journal.spec.ts so the two run in parallel; serves the gate's build via
// `setupL2()` and never builds (tests/README.md).
import { describe, expect, it } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import { setupL2, withRendered } from '../../../../tests/support/e2e.ts'
import { PIN_SETTLED_EVENT } from '../../app/utils/expandTransition.ts'
import type { PinRecord } from '../../app/utils/expandTransition.ts'
import { currentDigestDates } from './journal-support.ts'

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

describe('journal Tenant', async () => {
  await setupL2()

  // Both feeds are one page-wide accordion: opening a session card collapses an
  // already-open digest (and vice versa), so at most one item is ever expanded.
  it('keeps a single item open across both feeds (accordion)', async () => {
    const route = '/t/journal/current'
    await withRendered(route, async (page) => {
      // The digest body ships only in the useAsyncData payload until a click mounts
      // it (the accordion defaults closed), so a real click must make it visible.
      expect(await page.locator('.digest-body').count()).toBe(0) // collapsed: not mounted
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
    })
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
    await withRendered(route, async (page) => {
      expect(await page.locator('.feed .card .head .goal').count()).toBeGreaterThan(0)
      const intercepted = await page.evaluate(() => {
        const bad: string[] = []
        for (const goal of document.querySelectorAll('.feed .card .head .goal')) {
          // Recent activity collapses to the newest 10 by default (v-show,
          // not v-if, so a collapsed card still ships in SSR HTML) — its
          // goal is offscreen/zero-size until "Show all" is clicked, so it
          // has no meaningful hit-test target yet and isn't this guard's concern.
          if ((goal.closest('.card') as HTMLElement | null)?.offsetParent === null) continue
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
    })
  })

  // Opening an item must not move it on screen: the click didn't move the
  // user's eye, so the item they just acted on shouldn't jump. Park a card
  // mid-viewport (nothing else is open, so nothing above it can reflow when
  // it opens its own body below itself) and assert its top holds.
  it('holds a newly opened item at its pre-click viewport position', async () => {
    const route = '/t/journal/current'
    await withRendered(route, async (page) => {
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
    })
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
  it('holds the clicked item at its pre-click position when a sibling above it collapses', async () => {
    const route = '/t/journal/current'
    await withRendered(route, async (page) => {
      await page.setViewportSize({ width: 900, height: 720 })
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
        + `— this guard would pass, or all but pass, with the pin removed${evidence}`,
      ).toBeGreaterThan(2 * HOLD_TOLERANCE_PX)
      expect(pin.scrolls, `the pin issued no counter-scroll, so nothing was compensated${evidence}`)
        .toBeGreaterThan(0)
      expect(pin.clipped, `a counter-scroll target was clamped at the page top — park the card deeper${evidence}`)
        .toBe(false)
      expect(after.top, `card did not hold its position${evidence}`).toBeGreaterThan(before.top - HOLD_TOLERANCE_PX)
      expect(after.top, `card did not hold its position${evidence}`).toBeLessThan(before.top + HOLD_TOLERANCE_PX)
    })
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
    await withRendered(route, async (page) => {
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
    })
  })

  // The open item is mirrored to the URL hash so it can be shared, and the hash
  // clears when the item is collapsed — the two halves of the deep-link contract.
  it('mirrors the open item to the URL hash and clears it on collapse', async () => {
    const route = '/t/journal/current'
    await withRendered(route, async (page) => {
      const firstRow = page.locator('.digest .drow').first()
      await firstRow.click()
      await page.locator('.digest-body').first().waitFor({ state: 'visible' })
      await expect.poll(() => page.evaluate(() => location.hash)).toMatch(/^#digest-/)
      await firstRow.click() // collapse
      await expect.poll(() => page.evaluate(() => location.hash)).toBe('')
    })
  })
})
