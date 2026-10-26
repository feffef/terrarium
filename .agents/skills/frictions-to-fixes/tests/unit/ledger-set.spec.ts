import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseArgs, setEntry, writeEntry } from '../../scripts/ledger-set.ts'
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
  it('adds notes as a |- block in field order, one line per note', () => {
    expect(setEntry(entry, { notes: ['2026-10-05 one', '2026-10-06 two'] })).toBe(
      entry.replace('status: open\n', 'status: open\nnotes: |-\n  2026-10-05 one\n  2026-10-06 two\n'),
    )
  })
  it('appends a note, keeping the existing lines byte-for-byte', () => {
    const noted = entry.replace('status: open\n', 'status: open\nnotes: |-\n  2026-10-01 design: "x" dropped: #12 says no\n  2026-10-02 two\n')
    expect(setEntry(noted, { notes: ['2026-10-03 three'] })).toBe(noted.replace('two\n', 'two\n  2026-10-03 three\n'))
  })
  it('removes ref when cleared, keeping the rest as written', () => {
    const withRef = entry.replace('status: open\n', 'status: open\nref: "#1 open"\n')
    expect(setEntry(withRef, { ref: '' })).toBe(entry)
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
  it('reads repeated --note, --clear-ref, and --create with its fields', () => {
    expect(parseArgs(['x', '--note', 'a', '--note', 'b', '--clear-ref']).changes).toEqual({ notes: ['a', 'b'], ref: '' })
    expect(parseArgs(['y', '--create', '--summary', 'S', '--cause', 'C', '--surface', 'safe']).changes).toEqual({ create: { summary: 'S', cause: 'C', surface: 'safe' } })
  })
  it('refuses a ref clear combined with a --ref, and a create field without --create', () => {
    expect(() => parseArgs(['x', '--ref', 'r', '--clear-ref'])).toThrow('ref given twice')
    expect(() => parseArgs(['x', '--summary', 'S'])).toThrow('--summary needs --create')
  })
  it('refuses --replace-fixes without a --fix, which would empty the list', () => {
    expect(() => setEntry(entry, parseArgs(['x', '--replace-fixes']).changes)).toThrow('--replace-fixes needs at least one --fix')
  })
})

describe('writeEntry()', () => {
  let dir: string
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'ledger-set-')) })
  afterEach(() => rmSync(dir, { recursive: true, force: true }))
  const create = { summary: 'S.', cause: 'C.', surface: 'safe' }

  it('creates a new entry, open by default, that an occurrence append then fills', () => {
    writeEntry(dir, 'y', { create })
    expect(readFileSync(join(dir, 'y.yml'), 'utf8')).toBe('name: y\nsummary: S.\ncause: C.\nsurface: safe\nstatus: open\noccurrences: []\n')
    const block = occurrenceBlock({ session: 'b', startedAt: '2026-10-05T01:00:00Z', frictions: [{ severity: 'minor', description: 'e', solution: 't' }] }, 0)
    writeEntry(dir, 'y', { occurrences: block })
    expect(readFileSync(join(dir, 'y.yml'), 'utf8')).toBe(`name: y\nsummary: S.\ncause: C.\nsurface: safe\nstatus: open\noccurrences:\n${block}`)
  })
  it('refuses to create an entry that exists, and leaves it as written', () => {
    writeFileSync(join(dir, 'x.yml'), entry)
    expect(() => writeEntry(dir, 'x', { create })).toThrow('x already exists')
    expect(readFileSync(join(dir, 'x.yml'), 'utf8')).toBe(entry)
  })
  it('refuses to create an entry missing a required field, naming it, and writes nothing', () => {
    expect(() => writeEntry(dir, 'y', { create: { summary: 'S.', surface: 'safe' } })).toThrow('cause')
    expect(existsSync(join(dir, 'y.yml'))).toBe(false)
  })
})
