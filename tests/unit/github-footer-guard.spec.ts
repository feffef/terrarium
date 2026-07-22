// Coverage for the GitHub-comment/PR/issue-body footer guard (issue #628): a
// fabricated `Claude-Session:` footer recurred on a GitHub comment two days
// after the prose-only #605/#606 fix was meant to prevent exactly that,
// because `scripts/session-id-guard.ts` only ever sees git commit trailers.
// The pure core (`checkGithubFooter`) is pinned here directly; the CLI's
// stdin→deny-JSON path is exercised end to end against the real built script
// with a real transcript file, so the exact regression case (a fabricated
// footer on `mcp__github__add_issue_comment`, the tool used to post to #483)
// is proven to be blocked, not just asserted in the abstract.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  checkGithubFooter,
  denyOutputFor,
  formatGuardMessage,
  GITHUB_FOOTER_TOOLS,
} from '../../scripts/github-footer-guard.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SCRIPT = join(root, 'scripts', 'github-footer-guard.ts')

describe('checkGithubFooter() — the pure core (issue #628)', () => {
  it('THE REGRESSION: a fabricated Claude-Session footer on a GitHub comment body is flagged', () => {
    const finding = checkGithubFooter(
      'mcp__github__add_issue_comment',
      {
        owner: 'feffef',
        repo: 'terrarium',
        issue_number: 483,
        body: 'fix applied\n\nClaude-Session: https://claude.ai/code/session_FABRICATED',
      },
      'session_REAL',
    )
    expect(finding).toEqual({
      tool: 'mcp__github__add_issue_comment',
      found: 'session_FABRICATED',
      expected: 'session_REAL',
    })
  })

  it('passes silently when the footer matches the resolved ground truth', () => {
    const finding = checkGithubFooter(
      'mcp__github__add_issue_comment',
      { body: 'fix applied\n\nClaude-Session: https://claude.ai/code/session_REAL' },
      'session_REAL',
    )
    expect(finding).toBeNull()
  })

  it('passes when the body carries no footer at all', () => {
    expect(checkGithubFooter('mcp__github__add_issue_comment', { body: 'just a plain comment' }, 'session_REAL')).toBeNull()
  })

  it('skips (passes) when no ground-truth id is resolvable — no false failure', () => {
    const input = { body: 'Claude-Session: https://claude.ai/code/session_WRONG' }
    expect(checkGithubFooter('mcp__github__add_issue_comment', input, null)).toBeNull()
    expect(checkGithubFooter('mcp__github__add_issue_comment', input, undefined)).toBeNull()
  })

  it('only checks tools in the registry — an unrelated tool is never inspected', () => {
    expect(
      checkGithubFooter('Bash', { command: 'echo "Claude-Session: session_WRONG"' }, 'session_REAL'),
    ).toBeNull()
  })

  it('generalizes across the whole registry, not just add_issue_comment', () => {
    for (const { tool } of GITHUB_FOOTER_TOOLS) {
      const finding = checkGithubFooter(
        tool,
        { body: 'Claude-Session: https://claude.ai/code/session_WRONG' },
        'session_REAL',
      )
      expect(finding?.tool).toBe(tool)
    }
  })

  it('never throws on a null / non-object tool_input, or a non-string body', () => {
    expect(checkGithubFooter('mcp__github__add_issue_comment', null, 'session_REAL')).toBeNull()
    expect(checkGithubFooter('mcp__github__add_issue_comment', undefined, 'session_REAL')).toBeNull()
    expect(checkGithubFooter('mcp__github__add_issue_comment', 'a string', 'session_REAL')).toBeNull()
    expect(checkGithubFooter('mcp__github__add_issue_comment', { body: 42 }, 'session_REAL')).toBeNull()
  })
})

describe('the seed registry', () => {
  it('carries every GitHub-writing tool that can post a body (issue #628 scope)', () => {
    const names = GITHUB_FOOTER_TOOLS.map((r) => r.tool)
    expect(names).toEqual(
      expect.arrayContaining([
        'mcp__github__add_issue_comment',
        'mcp__github__add_reply_to_pull_request_comment',
        'mcp__github__create_pull_request',
        'mcp__github__update_pull_request',
        'mcp__github__pull_request_review_write',
        'mcp__github__add_comment_to_pending_review',
        'mcp__github__issue_write',
      ]),
    )
  })
})

describe('formatGuardMessage()', () => {
  it('names the offending tool, the found id, and the expected id', () => {
    const msg = formatGuardMessage({
      tool: 'mcp__github__add_issue_comment',
      found: 'session_WRONG',
      expected: 'session_REAL',
    })
    expect(msg).toContain('issue #628')
    expect(msg).toContain('mcp__github__add_issue_comment')
    expect(msg).toContain('session_WRONG')
    expect(msg).toContain('session_REAL')
  })
})

describe('denyOutputFor() — the PreToolUse control object', () => {
  it('emits a deny decision for a finding', () => {
    const out = denyOutputFor({ tool: 'mcp__github__add_issue_comment', found: 'session_WRONG', expected: 'session_REAL' })
    expect(out?.hookSpecificOutput.hookEventName).toBe('PreToolUse')
    expect(out?.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(out?.hookSpecificOutput.permissionDecisionReason).toContain('session_REAL')
  })

  it('emits nothing (null) for an allowed call, so the call proceeds untouched', () => {
    expect(denyOutputFor(null)).toBeNull()
  })
})

describe('the CLI as the PreToolUse hook would invoke it (stdin JSON → stdout deny)', () => {
  let scratch: string
  let transcriptPath: string

  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), 'github-footer-guard-'))
    transcriptPath = join(scratch, 'transcript.jsonl')
  })

  afterEach(() => {
    rmSync(scratch, { recursive: true, force: true })
  })

  function writeTranscript(sessionId: string): void {
    writeFileSync(
      transcriptPath,
      JSON.stringify({
        type: 'assistant',
        timestamp: '2026-07-22T10:00:00Z',
        sessionId,
        message: { model: 'claude-opus-4-8', content: [] },
      }) + '\n',
    )
  }

  /** Run the guard exactly as the PreToolUse hook would. Explicitly clears
   *  `CLAUDE_CODE_REMOTE_SESSION_ID` — this repo's own sessions run inside a
   *  Claude Code Remote container where that env var IS set, and
   *  `resolveGroundTruthSessionId` prefers it over the transcript's own
   *  `sessionId`. Without clearing it, these tests would silently resolve
   *  ground truth from the real outer session instead of the fixture
   *  transcript they construct. */
  function runHook(payload: unknown): { hookSpecificOutput: Record<string, string> } | null {
    const out = execFileSync('pnpm', ['exec', 'tsx', SCRIPT], {
      cwd: root,
      input: JSON.stringify(payload),
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_CODE_REMOTE_SESSION_ID: '' },
    }).trim()
    return out ? JSON.parse(out) : null
  }

  it('END TO END: THE REGRESSION — blocks a fabricated footer resolved against the real transcript', () => {
    writeTranscript('session_REAL')
    const deny = runHook({
      hook_event_name: 'PreToolUse',
      tool_name: 'mcp__github__add_issue_comment',
      tool_input: {
        owner: 'feffef',
        repo: 'terrarium',
        issue_number: 483,
        body: 'fix applied\n\nClaude-Session: https://claude.ai/code/session_FABRICATED',
      },
      transcript_path: transcriptPath,
    })
    expect(deny?.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(deny?.hookSpecificOutput.permissionDecisionReason).toContain('session_FABRICATED')
    expect(deny?.hookSpecificOutput.permissionDecisionReason).toContain('session_REAL')
  })

  it('END TO END: stays silent when the footer matches the resolved ground truth', () => {
    writeTranscript('session_REAL')
    const out = runHook({
      hook_event_name: 'PreToolUse',
      tool_name: 'mcp__github__add_issue_comment',
      tool_input: { body: 'fix applied\n\nClaude-Session: https://claude.ai/code/session_REAL' },
      transcript_path: transcriptPath,
    })
    expect(out).toBeNull()
  })

  it('END TO END: stays silent when no transcript_path is supplied (no ground truth resolvable)', () => {
    const out = runHook({
      hook_event_name: 'PreToolUse',
      tool_name: 'mcp__github__add_issue_comment',
      tool_input: { body: 'fix applied\n\nClaude-Session: https://claude.ai/code/session_FABRICATED' },
    })
    expect(out).toBeNull()
  })

  it('END TO END: stays silent on a correctly-shaped call with no footer', () => {
    writeTranscript('session_REAL')
    const out = runHook({
      hook_event_name: 'PreToolUse',
      tool_name: 'mcp__github__add_issue_comment',
      tool_input: { body: 'just a plain comment, no footer' },
      transcript_path: transcriptPath,
    })
    expect(out).toBeNull()
  })

  it('END TO END: stays silent on non-JSON / empty stdin (fails open)', () => {
    const out = execFileSync('pnpm', ['exec', 'tsx', SCRIPT], { cwd: root, input: '', encoding: 'utf8' }).trim()
    expect(out).toBe('')
  })
})
