import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { horizonStart, pruneEntry, pruneLedger } from '../../scripts/prune-friction-ledger.ts'

const entry = (...dates: string[]) => `name: x
# kept comment
cause: >-
  A cause.
status: open
occurrences:
${dates.map((d, i) => `  - session: s${i}\n    date: "${d}"\n    severity: nit\n`).join('')}`

describe('horizonStart()', () => {
  it('is 14 days before today', () => {
    expect(horizonStart('2026-10-13')).toBe('2026-09-29')
  })
})

describe('pruneEntry()', () => {
  it('drops occurrences before the horizon and keeps the rest of the file as written', () => {
    const { text, dropped } = pruneEntry(entry('2026-09-28', '2026-09-29'), '2026-09-29')
    expect(dropped).toBe(1)
    expect(text).toBe(entry('2026-09-29').replace('s0', 's1'))
  })
  it('returns the text untouched when nothing is old', () => {
    const text = entry('2026-10-01')
    expect(pruneEntry(text, '2026-09-29')).toEqual({ text, dropped: 0 })
  })
  it('returns null when no occurrence is left', () => {
    expect(pruneEntry(entry('2026-09-01'), '2026-09-29')).toEqual({ text: null, dropped: 1 })
  })
})

describe('pruneLedger()', () => {
  let cwd: string
  afterEach(() => rmSync(cwd, { recursive: true, force: true }))
  it('rewrites pruned entries and deletes emptied ones', () => {
    cwd = mkdtempSync(join(tmpdir(), 'ledger-'))
    const dir = join(cwd, 'layers/journal/content/current/frictions')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'old.yml'), entry('2026-09-01'))
    writeFileSync(join(dir, 'mixed.yml'), entry('2026-09-01', '2026-10-01'))
    expect(pruneLedger('2026-10-13', cwd)).toHaveLength(2)
    expect(existsSync(join(dir, 'old.yml'))).toBe(false)
    expect(readFileSync(join(dir, 'mixed.yml'), 'utf8')).not.toContain('2026-09-01')
  })
})
