// A Skill Inventory note must cite a full session id, not a truncated one (issue #2582).
import { describe, expect, it } from 'vitest'
import { skillSchema } from '../../tenant.config'

const skill = (note: string) => ({
  name: 'blog-post',
  category: 'platform-operation',
  importance: 'routine',
  role: 'Writes posts.',
  observations: [{ date: '2026-10-13', note }],
})

describe('skillSchema observation notes', () => {
  it('accepts a full session id', () => {
    expect(skillSchema.safeParse(skill('Checked session_01Xw7ZN8ghC7PDemvu9cA9Lo, PR #1809.')).success).toBe(true)
  })

  it('accepts a word like session_id that is not an id', () => {
    expect(skillSchema.safeParse(skill('Reads the session_id field.')).success).toBe(true)
  })

  it('rejects a truncated session id', () => {
    expect(skillSchema.safeParse(skill('Checked session_01Xw7ZN8.. here.')).success).toBe(false)
  })
})
