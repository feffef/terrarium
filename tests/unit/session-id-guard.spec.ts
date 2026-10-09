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
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
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
const MADE_ALL = madeShas('aaa', 'bbb', 'ccc', 'ddd')

let callId = 0
/** The two transcript records of one tool call: the assistant's `tool_use`
 *  and the `tool_result` that answers it. */
function toolCall(command: string, output: unknown, name = 'Bash'): Record<string, unknown>[] {
  const id = `toolu_${++callId}`
  return [
    { type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input: { command } }] } },
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content: output }] } },
  ]
}

describe('findSessionIdMismatches() — the pure core (issue #387)', () => {
  it('flags a commit whose trailer diverges from the ground truth', () => {
    const commits: OwnCommit[] = [{ sha: 'aaa111', trailerSessionId: 'session_WRONG' }]
    expect(findSessionIdMismatches(commits, 'session_REAL', MADE_ALL)).toEqual([
      { sha: 'aaa111', found: 'session_WRONG', expected: 'session_REAL' },
    ])
  })

  it('passes silently on a matching trailer', () => {
    const commits: OwnCommit[] = [{ sha: 'aaa111', trailerSessionId: 'session_REAL' }]
    expect(findSessionIdMismatches(commits, 'session_REAL', MADE_ALL)).toEqual([])
  })

  it('never flags a commit with no trailer at all — most commits on a branch carry none', () => {
    const commits: OwnCommit[] = [{ sha: 'aaa111' }]
    expect(findSessionIdMismatches(commits, 'session_REAL', MADE_ALL)).toEqual([])
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
    expect(findSessionIdMismatches(commits, 'session_REAL', MADE_ALL).map((m) => m.sha)).toEqual(['bbb', 'ddd'])
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
  it('reads every `[<branch> <sha>] <subject>` line a committing git command printed, string or text-part results, root and detached commits included', () => {
    const made = findMadeCommits([
      ...toolCall('git commit -F msg.txt', '[claude/x 1a2b3c4] first\n 1 file changed'),
      ...toolCall('git -C /repo commit --amend --no-edit', [{ type: 'text', text: 'hook ok\n[main (root-commit) 5d6e7f8] init' }]),
      ...toolCall('cd /repo && git cherry-pick abc', '[detached HEAD 9a8b7c6] probe'),
    ])
    expect(made.shas).toEqual(['1a2b3c4', '5d6e7f8', '9a8b7c6'])
  })

  it('reads the subagent records passed alongside the main ones', () => {
    expect(findMadeCommits([...toolCall('git commit -m a', '[a 1111111] a'), ...toolCall('git commit -m b', '[b 2222222] b')]).shas).toEqual([
      '1111111',
      '2222222',
    ])
  })

  it('ignores a commit line the session only read: cat, git show, a log, a subagent report, another session transcript', () => {
    const line = '[main 1a2b3c4] sibling work'
    const made = findMadeCommits([
      ...toolCall('cat .session-logs/x.log', line),
      ...toolCall('git show HEAD', line),
      ...toolCall('git log -1', line),
      ...toolCall('', line, 'Read'),
      ...toolCall('', line, 'mcp__claude-code-remote__list_events'),
      ...toolCall('', line, 'Agent'),
      { type: 'assistant', message: { content: [{ type: 'text', text: line }] } },
      { type: 'user', message: { content: line } },
    ])
    expect(made.shas).toEqual([])
  })

  it('keeps subjects only once the session rebased, so a sibling sharing a subject is not claimed otherwise', () => {
    const commit = toolCall('git commit -m "fix lint"', '[b 1a2b3c4] fix lint')
    expect([...findMadeCommits(commit).subjects]).toEqual([])
    expect([...findMadeCommits([...commit, ...toolCall('git rebase origin/main', 'Successfully rebased')]).subjects]).toEqual(['fix lint'])
    expect([...findMadeCommits([...commit, ...toolCall('git pull --rebase origin b', 'ok')]).subjects]).toEqual(['fix lint'])
  })

  it('needs git at command position, so a command that only quotes a git commit or rebase is neither', () => {
    const quoted = [
      ...toolCall(`grep -n "git rebase" scripts/x.ts`, '[main 1a2b3c4] fix lint'),
      ...toolCall("echo 'later: git commit -m x'", '[main 5d6e7f8] fix lint'),
    ]
    expect(findMadeCommits(quoted)).toEqual({ shas: [], subjects: new Set() })
    const own = toolCall('git commit -m "fix lint"', '[b 9a8b7c6] fix lint')
    expect([...findMadeCommits([...own, ...toolCall('echo "then git rebase main"', '')]).subjects]).toEqual([])
  })

  it('records nothing for a commit that prints no commit line (git commit -q, a merge): the documented fail-open', () => {
    expect(findMadeCommits([...toolCall('git commit -q -m x', ''), ...toolCall('git merge origin/main', "Merge made by the 'ort' strategy.")]).shas).toEqual([])
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

  /** Commits as a session's Bash call would: the records of that call. */
  const commit = (message: string) =>
    toolCall('git commit --allow-empty -F msg.txt', git(work, ['commit', '--allow-empty', '-m', message]))
  const jsonl = (records: Record<string, unknown>[]) => records.map((r) => JSON.stringify(r)).join('\n')
  const header = { type: 'user', sessionId: 'session_REAL', message: { content: 'x' } }

  it('end to end: a fabricated trailer on a commit the session made is caught; the inherited one never surfaces', () => {
    const made = findMadeCommits(commit('fabricated\n\nClaude-Session: https://claude.ai/code/session_FABRICATED'))
    expect(findSessionIdMismatches(readOwnCommits(work), 'session_REAL', made)).toEqual([
      { sha: expect.any(String), found: 'session_FABRICATED', expected: 'session_REAL' },
    ])
  })

  it("end to end: a correct trailer on the session's own commit passes with no mismatches", () => {
    const made = findMadeCommits(commit('own work\n\nClaude-Session: https://claude.ai/code/session_REAL'))
    expect(findSessionIdMismatches(readOwnCommits(work), 'session_REAL', made)).toEqual([])
  })

  it('end to end: an amended commit stays owned through the new sha git prints', () => {
    const first = commit('own\n\nClaude-Session: https://claude.ai/code/session_FABRICATED')
    const amended = toolCall('git commit --amend --no-edit', git(work, ['commit', '--amend', '--allow-empty', '--no-edit']))
    expect(findSessionIdMismatches(readOwnCommits(work), 'session_REAL', findMadeCommits([...first, ...amended]))).toHaveLength(1)
  })

  it('end to end: a rebased commit (new sha, nothing reprinted) stays owned by its subject', () => {
    const own = commit('own\n\nClaude-Session: https://claude.ai/code/session_FABRICATED')
    git(work, ['branch', 'feature'])
    git(work, ['reset', '--hard', 'origin/main'])
    git(work, ['commit', '--allow-empty', '-m', 'main moved on'])
    git(work, ['checkout', 'feature'])
    const rebase = toolCall('git rebase main', git(work, ['rebase', '--empty=keep', 'main']))
    const [rebased] = readOwnCommits(work)
    expect(JSON.stringify(own)).not.toContain(rebased!.sha.slice(0, 7)) // the sha really changed
    expect(findSessionIdMismatches(readOwnCommits(work), 'session_REAL', findMadeCommits([...own, ...rebase]))).toHaveLength(1)
  })

  it("checkOwnCommits(): a sibling's commit landing mid-session in the shared working copy is skipped (issue #1698)", () => {
    const own = commit('own\n\nClaude-Session: https://claude.ai/code/session_FABRICATED')
    git(work, ['commit', '--allow-empty', '-m', 'sibling\n\nClaude-Session: https://claude.ai/code/session_SIBLING'])
    const path = join(scratch, 'session.jsonl')
    writeFileSync(path, jsonl([header, ...own]))
    expect(checkOwnCommits(work, path, {})).toEqual({
      groundTruthId: 'session_REAL',
      mismatches: [{ sha: expect.any(String), found: 'session_FABRICATED', expected: 'session_REAL' }],
    })
  })

  it('checkOwnCommits(): a commit made by a subagent is checked through its transcript beside the main one', () => {
    const sub = commit('sub\n\nClaude-Session: https://claude.ai/code/session_FABRICATED')
    const path = join(scratch, 'session.jsonl')
    writeFileSync(path, jsonl([header]))
    expect(checkOwnCommits(work, path, {}).mismatches).toEqual([])
    mkdirSync(join(scratch, 'session', 'subagents'), { recursive: true })
    writeFileSync(join(scratch, 'session', 'subagents', 'agent-a.jsonl'), jsonl(sub))
    expect(checkOwnCommits(work, path, {}).mismatches).toHaveLength(1)
  })
})
