// Drift guard between the `skills` collection's `importance` Zod enum
// (tenant.config.ts) and dashboard.ts's internal `skillGroups()` display order
// (issue #807). The TS `Importance` type is inferred from that enum, so only the
// hand-written display order can drift. The Zod enum is the runtime source of truth.
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

const zodImportanceOptions: string[] = importanceField.options

describe('Importance grade set drift guard (issue #807)', () => {
  it('has exactly 5 grades with no duplicates (so a silent Zod-enum edit fails loudly)', () => {
    expect(new Set(zodImportanceOptions).size).toBe(zodImportanceOptions.length)
    expect(zodImportanceOptions).toHaveLength(5)
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
