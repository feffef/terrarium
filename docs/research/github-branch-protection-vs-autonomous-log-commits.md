# Branch protection vs. rulesets vs. autonomous session-log commits (issue #348)

A reference note for the tension issue #348 names: ADR-0009 has
`scripts/session-end.ts` push each session's log commit **directly to `main`**
(no PR — a deliberate, bounded exception, scoped to exactly one file under
`layers/journal/content/current/sessions/`). Classic branch protection on
`main` blocks that direct push. The maintainer removed protection on
2026-07-11 to let log commits through, which had a side effect: repo-level
**"Allow auto-merge"** now has nothing to wait on, because every PR is
immediately mergeable with no protection in place — regressing #231. This note
answers: can a **repository ruleset** (Settings → Rules → Rulesets) thread
that needle instead of classic protection, and if so, how precisely.

**Verified against** the official GitHub Docs (docs.github.com), **date
accessed 2026-07-12**. As with the prior research note in this directory,
docs.github.com returns HTTP 403 to the automated fetcher — the quotes below
are read from the **canonical Markdown source** of the same pages (and their
`{% data reusables/… %}` includes) in the public
[`github/docs`](https://github.com/github/docs) repository, located via GitHub
code search. Each fact is cited to the docs.github.com page it renders on plus
the source file it was pulled from.

**Repo-context check first** (why this matters for the "how narrow can the
bypass be" question): the session-log push does **not** happen inside a
GitHub Actions workflow. `scripts/session-end.ts` / `scripts/log-session.ts`
run live, inside whatever session authored the log, and push over plain `git`
using the credentials the session's own environment already has —
`.claude/settings.json`'s hooks just invoke the script; there is no
`GITHUB_TOKEN`-bearing workflow in the loop at all. Per **ADR-0017**
("Provenance footer…"), "this session's GitHub access is a managed connector
already authorized as the owner's own account" — there is no distinct bot
identity yet (a machine-user PAT or GitHub App was "investigated and set
aside," tracked on issue #124). `git log` confirms every landed session-log
commit is authored/committed as `Claude <noreply@anthropic.com>` (the
harness's commit-template identity), pushed with whatever `GH_TOKEN` /
`GITHUB_TOKEN` env the container's connector injects — which, per ADR-0017, is
the **repo owner's own personal GitHub credential**, shared with every other
action that owner's sessions take. This one fact drives the answer to Q2
below.

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

There is **no "add this one specific human user" option** in a ruleset bypass
list — only **role**, **team**, or **app**. Combined with the repo-context
fact above (the session's push is authenticated as **the repo owner's own
personal GitHub account** — there is no distinct bot/App identity, ADR-0017),
this means: the only bypass entry available today that lets
`session-end.ts`'s push through is a **role** the owner already holds
(**Repository admin**, since the owner is the repo's admin) — or a **team**
containing exactly the owner. Either way, that bypass entry is
**indistinguishable from a bypass for the owner's own manual, human-typed
pushes** to `main` — because it *is* the same GitHub identity making both
kinds of push. **A bypass this repo can grant today cannot be scoped tighter
than "the repo owner," full stop** — it is not possible to say "bypass only
when the push comes from `session-end.ts`" without a distinct machine
identity to name.

**The only way to get true actor-only scoping** is to close the gap ADR-0017
explicitly deferred to issue #124: provision a **distinct GitHub App**
(installed on this repo only, `contents: write` scoped to it) or a
**machine-user PAT**, and have `session-end.ts` push through *that* credential
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

There is no rule that says "require status checks/PR review for everything
*except* commits touching `layers/journal/content/current/sessions/**`." The
closest real workaround is exactly what this repo already does: **push
path-scoping down to the pushing mechanism itself**, not GitHub's protection
layer. `scripts/log-session.ts`'s `SESSIONS_DIR` guard and
`buildLogCommit`'s "commit changes exactly one path, or refuse" assertion
(the `changed.length !== 1` check) *are* the path-scoping — GitHub-side
config can only ever answer "does this actor bypass the whole rule," never
"only for this path." ADR-0009's framing of the helper script as "the single
enforcement point" of the path boundary is therefore not just good practice,
it is the *only* enforcement point technically available — the bypass-list
entry from §2 is a strictly coarser, unavoidable complement to it, never a
substitute.

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

So: **Settings → General → Allow auto-merge alone is not sufficient.** It
only makes the *feature available*; the "Enable auto-merge" affordance itself
only appears — and only does anything — when the PR has an **unmet
requirement to wait on** (a required review, a required status check that
hasn't reported success yet, etc.), which today comes from branch
protection/ruleset rules on the target branch. With protection removed
entirely from `main` (as it is now, per the maintainer's 2026-07-11 change), a
green PR is **immediately mergeable** the moment it's opened — there is
nothing left for auto-merge to defer on, so the digest/audit-docs/audit-skills
tiers' "enable auto-merge, let it land once green" flow has no observable
effect (it either never shows the option, or merges instantly, functionally
equivalent to a manual merge with no auto-merge queueing behavior). This
exactly matches and confirms the issue's stated regression mechanism — no
correction needed to that framing.

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

**This question's premise doesn't actually describe this repo, though** — see
the repo-context note at the top: there is no GitHub Actions workflow pushing
these commits at all, so the "default `GITHUB_TOKEN` in a workflow" case in
the question doesn't apply here. The actual actor is a live session's own git
credential (a personal-account-scoped `GH_TOKEN`/`GITHUB_TOKEN` env var
injected by the session's connector), which behaves like an ordinary
authenticated human push for branch-protection purposes — not like an
Actions-runtime `GITHUB_TOKEN` push, which is a different, workflow-scoped
credential this repo doesn't use for this path.

---

## Recommended configuration for `feffef/terrarium`

1. **Replace classic branch protection on `main` with a repository ruleset**
   (Settings → Rules → Rulesets → New branch ruleset, target `main` or
   `~DEFAULT_BRANCH`). Rulesets are the only mechanism with a bypass model
   granular enough to except one actor from the whole rule set at once (§1).
2. **Rules to enable**, to restore the exact protections needed to keep the
   green-gate auto-merge flow working (§4) — mirroring what `main` had before
   2026-07-11 and what `.github/workflows/gate.yml`'s `gate` job already
   produces:
   - **Require a pull request before merging**, with whatever review count the
     `reviewer-agent` tier (human-judged) needs; content-only/single-Tenant
     PRs stay low-risk per ADR-0004's blast-radius policy regardless.
   - **Require status checks to pass** — name the `gate` job (and its
     sub-steps if reported as separate checks) from `gate.yml` as required.
     This is what gives the digest/audit-docs/audit-skills auto-merge tiers
     something to wait on again (§4).
   - **Block force pushes**, **restrict deletions** — unchanged from before.
3. **Add exactly one bypass-list entry, set to "Always"** (not "For pull
   requests only" — ADR-0009's whole point is a direct, non-PR push): the
   **Repository admin** role, since (per §2) that is the only actor type
   available that covers the owner's credential the session-log push
   currently borrows. **Document explicitly, in the ruleset's description or
   an ADR note, that this bypass is role-scoped, not automation-scoped** — it
   also lets the human owner push directly to `main` by hand, which was not
   previously possible and is a real, if narrow, regression in protection
   against accidental manual pushes.
4. **Track closing that gap on issue #124** (already the deferred "bot
   identity" work from ADR-0017): once a dedicated GitHub App or machine-user
   PAT exists for `session-end.ts`'s push, swap the bypass-list entry from
   "Repository admin" to that specific App — the only actor type the ruleset
   bypass picker can target with true, human-excluding precision (§2).
5. **Do not attempt path-scoped protection** — it isn't offered by either
   mechanism (§3). Keep relying on `scripts/log-session.ts`'s existing
   single-file guard as the actual boundary enforcement; the ruleset bypass is
   a necessary complement to it, not a replacement.
6. **Re-enable Settings → General → Allow auto-merge** (or confirm it's still
   on) once the ruleset's required status check is in place — with an unmet
   requirement to wait on restored, the auto-merge regression from #231
   resolves itself (§4).

## Tradeoffs vs. routing session logs through the gated-PR flow instead

The sharpest alternative, worth naming plainly: **the entire bypass-scoping
problem in §2 exists only because ADR-0009 chooses a raw `git push
…:refs/heads/main`, not a PR merge.** A GitHub **merge** (via the UI or API)
is the *intended*, fully-protected path — it satisfies required reviews and
required status checks by construction and needs **no bypass-list entry at
all**, for any actor. If session logs instead opened a (possibly
auto-mergeable) PR:

- **Pro — closes the crux entirely.** `main` stays uniformly, strictly
  protected; no role/actor bypass is needed, so the "bypass also covers the
  owner's manual pushes" problem in §2 disappears completely, and the
  auto-merge regression in §4 never arises for this content type either
  (session-log PRs would just be another auto-mergeable low-risk tier, ADR-0004).
- **Con — reintroduces exactly the friction ADR-0009 was written to avoid.**
  ADR-0009's Context section is explicit about why: a session log describes
  work that may span zero, one, or several PRs (planning/research sessions
  open none at all), and "routing each session log through its own PR is
  heavy ceremony" that would, per that ADR, "suppress logging or flatten it
  into dishonest summaries." A pure-research session (like this one) would
  need to open a PR whose only content is one schema-validated YAML file,
  wait on the same `gate.yml` (a full `nuxt build` + e2e run) that ADR-0009's
  Consequences argue is wasted work for content "strict-schema-validated
  `data` that generates nothing, routes nothing, touches no code."
- **Con — kills "lands live, mid-session."** ADR-0009 (`Landing mechanism as
  shipped`) is built around the log landing promptly on the live `Stop` hook,
  before any teardown/freeze risk. Even an auto-merging PR queues behind CI
  (minutes), and a genuinely unattended/frozen session might never see its PR
  merge — reintroducing the "ephemeral container rarely hosts a live agent at
  the later merge moment" problem ADR-0009 already had to reckon with once
  (the `close-session` amendment's "closure means work-complete, not merged"
  reframing).
- **Middle ground, not fully explored here.** A session-log PR could target
  the *lowest*-risk auto-merge tier and, if the "merge via API" step itself
  can run under the *same* borrowed owner credential without needing a raw
  push (merging doesn't require a bypass — only direct pushes do), it might
  sidestep §2's scoping problem without reintroducing full PR ceremony's
  latency. This trades one exception (a bypass list) for another
  (autonomous-merge authority) and deserves its own follow-up spike rather
  than a verdict here.

**Bottom line:** a ruleset gets the described tension unstuck (§1, §4) and is
a strict improvement over "no protection at all," but it cannot make the
session-log bypass *automation-scoped* without first closing the ADR-0017/#124
bot-identity gap (§2) — until then, whichever bypass entry lets
`session-end.ts` through also lets the human owner push to `main` by hand.
Routing logs through the gated-PR flow instead would remove the need for any
bypass at all, at the direct cost of the ceremony and latency ADR-0009 was
written specifically to avoid.
