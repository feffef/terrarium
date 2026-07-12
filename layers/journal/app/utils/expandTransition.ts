// Vue <Transition> JS hooks (used with `:css="false"`) that grow/shrink a
// disclosure panel's outer clip wrapper by its own natural height, read from
// `scrollHeight` at animation start — no height needs to be known ahead of
// time. Shared by the digest and session-card inline disclosures (the Space
// landing + SessionCard.vue) so the "quick" duration/easing stay single-homed.
// The wrapper carries no padding/margin/border of its own (that lives on the
// inner content div it clips) — animating only `height` on a plain box avoids
// the extra work of also animating padding to reach a true zero size.
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
