// Integration coverage for the session-log helper's git plumbing (ADR-0009). The
// unit spec pins the pure guards; here we drive the REAL fetch → rebuild-off-main →
// push → "exactly one file" loop against a throwaway repo + bare remote, so the
// direct-to-`main` boundary is exercised without ever touching the real remote.
//
// This closes the friction logged in session 011Y8H9m: "the fetch→push loop cannot
// be tested end-to-end without pushing to main". The helper's `cwd` is injectable
// precisely so this can point it at a scratch repo.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildLogCommit, isLinkedWorktree, pushWithRetry, SESSIONS_DIR } from '../../scripts/log-session.ts'

/** git in a given repo, with a deterministic identity so commits are reproducible. */
function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'test',
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'test',
      GIT_COMMITTER_EMAIL: 'test@example.com',
    },
  }).trim()
}

function writeEntry(work: string, name: string, body: string): { abs: string; rel: string } {
  const rel = `${SESSIONS_DIR}/${name}`
  const abs = join(work, rel)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, body)
  return { abs, rel }
}

describe('pushWithRetry() / buildLogCommit() — against a throwaway bare remote', () => {
  let scratch: string
  let remote: string
  let work: string

  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), 'log-session-push-'))
    remote = join(scratch, 'remote.git')
    work = join(scratch, 'work')

    // A bare remote with a `main` branch, and a work repo whose `origin` is that remote.
    git(scratch, ['init', '--bare', '-b', 'main', remote])
    git(scratch, ['init', '-b', 'main', work])
    git(work, ['config', 'user.name', 'test'])
    git(work, ['config', 'user.email', 'test@example.com'])
    git(work, ['commit', '--allow-empty', '-m', 'init'])
    git(work, ['remote', 'add', 'origin', remote])
    git(work, ['push', 'origin', 'main'])
  })

  afterEach(() => {
    rmSync(scratch, { recursive: true, force: true })
  })

  it('lands a single log file on the remote main via the real fetch→build→push loop', () => {
    const name = '2026-07-05-session_abc.yml'
    const { abs, rel } = writeEntry(work, name, 'session: abc\n')

    const commit = pushWithRetry(rel, abs, 'origin', work)

    // The remote's main now carries exactly one new commit adding exactly `rel`.
    const remoteHead = git(remote, ['rev-parse', 'main'])
    expect(remoteHead).toBe(commit)
    const changed = git(remote, ['diff-tree', '--no-commit-id', '--name-only', '-r', commit])
    expect(changed).toBe(rel)
    expect(git(remote, ['show', `${commit}:${rel}`])).toBe('session: abc')
    expect(git(remote, ['log', '-1', '--format=%s', commit])).toBe(
      'journal(sessions): log 2026-07-05-session_abc',
    )
  })

  it('appends the ADR-0017 provenance footer, deriving the model from the stitched entry', () => {
    const name = '2026-07-05-session_footer.yml'
    const body = 'session: session_footer\nmodels:\n  claude-opus-4-8: 3\n  claude-sonnet-5: 9\n'
    const { abs, rel } = writeEntry(work, name, body)

    const commit = pushWithRetry(rel, abs, 'origin', work)

    const fullMessage = git(remote, ['log', '-1', '--format=%B', commit])
    expect(fullMessage).toBe(
      [
        'journal(sessions): log 2026-07-05-session_footer',
        '',
        'Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>',
        'Claude-Session: https://claude.ai/code/session_footer',
      ].join('\n'),
    )
  })

  it('falls back to a generic model name when the entry carries no `models` field', () => {
    const name = '2026-07-05-session_nomodel.yml'
    const { abs, rel } = writeEntry(work, name, 'session: session_nomodel\n')

    const commit = pushWithRetry(rel, abs, 'origin', work)

    const fullMessage = git(remote, ['log', '-1', '--format=%B', commit])
    expect(fullMessage).toContain('Co-Authored-By: Claude <noreply@anthropic.com>')
    expect(fullMessage).toContain('Claude-Session: https://claude.ai/code/session_nomodel')
  })

  it('rebuilds off freshly-fetched main, so a second distinct log stacks cleanly', () => {
    const first = writeEntry(work, '2026-07-05-session_one.yml', 'session: one\n')
    const c1 = pushWithRetry(first.rel, first.abs, 'origin', work)

    const second = writeEntry(work, '2026-07-05-session_two.yml', 'session: two\n')
    const c2 = pushWithRetry(second.rel, second.abs, 'origin', work)

    // Second commit is parented on the first (main advanced, no conflict) and both files live on main.
    expect(git(remote, ['rev-parse', 'main'])).toBe(c2)
    expect(git(remote, ['rev-parse', `${c2}^`])).toBe(c1)
    expect(git(remote, ['show', `main:${first.rel}`])).toBe('session: one')
    expect(git(remote, ['show', `main:${second.rel}`])).toBe('session: two')
  })

  it('refuses to build a commit that would change more than the one log file', () => {
    // Land the file, then try to build the identical file again: the diff off main is
    // now empty (0 files), so the "exactly one file" guard must fire.
    const { abs, rel } = writeEntry(work, '2026-07-05-session_dup.yml', 'session: dup\n')
    pushWithRetry(rel, abs, 'origin', work)
    git(work, ['fetch', 'origin', 'main'])

    expect(() => buildLogCommit(rel, abs, 'origin', work)).toThrow(/refusing to push/)
  })

  describe('isLinkedWorktree() — the worktree-subagent guard (issue #449 Gap 4)', () => {
    it('is false for the main/primary checkout', () => {
      expect(isLinkedWorktree(work)).toBe(false)
    })

    it('is true for a linked worktree created via `git worktree add`', () => {
      const worktreePath = join(scratch, 'linked-worktree')
      git(work, ['worktree', 'add', '-b', 'wt-branch', worktreePath])
      expect(isLinkedWorktree(worktreePath)).toBe(true)
      // ...and the main checkout is unaffected by the linked worktree existing.
      expect(isLinkedWorktree(work)).toBe(false)
    })

    it('fails open (false) when cwd is not inside any git repo', () => {
      const outside = mkdtempSync(join(tmpdir(), 'not-a-repo-'))
      try {
        expect(isLinkedWorktree(outside)).toBe(false)
      } finally {
        rmSync(outside, { recursive: true, force: true })
      }
    })
  })
})
