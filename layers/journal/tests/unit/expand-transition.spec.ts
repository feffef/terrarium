// Unit tests for the scroll-pin's observable record (issue #750).
//
// `pinTopAcrossTransition` is the counter-scroll that holds a just-opened
// accordion item at its pre-click viewport position. Its e2e guard could only
// ever report two numbers on failure, which is why the ~2800px failure in #750
// could not be attributed to a mechanism after the fact. The pin now reports
// what it did on `PIN_SETTLED_EVENT.detail`; these tests pin that record's
// contract (and, with it, that the pin's own scrolling is unchanged) at L1,
// where a browser is not needed.
//
// The DOM is hand-stubbed rather than jsdom'd: the pin touches only
// `window.scrollY`/`scrollTo`/`dispatchEvent`, `requestAnimationFrame`, and one
// element's `getBoundingClientRect`, so a fake is cheaper than a new dependency
// (ADR-0004 escalates a PR that adds one).
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PIN_SETTLED_EVENT, pinTopAcrossTransition } from '../../app/utils/expandTransition.ts'
import type { PinRecord } from '../../app/utils/expandTransition.ts'

/** A page whose single tracked element sits at `docTop` in document space. */
interface FakePage {
  scrollY: number
  docTop: number
  el: HTMLElement
  settled: PinRecord[]
  /** Run queued frames until the pin settles, at `stepMs` per frame. */
  run: (stepMs?: number, onFrame?: (frame: number) => void) => void
}

const savedGlobals: Record<string, unknown> = {}
const globals = globalThis as unknown as Record<string, unknown>

function fakePage(scrollY: number, docTop: number): FakePage {
  const frames: FrameRequestCallback[] = []
  const settled: PinRecord[] = []
  const page: FakePage = {
    scrollY,
    docTop,
    el: {
      getBoundingClientRect: () => ({ top: page.docTop - page.scrollY }) as DOMRect,
    } as HTMLElement,
    settled,
    run: (stepMs = 16, onFrame) => {
      let now = 0
      for (let frame = 0; frames.length > 0 && frame < 200; frame++) {
        const cb = frames.shift()!
        onFrame?.(frame)
        cb(now)
        now += stepMs
      }
    },
  }
  globals.window = {
    get scrollY() {
      return page.scrollY
    },
    scrollTo: (opts: ScrollToOptions) => {
      page.scrollY = opts.top ?? 0
    },
    dispatchEvent: (e: Event) => {
      settled.push((e as CustomEvent<PinRecord>).detail)
      return true
    },
  }
  globals.requestAnimationFrame = (cb: FrameRequestCallback) => {
    frames.push(cb)
    return frames.length
  }
  return page
}

describe('pinTopAcrossTransition — settle record', () => {
  beforeEach(() => {
    for (const key of ['window', 'requestAnimationFrame']) savedGlobals[key] = globals[key]
  })
  afterEach(() => {
    for (const [key, value] of Object.entries(savedGlobals)) {
      if (value === undefined) Reflect.deleteProperty(globals, key)
      else globals[key] = value
    }
  })

  it('reports the counter-scrolls it issued when content above the item collapses', () => {
    const page = fakePage(1000, 1300) // item top = 300
    pinTopAcrossTransition(page.el, 300)
    // Collapse 300px of content above the item after the first frame.
    page.run(16, (frame) => {
      if (frame === 1) page.docTop = 1000
    })

    const record = page.settled.at(-1)!
    expect(page.settled).toHaveLength(1)
    expect(record.scrolls).toBeGreaterThan(0)
    expect(record.frames).toBeGreaterThan(record.scrolls)
    expect(record.clipped).toBe(false)
    expect(record.residual).toBe(0)
    expect(page.scrollY).toBe(700) // counter-scrolled by the collapse height
  })

  it('reports zero counter-scrolls when nothing above the item moves', () => {
    const page = fakePage(1000, 1300)
    pinTopAcrossTransition(page.el, 300)
    page.run()

    const record = page.settled.at(-1)!
    expect(record.scrolls).toBe(0)
    expect(record.frames).toBeGreaterThan(0)
    expect(page.scrollY).toBe(1000) // untouched
  })

  it('flags a counter-scroll clamped at the page top, and the residual it left', () => {
    const page = fakePage(100, 400) // item top = 300, only 100px of scroll below it
    pinTopAcrossTransition(page.el, 300)
    page.run(16, (frame) => {
      if (frame === 1) page.docTop = 100 // a 300px collapse the page cannot absorb
    })

    const record = page.settled.at(-1)!
    expect(record.clipped).toBe(true)
    expect(page.scrollY).toBe(0) // clamped, never negative
    expect(record.residual).toBe(-200) // the part of the collapse the pin could not undo
  })

  it('settles with an empty record when there is nothing to pin', () => {
    const page = fakePage(1000, 1300)
    pinTopAcrossTransition(null, 300)

    expect(page.settled).toHaveLength(1)
    expect(page.settled[0]).toEqual({ frames: 0, scrolls: 0, clipped: false, residual: 0 })
  })

  it('names the event the e2e listens on', () => {
    expect(PIN_SETTLED_EVENT).toBe('journal:pin-settled')
  })
})
