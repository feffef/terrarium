# Issue tracker: GitHub

*Repo-authoritative, seeded from
`.agents/skills/setup-matt-pocock-skills/issue-tracker-github.md`. Don't re-sync
it against that generic, reinstallable template (ADR-0005).*

Issues and specs live as GitHub issues. The recipes below use the `gh` CLI; for writes, use
the `mcp__github__*` tools where you have them (the ADR-0017 rule).

## Cloud session? See `github-integration.md`

In a cloud session, GraphQL-backed `gh` subcommands 403;
for the MCP-tool equivalents, overflow traps, polling rules and `ToolSearch`
name resolution, see [`github-integration.md`](./github-integration.md).

## Conventions

- **`docs/research/` vs. a GitHub issue.** `docs/research/` holds verified,
  primary-source reference material. An unimplemented idea, proposal or open
  question is an issue instead: a spec (below) if it is big enough to split
  into several user stories with their own sub-issues, a plain issue if not.
- **`/triage`'s redundancy check applies to every open issue, no exemptions.**
  Before actioning one, search for an existing implementation, even if it's not
  actionable by design (e.g. a governance proposal awaiting a Trusted
  user's approval). Such a proposal can ship through another issue or PR while it
  stays open and unlabeled.
- **Before implementing a `ready-for-agent` issue, check for supersession.**
  A missing target file is not the only way an issue goes stale. Search for a
  merged PR or commit that already solved it another way
  (`scripts/git/list-merges-since.ts`, or a tracker search). Check whether its territory
  overlaps an open Prune Trial (`.agents/prune-trials.yml`, ADR-0027):
  implementing over a trial re-legislates prose the trial is still weighing.
- **Before locking a design that merges, moves or deletes a file, grep for its
  importers and what it imports.** One grep rules out an import cycle up front;
  issue #865 found one only during implementation (#1176).
- **Several issues pinned to one caller-set branch** (CLAUDE.md, "Stay on the
  branch your session started on"): flag it upfront and ask whether separate
  branches are allowed. Don't bundle unrelated issues into one PR and wait for
  an objection after the push.
- **Filing an issue.** Write what would be costly to derive again: the
  background, what you checked and found, and why it matters. Make clear which
  statements are verified fact (with their source) and which are assumption or
  working theory, so triage doesn't build on a guess. `clear-backlog` decides
  from the issue alone, and anything it can't settle becomes a question for the
  owner. Labels: [`triage-labels.md`](./triage-labels.md).
- **Create**: `gh issue create --title "..." --body "..."` (heredoc for multi-line bodies).
- **Read**: `gh issue view <number> --comments`, filtering comments with `jq` and fetching labels too.
- **List**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`, with `--label` / `--state` filters as needed.
- **Comment**: `gh issue comment <number> --body "..."`
- **Labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

`gh` infers the repo from the clone's remote.

## Specs

A spec is an ordinary GitHub issue with no dedicated label. Precedent: #64 (the
Atlas spec).

- **Label**: none while it is on hold (below): not `needs-triage`, not
  `ready-for-agent`.
- **Sub-issues**: link each user story to the spec as a native GitHub
  sub-issue (`sub_issue_write` / `gh api` on the sub-issues endpoint, as for
  [Wayfinding's child tickets](#wayfinding-operations)), and also put
  `Part of #<spec>` at the top of the child's body, so the link reads even where
  native sub-issues aren't rendered.
- **Hold**: a spec that isn't yet actionable says so in its body, e.g. *"On
  hold: implementation starts only after \[condition] — read, discuss, refine
  the idea, don't build."* Every sub-issue repeats the on-hold line at the top
  of its own body, so a reader who lands on a user story sees it. There is no
  "on hold" label; the body text is the source of truth. When the condition
  clears, the spec and its sub-issues get ordinary triage labels
  (`docs/agents/triage-labels.md`).

## Pull requests as a triage surface

**PRs as a request surface: yes.** _(Set to `no` to stop treating external PRs
as feature requests; `/triage` reads this flag.)_

PRs go through the same labels and states as issues, using `gh pr`:

- **Read**: `gh pr view <number> --comments`; `gh pr diff <number>` for the diff.
- **List external PRs**: `gh api --paginate 'repos/{owner}/{repo}/pulls?state=open'` (REST, so it works in a cloud session), then keep only PRs whose `author_association` is in `PUBLIC_ASSOCIATIONS` (`scripts/lib/author-trust.ts`; ADR-0020 says what follows).
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.
- **The `trusted` label** is applied automatically to same-repo PRs by `.github/workflows/pr-authorassociation-label.yml` (ADR-0020, issue #443). There is no `public` label. A fork PR is left unlabeled on purpose (see the workflow header), so judge Public by `authorAssociation`, not by the missing label.

Issues and PRs share one number space, so a bare `#42` may be either. Try
`gh pr view 42`, then fall back to `gh issue view 42`.

Verdicts (recipe step 4), review threads, closing keywords and what
`merge-pr.ts` does about a named issue GitHub left open: `docs/agents/pr-workflow.md`.

**A "you already have a pending review" error is stop-and-ask, never `delete_pending`:** see "Write traps" in [`github-integration.md`](./github-integration.md).

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is one issue; its **children** are tickets.

- **Map**: an issue labelled `wayfinder:map` with a Notes / Decisions-so-far / Fog body. `gh issue create --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (`gh api` on the sub-issues endpoint). Where sub-issues aren't enabled, add it to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, it is assigned to the driving dev.
- **Label provenance**: the `wayfinder:*` labels aren't in the curated set (`docs/agents/triage-labels.md`). Their `#ededed` color and empty description are expected: GitHub errors on a missing label instead of creating it, so they were created unstyled.
- **Blocking**: GitHub's **native issue dependencies**, the canonical, UI-visible form. Add an edge with `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`. `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`), not the `#number` or `node_id`. Write each edge as a literal command: the provenance guard denies a stdin or variable-built body (#1900). In a cloud session or without `gh`: `curl -X POST -H "Authorization: Bearer $GH_TOKEN" -H "Content-Type: application/json" -d '{"issue_id": <blocker-db-id>}' https://api.github.com/repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by`. `issue_dependencies_summary.blocked_by` counts open blockers only and is the live gate. Where dependencies aren't available, put a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children (`gh issue list --state open`, scoped to its sub-issues / task list). Drop any with an open blocker (`blocked_by > 0`, or an open issue in the `Blocked by` line) or an assignee. First in map order wins.
- **Claim**: `gh issue edit <n> --add-assignee @me`, the session's first write.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.
- **Rewriting a map or spec body wholesale**: replace the copied ADR-0017 header line; see "Write traps" in [`github-integration.md`](./github-integration.md).
