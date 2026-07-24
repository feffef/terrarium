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
  pollUntilResolved,
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
