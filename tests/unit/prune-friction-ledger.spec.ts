import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { horizonStart, pruneEntry, pruneLedger, summarizeLedger } from '../../scripts/prune-friction-ledger.ts'
import { LEDGER_DIR } from '../../scripts/session-frictions.ts'

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
  it('lists name, status, ref, in-horizon count and max severity', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'ledger-'))
    const dir = join(cwd, LEDGER_DIR)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'x.yml'), entry(['a', '2026-09-01'], ['b', '2026-10-01']).replace('status: open', 'status: fixed\nref: "PR #1"'))
    expect(summarizeLedger('2026-10-13', cwd)).toEqual(['x | fixed | PR #1 | 1 in horizon | nit'])
    rmSync(cwd, { recursive: true, force: true })
  })
})
