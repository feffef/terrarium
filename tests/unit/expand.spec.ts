// L3 — Isolation invariant (ADR-0004), tested at the manifest-expansion level
// where the real risk lives: a bug in `expand()` (shared/expand.ts) that produced
// duplicate or mis-scoped keys would silently cross-wire Spaces — it, not a
// committed generator, is what `content.config.ts`/`modules/routing.ts` run at
// config-evaluation/build time (ADR-0013/0014). Because each collection is its
// own SQLite table, correct + unique keys are exactly what guarantees no
// cross-Space leak.
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { catalogFrom, expand, type LoadedManifest } from '../../shared/expand.ts'
import { KINDS } from '../../shared/kinds.ts'
import { collectionKey, validateManifest, type TenantManifest } from '../../shared/manifest.ts'

const KEY = /^[a-z][a-z0-9]*_[a-z][a-z0-9]*_[a-z][a-z0-9]*$/

function tenant(name: string, spaces: string[], collections: string[]): LoadedManifest {
  return {
    dir: name,
    manifest: {
      name,
      spaces,
      collections: Object.fromEntries(
        collections.map((c) => [c, { type: 'page' as const, schema: z.object({}) }]),
      ),
    },
  }
}

describe('expand() — cross-product & keying', () => {
  const cols = expand([
    tenant('docs', ['current', 'archived'], ['pages', 'skills']),
    tenant('marketing', ['prod', 'dev'], ['pages']),
  ])

  it('produces one collection per (tenant, space, collection)', () => {
    expect(cols).toHaveLength(2 * 2 + 2 * 1) // docs: 2×2, marketing: 2×1
  })

  it('every key is unique (the isolation guarantee)', () => {
    const keys = cols.map((c) => c.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('every key is well-formed tenant_space_collection', () => {
    for (const c of cols) {
      expect(c.key).toMatch(KEY)
      expect(c.key).toBe(collectionKey(c.tenant, c.space, c.collection))
    }
  })

  it('every key maps to a distinct, correctly-scoped content dir', () => {
    const dirs = new Map<string, string>()
    for (const c of cols) {
      expect(c.cwdRel).toBe(`layers/${c.tenant}/content/${c.space}/${c.collection}`)
      expect(dirs.has(c.key)).toBe(false)
      dirs.set(c.key, c.cwdRel)
    }
    // Same collection name across Spaces must NOT share a key or a dir.
    const current = cols.find((c) => c.tenant === 'docs' && c.space === 'current' && c.collection === 'pages')!
    const archived = cols.find((c) => c.tenant === 'docs' && c.space === 'archived' && c.collection === 'pages')!
    expect(current.key).not.toBe(archived.key)
    expect(current.cwdRel).not.toBe(archived.cwdRel)
  })
})

describe('expand() — rejects collisions', () => {
  it('throws on a duplicated collection key', () => {
    const dup = tenant('docs', ['current'], ['pages'])
    expect(() => expand([dup, dup])).toThrow(/duplicate collection key/)
  })
})

describe('validateManifest()', () => {
  const ok: TenantManifest = {
    name: 'docs',
    spaces: ['current'],
    collections: { pages: { type: 'page', schema: z.object({}) } },
  }

  it('accepts a well-formed manifest', () => {
    expect(validateManifest(ok)).toEqual([])
  })

  it('rejects non-slug tenant / space / collection names', () => {
    expect(validateManifest({ ...ok, name: 'Docs' }).join()).toMatch(/tenant name/)
    expect(validateManifest({ ...ok, spaces: ['cur_rent'] }).join()).toMatch(/space/)
    expect(
      validateManifest({ ...ok, collections: { 'bad-name': { type: 'page' } } }).join(),
    ).toMatch(/collection/)
  })

  it('rejects duplicate spaces and empty declarations', () => {
    expect(validateManifest({ ...ok, spaces: ['a', 'a'] }).join()).toMatch(/duplicate spaces/)
    expect(validateManifest({ ...ok, spaces: [] }).join()).toMatch(/no spaces/)
    expect(validateManifest({ ...ok, collections: {} }).join()).toMatch(/no collections/)
  })

  it('rejects a schema that is not a zod schema', () => {
    const bad = { ...ok, collections: { pages: { type: 'page' as const, schema: {} as never } } }
    expect(validateManifest(bad).join()).toMatch(/not a zod schema/)
  })

  it('rejects an invalid collection type', () => {
    const bad = { ...ok, collections: { pages: { type: 'weird' as never } } }
    expect(validateManifest(bad).join()).toMatch(/invalid type/)
  })

  it('rejects a `data` collection with no schema (issue #93)', () => {
    // Cast: `CollectionDef` itself makes `schema` required on `data`, so TS
    // rejects this literal — which is exactly the point. The runtime validator
    // must catch the same invariant for manifests that never saw the
    // typechecker (jiti evaluates tenant.config.ts at build time).
    const bad = { ...ok, collections: { pings: { type: 'data' } } } as unknown as TenantManifest
    const errors = validateManifest(bad)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.join()).toMatch(/pings/)
  })

  it('rejects an unknown top-level key (e.g. a `space:` typo for `spaces:`)', () => {
    const bad = { ...ok, space: ['current'] } as unknown as TenantManifest
    expect(validateManifest(bad).join()).toMatch(/[Uu]nrecognized key/)
  })
})

// ── Collection kinds → #catalog (ADR-0025, issue #642) ──────────────────────
describe('validateManifest() — collection kinds', () => {
  const withPages = (pages: TenantManifest['collections']['pages']): TenantManifest => ({
    name: 'docs',
    spaces: ['current'],
    collections: { pages },
  })

  it('accepts `kind: "page"` on a page collection (with or without an inline schema)', () => {
    expect(validateManifest(withPages({ type: 'page', kind: 'page' }))).toEqual([])
    expect(validateManifest(withPages({ type: 'page', kind: 'page', schema: z.object({}) }))).toEqual([])
  })

  it('rejects an unknown kind', () => {
    const bad = withPages({ type: 'page', kind: 'nope' } as unknown as TenantManifest['collections']['pages'])
    expect(validateManifest(bad).join()).toMatch(/unknown kind "nope"/)
  })

  it('rejects a page kind on a data collection (type mismatch)', () => {
    const bad = { ...withPages({ type: 'page' }), collections: { notes: { type: 'data', kind: 'page' } } }
    expect(validateManifest(bad as unknown as TenantManifest).join()).toMatch(/is a page kind but the collection is type "data"/)
  })

  it('accepts a data collection carrying BOTH a kind and a local schema (minimum contract)', () => {
    const both: TenantManifest = {
      name: 'docs',
      spaces: ['current'],
      collections: { notes: { type: 'data', kind: 'session', schema: z.object({ mood: z.string() }) } },
    }
    expect(validateManifest(both)).toEqual([])
  })

  it('still rejects a data collection with neither schema nor kind', () => {
    const bad = { collections: { notes: { type: 'data' } }, name: 'docs', spaces: ['current'] }
    expect(validateManifest(bad as unknown as TenantManifest).join()).toMatch(/requires a schema \(or a `kind`/)
  })
})

// ── Minimum-contract merge: effective schema = kind contract + local (ADR-0025) ──
describe('expand() — effective schema merges the kind contract', () => {
  const loaded = (collections: TenantManifest['collections']): LoadedManifest[] => [
    { dir: 'docs', manifest: { name: 'docs', spaces: ['current'], collections } },
  ]

  it('a kinded page collection gets the page contract merged into its local schema', () => {
    const [col] = expand(loaded({
      pages: { type: 'page', kind: 'page', schema: z.object({ badge: z.string() }) },
    }))
    const schema = col!.schema!
    // Local field + contract fields coexist; the contract's fields stay optional.
    expect(schema.safeParse({ badge: 'b' }).success).toBe(true)
    expect(
      schema.safeParse({ badge: 'b', publishedAt: '2026-07-22T10:00:00Z', summary: 's' }).success,
    ).toBe(true)
    // The contract's refinement travels with the merge.
    expect(schema.safeParse({ badge: 'b', publishedAt: 'not-a-timestamp' }).success).toBe(false)
  })

  it('a kinded page collection with no local schema gets the contract alone', () => {
    const [col] = expand(loaded({ pages: { type: 'page', kind: 'page' } }))
    expect(col!.schema).toBeDefined()
    expect(Object.keys(col!.schema!.shape).sort()).toEqual(['publishedAt', 'summary'])
  })

  it('an un-kinded page collection keeps its local schema untouched (isolation default)', () => {
    const local = z.object({ token: z.string() })
    const [col] = expand(loaded({ pages: { type: 'page', schema: local } }))
    expect(col!.schema).toBe(local)
  })

  it('a data collection with only a kind uses the contract as its whole schema', () => {
    const [col] = expand(loaded({ sessions: { type: 'data', kind: 'session' } }))
    expect(col!.schema).toBe(KINDS.session.contract)
  })

  it('a data collection may extend its kind contract with local fields', () => {
    const [col] = expand(loaded({
      sessions: { type: 'data', kind: 'session', schema: z.object({ mood: z.string() }) },
    }))
    const keys = Object.keys(col!.schema!.shape)
    expect(keys).toContain('goal') // from the session contract
    expect(keys).toContain('mood') // local extension
  })
})

describe('expand() + catalogFrom() — the catalog projection', () => {
  const manifests: LoadedManifest[] = [
    {
      dir: 'docs',
      manifest: {
        name: 'docs',
        spaces: ['current', 'archived'],
        collections: {
          // opted in — appears in the catalog under `page`, both Spaces
          pages: { type: 'page', kind: 'page', schema: z.object({}) },
          // bespoke, un-kinded — must stay invisible to the catalog
          secrets: { type: 'data', schema: z.object({ token: z.string() }) },
        },
      },
    },
    {
      dir: 'marketing',
      manifest: {
        name: 'marketing',
        spaces: ['prod'],
        collections: { pages: { type: 'page', kind: 'page', schema: z.object({}) } },
      },
    },
  ]

  const cols = expand(manifests)

  it('carries `kind` through onto the opted-in expanded collections only', () => {
    const pages = cols.filter((c) => c.collection === 'pages')
    const secrets = cols.filter((c) => c.collection === 'secrets')
    expect(pages.every((c) => c.kind === 'page')).toBe(true)
    expect(secrets.every((c) => c.kind === undefined)).toBe(true)
  })

  it('groups every kinded collection by kind, and excludes the un-kinded one', () => {
    const catalog = catalogFrom(cols)
    expect(Object.keys(catalog)).toEqual(['page'])
    expect((catalog.page ?? []).map((e) => e.key)).toEqual([
      'docs_current_pages',
      'docs_archived_pages',
      'marketing_prod_pages',
    ])
    // no `secrets` key leaked into any kind bucket (isolation default)
    const allKeys = Object.values(catalog).flat().map((e) => e.key)
    expect(allKeys.some((k) => k.includes('secrets'))).toBe(false)
  })

  it('tags each catalog entry with full provenance', () => {
    const entry = (catalogFrom(cols).page ?? []).find((e) => e.key === 'marketing_prod_pages')!
    expect(entry).toEqual({
      key: 'marketing_prod_pages',
      tenant: 'marketing',
      space: 'prod',
      collection: 'pages',
      kind: 'page',
    })
  })

  it('returns an empty catalog when nothing opts in', () => {
    const noneKinded = expand([
      { dir: 'x', manifest: { name: 'x', spaces: ['s'], collections: { pages: { type: 'page', schema: z.object({}) } } } },
    ])
    expect(catalogFrom(noneKinded)).toEqual({})
  })
})
