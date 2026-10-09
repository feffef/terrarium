# Branch protection vs. rulesets vs. autonomous session-log commits (issue #348)

A reference note for the tension issue #348 names: ADR-0009 has
`scripts/log-session.ts` push each session's log commit **directly to `main`**
(no PR — a deliberate, bounded exception, scoped to exactly one file under
`layers/journal/content/current/sessions/`). Classic branch protection on
`main` blocks that direct push. The maintainer removed protection on
2026-07-11 to let log commits through, which had a side effect: repo-level
**"Allow auto-merge"** then had nothing to wait on, because every PR was
immediately mergeable with no protection in place — regressing #231. §1–§5
(July 2026) answer: can a **repository ruleset** (Settings → Rules →
Rulesets) thread that needle instead of classic protection, and if so, how
precisely. The answer was applied on 2026-10-08; **"Current state"** below is
the single home for what `main` enforces today.

**Verified against** the official GitHub Docs (docs.github.com), **date
accessed 2026-07-12**. `docs.github.com` returns 403 to the automated fetcher
here (`docs/agents/environment-caveats.md` owns this caveat) — the quotes
below are read from the **canonical Markdown source** of the same pages (and
their `{% data reusables/… %}` includes) in the public
[`github/docs`](https://github.com/github/docs) repository, located via GitHub
code search. Each fact is cited to the docs.github.com page it renders on plus
the source file it was pulled from.

**Repo context** (it decides the bypass-scope question): the session-log push does **not** run in a GitHub Actions workflow. `scripts/log-session.ts` runs inside the session that authored the log and pushes over plain `git` with the credentials that session already has (`.claude/settings.json` hooks just invoke the script); no `GITHUB_TOKEN` workflow is involved. Per **ADR-0017** ("Provenance footer…"), "this session's GitHub access is a managed connector already authorized as the owner's own account"; there is no distinct bot identity (a machine-user PAT or GitHub App was "investigated and set aside," issue #124). `git log` shows every landed session-log commit authored as `Claude <noreply@anthropic.com>` (the harness's commit-template identity) and pushed with the connector-injected `GH_TOKEN`/`GITHUB_TOKEN`, which per ADR-0017 is the **repo owner's own personal GitHub credential**, shared with every other action the owner's sessions take. This drives the answer to Q2.

---

## 1. Rulesets vs. classic branch protection — capability differences

Both mechanisms can require PR review, required status checks, linear
history, signed commits, etc. Rulesets are the newer, superset mechanism:

> "Rulesets have statuses, so you can easily manage which rulesets are
> active." "Anyone with read access to a repository can view the active
> rulesets." "…multiple rulesets can apply at the same time, so you can be
> confident that every rule targeting a branch in your repository will be
> evaluated." Rulesets also add "rules to control the metadata of commits
> entering a repository, such as the commit message and the author's email
> address" that classic protection has no equivalent for.
> — [About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
> (`content/repositories/…/managing-rulesets/about-rulesets.md`)

The bypass model is the concrete difference that matters here:

- **Rulesets: one unified bypass list per ruleset**, exempting the listed
  actor from **every** rule in that ruleset at once, plus an optional
  **per-actor mode** — "Always allow" (bypasses everything, including bare
  `git push`) or, via a kebab menu next to it, **"For pull requests only"**:
  > "Optionally, to grant bypass to an actor without allowing them to push
  > directly to a repository, to the right of 'Always allow,' click […] then
  > click **For pull requests only**. The selected actor is now required to
  > open a pull request to make changes to a repository… The actor can then
  > choose to bypass any branch protections and merge that pull request."
  > — [Creating rulesets for a repository §Granting bypass permissions for your branch or tag ruleset](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository#granting-bypass-permissions-for-your-branch-or-tag-ruleset)
  > (`data/reusables/repositories/rulesets-branch-tag-bypass-optional-step.md`)
- **Classic branch protection: bypass is fragmented, rule-by-rule, not
  unified.** The one bypass surface documented is scoped to the PR-requirement
  specifically: **"Allow specified actors to bypass required pull requests"**
  ("search for and select the actors who should be allowed to skip creating a
  pull request") — nested under "Require a pull request before merging," a
  *separate* step from enabling required status checks.
  — [Managing a branch protection rule](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule)
  (`content/repositories/…/managing-protected-branches/managing-a-branch-protection-rule.md`)
  Classic protection's other blanket exemption is the **"Include
  administrators"** toggle — off by default historically, in which case repo
  admins bypass the *entire* rule, not just the PR requirement:
  > "…you can 'optionally apply the restrictions to administrators and roles
  > with the "bypass branch protections" permission, too.'"
  > — [About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)

Net: a ruleset's bypass list is the right primitive for "let this one actor
skip the whole rule set, always" — that's exactly ADR-0009's shape (a direct
push, not a PR). Classic protection would need "Allow specified actors to
bypass required pull requests" **and** a working exemption from required
status checks (not clearly offered per-actor in classic protection at all) to
achieve the same thing.

## 2. Can a ruleset bypass target *only* the session-log push actor? (the crux)

**No — not as this repo is currently set up, and this is a hard limit, not a
UI gap.** The bypass-list actor picker only offers these types:

> "You can grant certain roles, teams, or apps bypass permissions… The
> following are eligible for bypass access:
> - Repository admins, organization owners, and enterprise owners
> - The maintain or write role, or custom repository roles based on the write role
> - Teams, excluding secret teams
> - GitHub Apps
> - Dependabot
> - [Enterprise Cloud only] Copilot cloud agent, enterprise teams/apps/roles"
> — [Creating rulesets for a repository §Granting bypass permissions](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository)
> (`data/reusables/repositories/rulesets-bypass-step.md`)

There is **no "add this one specific human user" option** in a ruleset bypass list — only **role**, **team**, or **app**. The session's push is authenticated as **the repo owner's own personal GitHub account** (no distinct bot/App identity, ADR-0017), so the only bypass entry that lets `log-session.ts`'s push through is a **role** the owner holds (**Repository admin**) or a **team** containing exactly the owner. Either way it is the same GitHub identity as the owner's own manual pushes to `main`, so the entry cannot tell them apart. **A bypass this repo can grant today cannot be scoped tighter than "the repo owner"**; "bypass only when the push comes from `log-session.ts`" needs a distinct machine identity to name.

**The only way to get true actor-only scoping** is to close the gap ADR-0017
explicitly deferred to issue #124: provision a **distinct GitHub App**
(installed on this repo only, `contents: write` scoped to it) or a
**machine-user PAT**, and have `log-session.ts` push through *that* credential
instead of the session's own connector token. GitHub Apps **are** individually
selectable in the bypass picker (per the eligible-actor list above), so that
one App could be the *sole* bypass entry — bypassing for the automation and
for nothing else, including the owner's own future manual pushes. Until #124
lands, this repo cannot fully decouple "let the log-commit script bypass
`main` protection" from "let the human owner bypass `main` protection
whenever they push directly" — they are, today, the same actor.

## 3. Path-scoped enforcement (protect `main` except `sessions/**`)?

**Confirmed not supported**, by either mechanism — protection targets
branches/tags/pushes, not paths within them:

> Classic branch protection: "does **not** support path-scoped enforcement.
> They apply to entire branches matching specified patterns, with no
> capability to protect only certain file paths or exclude specific paths
> within a branch."
> — [About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)

Rulesets' only path-aware rules run the **opposite direction** — they *block*
paths, they don't *exempt* them from other rules:

> - **Restrict file paths**: "Prevent commits that include changes in
>   specified file paths from being pushed to the repository."
> - **Restrict file extensions** / **Restrict file size**: same shape, for
>   extensions/size.
> — [Available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)

There is no rule that says "require status checks/PR review for everything *except* commits touching `layers/journal/content/current/sessions/**`." The closest workaround is what this repo already does: **push path-scoping down to the pushing mechanism**. `scripts/log-session.ts`'s `SESSIONS_DIR` guard and `buildLogCommit`'s "commit changes exactly one path, or refuse" assertion (the `changed.length !== 1` check) *are* the path-scoping; GitHub-side config can only answer "does this actor bypass the whole rule," never "only for this path." So ADR-0009's "single enforcement point" of the path boundary is the only path-level enforcement technically available, and the bypass-list entry from §2 is a coarser, unavoidable complement to it, never a substitute.

## 4. What actually enables "Enable auto-merge" — verified against the issue's claim

The issue's diagnosis is correct, and GitHub's own docs say so almost
verbatim:

> **[!NOTE]** "The option to enable auto-merge is shown only on pull requests
> that cannot be merged immediately. For example, when a branch protection
> rule enforces 'Require pull request reviews before merging' or 'Require
> status checks to pass before merging' and these conditions are not yet
> met."
> — [Automatically merging a pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request)
> (`data/reusables/pull_requests/auto-merge-requires-branch-protection.md`)

And the repository-level switch is a separate, necessary-but-insufficient
prerequisite:

> "Before you can use auto-merge with a pull request, auto-merge must be
> enabled for the repository."
> — same page

So: **Settings → General → Allow auto-merge alone is not sufficient.** It only makes the *feature available*; "Enable auto-merge" appears, and does anything, only when the PR has an **unmet requirement to wait on** (a required review, a required status check not yet green), which today comes from branch protection/ruleset rules on the target branch. With protection removed from `main` (2026-07-11 until the ruleset of 2026-10-08, "Current state" below), a green PR was mergeable the moment it opened, so nothing was left for auto-merge to defer on, and the digest/audit-docs/audit-skills tiers' "enable auto-merge, let it land once green" flow did nothing (no option shown, or an instant merge). This confirms the issue's regression mechanism; no correction needed.

## 5. Direct pushes and required status checks: `GITHUB_TOKEN` vs. PAT/App — and why this doesn't apply here

GitHub's docs don't single out `GITHUB_TOKEN` as exempt from branch
protection/required checks — the ruleset bypass-actor list in §2 explicitly
includes "GitHub Apps" (which is how `github-actions[bot]`/workflow pushes are
classified) as **one more actor type that must be explicitly bypass-listed
like any other** — there's no documented default exemption for it. Separately,
classic protection's required-status-checks behavior is stated generally, not
per-actor-type:

> "After enabling required status checks, all required status checks must
> pass before collaborators can merge changes into the protected branch.
> After all required status checks pass, any commits must either be pushed
> to another branch and then merged **or pushed directly** to the protected
> branch."
> — [About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)

Read plainly: a **direct push** of a brand-new commit to a required-status-checks
branch is blocked in practice for *any* authenticated actor (not just PATs vs.
`GITHUB_TOKEN`) unless that commit's SHA already carries a passing check run —
which a freshly `commit-tree`'d session-log commit (as `buildLogCommit` in
`scripts/log-session.ts` produces) never does, since it was never run through
CI. So restoring **any** required status check on `main` would re-block
session-log commits again regardless of which credential pushes them, unless
that credential is on the bypass list (§2) — `contents: write` permission
alone does not let an actor skip a required check; the bypass list is the
only skip mechanism.

**This repo is not that case**: no GitHub Actions workflow pushes these commits (see repo context). The actor is a live session's own git credential (a personal-account `GH_TOKEN`/`GITHUB_TOKEN` env var injected by the connector), which branch protection treats like an ordinary authenticated human push, not like a workflow-scoped Actions `GITHUB_TOKEN`.

---

## Current state: the `protect-main` ruleset (applied 2026-10-08)

`main` carries one active repository ruleset, `protect-main` (id 24740110),
approved by the owner on 2026-10-08 (session
`session_01CF4k9jXS9wLrcPVsGduZmn`) and applied by hand at 17:43 UTC, because
the agent proxy refuses ruleset writes (`docs/agents/environment-caveats.md`).
This section is the single home for what it enforces. The JSON below is the
create payload and holds the values; re-create from it if the ruleset is ever
lost (a visibility flip disables push rulesets, `making-repo-public.md` §1),
and check with `gh api repos/feffef/terrarium/rules/branches/main`. The
bullets hold only the reasons.

- **0 approvals.** Every agent PR is authored by the owner's own identity
  (Dependabot's by `dependabot[bot]`), and GitHub refuses self-approval, so
  any higher count would block every agent PR.
- **`require_extra_approval_for_unattributed_changes` is GitHub's default,
  left true.** Per GitHub's rules doc it applies only when the ruleset
  requires at least one approval, so at 0 it does nothing; it is in the JSON
  so a re-create matches the live ruleset.
- **The `gate` check is pinned to GitHub Actions** (`integration_id` 15368),
  so only the real `safety-gate` workflow satisfies it. Strict mode ("require
  branches to be up to date") is off: `main` moves many times a day with
  session logs, and strict mode would demand a refresh before every merge.
- **Bypass: Repository admin, "Always".** The session-log lander pushes with
  the owner's own credential (§2), so this is the only bypass that lets
  ADR-0009's direct push through, and it also covers every agent session,
  which acts as the owner. The ruleset is therefore a guardrail, not a wall:
  the gate is a required check, auto-merge has a condition to wait on (§4),
  force pushes and deletion are blocked, but nothing the owner identity does
  is blocked. The first session-log push after it went live (17:44 UTC)
  landed and shows as `result: bypass` in the repository's rule-suite log, so
  each such push is audited. Narrowing the bypass needs a distinct identity
  for the lander: issue #1689 (a GitHub App as the sole "Always" bypass, the
  owner reduced to "For pull requests only").
- **Left off, each would break the workflow:** linear history
  (`scripts/merge-pr.ts` and humans use merge commits), signed commits
  (session-log commits land unsigned).
- Chartered Skills' self-merges, human merges and the Dependabot workflow all
  merge green PRs and need no bypass. Unverified against GitHub's docs: whether
  an "Always" bypass actor's REST merge passes a red check silently; the merge
  script polls for green first, so it is a safety-net question only.

```sh
gh api -X POST repos/feffef/terrarium/rulesets --input - <<'JSON'
{
  "name": "protect-main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "bypass_actors": [
    { "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "always" }
  ],
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 0,
        "require_extra_approval_for_unattributed_changes": true,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false,
        "allowed_merge_methods": ["merge", "squash", "rebase"] } },
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": false,
        "do_not_enforce_on_create": false,
        "required_status_checks": [ { "context": "gate", "integration_id": 15368 } ] } }
  ]
}
JSON
```

The owner closed #348 on 2026-07-12; the earlier recommendation is in that issue's comment.

## 6. Re-checked 2026-10-08: a third bypass mode, `exempt`

GitHub's REST ruleset schema now accepts `bypass_mode: exempt` next to
`always` and `pull_request` (read from the Terraform GitHub provider's
`repository_ruleset` docs, which mirror the API; the changelog announcing it,
dated 2025-09-10, and docs.github.com are both blocked from this container).
Reported semantics: rules are not evaluated for an exempt actor and no bypass
entry is recorded, where "Always" evaluates and records a bypass. For the
session-log lander "Always" is the better fit: the record of each bypass is
exactly the audit trail ADR-0009's exception should leave. §2 and §3 still
hold: the bypass picker offers no individual-user entry, and no rule exempts
a path from the other rules. §4's "no protection" premise ended with the
ruleset above.
