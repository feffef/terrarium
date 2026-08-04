// The page-wide accordion + deep-link contract, lifted verbatim out of the
// Journal Space-landing SFC (issue #450) so a third inline-expandable feed
// adopts it by calling it rather than re-implementing it — which is exactly how
// the scroll contract gets re-broken. Its four behaviours (one-at-a-time open,
// hash mirror, deep-link-load scroll, click-open pin) are guarded end-to-end by
// four e2e in `layers/journal/tests/e2e/journal.e2e.ts`; the pin's own timing is
// tuned and NOT simplifiable — read pinTopAcrossTransition's header in
// ../utils/expandTransition.ts before touching it.
//
// Runtime imports are explicit rather than auto-imported so the module can be
// imported directly by a unit test, outside the Nuxt runtime.
import { getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Ref } from 'vue'
import { pinTopAcrossTransition } from '../utils/expandTransition'

export interface AccordionDeepLink {
  /** The one open item's deep-link anchor, or `null` when everything is closed. */
  openAnchor: Ref<string | null>
  isOpen: (anchor: string) => boolean
  toggle: (anchor: string) => void
  /** Open whatever the URL hash names and scroll it into view. Called on mount
   *  and on every `hashchange`; exposed so a caller can re-sync deliberately. */
  openFromHash: () => void
}

/**
 * One-at-a-time disclosure state for every feed on a page, keyed by each item's
 * deep-link anchor and mirrored to the URL hash.
 *
 * @param path The Space route the hash hangs off — a getter, so it tracks a
 *   route change rather than freezing the path at call time.
 */
export function useAccordionDeepLink(path: () => string): AccordionDeepLink {
  // The open anchor is mirrored to the URL hash so any open item is deep-linkable.
  // The hash is the source of truth on load: fragments aren't sent to the server,
  // so SSR always renders collapsed and `onMounted` opens the linked item on the
  // client (no hydration mismatch — both start from `null`).
  const openAnchor = ref<string | null>(null)
  const isOpen = (anchor: string) => openAnchor.value === anchor

  // replaceState (not `location.hash =`) so toggling neither floods history nor
  // triggers the browser's native jump-to-anchor scroll — we scroll deliberately
  // instead: pinTopAcrossTransition() on a click-triggered open, scrollToOpen()
  // on a deep-link load (see each for why they differ).
  const syncHash = (anchor: string | null) => {
    history.replaceState(history.state, '', anchor ? `${path()}#${anchor}` : path())
  }

  const toggle = (anchor: string) => {
    const opening = !isOpen(anchor)
    const next = opening ? anchor : null
    // Captured BEFORE the state flips: the accordion is one-at-a-time, so opening
    // this item can close another one elsewhere on the page (above or below it),
    // reflowing everything between them. Comparing this item's own viewport
    // position before vs. after — rather than assuming a direction — covers every
    // case: another entry above collapsing out from under it, one below collapsing
    // with no effect on it, or (on a deep-linked reload) no prior entry at all.
    const el = opening ? document.getElementById(anchor) : null
    const beforeTop = el?.getBoundingClientRect().top ?? null
    openAnchor.value = next
    syncHash(next)
    // Closing needs no scroll — nothing above the (now-shorter) item moves.
    // pinTopAcrossTransition holds `el` put across the open.
    if (opening) nextTick(() => pinTopAcrossTransition(el, beforeTop))
  }

  const scrollToOpen = () => {
    if (!openAnchor.value) return
    const el = document.getElementById(openAnchor.value)
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  const openFromHash = () => {
    const anchor = window.location.hash.slice(1)
    openAnchor.value = anchor || null
    if (anchor) nextTick(scrollToOpen)
  }

  // Only a component has a lifecycle to hang the listener on; outside one the
  // returned surface still works, and the caller drives openFromHash itself.
  if (getCurrentInstance()) {
    onMounted(() => {
      openFromHash()
      // Honor a hash the user edits or an in-page anchor link. Our own replaceState
      // never fires hashchange, so this can't loop back on syncHash().
      window.addEventListener('hashchange', openFromHash)
    })
    onBeforeUnmount(() => {
      window.removeEventListener('hashchange', openFromHash)
    })
  }

  return { openAnchor, isOpen, toggle, openFromHash }
}
