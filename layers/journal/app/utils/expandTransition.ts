// Vue <Transition> JS hooks (used with `:css="false"`) that grow/shrink a
// disclosure panel's outer clip wrapper by its own natural height, read from
// `scrollHeight` at animation start — no height needs to be known ahead of
// time. Shared by the digest and session-card inline disclosures (the Space
// landing + SessionCard.vue) so the "quick" duration/easing stay single-homed.
// The wrapper carries no padding/margin/border of its own (that lives on the
// inner content div it clips) — animating only `height` on a plain box avoids
// the extra work of also animating padding to reach a true zero size.
//
// This module also owns `pinTopAcrossTransition` (below) — the counter-scroll
// that keeps a just-opened item visually put while these height transitions
// play — so every moving part of the open animation stays single-homed here.
const DURATION_MS = 160

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function expandOnEnter(el: Element, done: () => void): void {
  const element = el as HTMLElement
  if (reducedMotion()) {
    done()
    return
  }
  element.style.height = '0'
  element.style.overflow = 'hidden'
  void element.offsetHeight // force layout: register the 0 start before animating
  element.style.transition = `height ${DURATION_MS}ms ease`
  element.style.height = `${element.scrollHeight}px`
  const finish = () => {
    element.style.height = ''
    element.style.overflow = ''
    element.style.transition = ''
    element.removeEventListener('transitionend', finish)
    done()
  }
  element.addEventListener('transitionend', finish)
}

export function expandOnLeave(el: Element, done: () => void): void {
  const element = el as HTMLElement
  if (reducedMotion()) {
    done()
    return
  }
  element.style.height = `${element.scrollHeight}px`
  element.style.overflow = 'hidden'
  void element.offsetHeight
  element.style.transition = `height ${DURATION_MS}ms ease`
  element.style.height = '0'
  const finish = () => {
    element.removeEventListener('transitionend', finish)
    done()
  }
  element.addEventListener('transitionend', finish)
}

// Dispatched on `window` the moment pinTopAcrossTransition's counter-scroll loop
// settles. The journal e2e waits for this exact event instead of polling the
// opened item's position against a timeout — the deterministic "scroll-pin done"
// signal that fixes the flake in issue #450, where a slow CI frame could push the
// settle past the poll's window and the test only ever masked it by waiting
// longer. Namespaced so it can't collide with a standard event.
export const PIN_SETTLED_EVENT = 'journal:pin-settled'

// Holds the clicked item's own top at the exact screen position it was at before
// the click — a collapsing sibling elsewhere can shift it, but the item the user
// just acted on shouldn't visually jump. This item's own body and any sibling's
// collapse both animate their height (the transitions above), so the shift plays
// out over several frames rather than in one DOM patch — correcting once, right
// after the patch, would miss most of it. Each frame: counter-scroll instantly
// (never animated — an animated correction would show the very motion this hides,
// clamped to 0 so we never scroll above the top of the page) by whatever moved
// the item since the last frame, then check whether the item's OWN position in
// the document — independent of our counter-scroll — is still changing; stop once
// it holds steady for a frame. The frame cap is a backstop against a runaway
// loop, not an expected path. Fires PIN_SETTLED_EVENT on every exit path so the
// settle is observable to the e2e rather than raced against a timeout (#450).
export function pinTopAcrossTransition(el: HTMLElement | null, beforeTop: number | null): void {
  const settled = () => {
    window.dispatchEvent(new CustomEvent(PIN_SETTLED_EVENT))
  }
  if (!el || beforeTop == null) {
    settled()
    return
  }
  let settledAt: number | null = null
  let frame = 0
  const step = () => {
    const rectTop = el.getBoundingClientRect().top
    const delta = rectTop - beforeTop
    if (delta) window.scrollTo({ top: Math.max(0, window.scrollY + delta), behavior: 'auto' })
    const documentTop = rectTop + window.scrollY // invariant to our own counter-scroll
    if (documentTop === settledAt || ++frame > 90) {
      settled()
      return
    }
    settledAt = documentTop
    requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}
