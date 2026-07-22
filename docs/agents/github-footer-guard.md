# GitHub comment/PR/issue footer guard (issue #628)

A mechanical backstop for CLAUDE.md's session-id rule (issue #387), as
extended by #605/#606 to cover GitHub comment/issue/PR-body footers — a
surface `scripts/session-id-guard.ts` structurally cannot see, since it reads
git commit trailers only. That prose-only extension did not hold: the exact
failure it described — a fabricated `Claude-Session:` footer posted on a
GitHub comment (issue #483) — recurred within two days of the fix merging
(#628). This is the mechanical safeguard #628 asked a human to choose between
another prose pass vs. a real check; the owner chose the check.

## What it is

- **`scripts/github-footer-guard.ts`** — a `PreToolUse` hook, following the
  same template as `scripts/deferred-tool-guard.ts` (#612). On each matched
  GitHub-writing tool call it reads `tool_name` + `tool_input` +
  `transcript_path` on stdin, resolves the session's ground-truth id from the
  transcript exactly as `session-id-guard.ts` does for commits
  (`resolveGroundTruthFromTranscript`, reused rather than re-derived), and
  checks whether the call's `body` carries a `Claude-Session:` footer that
  diverges from that ground truth. If so, it blocks the call
  (`permissionDecision: "deny"`) with a corrective message naming the
  fabricated id and the real one.
- **`.claude/settings.json`** wires it under `hooks.PreToolUse`, matched
  against every GitHub MCP tool whose body can carry a footer
  (`GITHUB_FOOTER_TOOLS` in the script — `add_issue_comment`,
  `add_reply_to_pull_request_comment`, `create_pull_request`,
  `update_pull_request`, `pull_request_review_write`,
  `add_comment_to_pending_review`, `issue_write`). Each tool's `body` field
  name was verified against its real schema via `ToolSearch`, not guessed.

## Contract: skip-and-pass, never a false failure

Mirroring `findSessionIdMismatches`' contract:

- No ground-truth session id resolvable (no `transcript_path`, or the
  transcript carries neither `CLAUDE_CODE_REMOTE_SESSION_ID` nor its own
  `sessionId`) → pass, silently.
- No `Claude-Session:` footer in the body at all → pass. Most comments don't
  carry one and shouldn't be flagged for that.
- A footer whose id matches ground truth → pass.
- Any parse/read failure (non-JSON stdin, unreadable transcript) → pass. This
  is a backstop, so it fails **open**.

Only an actual mismatch — a footer present and wrong — blocks the call.

## What this closes, and what it still doesn't

This runs **before** the comment/PR/issue is posted, closing the gap
#605/#606 could only document: prose can tell an agent what already went
wrong, but it can't intercept the next occurrence. A mechanical check can.

What it still doesn't cover:

- **An already-posted bad footer.** No edit-comment tool exists for GitHub
  comments, so the standing remedy from #605/#606 — post a visible follow-up
  correction comment — still applies when a footer somehow gets past this
  guard (e.g. a tool call this registry doesn't yet cover).
- **Non-tool-mediated posts.** A human pasting a footer by hand, or a future
  GitHub-writing surface not yet in `GITHUB_FOOTER_TOOLS`.

## How to extend

A new GitHub-writing tool is found to carry a footer-able body: add a
`FooterTool` row (`{ tool: '...' }`, plus `bodyField` only if it differs from
`body`) to `GITHUB_FOOTER_TOOLS` in `scripts/github-footer-guard.ts`, and add
the tool name to the `PreToolUse` matcher list in `.claude/settings.json`.
Verify the field name via `ToolSearch` first — do not guess it.

## Relationship to the CLAUDE.md rule and the commit-trailer guard

This guard does not replace the "never predict/reconstruct a session id"
rule — it backstops the specific surface that rule's prose extension
(#605/#606) failed to hold on, the same way `session-id-guard.ts` backstops
the commit-trailer surface. The two guards are siblings, not overlapping: one
reads git commit trailers after the fact (`origin/main..HEAD`), the other
intercepts a GitHub-tool call before it posts.
