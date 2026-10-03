# Issue tracker: GitHub

*Seeded from `.agents/skills/setup-matt-pocock-skills/issue-tracker-github.md`
and customized for this repo (the conventions, spec and wayfinding sections are
repo-specific). Don't re-sync the two: this file is the live one; the pack
template stays generic and reinstallable (ADR-0005).*

Issues and specs live as GitHub issues. Use the `gh` CLI for all operations.

## No `gh`? See `github-integration.md`

The recipes below are written as `gh` commands. For the MCP-tool equivalents
when `gh` is absent or 403s, plus the overflow traps, polling rules and `ToolSearch`
name resolution, see [`github-integration.md`](./github-integration.md).

## Conventions

- **`docs/research/` vs. a GitHub issue.** `docs/research/` holds verified,
  primary-source reference material. An unimplemented idea, proposal or open
  question is an issue instead: a spec (below) if it is big enough to split
  into several user stories with their own sub-issues, a plain issue if not.
- **`/triage`'s redundancy check applies to every open issue, no exemptions.**
  Search for an existing implementation before actioning it, even when the
  issue is not actionable by design (e.g. a governance proposal awaiting a
  human green-light). Unactionable and unimplemented are independent: such a
  proposal can ship through another issue or PR while it stays open and
  unlabeled.
- **Before implementing a `ready-for-agent` issue, check for supersession.**
  A missing target file is not the only way an issue goes stale. Search for a
  merged PR or commit that already solved it another way
  (`scripts/merged-since.ts`, or a tracker search). Check whether its territory
  overlaps an open Prune Trial (`.agents/prune-trials.yml`, ADR-0027):
  implementing over a trial re-legislates prose the trial is still weighing.
- **Before locking a design that merges, moves or deletes a file, grep for its
  importers and what it imports.** One grep rules out an import cycle up front;
  issue #865 found one only during implementation (#1176).
- **Picking up several issues under one caller-pinned branch** (CLAUDE.md's
  branch-off bullet): flag that upfront and ask whether separate branches are
  allowed. Don't bundle unrelated issues into one PR and wait for the objection
  after the push.
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

- **Label**: none. While a spec is a concept document rather than actionable
  work it carries no triage label (not `needs-triage`, not `ready-for-agent`);
  `docs/agents/triage-labels.md` applies once the hold below clears.
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
  clears, the spec and its sub-issues get ordinary triage labels.

## Pull requests as a triage surface

**PRs as a request surface: yes.** _(Set to `no` to stop treating external PRs
as feature requests; `/triage` reads this flag.)_

PRs go through the same labels and states as issues, using `gh pr`:

- **Read**: `gh pr view <number> --comments`; `gh pr diff <number>` for the diff.
- **List external PRs**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`, then keep only the Public-tier `authorAssociation` values (ADR-0020 lists them and what follows).
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.
- **The `trusted` label** is applied automatically to same-repo PRs by `.github/workflows/pr-authorassociation-label.yml` (ADR-0020, issue #443). There is no `public` label: no `trusted` label means Public. A fork PR is left unlabeled on purpose (see the workflow header).

Issues and PRs share one number space, so a bare `#42` may be either. Try
`gh pr view 42`, then fall back to `gh issue view 42`.

A reviewing agent's verdict-posting rules are in `docs/agents/pr-workflow.md`,
recipe step 4.

**Reply before resolving a review thread.** Say what changed (or why nothing
did) before calling `resolve_review_thread`. A resolved thread with no reply
leaves no record.

**Use a closing keyword (`Resolves`/`Closes`/`Fixes #N`) only for an issue the
PR completes.** Merging auto-closes every issue named that way. PR #326
silently closed a tracking issue (#213) it only touched, and the issue had to
be reopened. For any other issue the PR body mentions, write "relates to #N" or
"see #N".

**A multi-issue `Closes` line can leave some issues open.** The failure mode and
the `merge-pr.ts` self-heal are in `docs/agents/pr-workflow.md`'s merge recipe.

**Auditing PRs against session logs: parse `prs:`, don't regex it.** A log's
`prs` field (`shared/schemas/session.ts`) is a structured array of quoted PR
numbers (e.g. `["326"]`). Parse the log's YAML and read the array; don't
regex-scan the raw text.

**A "you already have a pending review" error means stop and ask the user, not
call `delete_pending` and retry.** It can come from `pull_request_review_write`
(or the raw review API) mid-triage. Agent API calls run under the human
owner's own connection (ADR-0017), so you can't tell whether the pending
review is your leftover or the maintainer's own unsubmitted draft. Deleting the
wrong one erases the draft for good.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is one issue; its **children** are tickets.

- **Map**: an issue labelled `wayfinder:map` with a Notes / Decisions-so-far / Fog body. `gh issue create --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (`gh api` on the sub-issues endpoint). Where sub-issues aren't enabled, add it to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, it is assigned to the driving dev.
- **Label provenance**: the `wayfinder:*` labels aren't in the curated set (`docs/agents/triage-labels.md`). Their `#ededed`/empty-description look just means they were created without a color. GitHub errors on a missing label instead of creating it, so the unstyled default is expected.
- **Blocking**: GitHub's **native issue dependencies**, the canonical, UI-visible form. Add an edge with `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`. `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`), not the `#number` or `node_id`. No `gh`? See [`github-integration.md`](./github-integration.md). `issue_dependencies_summary.blocked_by` counts open blockers only and is the live gate. Where dependencies aren't available, put a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children (`gh issue list --state open`, scoped to its sub-issues / task list). Drop any with an open blocker (`blocked_by > 0`, or an open issue in the `Blocked by` line) or an assignee. First in map order wins.
- **Claim**: `gh issue edit <n> --add-assignee @me`, the session's first write.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.
- **Rewriting a map or spec body wholesale**: pasting fresh content copies the OLD session's ADR-0017 header line, which the provenance guard then reads as this session's write and rejects as stale. Replace that line with the current session's marker before submitting.
