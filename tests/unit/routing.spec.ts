// L3 — Isolation invariant (ADR-0004) at *resolution* time. The generator test
// proves keys are unique and correctly scoped; this proves the runtime resolver
// (shared/routing.ts, human-only surface, ADR-0006) turns a request into exactly
// one Space's keys — and 404s everything else — so no cross-Space leak can occur.
import { describe, expect, it } from 'vitest'
import { resolveSpaceRoute, slugToPath, type RoutingMap } from '../../shared/routing.ts'

// A crafted two-Space map mirroring the generated shape. `dataOnly` is a Space with
// no `pages` collection — the resolver must treat it as unroutable (→ 404).
const MAP: RoutingMap = {
  journal: {
    current: {
      pages: 'journal_current_pages',
      skills: 'journal_current_skills',
      sessions: 'journal_current_sessions',
    },
    archived: {
      pages: 'journal_archived_pages',
      skills: 'journal_archived_skills',
      sessions: 'journal_archived_sessions',
    },
  },
  vault: {
    dataOnly: { notes: 'vault_dataOnly_notes' },
  },
}

describe('slugToPath() — catch-all normalisation', () => {
  it('maps an empty/absent slug to the Space root', () => {
    expect(slugToPath(undefined)).toBe('/')
    expect(slugToPath('')).toBe('/')
    expect(slugToPath([])).toBe('/')
  })

  it('joins an array slug and strips a trailing slash', () => {
    expect(slugToPath(['about'])).toBe('/about')
    expect(slugToPath(['a', 'b'])).toBe('/a/b')
    expect(slugToPath(['a', 'b', ''])).toBe('/a/b') // trailing segment → trailing slash, stripped
  })

  it('normalises a string slug the same way', () => {
    expect(slugToPath('about')).toBe('/about')
  })
})

describe('resolveSpaceRoute() — 404 negative paths', () => {
  it('returns null for an unknown Tenant', () => {
    expect(resolveSpaceRoute('nope', 'current', '', MAP)).toBeNull()
  })

  it('returns null for an unknown Space of a known Tenant', () => {
    expect(resolveSpaceRoute('journal', 'nope', '', MAP)).toBeNull()
  })

  it('returns null for a Space with no routable `pages` collection', () => {
    expect(resolveSpaceRoute('vault', 'dataOnly', '', MAP)).toBeNull()
  })
})

describe('resolveSpaceRoute() — resolution', () => {
  it('resolves the pages key, path and atRoot for the Space root', () => {
    const r = resolveSpaceRoute('journal', 'current', '', MAP)!
    expect(r.pagesKey).toBe('journal_current_pages')
    expect(r.path).toBe('/')
    expect(r.atRoot).toBe(true)
  })

  it('resolves a nested document path and marks it not-at-root', () => {
    const r = resolveSpaceRoute('journal', 'current', ['about'], MAP)!
    expect(r.path).toBe('/about')
    expect(r.atRoot).toBe(false)
  })

  it('surfaces every non-pages collection as the catalog, excluding pages', () => {
    const r = resolveSpaceRoute('journal', 'current', '', MAP)!
    expect(r.dataCollections).toEqual([
      { name: 'skills', key: 'journal_current_skills' },
      { name: 'sessions', key: 'journal_current_sessions' },
    ])
    expect(r.dataCollections.some((d) => d.name === 'pages')).toBe(false)
  })
})

describe('resolveSpaceRoute() — the isolation guarantee', () => {
  it('names ONLY the requested Space’s keys — never another Space’s', () => {
    const r = resolveSpaceRoute('journal', 'current', '', MAP)!
    const keys = [r.pagesKey, ...r.dataCollections.map((d) => d.key)]
    for (const key of keys) expect(key.startsWith('journal_current_')).toBe(true)
  })

  it('resolves the same collection name to disjoint keys across Spaces', () => {
    const cur = resolveSpaceRoute('journal', 'current', '', MAP)!
    const arc = resolveSpaceRoute('journal', 'archived', '', MAP)!
    const curKeys = new Set([cur.pagesKey, ...cur.dataCollections.map((d) => d.key)])
    const arcKeys = new Set([arc.pagesKey, ...arc.dataCollections.map((d) => d.key)])
    for (const key of arcKeys) expect(curKeys.has(key)).toBe(false)
  })
})

describe('resolveSpaceRoute() — default (generated) map', () => {
  // Omitting `map` must read the real generated routing map, not throw.
  it('resolves a real Space against the committed routing map', () => {
    const r = resolveSpaceRoute('journal', 'current', '')
    expect(r).not.toBeNull()
    expect(r!.pagesKey).toBe('journal_current_pages')
  })
})
