// Unit tests for prune-trial-window's pure core — parsing, the raw-first-line
// search-key extraction (the fix for the `-S` line-wrap miss), and the
// three-day boundary math, plus `buildWindows` against a throwaway git repo.
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildWindows,
  earliestJudgeableAtUtc,
  isJudgeable,
  parseTrials,
  rawProblemFirstLines,
  selectTrials,
  type TrialWithSearchKey,
} from '../../scripts/prune-trial-window.ts'

const LEDGER = `# header comment, ordinary YAML below
trials:
  - problem: >
      A wall of prose about pkill teardown that wraps across
      several lines once YAML folds it.
    territory:
      paths:
        - CLAUDE.md
    opened: 2026-08-23
    check: >
      how you'd tell.
  - problem: >
      A second entry about ADR-0009's amendment history.
    territory:
      paths:
        - docs/adr/0009-session-logs-commit-directly-to-main.md
    opened: 2026-08-25
    check: >
      how you'd tell.
`

describe('parseTrials()', () => {
  it('reads every trial in the ledger, folded YAML and all', () => {
    const trials = parseTrials(LEDGER)
    expect(trials).toHaveLength(2)
    expect(trials[0]!.opened).toBe('2026-08-23')
    expect(trials[1]!.opened).toBe('2026-08-25')
    // The parsed `problem` is YAML-folded: the line break becomes a space.
    expect(trials[0]!.problem).toContain('teardown that wraps across several lines')
  })

  it('returns an empty list for a ledger with no trials', () => {
    expect(parseTrials('trials: []\n')).toEqual([])
  })
})

describe('rawProblemFirstLines()', () => {
  it("extracts each entry's literal raw first line, unfolded", () => {
    const lines = rawProblemFirstLines(LEDGER)
    expect(lines).toEqual([
      'A wall of prose about pkill teardown that wraps across',
      "A second entry about ADR-0009's amendment history.",
    ])
  })

  it('is a literal substring of the raw file — the exact property `-S` needs', () => {
    for (const line of rawProblemFirstLines(LEDGER)) {
      expect(LEDGER.includes(line)).toBe(true)
    }
  })

  it('is NOT a substring the parsed (folded) problem text guarantees past a wrap', () => {
    // The folded value joins the two source lines with a single space, so
    // searching for a phrase that spans the wrap succeeds against the
    // *parsed* text but would miss on `-S` against the raw file. This is the
    // exact failure PR #1061 hit.
    const trials = parseTrials(LEDGER)
    const spansTheWrap = 'wraps across\n      several lines' // raw form
    expect(trials[0]!.problem.includes('wraps across several lines')).toBe(true) // folded: matches
    expect(LEDGER.includes(spansTheWrap.replace('\n      ', ' '))).toBe(false) // raw: does not
  })
})

// These pin down the pure floor math exactly, but the floor itself is a
// "never before this" bound, not a deadline any real run is expected to hit —
// `/prune-trial` runs on a scheduled Routine with no exact-timing guarantee,
// so judging any amount of time *after* the floor is normal and correct.
describe('earliestJudgeableAtUtc() / isJudgeable() — the three-day floor', () => {
  const LANDED = '2026-08-25T20:23:39.000Z'

  it('the floor sits exactly three days after landing, not "the third calendar date"', () => {
    expect(earliestJudgeableAtUtc(LANDED)).toBe('2026-08-28T20:23:39.000Z')
  })

  it('is not judgeable one day after landing, even on a later calendar date', () => {
    // This is the PR #1061 shape: landed 2026-08-25 20:23 UTC, "judged"
    // 2026-08-27 13:28 UTC — a later calendar date, but under 48 hours in.
    expect(isJudgeable(LANDED, new Date('2026-08-27T13:28:18.000Z'))).toBe(false)
  })

  it('is not judgeable a moment before the floor', () => {
    expect(isJudgeable(LANDED, new Date('2026-08-28T20:23:38.999Z'))).toBe(false)
  })

  it('is judgeable at the floor, and any time after it', () => {
    expect(isJudgeable(LANDED, new Date('2026-08-28T20:23:39.000Z'))).toBe(true)
    // A day-plus late, as an actual scheduled run's fire time would be — still fine.
    expect(isJudgeable(LANDED, new Date('2026-08-31T00:00:00.000Z'))).toBe(true)
  })
})

describe('selectTrials()', () => {
  const pairs: TrialWithSearchKey[] = [
    { trial: { problem: 'about pkill teardown', opened: '2026-08-23' }, searchKey: 'about pkill teardown' },
    { trial: { problem: "about ADR-0009's history", opened: '2026-08-25' }, searchKey: "about ADR-0009's history" },
  ]

  it('returns every pair when no filter is given', () => {
    expect(selectTrials(pairs, '')).toEqual(pairs)
  })

  it('filters to trials whose problem text contains the given substring', () => {
    expect(selectTrials(pairs, 'pkill')).toEqual([pairs[0]])
  })

  it('returns nothing when no trial matches', () => {
    expect(selectTrials(pairs, 'no such text')).toEqual([])
  })
})

describe('buildWindows() — landing commit', () => {
  it('reports the newest -S match: add A, remove A, add B sharing its first line → B (issue #1285)', () => {
    const repo = mkdtempSync(join(tmpdir(), 'prune-trial-window-'))
    const git = (args: string[], date?: string) =>
      execFileSync('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', '-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
        cwd: repo,
        encoding: 'utf8',
        env: date ? { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } : process.env,
      }).trim()
    mkdirSync(join(repo, '.agents'))
    const commit = (ledger: string, date: string) => {
      writeFileSync(join(repo, '.agents/prune-trials.yml'), ledger)
      git(['add', '-A'])
      git(['commit', '-qm', date], date)
      return git(['rev-parse', 'HEAD'])
    }
    const entry = (tail: string) => `trials:\n  - problem: >\n      Shared first line.\n      ${tail}\n    opened: 2026-09-01\n`
    git(['init', '-q'])
    commit(entry('Entry A.'), '2026-09-01T00:00:00Z')
    commit('trials: []\n', '2026-09-05T00:00:00Z')
    const landedB = commit(entry('Entry B.'), '2026-09-10T00:00:00Z')
    git(['update-ref', 'refs/remotes/origin/main', 'HEAD'])

    const trial = { problem: 'Shared first line. Entry B.', opened: '2026-09-01' }
    const [found, missing] = buildWindows(
      [{ trial, searchKey: 'Shared first line.' }, { trial, searchKey: 'Never in the ledger.' }],
      new Date('2026-09-11T00:00:00Z'),
      repo,
    )
    expect(found!.landing).toEqual({ hash: landedB, isoCommitTime: '2026-09-10T00:00:00.000Z' })
    expect(found!.judgeableNow).toBe(false)
    expect(missing!.landing).toBeNull()
  })
})
