# GitHub integration: the `mcp__github__*` tool surface

How to drive GitHub from a session: which tool does what, what overflows, and
how to poll. Two workflow docs sit on top of this one and own their recipes:
[`issue-tracker.md`](./issue-tracker.md) (issues, specs, triage) and
[`pr-workflow.md`](./pr-workflow.md) (landing a gated PR).

## Bare angle brackets vanish from a rendered title or body

GitHub strips bare `<...>` text. Put it in a fenced code block; a single
backtick is not enough. A guard denies it.

## Transient failures

A 503 ("no server currently available") is usually transient: retry once or
twice before calling it a failure. If `issue_read` keeps flaking,
`search_issues` scoped to the issue number works as a fallback.

## Local CLI vs cloud session: which tool works

| | Local CLI | Cloud session |
|---|---|---|
| GraphQL-backed `gh` subcommands (`gh issue view`, `gh pr list`, …) | yes | no: 403, GraphQL is blocked |
| `gh api` and REST-backed subcommands (`gh run list`) | yes | yes, though `gh auth status` reports a bad token |
| `mcp__github__*` tools | only if configured | yes |
| **Default** | `gh`; MCP for writes if configured | the MCP tools; `gh api` for REST a tool lacks |

Write through MCP in the cloud (ADR-0017); `gh api` suits bulk reads in scripts,
where the MCP list tools overflow. Some cloud sessions lack `gh`; check with
`which gh`. In a cloud session, map the workflow docs' `gh` recipes
like this:

- **Create / edit / label / close an issue** → `issue_write`.
  - Labeling a *PR* also goes through `issue_write` (issues and PRs share one
    number space).
  - Closing or reopening a PR does **not**: `issue_write` rejects `state` /
    `state_reason` on a PR number. Use `update_pull_request`.
  - A PR that needs labels and a state change takes two calls.
  - A label update **replaces** the whole set: pass every label the issue
    should end with.
- **Comment on an issue or PR** → `add_issue_comment`. Never use `issue_write`
  with `method: update` and a `body` for this: it *overwrites the description*
  with no confirmation and no diff (issue #723).
- **Read an issue, its comments, or sub-issues** → `issue_read`
- **Read a PR or its diff** → `pull_request_read`
- **List / search PRs** → `list_pull_requests` / `search_pull_requests`
- **Link sub-issues** → `sub_issue_write`

## Write traps

- **On a "you already have a pending review" error, stop and ask the user; don't
  `delete_pending` and retry.** It can come from `pull_request_review_write` (or
  the raw review API) mid-triage. Agent calls run under the human owner's
  connection (ADR-0017), so you can't tell your leftover from the maintainer's own
  unsubmitted draft, and deleting the wrong one erases the draft for good.
- **Rewriting a map or spec body wholesale:** pasting fresh content copies the OLD
  session's ADR-0017 header line, which the provenance guard then reads as this
  session's write and rejects as stale. Replace that line with the current
  session's marker before submitting.

## Overflow and precision traps

Large results overflow your context. Keep them small and read every hit.

- **Prefer a repo-scoped listing to `search_*`.** Search 403s after a few
  sequential calls, and the proxy blocks `search/issues` for scripts. Use
  `list_issues`, `list_pull_requests` or
  `pnpm exec tsx scripts/github/list-open-issues.ts` and filter locally. If you
  must search, scope it (state, label, a quoted identifier such as a session id
  or exact error string), run it alone, and on a 403 retry once after a minute.
  `search_pull_requests` needs explicit `owner` and `repo`, or it searches all of
  GitHub. A guard demands `fields` on both search tools and says what to pass.
- **`list_issues` and `list_pull_requests` have no `minimal_output`.** Pass
  `fields` that omit `body` (and `field_values`/`labels` on `list_issues`), use a
  small `perPage` (5-10), and page through open and closed/merged.
- **A search result is not proof.** Matching is fuzzy even for a quoted phrase,
  so read every hit. `total_count: 0` can miss a real hit: before you assert
  "nothing exists," cross-check with a narrow `list_*` scan.
- **`issue_read` / `pull_request_read` bodies are HTML-entity-encoded**
  (`&amp;`, `&#34;`, `&lt;`). Decode before you quote or parse them.
- **Three calls return huge output.** `actions_list` returns full run objects
  (~300KB): slice the saved file or query by SHA. `get_job_logs` can return one
  enormous line, so `Read`'s offset/limit doesn't help: redirect to a file and
  slice it, or fetch a small tail. `issue_read`'s `get_sub_issues` returns full
  bodies: for linkage or a count, use `list_issues` with `fields` that omit
  `body`, or read `sub_issues_summary.total_count`.

## Script escapes — cheaper than the API

- **Recently merged PRs:** `pnpm exec tsx scripts/git/list-recent-prs.ts [N]` reads
  `git log origin/main` (number, title, merge time only).
- **Open issues:** `pnpm exec tsx scripts/github/list-open-issues.ts [N]` (number,
  title, labels, updated time). It falls back to `curl` with `GH_TOKEN` /
  `GITHUB_TOKEN` when `gh` is missing; with neither, use the MCP tools.
- **An AI comment may claim a triage-label change the issue never got**
  (issue #325). `pnpm exec tsx scripts/github/check-triage-drift.ts [N]` prints such
  mismatches as JSON; the script's header says how.

## Polling: gate status is not webhook-delivered

- **Check a PR's gate with `pull_request_read` method `get_check_runs`, not
  `get_status`.** The combined-status API reports `total_count: 0` / pending for
  Actions-based gates, which wrongly suggests the gate has not run.
- **A red check's cause is in its annotations:**
  `gh api repos/{owner}/{repo}/check-runs/{id}/annotations` names the failing
  file and message. Read them before any log: the REST job-log download 403s in
  the cloud (its blob redirect is blocked), and a `get_job_logs` tail often
  shows only cleanup.
- **CI success is not delivered natively.** A green gate wakes a subscribed
  session only through the comment the gate action posts on green (its "doorbell",
  `.github/actions/gate/action.yml`; none on a fork PR). Poll
  `get_check_runs` when you can't rely on that: at agent-completion checkpoints,
  or with `send_later` when no agent is running. Babysit cadence: step 3 of
  [`pr-workflow.md`](./pr-workflow.md).
- **Re-running an old workflow run does not recompute the merge ref.** It
  re-checks-out that run's original `refs/pull/N/merge` snapshot, so it can stay
  red after the fix has merged. Only a fresh push or branch update recomputes
  the ref and gives a true re-check.
- **This polling advice covers state webhooks don't deliver, like CI, not a
  dispatched Agent-tool subagent.**
- **Polling relies on remote-session MCP and `AskUserQuestion` calls, which can
  fail transiently:** see the "permission stream closed" caveat and its fallback
  in [`environment-caveats.md`](./environment-caveats.md).

## Resolving deferred tool names

Deferred MCP tools resolve only by **fully-qualified name**
(`mcp__github__list_issues`, not `list_issues`). This is host behaviour this
repo can't change.

**Query forms:**
- `select:` plus a fully-qualified name resolves, comma-separated lists too.
- `select:` plus a bare or misspelled name fails with `No matching deferred
  tools found`.
- ⚠️ Mixing a valid and a bare name in one `select:` **silently partial-succeeds**:
  you get only the valid tool and no error about the dropped one.
- A bare name as a plain keyword query (no `select:`) resolves by semantic match.
  That is the recovery when a `select:` guess fails. If it still comes back
  empty, broaden it into a phrase.

**The bad-name trap:** calling a tool directly by an unknown name (bare, or a
misspelled full name) gives `Error: No such tool available: <name>`, with no
"did you mean" and no hint to try `ToolSearch`. Don't write off a plausible
bare name as unsupported: retry it as a keyword query.

**No MCP tool for issue dependencies** (wayfinding *Blocking*): use the `curl` recipe in
[`issue-tracker.md`](./issue-tracker.md)'s **Blocking** bullet (the proxy answers
415 without its `Content-Type` header). A summary read right after a write can be stale
(issue #1373).

**Known gap:** no GitHub API (REST or GraphQL) attaches a file or image to an
issue or comment. Options: (a) the web UI (needs a human), (b) commit the image
and hotlink it, (c) attach it as a release asset (issue #872).
