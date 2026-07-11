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

  it('surfaces every non-pages collection as a record keyed by name, excluding pages', () => {
    const r = resolveSpaceRoute('journal', 'current', '', MAP)!
    expect(r.collections).toEqual({
      skills: 'journal_current_skills',
      sessions: 'journal_current_sessions',
    })
    // The return TYPE already excludes 'pages' (#96), but the resolver asserts
    // that type via a cast — this line guards the runtime filter itself, which
    // the type system therefore does not.
    expect(Object.keys(r.collections)).not.toContain('pages')
  })
})

describe('resolveSpaceRoute() — the isolation guarantee', () => {
  it('names ONLY the requested Space’s keys — never another Space’s', () => {
    const r = resolveSpaceRoute('journal', 'current', '', MAP)!
    const keys = [r.pagesKey, ...Object.values(r.collections)]
    for (const key of keys) expect(key.startsWith('journal_current_')).toBe(true)
  })

  it('resolves the same collection name to disjoint keys across Spaces', () => {
    const cur = resolveSpaceRoute('journal', 'current', '', MAP)!
    const arc = resolveSpaceRoute('journal', 'archived', '', MAP)!
    const curKeys = new Set([cur.pagesKey, ...Object.values(cur.collections)])
    const arcKeys = new Set([arc.pagesKey, ...Object.values(arc.collections)])
    for (const key of arcKeys) expect(curKeys.has(key)).toBe(false)
  })
})

describe('resolveSpaceRoute() — prototype-pollution / accidental-lookup guard', () => {
  // A plain-object lookup (`map[tenant]?.[space]`) walks the prototype chain, so
  // these tenant/space names must resolve to `null` — never accidentally to
  // `Object.prototype` or one of its own members — proving the `Object.hasOwn`
  // guard in `resolveSpaceRoute` actually fails closed rather than leaking.
  it('treats `__proto__`/`constructor` as unknown Tenant or Space names', () => {
    expect(resolveSpaceRoute('__proto__', 'constructor', '', MAP)).toBeNull()
    expect(resolveSpaceRoute('constructor', 'prototype', '', MAP)).toBeNull()
    expect(resolveSpaceRoute('journal', '__proto__', '', MAP)).toBeNull()
  })

  it('resolves correctly when a Tenant is literally named `hasOwnProperty`', () => {
    // A crafted map with an own-property key that collides with a name found on
    // `Object.prototype` — the guard must still resolve the legitimate Tenant
    // rather than being confused by the name shadowing a prototype method.
    const craftedMap: RoutingMap = {
      hasOwnProperty: {
        current: { pages: 'hasOwnProperty_current_pages' },
      },
    }
    const r = resolveSpaceRoute('hasOwnProperty', 'current', '', craftedMap)!
    expect(r).not.toBeNull()
    expect(r.pagesKey).toBe('hasOwnProperty_current_pages')
  })
})

describe('resolveSpaceRoute() — default (build-time) map', () => {
  // Omitting `map` must read the real build-time routing map (ADR-0014), not throw.
  it('resolves a real Space against the build-time routing map', () => {
    const r = resolveSpaceRoute('journal', 'current', '')
    expect(r).not.toBeNull()
    expect(r!.pagesKey).toBe('journal_current_pages')
  })
})
