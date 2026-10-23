import { describe, expect, it } from 'vitest'
import { parseArgs, setEntry } from '../../scripts/ledger-set.ts'
import { occurrenceBlock } from '../../scripts/print-ledger-occurrence.ts'

const entry = `name: x
# kept comment
summary: A summary.
cause: >-
  A cause.
surface: safe
status: open
fixes:
  - pr: 10
    date: "2026-10-01"
    summary: "First fix."
occurrences:
  - session: a
    date: "2026-10-02"
    severity: nit
    description: "d"
    solution: "s"
`

describe('setEntry()', () => {
  it('sets status and keeps the rest of the file as written', () => {
    expect(setEntry(entry, { status: 'tracked' })).toBe(entry.replace('status: open', 'status: tracked'))
  })
  it('adds ref as free text, quoting a leading #', () => {
    expect(setEntry(entry, { ref: '#2344 closed without narrowing it' })).toBe(
      entry.replace('status: open\n', 'status: open\nref: "#2344 closed without narrowing it"\n'),
    )
  })
  it('appends a fix in the stored style', () => {
    expect(setEntry(entry, { fixes: [{ pr: 11, date: '2026-10-03', summary: 'Second fix.' }] })).toBe(
      entry.replace('occurrences:', '  - pr: 11\n    date: "2026-10-03"\n    summary: "Second fix."\noccurrences:'),
    )
  })
  it('replaces the fixes with replaceFixes', () => {
    expect(setEntry(entry, { fixes: [{ pr: 12, date: '2026-10-04', summary: 'Only fix.' }], replaceFixes: true })).toBe(
      entry.replace(/fixes:\n[\s\S]*?occurrences:/, 'fixes:\n  - pr: 12\n    date: "2026-10-04"\n    summary: "Only fix."\noccurrences:'),
    )
  })
  it('appends occurrence blocks as print-ledger-occurrence.ts prints them', () => {
    const block = occurrenceBlock({ session: 'b', startedAt: '2026-10-05T01:00:00Z', frictions: [{ severity: 'minor', description: 'e', solution: 't' }] }, 0)
    expect(setEntry(entry, { occurrences: block })).toBe(entry + block)
  })
  it('refuses a result the ledger schema rejects, naming the field', () => {
    expect(() => setEntry(entry, { status: 'done' })).toThrow('status')
    const dup = occurrenceBlock({ session: 'a', startedAt: '2026-10-05T01:00:00Z', frictions: [{ severity: 'nit', description: 'e', solution: 't' }] }, 0)
    expect(() => setEntry(entry, { occurrences: dup })).toThrow('a session is listed twice')
  })
})

describe('parseArgs()', () => {
  it('reads every flag, --fix taking three values', () => {
    expect(parseArgs(['x', '--status', 'open', '--ref', 'r', '--fix', '5', '2026-10-01', 'S', '--replace-fixes'])).toEqual({
      entry: 'x',
      changes: { status: 'open', ref: 'r', fixes: [{ pr: 5, date: '2026-10-01', summary: 'S' }], replaceFixes: true },
    })
  })
})
