import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ARCHIVED_SESSIONS_DIR, readSessionLogs, SESSIONS_DIR } from '../../scripts/session-logs.ts'

describe('readSessionLogs()', () => {
  let dir: string
  beforeEach(() => (dir = mkdtempSync(join(tmpdir(), 'session-logs-test-'))))
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  const put = (folder: string, name: string, yaml: string): void => {
    mkdirSync(join(dir, folder), { recursive: true })
    writeFileSync(join(dir, folder, name), yaml)
  }
  const sorted = (logs: ReturnType<typeof readSessionLogs>) => [...logs].sort((a, b) => a.file.localeCompare(b.file))

  it('reads only current .yml logs when archived is off', () => {
    put(SESSIONS_DIR, 'a.yml', 'session: a\n')
    put(SESSIONS_DIR, 'notes.md', 'session: ignored\n')
    put(ARCHIVED_SESSIONS_DIR, 'old.yml', 'session: old\n')
    expect(readSessionLogs(dir, { archived: false })).toEqual([
      { file: 'layers/journal/content/current/sessions/a.yml', data: { session: 'a' } },
    ])
  })

  it('reads both folders when archived is on', () => {
    put(SESSIONS_DIR, 'a.yml', 'session: a\n')
    put(ARCHIVED_SESSIONS_DIR, 'old.yml', 'session: old\n')
    expect(sorted(readSessionLogs(dir, { archived: true }))).toEqual([
      { file: 'layers/journal/content/archived/sessions/old.yml', data: { session: 'old' } },
      { file: 'layers/journal/content/current/sessions/a.yml', data: { session: 'a' } },
    ])
  })

  it('yields a filename present in both folders once, as its current copy', () => {
    put(SESSIONS_DIR, 'x.yml', 'session: x\nstatus: amended\n')
    put(ARCHIVED_SESSIONS_DIR, 'x.yml', 'session: x\nstatus: original\n')
    expect(readSessionLogs(dir, { archived: true })).toEqual([
      { file: 'layers/journal/content/current/sessions/x.yml', data: { session: 'x', status: 'amended' } },
    ])
  })

  it('yields nothing for a missing folder', () => {
    expect(readSessionLogs(dir, { archived: true })).toEqual([])
    put(ARCHIVED_SESSIONS_DIR, 'old.yml', 'session: old\n')
    expect(readSessionLogs(dir, { archived: false })).toEqual([])
  })

  it('skips a document that is not an object', () => {
    put(SESSIONS_DIR, 'empty.yml', '')
    put(SESSIONS_DIR, 'scalar.yml', 'just text\n')
    put(SESSIONS_DIR, 'a.yml', 'session: a\n')
    expect(readSessionLogs(dir, { archived: false }).map((l) => l.data.session)).toEqual(['a'])
  })

  it('surfaces a YAML parse error rather than swallowing it', () => {
    put(SESSIONS_DIR, 'bad.yml', 'session: [unclosed\n')
    expect(() => readSessionLogs(dir, { archived: false })).toThrow()
  })
})
