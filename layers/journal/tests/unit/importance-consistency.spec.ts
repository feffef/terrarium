// Drift guard between the journal Tenant's `Importance` grade set as it's
// written out by hand in three places (issue #807): the Zod enum on the
// `skills` collection's schema (tenant.config.ts), the TS union type
// (app/types/journal.ts), and dashboard.ts's internal `skillGroups()` display
// order. Nothing catches a partial update if a grade is ever added/renamed —
// this test fails loudly if any of the three drift from the others.
//
// The Zod enum is the runtime source of truth: everything else is checked
// against it, rather than against a fourth hand-copied list here (the
// `importanceExhaustiveness` record below is not a second source of truth —
// see its own comment for why).
import { z } from 'zod'
import { describe, expect, it } from 'vitest'
import journalTenant from '../../tenant.config'
import { skillGroups } from '../../app/utils/dashboard'
import type { Importance, SkillDoc } from '../../app/types/journal'

const skillsCollection = journalTenant.collections.skills
if (!skillsCollection) throw new Error('journal tenant has no "skills" collection')
const skillsSchema = skillsCollection.schema
if (!skillsSchema) throw new Error('journal tenant\'s skills collection has no schema')

// `importance` is a required (non-optional/nullable) field, so `.shape.importance`
// is the ZodEnum itself with no wrapper to unwrap first. The `instanceof` check
// both confirms that structure and narrows the type enough to reach `.options`
// (Zod's own way of exposing an enum's literal values at runtime).
const importanceField = skillsSchema.shape.importance
if (!importanceField) throw new Error('skills schema has no "importance" field')
if (!(importanceField instanceof z.ZodEnum)) {
  throw new Error('skills schema\'s "importance" field is no longer a z.enum(...) — update this drift-guard test to match its new shape')
}

// Runtime source of truth for the grade set — everything below is checked
// against this, not against a value hand-copied into this file.
const zodImportanceOptions: string[] = importanceField.options

describe('Importance grade set drift guard (issue #807)', () => {
  it('has exactly 5 grades with no duplicates (so a silent Zod-enum edit fails loudly)', () => {
    expect(new Set(zodImportanceOptions).size).toBe(zodImportanceOptions.length)
    expect(zodImportanceOptions).toHaveLength(5)
  })

  it('TS union `Importance` names exactly the Zod enum\'s grades — no more, no fewer', () => {
    // `journalTenant`'s export type is `TenantManifest` (shared/manifest.ts),
    // which widens every collection's `schema` to a generic
    // `ZodObject<ZodRawShape>` — so nothing reachable from `journalTenant`
    // itself carries the enum's specific literal member types, and a direct
    // `const x: Importance[] = zodImportanceOptions` would typecheck no
    // matter what the array actually contains (no real protection).
    //
    // Instead: this record's keys are checked against `Importance` at
    // COMPILE time — `pnpm typecheck` fails the moment `Importance` gains or
    // loses a member relative to it (TS's standard exhaustiveness idiom: a
    // `Record<Union, T>` object literal errors on both a missing key and an
    // excess one). It isn't an independent fourth source of truth because
    // the very next assertion cross-checks its keys against the Zod-derived
    // array at RUNTIME — so it can't itself silently drift from the real
    // (Zod) source of truth either.
    const importanceExhaustiveness: Record<Importance, true> = {
      essential: true,
      routine: true,
      specialist: true,
      supporting: true,
      peripheral: true,
    }
    expect(Object.keys(importanceExhaustiveness).sort()).toEqual([...zodImportanceOptions].sort())
  })

  it('dashboard.ts\'s internal skillGroups() order matches the Zod enum exactly, in order', () => {
    // One synthetic SkillDoc per grade, fed through the real (exported)
    // skillGroups() — this exercises dashboard.ts's own internal `order`
    // array without needing to export it. The cast is safe: these strings
    // are literally the skills collection's own `importance` enum values.
    const syntheticDocs: SkillDoc[] = zodImportanceOptions.map((importance) => ({
      name: `synthetic-${importance}`,
      category: 'platform-operation',
      importance: importance as Importance,
      role: 'synthetic fixture for the drift-guard test',
      observations: [],
    }))

    const groups = skillGroups(syntheticDocs)
    expect(groups.map((g) => g.importance)).toEqual(zodImportanceOptions)
  })
})
