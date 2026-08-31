// Unit tests for the Journal archival helper's pure core (the retained-date
// budget, digest/session classification) and its git-mv shell over a throwaway
// git repo.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  applyArchive,
  ARCHIVED_DIGESTS_DIR,
  buildPlan,
  datesToRetain,
  digestDate,
  parseSessionEndedDate,
  planArchive,
  planPart,
  RETAIN_DATES,
} from '../../scripts/archive-journal-content.ts'
import { ARCHIVED_SESSIONS_DIR, SESSIONS_DIR } from '../../scripts/audit-skills.ts'
import { DIGESTS_DIR } from '../../scripts/digest.ts'

describe('datesToRetain()', () => {
  it('keeps the newest N distinct dates present', () => {
    expect(datesToRetain(['2026-07-20', '2026-07-21', '2026-07-22'], 2)).toEqual(
      new Set(['2026-07-21', '2026-07-22']),
    )
  })

  it('counts distinct dates, not files — a busy date spends one slot', () => {
    const dates = ['2026-07-20', '2026-07-21', '2026-07-21', '2026-07-21', '2026-07-22']
    expect(datesToRetain(dates, 2)).toEqual(new Set(['2026-07-21', '2026-07-22']))
  })

  it('ignores calendar gaps — a quiet day never spends a slot', () => {
    // 07-21..07-23 are missing entirely; the budget still yields 3 real dates.
    expect(datesToRetain(['2026-07-19', '2026-07-20', '2026-07-24'], 3)).toEqual(
      new Set(['2026-07-19', '2026-07-20', '2026-07-24']),
    )
  })

  it('keeps everything when fewer dates exist than the budget', () => {
    expect(datesToRetain(['2026-07-20', '2026-07-21'], 7)).toEqual(new Set(['2026-07-20', '2026-07-21']))
  })

  it('retains nothing for a zero or negative budget', () => {
    expect(datesToRetain(['2026-07-20'], 0)).toEqual(new Set())
    expect(datesToRetain(['2026-07-20'], -1)).toEqual(new Set())
  })

  it('is empty for no dates at all', () => {
    expect(datesToRetain([], 7)).toEqual(new Set())
  })
})

describe('digestDate()', () => {
  it('reads the date off a YYYY-MM-DD.md filename', () => {
    expect(digestDate('2026-07-17.md')).toBe('2026-07-17')
  })

  it('throws on a filename that is not a plain YYYY-MM-DD.md', () => {
    expect(() => digestDate('index.md')).toThrow(/unexpected digest filename/)
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

describe('planPart()', () => {
  it('splits files by whether their date survives the budget, reporting the survivors', () => {
    const entries = [
      { file: 'old.yml', date: '2026-07-17' },
      { file: 'a.yml', date: '2026-07-18' },
      { file: 'b.yml', date: '2026-07-18' },
      { file: 'c.yml', date: '2026-07-19' },
    ]
    expect(planPart(entries, 2)).toEqual({
      retained: ['2026-07-18', '2026-07-19'],
      keep: ['a.yml', 'b.yml', 'c.yml'],
      archive: ['old.yml'],
    })
  })

  it('archives nothing when the dates present fit inside the budget', () => {
    const entries = [{ file: 'a.yml', date: '2026-07-18' }]
    expect(planPart(entries, 7)).toEqual({ retained: ['2026-07-18'], keep: ['a.yml'], archive: [] })
  })
})

describe('buildPlan()', () => {
  it('applies the budget to each kind independently', () => {
    const plan = buildPlan(
      ['2026-07-17.md', '2026-07-18.md', '2026-07-19.md'],
      [
        { file: 'a.yml', date: '2026-07-10' },
        { file: 'b.yml', date: '2026-07-24' },
      ],
      2,
    )
    expect(plan).toEqual({
      digests: {
        retained: ['2026-07-18', '2026-07-19'],
        keep: ['2026-07-18.md', '2026-07-19.md'],
        archive: ['2026-07-17.md'],
      },
      sessions: { retained: ['2026-07-10', '2026-07-24'], keep: ['a.yml', 'b.yml'], archive: [] },
    })
  })

  it('defaults the budget to RETAIN_DATES (7)', () => {
    expect(RETAIN_DATES).toBe(7)
    const digests = ['15', '16', '17', '18', '19', '20', '21', '22'].map((d) => `2026-07-${d}.md`)
    const plan = buildPlan(digests, [])
    expect(plan.digests.keep).toHaveLength(7)
    expect(plan.digests.archive).toEqual(['2026-07-15.md'])
  })

  // The regression this retention model exists for: a Digest covers a *closed*
  // UTC day, so today's never exists yet. A window measured back from today
  // spent a slot on it and left only six Digests on `current`.
  it("leaves a full RETAIN_DATES Digests even though today's is not written yet", () => {
    // Today is 2026-07-29; digests run 07-23..07-28, i.e. seven closed days
    // back from yesterday. All seven survive.
    const digests = ['22', '23', '24', '25', '26', '27', '28'].map((d) => `2026-07-${d}.md`)
    const plan = buildPlan(digests, [])
    expect(plan.digests.keep).toHaveLength(RETAIN_DATES)
    expect(plan.digests.archive).toEqual([])
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
    const plan = planArchive(dir, 1) // budget of 1 date, so the older of each pair ages out
    expect(plan.digests).toEqual({
      retained: ['2026-07-24'],
      keep: ['2026-07-24.md'],
      archive: ['2026-07-17.md'],
    })
    expect(plan.sessions).toEqual({
      retained: ['2026-07-24'],
      keep: ['2026-07-24-session_new.yml'],
      archive: ['2026-07-10-session_old.yml'],
    })
  })

  it('the default RETAIN_DATES budget keeps this whole fixture — two dates fit inside seven', () => {
    initRepo()
    const plan = planArchive(dir)
    expect(plan.digests.archive).toEqual([])
    expect(plan.sessions.archive).toEqual([])
  })

  it('applyArchive() git-mv\'s only the aged-out files, creating destination dirs as needed', () => {
    initRepo()
    const plan = planArchive(dir, 1)
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
    const first = planArchive(dir, 1)
    applyArchive(dir, first)
    execFileSync('git', ['add', '-A'], { cwd: dir })
    execFileSync('git', ['commit', '-q', '-m', 'archive'], { cwd: dir })

    const second = planArchive(dir, 1)
    expect(second.digests.archive).toEqual([])
    expect(second.sessions.archive).toEqual([])
  })

  it('aborts the whole run on a malformed session file, moving nothing', () => {
    initRepo()
    writeFileSync(join(dir, SESSIONS_DIR, '2026-07-01-session_bad.yml'), 'session: broken\n') // no endedAt
    expect(() => planArchive(dir)).toThrow(/no valid endedAt/)
  })

  // Regression test for issue #1093: a session log archived once, then
  // amended by log-session back into `current` under the same filename, must
  // not fatal-error the next sweep on the `git mv` destination collision.
  it('applyArchive() overwrites a stale archived copy left by an earlier pass, instead of failing', () => {
    initRepo()
    const file = '2026-07-10-session_old.yml'
    const archivedPath = join(dir, ARCHIVED_SESSIONS_DIR, file)

    // Simulate the prior archive pass having already moved this file out...
    writeFileSync(archivedPath, session('2026-07-10T12:00:00Z'))
    // ...and log-session having since amended it back into `current`.
    writeFileSync(join(dir, SESSIONS_DIR, file), session('2026-07-10T18:00:00Z'))
    execFileSync('git', ['add', '-A'], { cwd: dir })
    execFileSync('git', ['commit', '-q', '-m', 'simulate archive + amend'], { cwd: dir })

    const plan = planArchive(dir, 1)
    expect(() => applyArchive(dir, plan)).not.toThrow()

    // The amended (current) copy wins — its content overwrote the stale archived one.
    expect(existsSync(join(dir, SESSIONS_DIR, file))).toBe(false)
    expect(readFileSync(archivedPath, 'utf8')).toBe(session('2026-07-10T18:00:00Z'))
  })
})
