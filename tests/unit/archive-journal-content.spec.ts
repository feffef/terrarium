// Unit tests for the Journal archival helper's pure core (cutoff math, digest/
// session classification) and its git-mv shell over a throwaway git repo.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  applyArchive,
  ARCHIVED_DIGESTS_DIR,
  buildPlan,
  classifyDigests,
  classifySessions,
  cutoffDate,
  isOldEnoughToArchive,
  parseSessionEndedDate,
  planArchive,
  RETAIN_DAYS,
} from '../../scripts/archive-journal-content.ts'
import { ARCHIVED_SESSIONS_DIR, SESSIONS_DIR } from '../../scripts/audit-skills.ts'
import { DIGESTS_DIR } from '../../scripts/digest.ts'

describe('cutoffDate()', () => {
  it('keeps today + the previous (retainDays - 1) UTC dates, today inclusive', () => {
    expect(cutoffDate(new Date('2026-07-24T10:00:00Z'), 7)).toBe('2026-07-18')
  })

  it('is unaffected by the time-of-day component', () => {
    expect(cutoffDate(new Date('2026-07-24T23:59:59Z'), 7)).toBe('2026-07-18')
    expect(cutoffDate(new Date('2026-07-24T00:00:00Z'), 7)).toBe('2026-07-18')
  })

  it('rolls over a month boundary correctly', () => {
    expect(cutoffDate(new Date('2026-08-02T10:00:00Z'), 7)).toBe('2026-07-27')
  })

  it('a single retained day keeps only today', () => {
    expect(cutoffDate(new Date('2026-07-24T10:00:00Z'), 1)).toBe('2026-07-24')
  })
})

describe('isOldEnoughToArchive()', () => {
  it('a date before the cutoff archives', () => {
    expect(isOldEnoughToArchive('2026-07-17', '2026-07-18')).toBe(true)
  })
  it('the cutoff date itself is kept, not archived', () => {
    expect(isOldEnoughToArchive('2026-07-18', '2026-07-18')).toBe(false)
  })
  it('a date after the cutoff is kept', () => {
    expect(isOldEnoughToArchive('2026-07-24', '2026-07-18')).toBe(false)
  })
})

describe('classifyDigests()', () => {
  it('splits filenames by their own date against the cutoff', () => {
    const files = ['2026-07-17.md', '2026-07-18.md', '2026-07-24.md']
    expect(classifyDigests(files, '2026-07-18')).toEqual({
      keep: ['2026-07-18.md', '2026-07-24.md'],
      archive: ['2026-07-17.md'],
    })
  })

  it('throws on a filename that is not a plain YYYY-MM-DD.md', () => {
    expect(() => classifyDigests(['index.md'], '2026-07-18')).toThrow(/unexpected digest filename/)
  })
})

describe('parseSessionEndedDate()', () => {
  it('reads the UTC date off endedAt', () => {
    expect(parseSessionEndedDate('endedAt: 2026-07-17T23:50:00Z\n', 'f.yml')).toBe('2026-07-17')
  })

  it('a session started one day and ended the next is dated by endedAt, not the filename', () => {
    // The filename would say 2026-07-17, but endedAt crossed into 07-18.
    expect(parseSessionEndedDate('startedAt: 2026-07-17T23:50:00Z\nendedAt: 2026-07-18T00:10:00Z\n', 'f.yml')).toBe(
      '2026-07-18',
    )
  })

  it('throws on missing endedAt', () => {
    expect(() => parseSessionEndedDate('session: s\n', 'f.yml')).toThrow(/no valid endedAt/)
  })

  it('throws on an unparseable endedAt value', () => {
    expect(() => parseSessionEndedDate('endedAt: not-a-date\n', 'f.yml')).toThrow(/unparseable endedAt/)
  })

  it('throws on invalid YAML', () => {
    expect(() => parseSessionEndedDate('endedAt: [unterminated\n', 'f.yml')).toThrow(/not valid YAML/)
  })
})

describe('classifySessions()', () => {
  it('splits by endedAtDate against the cutoff', () => {
    const entries = [
      { file: 'a.yml', endedAtDate: '2026-07-17' },
      { file: 'b.yml', endedAtDate: '2026-07-18' },
    ]
    expect(classifySessions(entries, '2026-07-18')).toEqual({ keep: ['b.yml'], archive: ['a.yml'] })
  })
})

describe('buildPlan()', () => {
  it('composes the cutoff with both classifications', () => {
    const plan = buildPlan(
      ['2026-07-17.md', '2026-07-18.md'],
      [
        { file: 'a.yml', endedAtDate: '2026-07-10' },
        { file: 'b.yml', endedAtDate: '2026-07-24' },
      ],
      new Date('2026-07-24T12:00:00Z'),
      7,
    )
    expect(plan).toEqual({
      cutoff: '2026-07-18',
      digests: { keep: ['2026-07-18.md'], archive: ['2026-07-17.md'] },
      sessions: { keep: ['b.yml'], archive: ['a.yml'] },
    })
  })

  it('defaults retainDays to RETAIN_DAYS (7)', () => {
    const plan = buildPlan(['2026-07-17.md'], [], new Date('2026-07-24T12:00:00Z'))
    expect(plan.cutoff).toBe('2026-07-18')
    expect(RETAIN_DAYS).toBe(7)
  })
})

describe('planArchive() / applyArchive() — the fs/git shell, over a throwaway repo', () => {
  let dir: string

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  function session(endedAt: string): string {
    return [
      'session: session_test',
      'startedAt: 2026-07-01T00:00:00Z',
      `endedAt: ${endedAt}`,
      'kind: interactive',
      'goal: test fixture',
      'status: completed',
      'outcome: fixture',
      'summary: a synthetic fixture entry',
      'frictions: []',
    ].join('\n') + '\n'
  }

  function initRepo(): void {
    dir = mkdtempSync(join(tmpdir(), 'archive-journal-content-'))
    execFileSync('git', ['init', '-q'], { cwd: dir })
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir })
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir })

    mkdirSync(join(dir, DIGESTS_DIR), { recursive: true })
    mkdirSync(join(dir, SESSIONS_DIR), { recursive: true })
    mkdirSync(join(dir, ARCHIVED_SESSIONS_DIR), { recursive: true }) // pre-exists, like the real repo

    writeFileSync(join(dir, DIGESTS_DIR, '2026-07-17.md'), '# old digest\n')
    writeFileSync(join(dir, DIGESTS_DIR, '2026-07-24.md'), '# recent digest\n')
    writeFileSync(join(dir, SESSIONS_DIR, '2026-07-10-session_old.yml'), session('2026-07-10T12:00:00Z'))
    writeFileSync(join(dir, SESSIONS_DIR, '2026-07-24-session_new.yml'), session('2026-07-24T12:00:00Z'))

    execFileSync('git', ['add', '-A'], { cwd: dir })
    execFileSync('git', ['commit', '-q', '-m', 'fixture'], { cwd: dir })
  }

  it('planArchive() reads real directories and produces the expected split', () => {
    initRepo()
    const plan = planArchive(dir, new Date('2026-07-24T12:00:00Z'))
    expect(plan.cutoff).toBe('2026-07-18')
    expect(plan.digests).toEqual({ keep: ['2026-07-24.md'], archive: ['2026-07-17.md'] })
    expect(plan.sessions).toEqual({ keep: ['2026-07-24-session_new.yml'], archive: ['2026-07-10-session_old.yml'] })
  })

  it('applyArchive() git-mv\'s only the aged-out files, creating destination dirs as needed', () => {
    initRepo()
    const plan = planArchive(dir, new Date('2026-07-24T12:00:00Z'))
    applyArchive(dir, plan)

    // Moved: no longer under current, now under archived, with content intact.
    expect(existsSync(join(dir, DIGESTS_DIR, '2026-07-17.md'))).toBe(false)
    expect(readFileSync(join(dir, ARCHIVED_DIGESTS_DIR, '2026-07-17.md'), 'utf8')).toBe('# old digest\n')
    expect(existsSync(join(dir, SESSIONS_DIR, '2026-07-10-session_old.yml'))).toBe(false)
    expect(readFileSync(join(dir, ARCHIVED_SESSIONS_DIR, '2026-07-10-session_old.yml'), 'utf8')).toBe(
      session('2026-07-10T12:00:00Z'),
    )

    // Kept: untouched, still under current.
    expect(existsSync(join(dir, DIGESTS_DIR, '2026-07-24.md'))).toBe(true)
    expect(existsSync(join(dir, SESSIONS_DIR, '2026-07-24-session_new.yml'))).toBe(true)

    // git itself recognizes these as renames (history/blame preserved), not delete+add.
    const status = execFileSync('git', ['status', '--porcelain'], { cwd: dir, encoding: 'utf8' })
    const renameLines = status.split('\n').filter((l) => l.startsWith('R '))
    expect(renameLines).toHaveLength(2)
  })

  it('is idempotent — a second planArchive() against the already-moved tree finds nothing left to archive', () => {
    initRepo()
    const first = planArchive(dir, new Date('2026-07-24T12:00:00Z'))
    applyArchive(dir, first)
    execFileSync('git', ['add', '-A'], { cwd: dir })
    execFileSync('git', ['commit', '-q', '-m', 'archive'], { cwd: dir })

    const second = planArchive(dir, new Date('2026-07-24T12:00:00Z'))
    expect(second.digests.archive).toEqual([])
    expect(second.sessions.archive).toEqual([])
  })

  it('aborts the whole run on a malformed session file, moving nothing', () => {
    initRepo()
    writeFileSync(join(dir, SESSIONS_DIR, '2026-07-01-session_bad.yml'), 'session: broken\n') // no endedAt
    expect(() => planArchive(dir, new Date('2026-07-24T12:00:00Z'))).toThrow(/no valid endedAt/)
  })
})
