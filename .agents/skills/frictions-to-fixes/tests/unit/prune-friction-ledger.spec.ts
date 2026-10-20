import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { candidateLabels, horizonStart, pruneEntry, pruneLedger, regressionCheck, sharedFrictions, summarizeLedger } from '../../scripts/prune-friction-ledger.ts'
import { LEDGER_DIR } from '../../../../../scripts/session/extract-frictions.ts'

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
  it('ends with the newest note in full, only when the entry has notes', () => {
    const dir = setup()
    const newest = `2026-10-20 design: ${'x'.repeat(90)} dropped: costs more than it saves`
    writeFileSync(join(dir, 'a.yml'), entry(['a', '2026-10-01']).replace('status: open', `status: open\nnotes: |-\n  2026-10-10 design: old dropped: why\n  ${newest}`))
    writeFileSync(join(dir, 'b.yml'), entry(['a', '2026-10-01']))
    const [a, b] = summarizeLedger('2026-10-13', cwd)
    expect(a!.endsWith(` | note: ${newest}`)).toBe(true)
    expect(b).toBe('x | open | - | 1 in horizon | nit | no fixes')
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

describe('same-day occurrences and --candidates', () => {
  let cwd: string
  afterEach(() => rmSync(cwd, { recursive: true, force: true }))
  const fixed = (...occ: [string, string][]) => entry(...occ).replace('status: open', 'status: open\nfixes:\n  - pr: 1\n    date: "2026-10-05"\n    summary: s')
  const setup = (files: Record<string, string>, starts: Record<string, string> = {}) => {
    cwd = mkdtempSync(join(tmpdir(), 'ledger-'))
    const dir = join(cwd, LEDGER_DIR)
    mkdirSync(dir, { recursive: true })
    for (const [f, text] of Object.entries(files)) writeFileSync(join(dir, f), text)
    const sessions = join(cwd, 'layers/journal/content/archived/sessions')
    mkdirSync(sessions, { recursive: true })
    for (const [s, t] of Object.entries(starts)) writeFileSync(join(sessions, `${t.slice(0, 10)}-${s}.yml`), `id: ${s}\nstartedAt: ${t}\n`)
  }
  const merges = new Map([[1, '2026-10-05T12:00:00Z']])

  it('counts a same-day occurrence whose session started after the fix merged, and not one before', () => {
    setup(
      { 'after.yml': fixed(['early', '2026-10-01'], ['late', '2026-10-05']), 'before.yml': fixed(['early', '2026-10-01'], ['morning', '2026-10-05']) },
      { late: '2026-10-05T13:00:00Z', morning: '2026-10-05T11:00:00Z' },
    )
    const check = regressionCheck(cwd, merges)
    const [after, before] = summarizeLedger('2026-10-06', cwd, check)
    expect(after).toContain('| still recurring (1 since #1) |')
    expect(before).toContain('| fix landed |')
    expect(check.fallbacks).toEqual([])
  })
  it('falls back to the date and says so when a time is missing', () => {
    setup({ 'x.yml': fixed(['nolog', '2026-10-05']) })
    const check = regressionCheck(cwd, new Map())
    expect(summarizeLedger('2026-10-06', cwd, check)[0]).toContain('| fix landed |')
    expect(check.fallbacks).toEqual(['nolog on #1\'s merge day: compared by date (no merge commit for #1 on origin/main, no session log startedAt)'])
  })
  it('labels each entry never-fixed, regression, open-already or drop', () => {
    setup(
      {
        'a.yml': entry(['s', '2026-10-01']),
        'b.yml': fixed(['late', '2026-10-05']),
        'c.yml': entry(['s', '2026-10-01']).replace('status: open', 'ref: "issue #9"\nstatus: tracked'),
        'd.yml': fixed(['early', '2026-10-01']),
        'e.yml': fixed(['late', '2026-10-05']).replace('status: open', 'status: accepted'),
        'f.yml': fixed(['late', '2026-10-05']).replace('status: open', 'ref: "issue #8 (closed)"\nstatus: open'),
      },
      { late: '2026-10-05T13:00:00Z' },
    )
    expect(candidateLabels('2026-10-06', cwd, regressionCheck(cwd, merges))).toEqual([
      'x | never-fixed | nit | 1 in horizon | -',
      'x | regression of #1 (1 since) | nit | 1 in horizon | -',
      'x | open-already? (ref names #9; check it is open) | nit | 1 in horizon | issue #9',
      'x | drop (fixed by #1, none since) | nit | 1 in horizon | -',
      'x | drop (accepted) | nit | 1 in horizon | -',
      'x | regression of #1 (1 since) | nit | 1 in horizon | issue #8 (closed)',
    ])
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
