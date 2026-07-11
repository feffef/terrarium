# Issue tracker: GitHub

*Seeded from `.agents/skills/setup-matt-pocock-skills/issue-tracker-github.md`'s
generic template and customized for this repo (the remote-session MCP-tool
mapping below is repo-specific, not part of the pack). Don't re-sync the two —
this file is the live, repo-authoritative one; the pack template stays generic
and reinstallable (ADR-0005).*

Issues and PRDs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## No `gh`? Remote sessions: use the GitHub MCP tools

Remote/managed agent sessions have **no `gh` binary** — GitHub access goes
through the GitHub MCP tools (`mcp__github__*`). The recipes below stay written
as `gh` commands (the canonical form); when `gh` is absent, map each recipe
class to its MCP equivalent:

- **Create / edit / label / close an issue** → `issue_write` (labeling and
  closing a *PR* also go through `issue_write` — issues and PRs share one
  number space)
- **Comment on an issue or PR** → `add_issue_comment` (not `issue_write`:
  its `update` + `body` *overwrites the issue description*)
- **Read an issue, its comments, or sub-issues** → `issue_read`
- **List / search issues** → `list_issues` / `search_issues`. **`list_issues` and
  `list_pull_requests` have no `minimal_output` param** — they always return full
  bodies, so even a paginated call can overflow the tool-result limit. Prefer
  `search_issues` / `search_pull_requests` with a targeted query for a narrow
  lookup; when a full list is genuinely unavoidable, use a small `perPage`
  (5–10) and page through it, expecting to slice the persisted file by hand for
  large sets. Page both open and closed/merged. **A broad `search_*` query
  overflows the same way** — a wide `search_issues`/`search_pull_requests`
  query is not a free escape from the `list_*` overflow; always scope the
  query narrowly (state/label/keyword) or expect to slice the persisted file
  by hand just as you would for a full list.
- **Scoping the query narrowly doesn't buy precision.** Even a narrowly
  scoped, quoted, multi-term `search_issues`/`search_pull_requests` query
  still does fuzzy term-matching under the hood, not exact-phrase matching —
  it surfaces loosely-relevant, noisy hits alongside genuine ones. Eyeball
  every result for actual relevance; don't trust hit count or ranking/order
  as a precision signal.
- **Read a PR or its diff** → `pull_request_read`
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
- **Any `mcp__Claude_Code_Remote__*` call — not just `send_later` — can fail
  with a transient "permission stream closed before response received"
  error.** Converged workaround (mirrors the poll-until-green pattern above,
  issue #145): retry the same call once after reconnect; if it fails again,
  route around it — for `send_later` specifically, fall back to the built-in
  `ScheduleWakeup` tool instead of retrying further (issue #229).
- **List / search PRs** → `list_pull_requests` / `search_pull_requests`
- **Link sub-issues** → `sub_issue_write`

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

**Practical rule:** always use a tool's fully-qualified name (bare or with
`select:`), never a bare short name. If a `select:` lookup comes back empty,
retry the same string as a plain keyword query, or broaden it into a phrase.

`actions_list` has no `minimal_output` and returns full run objects (~300KB),
which overflow the tool-result limit — for an "is main green" check, slice the
persisted file or query by SHA instead of pulling the full list.

**Known gap:** the wayfinding *Blocking* recipes (`gh api …/dependencies/blocked_by`)
have **no MCP equivalent** — native issue dependencies aren't exposed as MCP
tools. Use the `Blocked by: #<n>` body-line fallback described under
[Wayfinding operations](#wayfinding-operations) instead.

## Conventions

- **`/triage`'s redundancy check applies to every open issue, no exemptions.**
  "Search for an existing implementation before actioning this issue" is not
  optional for issues that read as *not yet actionable by design* — e.g. a
  governance proposal intentionally sitting on a human greenlight.
  Unactionable-by-design and unimplemented are two independent facts, not one:
  a proposal can quietly ship anyway (via a different issue or PR) while it's
  still open and unlabeled, and the redundancy check is exactly what catches
  that. Check both, every time, even when an issue looks obviously pending.
- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v` — `gh` does this automatically when run inside a clone.

## PRDs

A PRD is an ordinary GitHub issue — no dedicated label. The precedent is #64
(the Atlas PRD):

- **Label**: none. A PRD carries **no triage label** (not `needs-triage`, not
  `ready-for-agent`) while it's a concept document rather than actionable work —
  the triage-labels vocabulary (`docs/agents/triage-labels.md`) doesn't apply
  until the hold below clears.
- **Sub-issue linking**: link each user story to the PRD as a **native GitHub
  sub-issue** (`sub_issue_write` / `gh api` on the sub-issues endpoint, same
  mechanism as [Wayfinding's child tickets](#wayfinding-operations)), *and* put
  a `Part of #<prd>` line at the top of the child's body — the same
  belt-and-suspenders pattern used there, so the link still reads even where
  native sub-issues aren't rendered.
- **Hold semantics**: a PRD that isn't yet actionable says so in its own body,
  e.g. *"On hold: implementation starts only after \[condition] — read, discuss,
  refine the idea, don't build."* Every sub-issue **inherits the same hold** and
  repeats the on-hold line at the top of its own body, so a reader who lands
  directly on a user story sees the hold without having to open the parent.
  There is no label for "on hold" — the body text is the single source of truth
  until the condition clears, at which point the PRD (and its sub-issues) pick
  up ordinary triage labels like any other issue.

## Pull requests as a triage surface

**PRs as a request surface: yes.** _(Set to `no` if this repo should stop treating external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues, using the `gh pr` equivalents:

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments` then keep only `authorAssociation` of `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE` (drop `OWNER`/`MEMBER`/`COLLABORATOR`).
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either — resolve with `gh pr view 42` and fall back to `gh issue view 42`.

A reviewing agent must post its verdict as a PR review or comment **before merging** — every time, even on a clean "merging as-is" verdict — so the audit trail lives on the PR; otherwise `get_reviews`/`get_comments` return empty and a real review reads as none having happened.

**Never submit an APPROVE-event review — use `add_issue_comment` or a COMMENT-event review instead.** The agent's GitHub identity under the shared connection is always the repo owner, and GitHub blocks a PR author from approving their own pull request.

**A "you already have a pending review" error is a stop-and-ask signal, never a call-`delete_pending`-and-retry one.** This can surface from `pull_request_review_write` (or the raw GitHub review API) mid-triage. Because agent-driven GitHub API calls run under the human owner's own authorized connection (ADR-0017), there is no reliable way to tell whether the pending review is the agent's own leftover state or the maintainer's own in-progress draft. Deleting the wrong one permanently erases the maintainer's unsubmitted draft text, with no undo. On this error, stop and ask the user before touching `delete_pending` — don't guess.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `gh issue create --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (`gh api` on the sub-issues endpoint). Where sub-issues aren't enabled, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: GitHub's **native issue dependencies** — the canonical, UI-visible representation. Add an edge with `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _not_ the `#number` or `node_id`). GitHub reports `issue_dependencies_summary.blocked_by` (open blockers only — the live gate). Where dependencies aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children (`gh issue list --state open`, scoped to the map's sub-issues / task list), drop any with an open blocker (`issue_dependencies_summary.blocked_by > 0`, or an open issue in the `Blocked by` line) or an assignee; first in map order wins.
- **Claim**: `gh issue edit <n> --add-assignee @me` — the session's first write.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.
