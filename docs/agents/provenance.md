# Provenance & identity

The single home for two rules that travel together — **never fabricate an
identifier**, and **every agent-authored artefact carries the ADR-0017
provenance footer** — plus the map of which mechanical guard covers which
surface.

Moved out of `CLAUDE.md` so that file could stay an index (the same treatment
`pr-workflow.md` got in #448). This
doc is deliberately *not* split along a git/GitHub line: the same footer rule
spans local commits, GitHub posts, and commits made through the GitHub API, and
the coverage map below is only legible whole. Splitting it is what produced
#605 (the commit-trailer guard can't see GitHub surfaces) and its recurrence
#628 two days later.

ADR-0017 remains the single home for *scope* — what the footer covers and why
it is convention rather than gate-enforced. This doc holds the mechanics.

## The rules

- **Never predict or reconstruct an identifier — a line number, a blob SHA, an
  issue/PR number — from memory.** Always resolve it via a fresh tool call (a
  Read, `git rev-parse`/`git log -1 --format=%H`, or the actual `issue_write`
  response) at the moment you write it down. For a session id specifically,
  resolve it from the system-prompt commit-footer template / session context at
  the moment of writing — never construct one from a plausible-looking pattern.
  This rule alone has repeatedly failed to hold (issue #387).
- **Every agent-authored interaction with GitHub, or any other external system,
  carries a two-line footer** (ADR-0017 — read it for the full rationale and the
  no-exemptions scope):

  ```
  Co-Authored-By: <model name> <noreply@anthropic.com>
  Claude-Session: <session URL>
  ```
- **GitHub strips bare `<...>` angle-bracket text in a rendered issue/PR body
  as HTML markup.** This has silently garbled both the footer's own
  `<noreply@anthropic.com>` and an unrelated placeholder written in prose
  (e.g. `<slug>`) — the text simply vanishes from the rendered body, with no
  error. Verify the rendered body after posting when angle brackets are
  involved, or avoid bare angle-bracket placeholder syntax in prose (issue
  #779).

## Guard coverage map

Four surfaces, three guards, one hole. Read the whole table before concluding
you are covered — every recorded failure here came from an agent who knew about
one row and assumed it generalized.

| Surface | Guard | What it does |
| --- | --- | --- |
| Local `git commit` | `.githooks/commit-msg` → `scripts/provenance-footer.ts` | Appends the footer when absent; **corrects it in place when present but mismatched** (issue #710). Installed via `core.hooksPath` in `postinstall`. Fail-open. |
| A commit trailer, after the fact | `scripts/session-id-guard.ts`, wired into the `Stop`-hook path (`scripts/session-end.ts`) | Compares every `Claude-Session:` trailer on this session's own commits against resolved ground truth and **records** a mismatch. Detection only — it does not prevent one. |
| Seven GitHub write tools | `scripts/github-footer-guard.ts`, a `PreToolUse` hook | **Blocks** a call whose body's `Claude-Session:` footer diverges from ground truth, before the post. Registry: `GITHUB_FOOTER_TOOLS`; matcher in `.claude/settings.json`. |
| MCP-API commits — `create_or_update_file`, `push_files` | **none** | Neither hook fires. The commit-msg hook only sees a local `git commit`; the footer guard's matcher does not list these tools. Append the footer by hand. |

Two further gaps worth holding in mind:

- The `PreToolUse` guard blocks a **divergent** footer, not a **missing** one —
  a body with no footer at all passes today (open issue #737).
- The commit-msg hook can silently no-op if pnpm/tsx isn't on PATH. It usually
  works, so you should rarely need to amend by hand — but glance that a
  commit's footer actually landed rather than assuming it.

## Remedies, which differ by surface

This asymmetry is the reason the two halves cannot be documented apart:

- **A commit** is fixable in place: `git commit --amend -F <file>` on the tip
  commit only. **Never** use `git commit-tree` or other history-rewriting
  techniques to inject a missing footer — see
  [`git-conventions.md`](./git-conventions.md) for why (it can silently
  re-parent the chain and drop intervening commits).
- **A GitHub post is not.** No edit-comment tool exists. The standing remedy
  for a bad footer caught after posting — a guard miss, or a post that wasn't
  tool-mediated — is to post a **visible follow-up correction comment**, never
  to try to rewrite the original.

## Why this keeps recurring

The prose-only rule has now failed four recorded times (#387, #605, #628, and
the pattern #723 tracks), each time surviving a strengthening of the prose. The
guards above exist because prose alone did not hold. Two consequences for how
you read this doc:

- A guard that *detects* (row 2) is not a guard that *prevents*. Resolving the
  real identifier at write time is still the primary control.
- A surface with no guard (row 4) is not a surface with no rule.
