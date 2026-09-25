import { describe, expect, it } from 'vitest'
import { SESSIONS_DIR } from '../../scripts/audit-skills.ts'
import { queryCorpus, type SessionLog } from '../../scripts/corpus.ts'

const log = (date: string, id: string, data: Record<string, unknown> = {}): SessionLog => ({
  file: `${SESSIONS_DIR}/${date}-${id}.yml`,
  data: { session: id, ...data },
})

const logs = [
  log('2026-09-02', 'session_B', { ideas: ['b'] }),
  log('2026-08-01', 'session_A', { ideas: ['a'] }),
  log('2026-09-20', 'session_C'),
]

describe('queryCorpus()', () => {
  it('returns every log oldest first, whole, without options', () => {
    const rows = queryCorpus(logs, {})
    expect(rows.map((r) => r.session)).toEqual(['session_A', 'session_B', 'session_C'])
    expect(rows[0]).toMatchObject({ date: '2026-08-01', value: { session: 'session_A', ideas: ['a'] } })
  })

  it('filters by filename date, inclusive', () => {
    const rows = queryCorpus(logs, { since: '2026-09-02', until: '2026-09-20' })
    expect(rows.map((r) => r.session)).toEqual(['session_B', 'session_C'])
  })

  it('projects one field and skips logs without it', () => {
    expect(queryCorpus(logs, { field: 'ideas' }).map((r) => r.value)).toEqual([['a'], ['b']])
  })
})
