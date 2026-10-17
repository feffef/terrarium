import { describe, expect, it } from 'vitest'
import { occurrenceBlock } from '../../scripts/print-ledger-occurrence.ts'

describe('occurrenceBlock()', () => {
  const log = {
    session: 'session_abc',
    startedAt: '2026-10-14T04:01:02Z',
    frictions: [
      { description: 'first', solution: 'x', severity: 'nit' },
      { description: 'Gate  ran\n  twice: "quoted"', solution: 'Add a guard', severity: 'minor' },
    ],
  }
  it('prints the occurrence as the ledger stores it: start date, flattened quoted text', () => {
    expect(occurrenceBlock(log, 1)).toBe(
      '  - session: session_abc\n    date: "2026-10-14"\n    severity: minor\n    description: "Gate ran twice: \\"quoted\\""\n    solution: "Add a guard"\n',
    )
  })
  it('refuses an index the log has no friction at', () => {
    expect(() => occurrenceBlock(log, 2)).toThrow('no friction 2')
  })
})
