// L3 — Isolation invariant (ADR-0004), tested at the manifest-expansion level
// where the real risk lives: a bug in `expand()` (shared/expand.ts) that produced
// duplicate or mis-scoped keys would silently cross-wire Spaces — it, not a
// committed generator, is what `content.config.ts`/`modules/routing.ts` run at
// config-evaluation/build time (ADR-0013/0014). Because each collection is its
// own SQLite table, correct + unique keys are exactly what guarantees no
// cross-Space leak.
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { expand, type LoadedManifest } from '../../shared/expand.ts'
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
