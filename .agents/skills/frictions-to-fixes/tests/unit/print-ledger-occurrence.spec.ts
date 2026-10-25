import { describe, expect, it } from 'vitest'
import { appendPlan, groupTriples, occurrenceBlock } from '../../scripts/print-ledger-occurrence.ts'

const log = {
  session: 'session_abc',
  startedAt: '2026-10-14T04:01:02Z',
  frictions: [
    { description: 'first', solution: 'x', severity: 'nit' },
    { description: 'Gate  ran\n  twice: "quoted"', solution: 'Add a guard', severity: 'minor' },
  ],
}

describe('occurrenceBlock()', () => {
  it('prints the occurrence as the ledger stores it: start date, flattened quoted text', () => {
    expect(occurrenceBlock(log, 1)).toBe(
      '  - session: session_abc\n    date: "2026-10-14"\n    severity: minor\n    description: "Gate ran twice: \\"quoted\\""\n    solution: "Add a guard"\n',
    )
  })
  it('refuses an index the log has no friction at', () => {
    expect(() => occurrenceBlock(log, 2)).toThrow('no friction 2')
  })
})

describe('groupTriples()', () => {
  it('groups picks by entry in first-seen order', () => {
    expect(groupTriples(['x', 'session_abc', '0', 'y', 'session_def', '1', 'x', 'session_def', '0'])).toEqual(new Map([
      ['x', [{ session: 'session_abc', index: 0 }, { session: 'session_def', index: 0 }]],
      ['y', [{ session: 'session_def', index: 1 }]],
    ]))
  })
  it('refuses a count that is not triples, and an index that is not a whole number', () => {
    expect(() => groupTriples(['x', 'session_abc'])).toThrow('usage')
    expect(() => groupTriples(['x', 'session_abc', 'one'])).toThrow('x session_abc: index must be a whole number')
  })
})

describe('appendPlan()', () => {
  const entry = (name: string) => `name: ${name}\nsummary: S.\ncause: C.\nsurface: safe\nstatus: open\noccurrences:\n  - session: old\n    date: "2026-10-01"\n    severity: nit\n    description: "d"\n    solution: "s"\n`
  const logs = new Map([['session_abc', log], ['session_def', { ...log, session: 'session_def' }]])

  it('appends each entry its blocks, in the order given', () => {
    const plan = appendPlan(groupTriples(['x', 'session_abc', '0', 'y', 'session_def', '1', 'x', 'session_def', '0']), logs, entry)
    expect(plan.get('x')).toBe(entry('x') + occurrenceBlock(log, 0) + occurrenceBlock(logs.get('session_def')!, 0))
    expect(plan.get('y')).toBe(entry('y') + occurrenceBlock(logs.get('session_def')!, 1))
  })
  it('names the entry when a block is refused, and plans nothing', () => {
    expect(() => appendPlan(groupTriples(['x', 'session_abc', '0', 'x', 'session_abc', '1']), logs, entry)).toThrow('x: schema refuses')
    expect(() => appendPlan(groupTriples(['x', 'session_nope', '0']), logs, entry)).toThrow('x: no session log for session_nope')
  })
})
