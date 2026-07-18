// Unit + integration coverage for the session-id-fabrication backstop (issue
// #387): CLAUDE.md's doc-only "never predict/reconstruct a session id" rule
// kept failing to hold, so this mechanically compares this session's own
// commits' `Claude-Session:` trailers against the resolved ground-truth id.
// The pure core (`findSessionIdMismatches`/`parseOwnCommits`) is pinned here
// directly; `readOwnCommits` is exercised against a real throwaway repo +
// bare remote (mirroring log-session-push.spec.ts's pattern) so the
// `origin/main..HEAD` scoping — the "never flag inherited history" guarantee
// — is proven against real git, not just asserted.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  findSessionIdMismatches,
  formatMismatchError,
  parseOwnCommits,
  readOwnCommits,
  resolveGroundTruthFromTranscript,
  type OwnCommit,
} from '../../scripts/session-id-guard.ts'

/** git in a given repo, with a deterministic identity (mirrors log-session-push.spec.ts). */
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

const REC = '\x1e'

describe('findSessionIdMismatches() — the pure core (issue #387)', () => {
  it('flags a commit whose trailer diverges from the ground truth', () => {
    const commits: OwnCommit[] = [{ sha: 'aaa111', trailerSessionId: 'session_WRONG' }]
    expect(findSessionIdMismatches(commits, 'session_REAL')).toEqual([
      { sha: 'aaa111', found: 'session_WRONG', expected: 'session_REAL' },
    ])
  })

  it('passes silently on a matching trailer', () => {
    const commits: OwnCommit[] = [{ sha: 'aaa111', trailerSessionId: 'session_REAL' }]
    expect(findSessionIdMismatches(commits, 'session_REAL')).toEqual([])
  })

  it('never flags a commit with no trailer at all — most commits on a branch carry none', () => {
    const commits: OwnCommit[] = [{ sha: 'aaa111' }]
    expect(findSessionIdMismatches(commits, 'session_REAL')).toEqual([])
  })

  it('skips (passes) when no ground-truth id is available — no false failure on a local CLI session', () => {
    const commits: OwnCommit[] = [{ sha: 'aaa111', trailerSessionId: 'session_WRONG' }]
    expect(findSessionIdMismatches(commits, null)).toEqual([])
    expect(findSessionIdMismatches(commits, undefined)).toEqual([])
  })

  it('reports every offending commit when several mismatch, ignoring the ones that match or lack a trailer', () => {
    const commits: OwnCommit[] = [
      { sha: 'aaa', trailerSessionId: 'session_REAL' },
      { sha: 'bbb', trailerSessionId: 'session_ONE_WRONG' },
      { sha: 'ccc' },
      { sha: 'ddd', trailerSessionId: 'session_ANOTHER_WRONG' },
    ]
    expect(findSessionIdMismatches(commits, 'session_REAL').map((m) => m.sha)).toEqual(['bbb', 'ddd'])
  })
})

describe('parseOwnCommits()', () => {
  it("parses sha + trailer session id per record, matching readOwnCommits' git-log format", () => {
    const raw = [
      `${REC}sha1\nsubject line\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_ABC`,
      `${REC}sha2\nsubject with no trailer at all`,
    ].join('')
    expect(parseOwnCommits(raw)).toEqual([
      { sha: 'sha1', trailerSessionId: 'session_ABC' },
      { sha: 'sha2', trailerSessionId: undefined },
    ])
  })

  it('returns [] for empty input', () => {
    expect(parseOwnCommits('')).toEqual([])
  })
})

describe('formatMismatchError()', () => {
  it('names the offending commit (short sha), the found id, and the expected id', () => {
    const msg = formatMismatchError([{ sha: '0123456789abcdef', found: 'session_WRONG', expected: 'session_REAL' }])
    expect(msg).toContain('issue #387')
    expect(msg).toContain('0123456789ab') // 12-char short sha
    expect(msg).toContain('session_WRONG')
    expect(msg).toContain('session_REAL')
  })
})

describe('resolveGroundTruthFromTranscript() — issue #387', () => {
  const transcript = JSON.stringify({
    type: 'assistant',
    timestamp: '2026-07-18T10:00:00Z',
    sessionId: 'b84dc292-4954-52dc-b693-5681f040259e',
    message: { model: 'claude-opus-4-8', content: [] },
  })

  it('normalizes a CLAUDE_CODE_REMOTE_SESSION_ID cse_ id onto the session_ form, preferring it over the transcript id', () => {
    expect(
      resolveGroundTruthFromTranscript(transcript, { CLAUDE_CODE_REMOTE_SESSION_ID: 'cse_019W471jzQDwoZmKzJKtE4vk' }),
    ).toBe('session_019W471jzQDwoZmKzJKtE4vk')
  })

  it('falls back to the transcript session id for a plain local CLI session (no CCR env var)', () => {
    expect(resolveGroundTruthFromTranscript(transcript, {})).toBe('b84dc292-4954-52dc-b693-5681f040259e')
  })

  it('returns null when neither source is available', () => {
    const noSessionTranscript = JSON.stringify({
      type: 'assistant',
      timestamp: '2026-07-18T10:00:00Z',
      message: { model: 'claude-opus-4-8', content: [] },
    })
    expect(resolveGroundTruthFromTranscript(noSessionTranscript, {})).toBeNull()
  })
})

describe('readOwnCommits() — against a throwaway bare remote, scoped to origin/main..HEAD', () => {
  let scratch: string
  let remote: string
  let work: string

  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), 'session-id-guard-'))
    remote = join(scratch, 'remote.git')
    work = join(scratch, 'work')
    git(scratch, ['init', '--bare', '-b', 'main', remote])
    git(scratch, ['init', '-b', 'main', work])
    git(work, ['config', 'user.name', 'test'])
    git(work, ['config', 'user.email', 'test@example.com'])
    // Inherited history on origin/main, deliberately carrying a Claude-Session
    // trailer that would mismatch any real ground truth — must NEVER be flagged
    // (CLAUDE.md: never inspect/rewrite history already on origin/main).
    git(work, [
      'commit',
      '--allow-empty',
      '-m',
      'init\n\nClaude-Session: https://claude.ai/code/session_INHERITED_BAD',
    ])
    git(work, ['remote', 'add', 'origin', remote])
    git(work, ['push', 'origin', 'main'])
  })

  afterEach(() => {
    rmSync(scratch, { recursive: true, force: true })
  })

  it('reports no commits when HEAD has nothing beyond origin/main yet', () => {
    expect(readOwnCommits(work)).toEqual([])
  })

  it("reads this session's own commits (sha + trailer id), newest first, excluding inherited history", () => {
    git(work, ['commit', '--allow-empty', '-m', 'own work, no trailer'])
    git(work, ['commit', '--allow-empty', '-m', 'own work\n\nClaude-Session: https://claude.ai/code/session_OWN'])
    const commits = readOwnCommits(work)
    expect(commits).toHaveLength(2) // the inherited init commit is excluded
    expect(commits.map((c) => c.trailerSessionId)).toEqual(['session_OWN', undefined]) // git log is newest-first
  })

  it('end to end: a fabricated trailer on an own commit is caught; the inherited one never surfaces', () => {
    git(work, [
      'commit',
      '--allow-empty',
      '-m',
      'fabricated\n\nClaude-Session: https://claude.ai/code/session_FABRICATED',
    ])
    const mismatches = findSessionIdMismatches(readOwnCommits(work), 'session_REAL')
    expect(mismatches).toEqual([
      { sha: expect.any(String), found: 'session_FABRICATED', expected: 'session_REAL' },
    ])
  })

  it('end to end: a correct trailer on the session\'s own commit passes with no mismatches', () => {
    git(work, ['commit', '--allow-empty', '-m', 'own work\n\nClaude-Session: https://claude.ai/code/session_REAL'])
    expect(findSessionIdMismatches(readOwnCommits(work), 'session_REAL')).toEqual([])
  })
})
