// Unit tests for the poll-then-merge helper's pure core (issue #667):
// the check-run verdict aggregation (the `enable_pr_auto_merge`-replacing
// logic — a still-`in_progress` run must not read as failing, matching
// `docs/agents/pr-workflow.md`'s guidance), the failing-name extraction, and
// the poll loop's resolve/timeout behavior. The `gh api`/REST shell and the
// actual merge call are a thin wrapper over these, exercised by running the
// script directly. The shared `gh`/`rest` strategy decision
// (`pickFetchStrategy`) is single-homed in `list-open-issues.ts` and tested
// there.
import { describe, expect, it, vi } from 'vitest'
import {
  failingCheckNames,
  mergeMethodFlag,
  parseClosingKeywordIssues,
  pollUntilResolved,
  reconcileClosingKeywords,
  verdictFromCheckRuns,
  type RawCheckRun,
} from '../../scripts/merge-pr.ts'

describe('verdictFromCheckRuns()', () => {
  it('is pending when there are no check runs yet', () => {
    expect(verdictFromCheckRuns([])).toBe('pending')
  })

  it('is pending while any run is still in_progress, even if others are green', () => {
    const runs: RawCheckRun[] = [
      { name: 'gate', status: 'completed', conclusion: 'success' },
      { name: 'slow-job', status: 'in_progress', conclusion: null },
    ]
    expect(verdictFromCheckRuns(runs)).toBe('pending')
  })

  it('is pending while any run is still queued', () => {
    const runs: RawCheckRun[] = [{ name: 'gate', status: 'queued', conclusion: null }]
    expect(verdictFromCheckRuns(runs)).toBe('pending')
  })

  it('is green when every run is completed with a non-failing conclusion', () => {
    const runs: RawCheckRun[] = [
      { name: 'gate', status: 'completed', conclusion: 'success' },
      { name: 'optional', status: 'completed', conclusion: 'skipped' },
      { name: 'informational', status: 'completed', conclusion: 'neutral' },
    ]
    expect(verdictFromCheckRuns(runs)).toBe('green')
  })

  it('is red when any completed run failed', () => {
    const runs: RawCheckRun[] = [
      { name: 'gate', status: 'completed', conclusion: 'failure' },
    ]
    expect(verdictFromCheckRuns(runs)).toBe('red')
  })

  it('treats cancelled, timed_out, action_required, and stale as failing too', () => {
    for (const conclusion of ['cancelled', 'timed_out', 'action_required', 'stale']) {
      expect(verdictFromCheckRuns([{ name: 'gate', status: 'completed', conclusion }])).toBe('red')
    }
  })

  it('is red, not pending, when a real failure sits alongside a still-running run', () => {
    const runs: RawCheckRun[] = [
      { name: 'gate', status: 'completed', conclusion: 'failure' },
      { name: 'slow-job', status: 'in_progress', conclusion: null },
    ]
    expect(verdictFromCheckRuns(runs)).toBe('red')
  })
})

describe('failingCheckNames()', () => {
  it('names only the runs with a failing conclusion', () => {
    const runs: RawCheckRun[] = [
      { name: 'gate', status: 'completed', conclusion: 'failure' },
      { name: 'lint', status: 'completed', conclusion: 'success' },
      { name: 'e2e', status: 'completed', conclusion: 'cancelled' },
    ]
    expect(failingCheckNames(runs)).toEqual(['gate', 'e2e'])
  })

  it('is empty when nothing failed', () => {
    const runs: RawCheckRun[] = [{ name: 'gate', status: 'completed', conclusion: 'success' }]
    expect(failingCheckNames(runs)).toEqual([])
  })
})

describe('mergeMethodFlag()', () => {
  it('maps each merge method to its gh-style flag', () => {
    expect(mergeMethodFlag('merge')).toBe('--merge')
    expect(mergeMethodFlag('squash')).toBe('--squash')
    expect(mergeMethodFlag('rebase')).toBe('--rebase')
  })
})

describe('parseClosingKeywordIssues()', () => {
  it('finds a single "Closes #N" reference', () => {
    expect(parseClosingKeywordIssues('Closes #42')).toEqual([42])
  })

  it('finds each keyword on its own line (PR #955\'s well-formed body)', () => {
    const body = 'Closes #948\nCloses #950\nCloses #952\nCloses #954'
    expect(parseClosingKeywordIssues(body)).toEqual([948, 950, 952, 954])
  })

  it('finds every number in a comma-separated list after one keyword, even though GitHub itself only recognizes the first (per GitHub\'s own "keyword before each reference" requirement)', () => {
    const body = 'Closes #948, #950, #952, #954'
    expect(parseClosingKeywordIssues(body)).toEqual([948, 950, 952, 954])
  })

  it('handles an "and" before the last item in a list', () => {
    expect(parseClosingKeywordIssues('Fixes #1, #2, and #3')).toEqual([1, 2, 3])
  })

  it('recognizes fix/fixes/fixed/resolve/resolves/resolved/close/closed too', () => {
    for (const keyword of ['Fix', 'Fixes', 'Fixed', 'Resolve', 'Resolves', 'Resolved', 'Close', 'Closed']) {
      expect(parseClosingKeywordIssues(`${keyword} #7`)).toEqual([7])
    }
  })

  it('is case-insensitive', () => {
    expect(parseClosingKeywordIssues('closes #7')).toEqual([7])
  })

  it('deduplicates and sorts ascending', () => {
    expect(parseClosingKeywordIssues('Closes #5\nFixes #3, #5')).toEqual([3, 5])
  })

  it('ignores a cross-repo owner/repo#N reference', () => {
    expect(parseClosingKeywordIssues('Fixes octo-org/octo-repo#100')).toEqual([])
  })

  it('ignores a bare issue mention with no closing keyword', () => {
    expect(parseClosingKeywordIssues('See #42 for context')).toEqual([])
  })

  it('is empty for a body with no closing keywords', () => {
    expect(parseClosingKeywordIssues('Just a plain description, no keywords here.')).toEqual([])
  })
})

describe('reconcileClosingKeywords()', () => {
  it('closes only the still-open issues a body names with a closing keyword', async () => {
    const states: Record<number, string> = { 1: 'open', 2: 'closed', 3: 'open' }
    const closer = vi.fn()
    const result = await reconcileClosingKeywords(
      'Closes #1, #2, #3',
      (n) => states[n]!,
      closer,
    )
    expect(result).toEqual({ closed: [1, 3], failed: [] })
    expect(closer).toHaveBeenCalledTimes(2)
    expect(closer).toHaveBeenCalledWith(1)
    expect(closer).toHaveBeenCalledWith(3)
  })

  it('does nothing when the body names no issues', async () => {
    const closer = vi.fn()
    const result = await reconcileClosingKeywords('No keywords here.', () => 'open', closer)
    expect(result).toEqual({ closed: [], failed: [] })
    expect(closer).not.toHaveBeenCalled()
  })

  it('collects a failure without throwing and keeps reconciling the rest', async () => {
    const closer = vi.fn()
    const reader = vi.fn((n: number) => {
      if (n === 2) throw new Error('boom')
      return 'open'
    })
    const result = await reconcileClosingKeywords('Closes #1, #2, #3', reader, closer)
    expect(result.closed).toEqual([1, 3])
    expect(result.failed).toEqual([2])
  })
})

describe('pollUntilResolved()', () => {
  it('returns immediately once the first fetch already resolves', async () => {
    const runs: RawCheckRun[] = [{ name: 'gate', status: 'completed', conclusion: 'success' }]
    const fetchRuns = vi.fn().mockResolvedValue(runs)
    const result = await pollUntilResolved(fetchRuns, { intervalMs: 1, timeoutMs: 1000 })
    expect(result).toEqual({ verdict: 'green', runs })
    expect(fetchRuns).toHaveBeenCalledTimes(1)
  })

  it('keeps polling through pending states until a resolved verdict lands', async () => {
    const pending: RawCheckRun[] = [{ name: 'gate', status: 'in_progress', conclusion: null }]
    const red: RawCheckRun[] = [{ name: 'gate', status: 'completed', conclusion: 'failure' }]
    const fetchRuns = vi
      .fn()
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce(red)
    const result = await pollUntilResolved(fetchRuns, { intervalMs: 1, timeoutMs: 1000 })
    expect(result).toEqual({ verdict: 'red', runs: red })
    expect(fetchRuns).toHaveBeenCalledTimes(3)
  })

  it('gives up at the timeout and reports pending rather than throwing', async () => {
    const pending: RawCheckRun[] = [{ name: 'gate', status: 'in_progress', conclusion: null }]
    const fetchRuns = vi.fn().mockResolvedValue(pending)
    const result = await pollUntilResolved(fetchRuns, { intervalMs: 5, timeoutMs: 12 })
    expect(result.verdict).toBe('pending')
    expect(result.runs).toEqual(pending)
  })
})
