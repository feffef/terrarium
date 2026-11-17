// A Skill Inventory note must cite a full session id, not a truncated one (issue #2582).
import { describe, expect, it } from 'vitest'
import { skillSchema } from '../../tenant.config'
import { auditIsStale, formatAuditDate } from '../../app/utils/dashboard'

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

describe('watchFor', () => {
  const base = skill('x')
  it('is optional and takes plain sentences', () => {
    expect(skillSchema.safeParse({ ...base, watchFor: ['A merging run ran the gate first.'] }).success).toBe(true)
    expect(skillSchema.safeParse(base).success).toBe(true)
  })
  it('rejects an item that cites an issue or session id', () => {
    expect(skillSchema.safeParse({ ...base, watchFor: ['Fixed in #3395.'] }).success).toBe(false)
  })
})

describe('auditIsStale', () => {
  const now = new Date('2026-11-15T12:00:00Z')
  it('dims a line older than 14 days', () => {
    expect(auditIsStale('2026-11-01', now)).toBe(true)
    expect(auditIsStale('2026-11-02', now)).toBe(false)
  })
})

describe('auditSummary', () => {
  const base = skill('x')
  it('is optional and takes a date and text', () => {
    expect(skillSchema.safeParse({ ...base, auditSummary: { date: '2026-11-15', text: 'Ran 7 times.' } }).success).toBe(true)
    expect(skillSchema.safeParse({ ...base, auditSummary: undefined }).success).toBe(true)
  })
  it('rejects a malformed date', () => {
    expect(skillSchema.safeParse({ ...base, auditSummary: { date: 'Nov 15', text: 'x' } }).success).toBe(false)
  })
  it('formats the date without a year', () => {
    expect(formatAuditDate('2026-11-05')).toBe('Nov 5')
  })
})
