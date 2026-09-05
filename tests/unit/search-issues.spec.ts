// Unit coverage for the search-issues helper's backoff decision only (issue
// #1092) — no network. The `gh`/`curl` shells are exercised by running the
// script directly, same convention as `list-open-issues.spec.ts`.
import { describe, expect, it, vi } from 'vitest'
import { extractHttpStatus, isRetryableStatus, searchWithRetry, type SearchAttempt } from '../../scripts/search-issues.ts'

describe('isRetryableStatus()', () => {
  it('retries on a 403 (primary or secondary rate limit)', () => {
    expect(isRetryableStatus('403')).toBe(true)
  })
  it('retries on a 429 (abuse detection)', () => {
    expect(isRetryableStatus('429')).toBe(true)
  })
  it('does not retry a genuine failure', () => {
    expect(isRetryableStatus('404')).toBe(false)
    expect(isRetryableStatus('401')).toBe(false)
    expect(isRetryableStatus('unknown')).toBe(false)
  })
})

describe('extractHttpStatus()', () => {
  it('pulls the numeric status out of a gh api error message', () => {
    expect(extractHttpStatus('HTTP 403: API rate limit exceeded')).toBe('403')
  })
  it('returns null when the message carries no HTTP status', () => {
    expect(extractHttpStatus('gh: some other failure')).toBeNull()
  })
})

describe('searchWithRetry()', () => {
  it('returns hits on the first attempt without ever waiting', () => {
    const wait = vi.fn()
    const attempt = vi.fn<() => SearchAttempt>(() => ({ ok: true, hits: [] }))
    const hits = searchWithRetry(attempt, wait)
    expect(hits).toEqual([])
    expect(attempt).toHaveBeenCalledTimes(1)
    expect(wait).not.toHaveBeenCalled()
  })

  it('retries a 403 with a growing backoff, then succeeds', () => {
    const wait = vi.fn()
    let calls = 0
    const attempt = vi.fn<() => SearchAttempt>(() => {
      calls += 1
      if (calls < 3) return { ok: false, status: '403', message: 'rate limited' }
      return { ok: true, hits: [] }
    })
    searchWithRetry(attempt, wait)
    expect(attempt).toHaveBeenCalledTimes(3)
    // One immediate attempt, then two growing waits before success.
    expect(wait.mock.calls.map((c) => c[0])).toEqual([2000, 4000])
  })

  it('throws immediately on a non-retryable status, without waiting or retrying', () => {
    const wait = vi.fn()
    const attempt = vi.fn<() => SearchAttempt>(() => ({ ok: false, status: '404', message: 'not found' }))
    expect(() => searchWithRetry(attempt, wait)).toThrow('not found')
    expect(attempt).toHaveBeenCalledTimes(1)
    expect(wait).not.toHaveBeenCalled()
  })

  it('gives up after the backoff schedule is exhausted, surfacing the last failure', () => {
    const wait = vi.fn()
    const attempt = vi.fn<() => SearchAttempt>(() => ({ ok: false, status: '403', message: 'still limited' }))
    expect(() => searchWithRetry(attempt, wait)).toThrow('still limited')
    // 1 immediate + 4 documented retry delays = 5 total attempts.
    expect(attempt).toHaveBeenCalledTimes(5)
    expect(wait).toHaveBeenCalledTimes(4)
  })
})
