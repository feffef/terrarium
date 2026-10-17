import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { horizonStart, pruneEntry, pruneLedger, sharedFrictions, summarizeLedger } from '../../scripts/prune-friction-ledger.ts'
import { LEDGER_DIR } from '../../../../../scripts/session-frictions.ts'

const entry = (...occ: [session: string, date: string][]) => `name: x
# kept comment
cause: >-
  A cause.
status: open
occurrences:
${occ.map(([s, d]) => `  - session: ${s}\n    date: "${d}"\n    severity: nit\n`).join('')}`

describe('horizonStart()', () => {
  it('is 14 days before today', () => {
    expect(horizonStart('2026-10-13')).toBe('2026-09-29')
  })
})

describe('pruneEntry()', () => {
  it('drops occurrences before the horizon and keeps the rest of the file as written', () => {
    const { text, dropped } = pruneEntry(entry(['a', '2026-09-28'], ['b', '2026-09-29']), '2026-09-29')
    expect(dropped).toBe(1)
    expect(text).toBe(entry(['b', '2026-09-29']))
  })
  it('returns the text untouched when nothing is old', () => {
    const text = entry(['a', '2026-10-01'])
    expect(pruneEntry(text, '2026-09-29')).toEqual({ text, dropped: 0 })
  })
  it('returns null when no occurrence is left', () => {
    expect(pruneEntry(entry(['a', '2026-09-01']), '2026-09-29')).toEqual({ text: null, dropped: 1 })
  })
})

describe('pruneLedger()', () => {
  let cwd: string
  afterEach(() => rmSync(cwd, { recursive: true, force: true }))
  it('rewrites pruned entries and deletes emptied ones', () => {
    cwd = mkdtempSync(join(tmpdir(), 'ledger-'))
    const dir = join(cwd, LEDGER_DIR)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'old.yml'), entry(['a', '2026-09-01']))
    writeFileSync(join(dir, 'mixed.yml'), entry(['a', '2026-09-01'], ['b', '2026-10-01']))
    expect(pruneLedger('2026-10-13', cwd)).toEqual([
      'mixed.yml: dropped 1 occurrence(s) before 2026-09-29',
      'old.yml: deleted (no occurrence since 2026-09-29)',
    ])
    expect(existsSync(join(dir, 'old.yml'))).toBe(false)
    expect(readFileSync(join(dir, 'mixed.yml'), 'utf8')).not.toContain('2026-09-01')
  })
})

describe('summarizeLedger()', () => {
  let cwd: string
  afterEach(() => rmSync(cwd, { recursive: true, force: true }))
  const fixes = (...prs: [pr: number, date: string][]) => `fixes:\n${prs.map(([p, d]) => `  - pr: ${p}\n    date: "${d}"\n    summary: s\n`).join('')}`
  const withFixes = (fixesText: string, ...occ: [string, string][]) => entry(...occ).replace('status: open', `status: open\n${fixesText}`)
  const setup = () => {
    cwd = mkdtempSync(join(tmpdir(), 'ledger-'))
    const dir = join(cwd, LEDGER_DIR)
    mkdirSync(dir, { recursive: true })
    return dir
  }

  it('lists name, state, ref, in-horizon count, max severity and the latest fix', () => {
    const dir = setup()
    writeFileSync(join(dir, 'x.yml'), withFixes(fixes([1, '2026-10-02'], [7, '2026-10-12']), ['a', '2026-09-01'], ['b', '2026-10-01']).replace('status: open', 'ref: "issue #5"\nstatus: open'))
    writeFileSync(join(dir, 'y.yml'), entry(['a', '2026-10-01']))
    expect(summarizeLedger('2026-10-13', cwd)).toEqual([
      'x | fix landed | issue #5 | 1 in horizon | nit | 2 fixes, latest #7 2026-10-12',
      'x | open | - | 1 in horizon | nit | no fixes',
    ])
  })
  it('takes the latest fix by date whatever their order, and says "fix" for one', () => {
    const dir = setup()
    writeFileSync(join(dir, 'a.yml'), withFixes(fixes([7, '2026-10-12'], [1, '2026-10-02']), ['a', '2026-10-01']))
    writeFileSync(join(dir, 'b.yml'), withFixes(fixes([7, '2026-10-12']), ['a', '2026-10-01']))
    const [a2, b2] = summarizeLedger('2026-10-13', cwd)
    expect(a2).toContain('2 fixes, latest #7 2026-10-12')
    expect(b2).toContain('1 fix, latest #7 2026-10-12')
  })
  it('derives still recurring with the count, likely fixed after a quiet spell, and fix landed before it', () => {
    const dir = setup()
    writeFileSync(join(dir, 'pad.yml'), entry(['a', '2026-10-20']))
    writeFileSync(join(dir, 'recurring.yml'), withFixes(fixes([1, '2026-10-02']), ['a', '2026-10-01'], ['b', '2026-10-05'], ['c', '2026-10-06']))
    writeFileSync(join(dir, 'refixed.yml'), withFixes(fixes([1, '2026-10-02'], [2, '2026-10-06']), ['a', '2026-10-01'], ['b', '2026-10-05']))
    writeFileSync(join(dir, 'sameday.yml'), withFixes(fixes([1, '2026-10-05']), ['a', '2026-10-01'], ['b', '2026-10-05']))
    writeFileSync(join(dir, 'young.yml'), withFixes(fixes([1, '2026-10-19']), ['a', '2026-10-01']))
    const [, recurring, refixed, sameday, young] = summarizeLedger('2026-10-21', cwd)
    expect(recurring).toContain('| still recurring (2 since #1) |')
    expect(refixed).toContain('| likely fixed |')
    expect(sameday).toContain('| likely fixed |')
    expect(young).toContain('| fix landed |')
  })
  it('shows accepted over the derived state', () => {
    const dir = setup()
    writeFileSync(join(dir, 'x.yml'), withFixes(fixes([1, '2026-10-02']), ['a', '2026-10-01'], ['b', '2026-10-05']).replace('status: open', 'status: accepted'))
    expect(summarizeLedger('2026-10-13', cwd)).toEqual(['x | accepted | - | 2 in horizon | nit | 1 fix, latest #1 2026-10-02'])
  })
})

describe('sharedFrictions()', () => {
  it('lists a friction two clusters both hold, by session and description', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'ledger-'))
    const dir = join(cwd, LEDGER_DIR)
    mkdirSync(dir, { recursive: true })
    const occ = (d: string) => `occurrences:\n  - session: s1\n    date: "2026-10-01"\n    severity: nit\n    description: "${d}"\n`
    writeFileSync(join(dir, 'a.yml'), `name: a\n${occ('both guards denied')}`)
    writeFileSync(join(dir, 'b.yml'), `name: b\n${occ('both guards denied')}`)
    writeFileSync(join(dir, 'c.yml'), `name: c\n${occ('something else')}`)
    expect(sharedFrictions(cwd)).toEqual(['a, b: s1 "both guards denied"'])
    rmSync(cwd, { recursive: true, force: true })
  })
})
