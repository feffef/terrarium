// Unit + integration coverage for the session-id-fabrication backstop (issue
// #387): CLAUDE.md's doc-only "never predict/reconstruct a session id" rule
// kept failing to hold, so this mechanically compares this session's own
// commits' `Claude-Session:` trailers against the resolved ground-truth id.
// The pure core (`findSessionIdMismatches`/`parseOwnCommits`) is pinned here
// directly; `readOwnCommits` is exercised against a real throwaway repo +
// bare remote (mirroring log-session-push.spec.ts's pattern) so the
// `origin/main..HEAD` scoping and the transcript ownership check (issues
// #1611, #1698) are proven against real git.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  checkOwnCommits,
  findMadeCommits,
  findSessionIdMismatches,
  formatMismatchError,
  parseOwnCommits,
  readOwnCommits,
  resolveGroundTruthFromTranscript,
  type MadeCommits,
  type OwnCommit,
} from '../../scripts/session-id-guard.ts'

/** git in a given repo, with a deterministic identity (mirrors log-session-push.spec.ts). */
function git(cwd: string, args: string[], extraEnv: Record<string, string> = {}): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...extraEnv,
      GIT_AUTHOR_NAME: 'test',
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'test',
      GIT_COMMITTER_EMAIL: 'test@example.com',
    },
  }).trim()
}

const REC = '\x1e'

/** Ownership by sha prefix, the shape `findMadeCommits` produces. */
const madeShas = (...shas: string[]): MadeCommits => ({ shas, subjects: new Set() })

/** A transcript record carrying one Bash tool result. */
const toolResult = (content: unknown) =>
  JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't', content }] } })

describe('findSessionIdMismatches() — the pure core (issue #387)', () => {
  it('flags a commit whose trailer diverges from the ground truth', () => {
    const commits: OwnCommit[] = [{ sha: 'aaa111', trailerSessionId: 'session_WRONG' }]
    expect(findSessionIdMismatches(commits, 'session_REAL', madeShas('aaa', 'bbb', 'ccc', 'ddd'))).toEqual([
      { sha: 'aaa111', found: 'session_WRONG', expected: 'session_REAL' },
    ])
  })

  it('passes silently on a matching trailer', () => {
    const commits: OwnCommit[] = [{ sha: 'aaa111', trailerSessionId: 'session_REAL' }]
    expect(findSessionIdMismatches(commits, 'session_REAL', madeShas('aaa', 'bbb', 'ccc', 'ddd'))).toEqual([])
  })

  it('never flags a commit with no trailer at all — most commits on a branch carry none', () => {
    const commits: OwnCommit[] = [{ sha: 'aaa111' }]
    expect(findSessionIdMismatches(commits, 'session_REAL', madeShas('aaa', 'bbb', 'ccc', 'ddd'))).toEqual([])
  })

  it('skips (passes) when no ground-truth id is available — no false failure on a local CLI session', () => {
    const commits: OwnCommit[] = [{ sha: 'aaa111', trailerSessionId: 'session_WRONG' }]
    expect(findSessionIdMismatches(commits, null, madeShas('aaa'))).toEqual([])
    expect(findSessionIdMismatches(commits, undefined, madeShas('aaa'))).toEqual([])
  })

  it('reports every offending commit when several mismatch, ignoring the ones that match or lack a trailer', () => {
    const commits: OwnCommit[] = [
      { sha: 'aaa', trailerSessionId: 'session_REAL' },
      { sha: 'bbb', trailerSessionId: 'session_ONE_WRONG' },
      { sha: 'ccc' },
      { sha: 'ddd', trailerSessionId: 'session_ANOTHER_WRONG' },
    ]
    expect(findSessionIdMismatches(commits, 'session_REAL', madeShas('aaa', 'bbb', 'ccc', 'ddd')).map((m) => m.sha)).toEqual(['bbb', 'ddd'])
  })
})

describe('findSessionIdMismatches() — only commits the session made (issues #1611, #1698)', () => {
  const foreign: OwnCommit[] = [{ sha: 'aaa111', trailerSessionId: 'session_OTHER', subject: 'sibling work' }]

  it("skips another session's commit on the branch, inherited or made by a sibling sharing the working copy", () => {
    expect(findSessionIdMismatches(foreign, 'session_REAL', { shas: ['bbb222'], subjects: new Set(['own work']) })).toEqual([])
  })

  it('flags a made commit by short-sha prefix (the #387 case)', () => {
    expect(findSessionIdMismatches(foreign, 'session_REAL', madeShas('aaa111'))).toHaveLength(1)
  })

  it('flags a made commit by subject, so a rebase (new sha, no commit output) keeps it owned', () => {
    expect(findSessionIdMismatches(foreign, 'session_REAL', { shas: [], subjects: new Set(['sibling work']) })).toHaveLength(1)
  })
})

describe('findMadeCommits()', () => {
  it('reads every `[<branch> <sha>] <subject>` line from string and text-part tool results, root and detached commits included', () => {
    const made = findMadeCommits([
      [
        toolResult('[claude/x 1a2b3c4] first\n 1 file changed'),
        toolResult([{ type: 'text', text: 'hook ok\n[main (root-commit) 5d6e7f8] init' }]),
        toolResult('[detached HEAD 9a8b7c6] probe'),
      ].join('\n'),
    ])
    expect(made.shas).toEqual(['1a2b3c4', '5d6e7f8', '9a8b7c6'])
    expect([...made.subjects]).toEqual(['first', 'init', 'probe'])
  })

  it('reads subagent transcripts alongside the main one', () => {
    expect(findMadeCommits([toolResult('[a 1111111] main'), toolResult('[b 2222222] sub')]).shas).toEqual(['1111111', '2222222'])
  })

  it("ignores a commit line the session only wrote or was shown outside a tool result", () => {
    const assistant = JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: '[main 1a2b3c4] quoted' }] } })
    const prompt = JSON.stringify({ type: 'user', message: { content: '[main 5d6e7f8] pasted' } })
    expect(findMadeCommits([[assistant, prompt].join('\n')]).shas).toEqual([])
  })

  it('ignores `git log` output, which has no bracketed commit line', () => {
    expect(findMadeCommits([toolResult('1a2b3c4 subject\ncommit 5d6e7f8a\nAuthor: x')]).shas).toEqual([])
  })
})

describe('parseOwnCommits()', () => {
  it("parses sha + trailer session id per record, matching readOwnCommits' git-log format", () => {
    const raw = [
      `${REC}sha1\nsubject line\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_ABC`,
      `${REC}sha2\nsubject with no trailer at all`,
    ].join('')
    expect(parseOwnCommits(raw)).toEqual([
      { sha: 'sha1', trailerSessionId: 'session_ABC', subject: 'subject line' },
      { sha: 'sha2', trailerSessionId: undefined, subject: 'subject with no trailer at all' },
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
    expect(commits.map((c) => c.subject)).toEqual(['own work', 'own work, no trailer'])
  })

  /** Commits like a session's Bash call would, returning the tool result it would see. */
  const commit = (message: string) => toolResult(git(work, ['commit', '--allow-empty', '-m', message]))

  it('end to end: a fabricated trailer on a commit the session made is caught; the inherited one never surfaces', () => {
    const made = findMadeCommits([commit('fabricated\n\nClaude-Session: https://claude.ai/code/session_FABRICATED')])
    expect(findSessionIdMismatches(readOwnCommits(work), 'session_REAL', made)).toEqual([
      { sha: expect.any(String), found: 'session_FABRICATED', expected: 'session_REAL' },
    ])
  })

  it("end to end: a correct trailer on the session's own commit passes with no mismatches", () => {
    const made = findMadeCommits([commit('own work\n\nClaude-Session: https://claude.ai/code/session_REAL')])
    expect(findSessionIdMismatches(readOwnCommits(work), 'session_REAL', made)).toEqual([])
  })

  it('end to end: an amended commit stays owned through the new sha git prints', () => {
    const first = commit('own\n\nClaude-Session: https://claude.ai/code/session_FABRICATED')
    const amended = toolResult(git(work, ['commit', '--amend', '--allow-empty', '--no-edit']))
    expect(findSessionIdMismatches(readOwnCommits(work), 'session_REAL', findMadeCommits([first, amended]))).toHaveLength(1)
  })

  it("checkOwnCommits(): a sibling's commit landing mid-session in the shared working copy is skipped (issue #1698)", () => {
    const own = commit('own\n\nClaude-Session: https://claude.ai/code/session_FABRICATED')
    git(work, ['commit', '--allow-empty', '-m', 'sibling\n\nClaude-Session: https://claude.ai/code/session_SIBLING'])
    const transcript = [JSON.stringify({ type: 'user', sessionId: 'session_REAL', message: { content: 'x' } }), own].join('\n')
    expect(checkOwnCommits(work, transcript, {})).toEqual({
      groundTruthId: 'session_REAL',
      mismatches: [{ sha: expect.any(String), found: 'session_FABRICATED', expected: 'session_REAL' }],
    })
  })

  it('checkOwnCommits(): a commit made by a subagent is checked through its transcript', () => {
    const sub = commit('sub\n\nClaude-Session: https://claude.ai/code/session_FABRICATED')
    const main = JSON.stringify({ type: 'user', sessionId: 'session_REAL', message: { content: 'x' } })
    expect(checkOwnCommits(work, main, {}).mismatches).toEqual([])
    expect(checkOwnCommits(work, main, {}, [sub]).mismatches).toHaveLength(1)
  })
})
