// Vue <Transition> JS hooks (used with `:css="false"`) that grow/shrink a
// disclosure panel's outer clip wrapper by its own natural height, read from
// `scrollHeight` at animation start — no height needs to be known ahead of
// time. Shared by the digest and session-card inline disclosures (the Space
// landing + SessionCard.vue) so the "quick" duration/easing stay single-homed.
// The wrapper carries no padding/margin/border of its own (that lives on the
// inner content div it clips) — animating only `height` on a plain box avoids
// the extra work of also animating padding to reach a true zero size.
//
// Also owns `pinTopAcrossTransition` (below), so the whole open animation is
// single-homed here.
const DURATION_MS = 160

// Wall-clock slack so the pin's final counter-scroll lands after the transition's
// last frame even on a loaded runner.
const SETTLE_GRACE_MS = 48

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

// Dispatched on `window` when pinTopAcrossTransition settles, so the e2e can await
// the exact end of the pin instead of polling a timeout (issue #450).
export const PIN_SETTLED_EVENT = 'journal:pin-settled'

// Counter-scroll a just-opened item back to `beforeTop` every frame for the whole
// disclosure transition, so a sibling collapsing above it can't make it visually
// jump. Runs for the known duration rather than exiting when the item "stops
// moving": the reflow can start a frame late, and an early exit would leave it
// uncompensated (issue #450). Never animated; clamped to 0 so we never scroll past
// the page top. Fires PIN_SETTLED_EVENT on every exit path.
export function pinTopAcrossTransition(el: HTMLElement | null, beforeTop: number | null): void {
  const settled = () => {
    window.dispatchEvent(new CustomEvent(PIN_SETTLED_EVENT))
  }
  if (!el || beforeTop == null) {
    settled()
    return
  }
  let start: number | null = null
  const step = (now: number) => {
    if (start === null) start = now
    const delta = el.getBoundingClientRect().top - beforeTop
    if (delta) window.scrollTo({ top: Math.max(0, window.scrollY + delta), behavior: 'auto' })
    if (now - start >= DURATION_MS + SETTLE_GRACE_MS) {
      settled()
      return
    }
    requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}
