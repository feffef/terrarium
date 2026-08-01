// Guards the drift `app/types/journal.ts` documents but cannot prevent: its
// unions are hand-maintained mirrors of Zod enums that live elsewhere (the
// `skills` manifest schema, the shared `session` kind), deliberately NOT aliases
// of the generated `Collections[...]` item types — see that file's header for
// why an alias collapses to `never` in this program. Nothing tied the two sides
// together, so widening one enum and forgetting the other typechecked and
// shipped (issue #803 added `routine` across seven hand-edited sites).
//
// Each union is pinned twice against the same literal tuple: at runtime (the
// tuple equals the live Zod enum's options, order included) and at compile time
// (the tuple's member type is mutually assignable with the union). One of the
// two fails whichever side drifts.
import { describe, expect, it } from 'vitest'
import { loadManifests } from '../../../../shared/expand'
import { sessionSchema } from '../../../../shared/schemas/session'
import type { Importance, Severity, Status } from '../../app/types/journal'

/** Mutual assignability — a one-directional `extends` would pass while the union
 *  still carried a member the tuple has lost. */
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
function assertExact<_T extends true>(): void {}

// The manifest is loaded through jiti (`loadManifests`) rather than imported:
// `layers/*/tenant.config.ts` is typechecked by the Nuxt program only, and a
// static import here would pull it into this node program too (tsconfig.node.json).
function journalCollectionSchema(collection: string): Record<string, { options?: unknown }> {
  const journal = loadManifests().find((m) => m.dir === 'journal')
  if (!journal) throw new Error('no journal manifest on disk — this canary means nothing without it')
  const schema = journal.manifest.collections[collection]?.schema
  if (!schema) throw new Error(`journal manifest has no inline schema for "${collection}"`)
  return (schema as { shape: Record<string, { options?: unknown }> }).shape
}

describe('journal.ts unions mirror their Zod enums', () => {
  it('Importance matches the skills manifest schema', () => {
    const IMPORTANCE = ['essential', 'routine', 'specialist', 'supporting', 'peripheral'] as const
    assertExact<Exact<(typeof IMPORTANCE)[number], Importance>>()
    expect(journalCollectionSchema('skills').importance?.options).toEqual([...IMPORTANCE])
  })

  it('Status matches the shared session kind', () => {
    const STATUS = ['completed', 'in-review', 'partial', 'blocked', 'abandoned'] as const
    assertExact<Exact<(typeof STATUS)[number], Status>>()
    expect(sessionSchema.shape.status.options).toEqual([...STATUS])
  })

  it('Severity matches the shared session kind', () => {
    const SEVERITY = ['nit', 'minor', 'moderate', 'major', 'blocker'] as const
    assertExact<Exact<(typeof SEVERITY)[number], Severity>>()
    const friction = sessionSchema.shape.frictions.element
    expect(friction.shape.severity.options).toEqual([...SEVERITY])
  })
})
