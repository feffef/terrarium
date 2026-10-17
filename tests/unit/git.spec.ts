// Unit tests for the shared git helpers — the runner and the fetch-timeout degrade path (#451).
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, afterEach, describe, expect, it } from 'vitest'
import { fetchOriginMain, FETCH_TIMEOUT_MS, git as run, hasOriginHead, isFetchTimeout, isShallowRepository, setOriginHead, tryGit, unshallow, UNSHALLOW_TIMEOUT_MS } from '../../scripts/lib/git.ts'
import { commitFile, createGitFixture, git, shallowClone } from '../support/git-fixture.ts'

describe('git() and tryGit()', () => {
  const dir = mkdtempSync(join(tmpdir(), 'git-run-'))
  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  it('git() runs in the given cwd and returns stdout untrimmed', () => {
    run(['init', '-q'], dir)
    expect(run(['rev-parse', '--is-inside-work-tree'], dir)).toBe('true\n')
  })

  it('git() throws on a non-zero exit', () => {
    expect(() => run(['rev-parse', '--verify', 'no-such-ref'], dir, { stdio: 'pipe' })).toThrow()
  })

  it('tryGit() reports stdout on success, and the exit status on failure instead of throwing', () => {
    expect(tryGit(['rev-parse', '--is-inside-work-tree'], dir)).toEqual({ ok: true, out: 'true\n', status: 0 })
    const failed = tryGit(['rev-parse', '--verify', 'no-such-ref'], dir)
    expect(failed.ok).toBe(false)
    expect(failed.out).toBe('')
    expect(failed.status).toBeGreaterThan(0)
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

describe('UNSHALLOW_TIMEOUT_MS', () => {
  it('is bounded, and roomier than a single-ref freshen (#849)', () => {
    expect(UNSHALLOW_TIMEOUT_MS).toBeGreaterThan(FETCH_TIMEOUT_MS)
    expect(UNSHALLOW_TIMEOUT_MS).toBeLessThanOrEqual(120_000)
  })
})

describe('isShallowRepository()', () => {
  it('reports a real clone without throwing', () => {
    expect(typeof isShallowRepository(process.cwd())).toBe('boolean')
  })

  it('is true for a shallow clone and false once it is completed', () => {
    const fixture = createGitFixture('git-helpers-shallow')
    try {
      for (const n of [1, 2, 3]) commitFile(fixture.work, `${n}.txt`, `${n}`, `c${n}`)
      git(fixture.work, ['push', '-q', 'origin', 'main'])
      const clone = shallowClone(fixture, 'clone', 1)

      expect(isShallowRepository(clone)).toBe(true)
      unshallow(clone)
      expect(isShallowRepository(clone)).toBe(false)
    } finally {
      rmSync(fixture.dir, { recursive: true, force: true })
    }
  })
})

describe('hasOriginHead() / setOriginHead()', () => {
  it('is false for a checkout built by fetch rather than clone, true once set', () => {
    const fixture = createGitFixture('git-helpers-origin-head')
    try {
      commitFile(fixture.work, '1.txt', '1', 'c1')
      git(fixture.work, ['push', '-q', 'origin', 'main'])

      // `git init` + `remote add` + `fetch` mirrors the no-origin/HEAD
      // checkouts this environment hands out, unlike `git clone` (which sets
      // it). Some git versions set it on `fetch` too when the remote
      // advertises it (observed live: unset on git 2.43, set on git 2.55) —
      // delete it unconditionally afterward so the "missing" precondition
      // this test needs holds regardless of the git version running it.
      const clone = join(fixture.dir, 'clone')
      git(fixture.dir, ['init', '-q', '-b', 'main', 'clone'])
      git(clone, ['remote', 'add', 'origin', fixture.origin])
      git(clone, ['fetch', '-q', 'origin'])
      try {
        git(clone, ['symbolic-ref', '--delete', 'refs/remotes/origin/HEAD'])
      } catch {
        // Already unset on this git version — the case this test used to rely on.
      }

      expect(hasOriginHead(clone)).toBe(false)
      setOriginHead(clone)
      expect(hasOriginHead(clone)).toBe(true)
    } finally {
      rmSync(fixture.dir, { recursive: true, force: true })
    }
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
