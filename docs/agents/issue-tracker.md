# Issue tracker: GitHub

*Seeded from `.agents/skills/setup-matt-pocock-skills/issue-tracker-github.md`'s
generic template and customized for this repo (the conventions, PRD and
wayfinding sections below are repo-specific, not part of the pack; the
remote-session MCP-tool surface now lives in `github-integration.md`). Don't
re-sync the two —
this file is the live, repo-authoritative one; the pack template stays generic
and reinstallable (ADR-0005).*

Issues and PRDs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## No `gh`? See `github-integration.md`

The recipes below stay written as `gh` commands (the canonical form); for the
MCP-tool equivalent when `gh` is absent, plus the overflow/precision traps, the
polling rules and the `ToolSearch` name-resolution mechanics, see
[`github-integration.md`](./github-integration.md) — the single home for that
tool surface.

## Conventions

- **`docs/research/` vs. a GitHub issue.** `docs/research/` is for verified,
  primary-source-grounded reference material — facts gathered and checked. An
  unimplemented idea, design proposal, or open question belongs in a GitHub
  issue instead — a PRD (see below) once it's substantial enough to decompose
  into multiple user stories that need their own sub-issues; a plain issue
  otherwise.
- **`/triage`'s redundancy check applies to every open issue, no exemptions.**
  "Search for an existing implementation before actioning this issue" is not
  optional for issues that read as *not yet actionable by design* — e.g. a
  governance proposal intentionally sitting on a human greenlight.
  Unactionable-by-design and unimplemented are two independent facts, not one:
  a proposal can quietly ship anyway (via a different issue or PR) while it's
  still open and unlabeled, and the redundancy check is exactly what catches
  that. Check both, every time, even when an issue looks obviously pending.
- **Before implementing a `ready-for-agent` issue, check for supersession —
  not just that the issue's named target artifact doesn't already exist.**
  Search for a merged PR or commit that already addressed the issue a
  different way (`scripts/merged-since.ts`, or a tracker search), and check
  whether the issue's territory overlaps an open Prune Trial
  (`.agents/prune-trials.yml`, ADR-0027) — implementing over a trial
  re-legislates the prose the trial is still weighing. A missing target file
  is not the only way an issue goes stale.
- **A session picking up more than one issue under a single caller-pinned
  branch (CLAUDE.md's branch-off bullet) should flag that packaging
  constraint upfront and ask whether separate branches are allowed** — rather
  than silently bundling unrelated issues into one PR and discovering the
  objection only after push.
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
- **List external PRs for triage**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments` then keep only the Public-tier `authorAssociation` values — ADR-0020 has the exact list and what follows from it.
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.
- **The `trusted` label is auto-applied** to same-repo PRs by `.github/workflows/pr-authorassociation-label.yml` (the ADR-0020 mechanical aid, issue #443). It is one-sided by design: there is **no `public` label — absence of `trusted` means Public** (a fork PR, the only way a Public author opens one, is intentionally left unlabeled; see the workflow header for why).

GitHub shares one number space across issues and PRs, so a bare `#42` may be either — resolve with `gh pr view 42` and fall back to `gh issue view 42`.

A reviewing agent's verdict-posting rules live in `docs/agents/pr-workflow.md`'s recipe, step 4 — follow them there.

**Reply before resolving a review thread.** Post a reply describing what changed (or why no change was made) before calling `resolve_review_thread` — a resolved thread with no reply leaves no record of what happened, especially on longer PRs.

**Never use a GitHub closing keyword (`Resolves`/`Closes`/`Fixes #N`) for an issue a PR only *references*** — e.g. a governance/tracking issue the PR touches on but doesn't complete. Merging a PR auto-closes anything named with a closing keyword, so using one on an issue the PR doesn't actually finish silently closes it out from under the tracker (it then has to be reopened with an explaining comment — this has already happened once, PR #326 → issue #213). Reserve closing keywords for the issue(s) the PR genuinely completes; use a plain-text reference ("relates to #N", "see #N") for every other issue the PR body mentions.

**A multi-issue `Closes` line can drop all but the first issue** — `docs/agents/pr-workflow.md`'s merge recipe is the single home for that failure mode and the `merge-pr.ts` self-heal that covers it.

**Auditing PRs against session logs: parse `prs:`, don't regex it.** A session log's `prs` field (`shared/schemas/session.ts`) is a structured array of bare quoted PR-number strings (e.g. `["326"]`), not free-form prose — parse the log's YAML/frontmatter structurally and read the array, rather than regex-scanning the raw file text for something that looks like a PR reference.

**A "you already have a pending review" error is a stop-and-ask signal, never a call-`delete_pending`-and-retry one.** This can surface from `pull_request_review_write` (or the raw GitHub review API) mid-triage. Because agent-driven GitHub API calls run under the human owner's own authorized connection (ADR-0017), there is no reliable way to tell whether the pending review is the agent's own leftover state or the maintainer's own in-progress draft. Deleting the wrong one permanently erases the maintainer's unsubmitted draft text, with no undo. On this error, stop and ask the user before touching `delete_pending` — don't guess.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `gh issue create --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (`gh api` on the sub-issues endpoint). Where sub-issues aren't enabled, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Label provenance**: the `wayfinder:*` labels aren't in the original curated set (`docs/agents/triage-labels.md`); their `#ededed`/empty-description default just means they were created explicitly without a color. GitHub errors on a not-yet-existing label rather than auto-creating one, so the unstyled default is expected, not a surprise to debug.
- **Blocking**: GitHub's **native issue dependencies** — the canonical, UI-visible representation. Add an edge with `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _not_ the `#number` or `node_id`). GitHub reports `issue_dependencies_summary.blocked_by` (open blockers only — the live gate). Where dependencies aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children (`gh issue list --state open`, scoped to the map's sub-issues / task list), drop any with an open blocker (`issue_dependencies_summary.blocked_by > 0`, or an open issue in the `Blocked by` line) or an assignee; first in map order wins.
- **Claim**: `gh issue edit <n> --add-assignee @me` — the session's first write.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.
