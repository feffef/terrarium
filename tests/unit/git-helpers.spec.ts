// Unit tests for the shared git-log helpers — the parentless-boundary-commit
// guard (#292) and the fetch-timeout degrade path (#451), where every
// git-log-based script's correctness bugs would otherwise be re-derived.
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { fetchOriginMain, FETCH_TIMEOUT_MS, isFetchTimeout, isParentlessBoundaryCommit } from '../../scripts/git-helpers.ts'

describe('isParentlessBoundaryCommit()', () => {
  it('is true for an empty %P — a shallow-clone graft or the true repo root', () => {
    expect(isParentlessBoundaryCommit('')).toBe(true)
  })

  it('is false for whitespace — %P is never whitespace-only in real git output', () => {
    expect(isParentlessBoundaryCommit('   ')).toBe(false)
  })

  it('is false for a normal single-parent commit', () => {
    expect(isParentlessBoundaryCommit('p1')).toBe(false)
  })

  it('is false for a merge commit (more than one parent)', () => {
    expect(isParentlessBoundaryCommit('p1 p2')).toBe(false)
  })
})

describe('isFetchTimeout()', () => {
  it('is true for an execFileSync timeout error (code: ETIMEDOUT)', () => {
    expect(isFetchTimeout({ code: 'ETIMEDOUT', signal: 'SIGTERM' })).toBe(true)
  })

  it('is false for an ordinary failure (a different code)', () => {
    expect(isFetchTimeout({ code: 'ENOENT' })).toBe(false)
  })

  it('is false for a plain Error with no code', () => {
    expect(isFetchTimeout(new Error('offline'))).toBe(false)
  })

  it('is false for a non-object value', () => {
    expect(isFetchTimeout('nope')).toBe(false)
    expect(isFetchTimeout(null)).toBe(false)
    expect(isFetchTimeout(undefined)).toBe(false)
  })
})

describe('FETCH_TIMEOUT_MS', () => {
  it('is a positive, bounded number of milliseconds', () => {
    expect(FETCH_TIMEOUT_MS).toBeGreaterThan(0)
    expect(FETCH_TIMEOUT_MS).toBeLessThanOrEqual(60_000)
  })
})

describe('fetchOriginMain() — timeout degrade path', () => {
  let dir: string | undefined
  let originalPath: string | undefined

  afterEach(() => {
    if (originalPath !== undefined) process.env.PATH = originalPath
    if (dir) rmSync(dir, { recursive: true, force: true })
    dir = undefined
    originalPath = undefined
  })

  // A stub `git` binary that outlives any sane bound — simulates the proxy
  // latency this helper degrades against (#451), without a real network call.
  function stubSlowGit(): void {
    dir = mkdtempSync(join(tmpdir(), 'git-helpers-test-'))
    const gitStub = join(dir, 'git')
    writeFileSync(gitStub, '#!/bin/sh\nsleep 5\n')
    chmodSync(gitStub, 0o755)
    originalPath = process.env.PATH
    process.env.PATH = `${dir}${originalPath ? `:${originalPath}` : ''}`
  }

  it('throws a clear "fetch timed out" error instead of hanging', () => {
    stubSlowGit()
    expect(() => fetchOriginMain(process.cwd(), 'origin', 50)).toThrow(/git fetch origin main timed out after 50ms/)
  })
})
