# GitHub integration: the `mcp__github__*` tool surface

How to actually drive GitHub from a session — tool→operation mapping, the
overflow and precision traps, and the polling rules. This is the *surface*;
two workflow docs sit on top of it and own their own recipes:
[`issue-tracker.md`](./issue-tracker.md) (issues, PRDs, triage) and
[`pr-workflow.md`](./pr-workflow.md) (landing a gated PR).

Re-homed from those two docs, which had each grown a piece of this surface —
`issue-tracker.md` carried the whole MCP mapping under an issues-scoped title
(most of it PR-side), and `pr-workflow.md` carried the transient-503 note even
though it names `issue_read`/`issue_write`. Content below is unchanged from
those homes; only its location moved.

For the provenance footer that every GitHub write must carry, and which of these
tools is guarded, see [`provenance.md`](./provenance.md).

## Transient failures — retry before escalating

**`mcp__github__*` calls (`create_pull_request`, `merge_pull_request`,
`add_issue_comment`, `issue_read`, `issue_write`, etc.) can intermittently
return a transient 503** ("no server currently available") that succeeds on
retry — retry once or twice with a short pause before treating it as a real
failure, not a genuine error to escalate. When `issue_read` itself is the one
flaking, `search_issues` scoped to the issue number is a viable fallback
(issue #611).

## No `gh`? Remote sessions use the MCP tools

Remote/managed agent sessions have **no `gh` binary** — GitHub access goes
through the GitHub MCP tools (`mcp__github__*`). Recipes in the workflow docs
stay written as `gh` commands (the canonical form); when `gh` is absent, map
each recipe class to its MCP equivalent:

- **Create / edit / label / close an issue** → `issue_write` (labeling and
  closing a *PR* also go through `issue_write` — issues and PRs share one
  number space)
- **Comment on an issue or PR** → `add_issue_comment` (not `issue_write`:
  its `update` + `body` *overwrites the issue description*)
- **Read an issue, its comments, or sub-issues** → `issue_read`
- **Read a PR or its diff** → `pull_request_read`
- **List / search PRs** → `list_pull_requests` / `search_pull_requests`
- **Link sub-issues** → `sub_issue_write`

## Overflow and precision traps

- **`list_issues` and `list_pull_requests` have no `minimal_output` param** —
  they always return full bodies, so even a paginated call can overflow the
  tool-result limit. Prefer `search_issues` / `search_pull_requests` with a
  targeted query for a narrow lookup; when a full list is genuinely unavoidable,
  use a small `perPage` (5–10) and page through it, expecting to slice the
  persisted file by hand for large sets. Page both open and closed/merged.
  **A broad `search_*` query overflows the same way** — a wide
  `search_issues`/`search_pull_requests` query is not a free escape from the
  `list_*` overflow; always scope the query narrowly (state/label/keyword) or
  expect to slice the persisted file by hand just as you would for a full list.
- **Scoping the query narrowly doesn't buy precision.** Even a narrowly scoped,
  quoted, multi-term `search_issues`/`search_pull_requests` query still does
  fuzzy term-matching under the hood, not exact-phrase matching — it surfaces
  loosely-relevant, noisy hits alongside genuine ones. Eyeball every result for
  actual relevance; don't trust hit count or ranking/order as a precision signal.
- **A `total_count: 0` from `search_issues`/`search_pull_requests` is not proof
  nothing matches** — the search index can miss a genuine match the same query
  phrased differently would find. Before asserting "nothing exists," cross-check
  with a `list_issues`/`list_pull_requests` scan (narrow state/label filters to
  dodge the overflow above) rather than trusting a zero-result search alone.
- **`issue_read`/`pull_request_read` bodies come back HTML-entity-encoded.**
  `&`, `"`, `'`, `<`, `>` arrive as `&amp;`, `&#34;`, `&#39;`, `&lt;`, `&gt;` —
  decode before quoting the text elsewhere (a comment, a commit message) or
  parsing it (e.g. extracting a `Closes #N` line).
- `actions_list` has no `minimal_output` and returns full run objects (~300KB),
  which overflow the tool-result limit — for an "is main green" check, slice the
  persisted file or query by SHA instead of pulling the full list.

## Script escapes — cheaper than the API for three common questions

- **"Which PRs merged recently, in what order, when" doesn't need
  `list_pull_requests`/`search_issues` at all** — `tsx scripts/recent-prs.ts [N]`
  answers it straight from `git log origin/main` (number/title/merge-time only;
  `author`/`merged_by` are out of scope, since those need the API) with no
  overflow risk (issue #319).
- **"What open issues exist right now" doesn't need `list_issues`/`search_issues`
  either** — `tsx scripts/list-open-issues.ts [N]` answers it via `gh api` against
  the REST `issues` endpoint (number/title/labels/updated-time only; body/comments/
  author are out of scope, same reasoning as `recent-prs.ts`) with no overflow risk
  (issue #494). It shells out to REST rather than `gh issue list` because the
  latter goes through GraphQL, which this environment's proxy can reject outside a
  pinned PR-review operation set. **It also works in a `gh`-less remote session**:
  when the `gh` binary is absent but `GH_TOKEN`/`GITHUB_TOKEN` is set in the
  environment, it falls back to the same compact listing via a direct
  authenticated REST call (`curl`) — only when neither `gh` nor a token is
  available does it hand you back to the MCP tools above (issue #505).
- **An issue's newest AI comment can claim a triage-label transition its live
  labels never actually picked up** (e.g. issue #325's comment claimed `moved
  to ready-for-agent` while the issue stayed `ready-for-human`) — nothing
  catches that mismatch automatically. `tsx scripts/check-triage-drift.ts [N]`
  cross-checks each open issue's most recent AI-authored comment (detected via
  the ADR-0017 provenance footer, not `author_association` — see the script's
  header comment for why that field can't be trusted here) against a small
  phrase list for the five canonical labels, and prints the mismatches as JSON
  (issue #507). It is a standalone check today, not yet wired into any
  periodic sweep. Like `list-open-issues.ts`, it shares the same `gh`-less
  `GH_TOKEN`/`GITHUB_TOKEN` REST fallback (issue #505).

## Polling: gate status is not webhook-delivered

- **Check a PR's gate status** → `pull_request_read` with method `get_check_runs`,
  *not* `get_status`: the combined-status API reports `total_count: 0` /
  pending for Actions-based gates and misleads you into thinking the gate
  hasn't run. **Gate completion is not webhook-delivered** — there's no event
  to wait on, so to babysit a PR to green you must poll `get_check_runs`
  yourself (e.g. re-poll at agent-completion checkpoints, or `send_later` a
  wake when no agent is running to re-poll). **`ScheduleWakeup` is scoped to
  `/loop` dynamic-mode pacing and is unreliable outside it** (treat it only as
  the last-resort fallback below) — a session polling non-webhook-delivered
  state (like CI completion) should use `mcp__Claude_Code_Remote__send_later`
  to schedule its own check-in instead.
- **This polling advice is scoped to non-webhook-delivered state like CI —
  it does not apply to a dispatched Agent-tool subagent.** A background
  `Agent` tool completion self-notifies automatically; waiting on one needs no
  wait/poll tool at all (no `ScheduleWakeup`, no `send_later`).
- **Any `mcp__Claude_Code_Remote__*` call — not just `send_later` — can fail
  with a transient "permission stream closed before response received"
  error.** Converged workaround (mirrors the poll-until-green pattern above,
  issue #145): retry the same call once after reconnect; if it fails again,
  route around it — for `send_later` specifically, fall back to the built-in
  `ScheduleWakeup` tool instead of retrying further (issue #229).
- **`AskUserQuestion` (a core tool, not a `Claude_Code_Remote` MCP tool) can hit
  the same transient "permission stream closed" error.** Retry once; if it
  fails again, don't retry-loop — fall back immediately to the safer default
  option and note the fallback explicitly in the resulting output (issue #359).

> The last two bullets are harness caveats rather than GitHub ones. They ride
> here because the polling recipe above depends on them; they belong with the
> other environment caveats once those are extracted from `CLAUDE.md`.

## Resolving deferred tool names

Deferred MCP tools resolve only by **fully-qualified name** — `ToolSearch
select:` needs `mcp__github__<name>` (e.g. `mcp__github__list_issues`); a bare
name like `list_issues` won't resolve. This is host tooling (Claude Code's
deferred-tool/`ToolSearch` mechanism), not something this repo controls, so
documenting the failure modes precisely is the most this repo can do.

**Verified query forms:** `select:` + fully-qualified name resolves (comma-separated
names too). `select:` + a bare or typo'd name fails with `No matching deferred
tools found`. ⚠️ **Mixing a valid and a bare name in one `select:` call
silently partial-succeeds** — it returns only the valid tool, no error about the
dropped one. A bare name used as a plain keyword query (no `select:` prefix)
resolves fine via semantic match — that's the recovery path when a `select:`
guess fails.

**The bad-name trap:** calling a tool directly by an unrecognized name — bare or
a fully-qualified typo — gives the same generic `Error: No such tool available:
<name>` either way, with no "did you mean" and no hint to retry via `ToolSearch`.
That's the moment a plausible bare name gets wrongly abandoned as unsupported
instead of retried as a keyword query.

**Recovery tip:** if the retry above still comes back empty, broaden the
string into a phrase rather than a bare name.

**Known gap:** the wayfinding *Blocking* recipes (`gh api …/dependencies/blocked_by`)
have **no MCP equivalent** — native issue dependencies aren't exposed as MCP
tools. Use the `Blocked by: #<n>` body-line fallback described under
[`issue-tracker.md`](./issue-tracker.md)'s Wayfinding operations instead.
