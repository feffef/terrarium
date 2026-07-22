// Mechanical backstop for issue #628: CLAUDE.md's doc-only "never predict or
// reconstruct a session id" rule (issue #387) was extended by #605/#606 to
// call out GitHub comment/issue/PR-body footers as a surface
// `scripts/session-id-guard.ts` structurally cannot see (it reads git commit
// trailers only). That prose-only extension did not hold: the exact failure —
// a fabricated `Claude-Session:` footer on a GitHub comment (issue #483) —
// recurred within two days of the fix merging. This is the mechanical
// safeguard #628 asked a human to choose between prose-again vs. a real
// check; the owner chose the check.
//
// A `PreToolUse` hook (wired in `.claude/settings.json`, mirroring
// `deferred-tool-guard.ts`'s #612 template) matches every GitHub-writing tool
// whose body can carry a footer (`GITHUB_FOOTER_TOOLS`). On a match it reads
// the hook payload's `transcript_path`, resolves ground truth exactly as
// `session-id-guard.ts` does for commits (`resolveGroundTruthFromTranscript`,
// reused rather than re-derived), and blocks the call if the body's
// `Claude-Session:` footer names a different session id. No ground truth
// resolvable, or no footer present at all, is always a pass — never a false
// failure (the same skip-and-pass contract as `findSessionIdMismatches`).
//
// This closes the gap #605/#606 could only document, not prevent: the guard
// runs BEFORE the comment/PR/issue is posted, not after. It cannot fix an
// already-posted bad footer (no edit-comment tool exists — the standing
// remedy stays "post a visible follow-up correction comment"), and it only
// covers tool-mediated posts.
//
// Pure core (`checkGithubFooter`) is kept separate from the stdin/transcript
// I/O (`main`), mirroring `deferred-tool-guard.ts` / `session-id-guard.ts`.
//
// Usage (normally invoked by the PreToolUse hook with the payload on stdin):
//   tsx scripts/github-footer-guard.ts
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { SESSION_TRAILER } from './git-helpers.ts'
import { resolveGroundTruthFromTranscript } from './session-id-guard.ts'

/** One GitHub-writing tool whose call can carry an agent-authored footer, and
 *  which of its parameters holds that text. Verified against each tool's real
 *  schema via `ToolSearch` (issue #628 — CLAUDE.md: never guess a deferred
 *  tool's shape) — every one of these uses `body`, but the field is still
 *  named per entry so a future addition with a different field name is a
 *  one-line row, not a logic change. */
export interface FooterTool {
  tool: string
  bodyField?: string
}

/** The seed registry: every GitHub MCP tool that writes a comment, issue, PR,
 *  or review body an agent might stamp with a `Claude-Session:` footer
 *  (ADR-0017). Add a row here if a new footer-carrying surface is found. */
export const GITHUB_FOOTER_TOOLS: readonly FooterTool[] = [
  { tool: 'mcp__github__add_issue_comment' },
  { tool: 'mcp__github__add_reply_to_pull_request_comment' },
  { tool: 'mcp__github__create_pull_request' },
  { tool: 'mcp__github__update_pull_request' },
  { tool: 'mcp__github__pull_request_review_write' },
  { tool: 'mcp__github__add_comment_to_pending_review' },
  { tool: 'mcp__github__issue_write' },
]

export interface FooterMismatch {
  tool: string
  found: string
  expected: string
}

/** The pure, unit-testable core: does this call's body carry a
 *  `Claude-Session:` footer that diverges from the resolved ground truth?
 *  Returns `null` for anything that isn't a mismatch — a tool outside the
 *  registry, a missing/non-string body, no footer at all, a matching footer,
 *  or (skip-and-pass, never a false failure) no ground truth id. Never
 *  throws. */
export function checkGithubFooter(
  toolName: string,
  toolInput: unknown,
  groundTruthId: string | null | undefined,
  registry: readonly FooterTool[] = GITHUB_FOOTER_TOOLS,
): FooterMismatch | null {
  if (!groundTruthId) return null
  const entry = registry.find((r) => r.tool === toolName)
  if (!entry) return null
  if (toolInput === null || typeof toolInput !== 'object') return null
  const body = (toolInput as Record<string, unknown>)[entry.bodyField ?? 'body']
  if (typeof body !== 'string') return null
  const m = body.match(SESSION_TRAILER)
  if (!m) return null
  const found = m[1]!
  if (found === groundTruthId) return null
  return { tool: toolName, found, expected: groundTruthId }
}

/** The corrective message shown to the agent when the guard blocks — names
 *  the offending tool, the fabricated/mismatched id, and the real one, and
 *  restates the rule so it's self-contained without the agent having read
 *  CLAUDE.md. */
export function formatGuardMessage(f: FooterMismatch): string {
  return (
    `Blocked (issue #628 github-footer guard): the \`${f.tool}\` call's body carries a ` +
    `\`Claude-Session:\` footer naming ${f.found}, but this session's resolved ground-truth id ` +
    `is ${f.expected}. Never predict or reconstruct a session id from memory — this hook already ` +
    `resolved the real one from the transcript; use ${f.expected} verbatim, or drop the footer ` +
    `entirely if this post isn't meant to carry one.`
  )
}

/** The `PreToolUse` "deny" control object a hook writes to stdout to block a
 *  call (Claude Code hooks reference). `null` when nothing should be blocked,
 *  so `main` writes nothing and the call proceeds untouched. */
export function denyOutputFor(finding: FooterMismatch | null): { hookSpecificOutput: Record<string, string> } | null {
  if (!finding) return null
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: formatGuardMessage(finding),
    },
  }
}

/** Hook payload shape we rely on — a subset of the PreToolUse stdin JSON.
 *  `transcript_path` is what `session-end.ts` already reads off the same
 *  payload shape (confirmed there, not guessed here). */
interface PreToolUsePayload {
  tool_name?: string
  tool_input?: unknown
  transcript_path?: string
}

/** Reads the hook JSON on stdin, resolves ground truth from the transcript,
 *  runs the pure check, and — only on a mismatch — writes the deny control
 *  object to stdout. Always exits 0: an allowed call, a missing transcript
 *  (no ground truth resolvable), or any parse/read failure must let normal
 *  tool use proceed. This is a backstop, so it fails OPEN. */
export function main(): void {
  let raw: string
  try {
    raw = readFileSync(0, 'utf8')
  } catch {
    return // no stdin — nothing to inspect
  }
  if (!raw.trim()) return

  let payload: PreToolUsePayload
  try {
    payload = JSON.parse(raw)
  } catch {
    return // not JSON — do not interfere
  }
  if (typeof payload.tool_name !== 'string') return
  if (!payload.transcript_path) return // no transcript path — no ground truth resolvable, skip-and-pass

  let transcriptJsonl: string
  try {
    transcriptJsonl = readFileSync(payload.transcript_path, 'utf8')
  } catch {
    return // transcript unreadable — skip-and-pass, same contract
  }

  const groundTruthId = resolveGroundTruthFromTranscript(transcriptJsonl)
  const finding = checkGithubFooter(payload.tool_name, payload.tool_input, groundTruthId)
  const output = denyOutputFor(finding)
  if (output) process.stdout.write(JSON.stringify(output))
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  } catch {
    // A hook must never wedge tool use with its own crash — swallow and allow.
  }
}
