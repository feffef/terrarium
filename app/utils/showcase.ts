// Pure entry-capping logic for the root index page's Tenant showcase cards
// (app/pages/index.vue, app/components/HomeShowcase.vue), split out so it's
// L3-testable without a full Nuxt/@vue/test-utils mount (tests/unit/mermaid.spec.ts
// sets this precedent for ProsePre.vue).
export interface ShowcaseEntry {
  name: string
  path: string
  note?: string
  /** Any CSS colour — including a `var()` reference to a Tenant's own token. */
  accent: string
}

// A card lists at most this many entries and defers the rest to the Tenant's
// own front door. Without a cap an entry-rich Tenant sets the height of every
// card sharing its grid row, hollowing them out — verified at 12 entries.
export const MAX_LISTED_ENTRIES = 6

export function listEntries<T extends ShowcaseEntry>(
  entries: T[],
  max: number = MAX_LISTED_ENTRIES,
): { listed: T[]; overflow: number } {
  const listed = entries.slice(0, max)
  return { listed, overflow: entries.length - listed.length }
}
