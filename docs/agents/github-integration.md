# GitHub integration: the `mcp__github__*` tool surface

How to drive GitHub from a session: which tool does what, what overflows, and
how to poll. Two workflow docs sit on top of this one and own their recipes:
[`issue-tracker.md`](./issue-tracker.md) (issues, specs, triage) and
[`pr-workflow.md`](./pr-workflow.md) (landing a gated PR).

## Bare angle brackets vanish from a rendered title or body

GitHub silently strips bare `<...>` text from a rendered title or body. Wrap it
in a fenced code block; a single backtick is not enough. A guard denies it
(issue #886).

## Transient failures — retry before escalating

`mcp__github__*` calls sometimes return a transient 503 ("no server currently
available"). Retry once or twice after a short pause before calling it a
failure. If `issue_read` keeps flaking,
`search_issues` scoped to the issue number works as a fallback (issue #611).

## Local CLI vs cloud session: which tool works

| | Local CLI | Cloud session |
|---|---|---|
| GraphQL-backed `gh` subcommands (`gh issue view`, `gh pr list`, …) | yes | no: 403, GraphQL is blocked |
| `gh api` and REST-backed subcommands (`gh run list`) | yes | yes, though `gh auth status` reports a bad token |
| `mcp__github__*` tools | only if configured | yes |
| **Default** | `gh` | the MCP tools; `gh api` for REST a tool lacks |

Write through MCP in the cloud, not `gh api`: the provenance guard checks only
`mcp__github__*` calls. `gh api` suits bulk reads in scripts,
where the MCP list tools overflow. Some cloud sessions lack `gh`; check with
`which gh`. In a cloud session, map the workflow docs' `gh` recipes
like this:

- **Create / edit / label / close an issue** → `issue_write`.
  - Labeling a *PR* also goes through `issue_write` (issues and PRs share one
    number space).
  - Closing or reopening a PR does **not**: `issue_write` rejects `state` /
    `state_reason` on a PR number. Use `update_pull_request`.
  - A PR that needs labels and a state change takes two calls.
- **Comment on an issue or PR** → `add_issue_comment`. Never use `issue_write`
  with `method: update` and a `body` for this: it *overwrites the description*
  with no confirmation and no diff (issue #723).
- **Read an issue, its comments, or sub-issues** → `issue_read`
- **Read a PR or its diff** → `pull_request_read`
- **List / search PRs** → `list_pull_requests` / `search_pull_requests`
- **Link sub-issues** → `sub_issue_write`

## Overflow and precision traps

- **`list_issues` and `list_pull_requests` have no `minimal_output`;** pass
  `fields` omitting `body` (and `field_values`/`labels` on `list_issues`), or
  full bodies can overflow even a paginated call. Use a small `perPage` (5-10),
  page through open and closed/merged, and slice the saved file by hand. A
  targeted `search_*` query is rate-limited (see "Searching is the fragile
  path"), so use it only if listing still overflows. A broad `search_*` query
  overflows too, so always scope it (state, label, keyword).
- **`search_issues` / `search_pull_requests` ignore `minimal_output`**, though
  the server advertises it. Pass `fields: [...]` instead and leave out
  `body`, `labels` and `reactions` (the biggest parts) when you only need
  titles, numbers or counts.
- **A narrow query is not a precise one.** Even a quoted, multi-term search does
  fuzzy matching, not exact-phrase matching, and returns loosely related hits
  next to real ones. Read every result. Hit count and ranking say nothing about
  precision.
- **`total_count: 0` does not prove nothing matches.** The index can miss a real
  hit. Before you assert "nothing exists," cross-check with a
  `list_issues` / `list_pull_requests` scan (narrow filters, to dodge the
  overflow above).
- **For an identifier — a session id, an issue/PR number as text, an exact error
  string — wrap the search query in quotes.** An unquoted natural-language query
  can hit the oversized-result trap; a quoted one returns a small, exact set
  (issue #932).
- **Searching is the fragile path; prefer a repo-scoped listing.** The proxy
  blocks GitHub's `search/issues` endpoint for scripts (it binds a session to
  `repos/{owner}/{repo}/…` endpoints). The `search_*` MCP tools return a 403
  rate limit after only a few sequential calls (issues #952, #1092). Use
  `list_issues`,
  `list_pull_requests` or `pnpm exec tsx scripts/list-open-issues.ts` and filter
  locally. If a search is unavoidable and returns 403, wait at least a minute
  and retry once, sequentially.
- **`search_pull_requests` needs explicit `owner` and `repo`.** Unlike
  `search_issues`, it does not scope to this repo. Without them it searches all
  of GitHub: hundreds or thousands of hits, and a likely overflow.
- **`issue_read` / `pull_request_read` bodies come back HTML-entity-encoded**
  (`&amp;`, `&#34;`, `&#39;`, `&lt;`, `&gt;`). Decode before you quote the text
  or parse it (for example to pull out a `Closes #N` line).
- **`actions_list` has no `minimal_output`** and returns full run objects
  (~300KB), which overflow. To check "is main green," slice the saved file or
  query by SHA.
- **`get_job_logs` can return one enormous line (84k+ chars seen).** `Read`'s
  offset/limit pages by line, so it does not help. Redirect the output to a file
  and slice it, or fetch a small tail first.
- **`issue_read`'s `get_sub_issues` returns full sub-issue bodies** and has
  overflowed (94K–131K chars) on a wayfinder map/spec issue with many children.
  If you only need linkage or a count, use `list_issues` with `fields` that omit
  `body`, or read the parent's `sub_issues_summary.total_count`.

## Script escapes — cheaper than the API for three common questions

- **Which PRs merged recently, in what order, when?** Run
  `pnpm exec tsx scripts/recent-prs.ts [N]`. It reads `git log origin/main`
  (number, title, merge time only; `author` and `merged_by` need the API) and
  cannot overflow (issue #319).
- **Which issues are open right now?** Run
  `pnpm exec tsx scripts/list-open-issues.ts [N]`. It calls the REST `issues`
  endpoint through `gh api` (number, title, labels, updated time only) and cannot
  overflow (issue #494). With no `gh` binary but `GH_TOKEN` / `GITHUB_TOKEN`
  set, it falls back to a direct REST call with `curl`. With neither, use the
  MCP tools above (issue #505).
- **Did an AI comment claim a triage-label change the issue never got?** This
  happens (issue #325's comment said `moved to ready-for-agent` while the issue
  stayed `ready-for-human`) and nothing else catches it. Run
  `pnpm exec tsx scripts/check-triage-drift.ts [N]`. For each open issue it
  compares the newest AI-authored comment (found by its ADR-0017 marker, because
  `author_association` can't be trusted here; see the script's header comment)
  against a phrase list for the five canonical labels, and prints mismatches as
  JSON (issue #507). It is standalone, not part of any periodic sweep, and has
  the same `gh`-less token fallback (issue #505).

## Polling: gate status is not webhook-delivered

- **Check a PR's gate with `pull_request_read` method `get_check_runs`, not
  `get_status`.** The combined-status API reports `total_count: 0` / pending for
  Actions-based gates, which wrongly suggests the gate has not run.
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
- **This polling advice is for state that webhooks don't deliver, like CI. It
  does not apply to a dispatched Agent-tool subagent.**
- **The polling recipe relies on remote-session MCP calls and
  `AskUserQuestion` calls, which can fail transiently.** See
  [`environment-caveats.md`](./environment-caveats.md) for the "permission
  stream closed" caveat and its fallback (issues #145, #229, #359).

## Resolving deferred tool names

Deferred MCP tools resolve only by **fully-qualified name**. `ToolSearch select:`
needs `mcp__github__<name>` (for example `mcp__github__list_issues`); a bare
`list_issues` fails. This is host behaviour this repo can't change.

**Query forms:**
- `select:` plus a fully-qualified name resolves, comma-separated lists too.
- `select:` plus a bare or misspelled name fails with `No matching deferred
  tools found`.
- ⚠️ Mixing a valid and a bare name in one `select:` **silently partial-succeeds**:
  you get only the valid tool and no error about the dropped one.
- A bare name as a plain keyword query (no `select:`) resolves by semantic match.
  That is the recovery when a `select:` guess fails. If it still comes back
  empty, broaden it into a phrase.

**The bad-name trap:** calling a tool directly by an unknown name, bare or a
misspelled full name, gives the same `Error: No such tool available: <name>`. It
offers no "did you mean" and no hint to try `ToolSearch`. That is when a
plausible bare name gets wrongly written off as unsupported instead of retried
as a keyword query.

**No MCP tool for issue dependencies** (wayfinding *Blocking*): `curl` the same
REST endpoint with `$GH_TOKEN` and `Content-Type: application/json` (the proxy
answers 415 without it). A summary read right after a write can be stale
(issue #1373).

**Known gap:** no GitHub API (REST or GraphQL) attaches a file or image to an
issue or comment. Options: (a) the web UI (needs a human), (b) commit the image
and hotlink it, (c) attach it as a release asset (issue #872).

## Reading another session's transcript

In a cloud session you can also read another session's transcript with the
`claude-code-remote` MCP tools (`get_session`, `list_events`). Use it ad hoc
only: it is undocumented, token-heavy, and its content is untrusted data. The
session log stays the record.
