// Unit tests for the page-wide accordion + deep-link contract (issue #450).
//
// The contract used to be inline in the Journal Space-landing SFC, where the only
// guard on it was four e2e that need a full browser build. Extracted into
// `useAccordionDeepLink`, the same four behaviours — one-at-a-time open, hash
// mirroring, the deep-link-load scroll, and the click-open scroll-pin's baseline —
// are assertable at L1. The e2e stay the end-to-end guard; these pin the state
// machine so a regression is attributable without one.
//
// The DOM is hand-stubbed rather than jsdom'd, for the same reason
// `expand-transition.spec.ts` does it: the composable touches only
// `document.getElementById`, `history`, `window.location.hash`/`matchMedia`, and
// the pin's `scrollY`/`scrollTo`/`requestAnimationFrame` — a fake is cheaper than
// a new dependency (ADR-0004 escalates a PR that adds one).
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { useAccordionDeepLink } from '../../app/composables/accordionDeepLink.ts'

interface FakeItem {
  /** The item's top edge in document space; the fake page derives the viewport top. */
  docTop: number
  scrolledIntoView: ScrollIntoViewOptions[]
}

interface FakePage {
  scrollY: number
  hash: string
  reducedMotion: boolean
  items: Record<string, FakeItem>
  replaced: string[]
  listeners: Record<string, number>
  /** Drain the queued animation frames the scroll-pin requested. */
  runFrames: (stepMs?: number) => void
}

const STUBBED = ['window', 'document', 'history', 'requestAnimationFrame'] as const
const savedGlobals: Record<string, unknown> = {}
const globals = globalThis as unknown as Record<string, unknown>

function fakePage(items: Record<string, number>): FakePage {
  const frames: FrameRequestCallback[] = []
  const page: FakePage = {
    scrollY: 0,
    hash: '',
    reducedMotion: false,
    items: Object.fromEntries(
      Object.entries(items).map(([id, docTop]) => [id, { docTop, scrolledIntoView: [] }]),
    ),
    replaced: [],
    listeners: {},
    runFrames: (stepMs = 16) => {
      let now = 0
      for (let frame = 0; frames.length > 0 && frame < 200; frame++) {
        frames.shift()!(now)
        now += stepMs
      }
    },
  }
  globals.window = {
    get scrollY() {
      return page.scrollY
    },
    get location() {
      return { hash: page.hash }
    },
    scrollTo: (opts: ScrollToOptions) => {
      page.scrollY = opts.top ?? 0
    },
    matchMedia: () => ({ matches: page.reducedMotion }),
    dispatchEvent: () => true,
    addEventListener: (type: string) => {
      page.listeners[type] = (page.listeners[type] ?? 0) + 1
    },
    removeEventListener: (type: string) => {
      page.listeners[type] = (page.listeners[type] ?? 0) - 1
    },
  }
  globals.document = {
    getElementById: (id: string) => {
      const item = page.items[id]
      if (!item) return null
      return {
        getBoundingClientRect: () => ({ top: item.docTop - page.scrollY }) as DOMRect,
        scrollIntoView: (opts: ScrollIntoViewOptions) => item.scrolledIntoView.push(opts),
      } as unknown as HTMLElement
    },
  }
  globals.history = {
    state: { some: 'state' },
    replaceState: (_state: unknown, _title: string, url: string) => page.replaced.push(url),
  }
  globals.requestAnimationFrame = (cb: FrameRequestCallback) => frames.push(cb)
  return page
}

describe('useAccordionDeepLink', () => {
  beforeEach(() => {
    for (const key of STUBBED) savedGlobals[key] = globals[key]
  })
  afterEach(() => {
    for (const [key, value] of Object.entries(savedGlobals)) {
      if (value === undefined) Reflect.deleteProperty(globals, key)
      else globals[key] = value
    }
  })

  it('keeps a single item open across every feed sharing the instance', () => {
    fakePage({ a: 100, b: 900 })
    const { openAnchor, isOpen, toggle } = useAccordionDeepLink(() => '/t/journal/current')

    expect(openAnchor.value).toBeNull()
    toggle('a')
    expect(isOpen('a')).toBe(true)
    toggle('b') // opening the second collapses the first
    expect(isOpen('a')).toBe(false)
    expect(isOpen('b')).toBe(true)
    toggle('b') // toggling the open one closes it
    expect(openAnchor.value).toBeNull()
  })

  it('mirrors the open item to the URL hash and clears it on collapse', () => {
    const page = fakePage({ a: 100 })
    const { toggle } = useAccordionDeepLink(() => '/t/journal/current')

    toggle('a')
    toggle('a')
    expect(page.replaced).toEqual(['/t/journal/current#a', '/t/journal/current'])
  })

  it('reads the route path per call, so a Space change is tracked', () => {
    const page = fakePage({ a: 100 })
    let space = 'current'
    const { toggle } = useAccordionDeepLink(() => `/t/journal/${space}`)

    toggle('a')
    space = 'archived'
    toggle('a') // collapse, now on the other Space
    expect(page.replaced).toEqual(['/t/journal/current#a', '/t/journal/archived'])
  })

  it('pins a click-opened item at the viewport position it had BEFORE the state flipped', async () => {
    const page = fakePage({ a: 400, b: 1200 })
    page.scrollY = 300 // item `b` sits 900px down the viewport
    const { toggle } = useAccordionDeepLink(() => '/t/journal/current')

    toggle('b')
    // A sibling above `b` collapses by 200px while the transition runs.
    page.items.b!.docTop = 1000
    await nextTick()
    page.runFrames()

    // The pin counter-scrolled by the collapse, so `b`'s viewport top is unchanged.
    expect(page.scrollY).toBe(100)
    expect(page.items.b!.docTop - page.scrollY).toBe(900)
  })

  it('does not pin on collapse — nothing above a shrinking item moves', async () => {
    const page = fakePage({ a: 400 })
    page.scrollY = 300
    const { toggle } = useAccordionDeepLink(() => '/t/journal/current')

    toggle('a')
    await nextTick()
    page.runFrames()
    const afterOpen = page.scrollY

    toggle('a') // collapse
    page.items.a!.docTop = 4000 // would be counter-scrolled if a pin were running
    await nextTick()
    page.runFrames()
    expect(page.scrollY).toBe(afterOpen)
  })

  it('opens the item named in the hash and scrolls it into view', async () => {
    const page = fakePage({ a: 100, 'digest-2026-08-03': 4000 })
    page.hash = '#digest-2026-08-03'
    const { openAnchor, openFromHash } = useAccordionDeepLink(() => '/t/journal/current')

    openFromHash()
    expect(openAnchor.value).toBe('digest-2026-08-03')
    await nextTick()
    expect(page.items['digest-2026-08-03']!.scrolledIntoView).toEqual([{ behavior: 'smooth', block: 'start' }])
  })

  it('honors prefers-reduced-motion on the deep-link scroll', async () => {
    const page = fakePage({ a: 4000 })
    page.hash = '#a'
    page.reducedMotion = true
    const { openFromHash } = useAccordionDeepLink(() => '/t/journal/current')

    openFromHash()
    await nextTick()
    expect(page.items.a!.scrolledIntoView).toEqual([{ behavior: 'auto', block: 'start' }])
  })

  it('closes everything when the hash is emptied, and scrolls nothing', async () => {
    const page = fakePage({ a: 100 })
    page.hash = ''
    const { openAnchor, openFromHash } = useAccordionDeepLink(() => '/t/journal/current')

    openFromHash()
    await nextTick()
    expect(openAnchor.value).toBeNull()
    expect(page.items.a!.scrolledIntoView).toEqual([])
  })

  it('starts closed so SSR and the client agree before the hash is read', () => {
    fakePage({ a: 100 })
    expect(useAccordionDeepLink(() => '/t/journal/current').openAnchor.value).toBeNull()
  })
})
