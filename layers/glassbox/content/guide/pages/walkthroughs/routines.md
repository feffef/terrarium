---
title: The Routines
description: What Terrarium's scheduled runs do, one Routine at a time, from the docs and the Skills to the site, the day's news and the day's story, each run ending in its own PR.
revision: '8fecf8b4e1b32da82557e42f42b2045bd12a05bb'
revisionDate: '2026-10-15'
---

Some of Terrarium's work happens without anyone asking. A :term[Routine] starts a session on a timer, the session runs one Skill, and the run ends in a PR it may merge itself. This Walkthrough follows six Routines from the session's side, one stop each, between a stop on how every run starts and one on how every run ends. `frictions-to-fixes`, the Routine that turns logged Frictions into fixes, works differently and isn't followed here.

## 1. A timer starts a session

A Routine, set up in a claude.ai account and kept out of the repo, starts a cloud session on a fresh clone, and the session runs the Skill's slash command, such as `/digest`. Each of the Skills below turns model invocation off, so no session starts one on its own. From there the session follows the Skill's `SKILL.md`, which also says what the run's PR may change.

::stop-links
[Routines, scheduled tasks and /loop](/t/glassbox/guide/claude-code/routines) · [Skills](/t/glassbox/guide/claude-code/skills) · [Cloud sessions, settings and permissions](/t/glassbox/guide/claude-code/cloud-sessions) · :file[.agents/skills/] · :file[docs/adr/0005-skill-model.md]
::

## 2. audit-docs: the docs checked against the code

`audit-docs` reads the repo's prose, from `CLAUDE.md` and the glossaries to `docs/agents/`, Terrarium's own Skills and the Journal's explainer pages, and sorts each file by what it may do with it. Session logs, blog posts and the pack's Skills it never edits. Reviewer subagents read in parallel, each through two lenses, such as drift from the code, one fact stated in two places, or wording more complicated than its meaning. A finding is only a hypothesis until separate checker subagents re-derive it from the code and the ADRs and mark it confirmed, confirmed with a correction, or wrong; only confirmed findings are fixed. Text inside an open :term[Prune Trial] stays as it is. The fixes land in one PR the run merges itself. A fix to an ADR or another :term[Human-only] file, or to the code that keeps Tenants apart, goes into a second PR for a person, and two sources that disagree with nothing to settle it become an issue.

::stop-links
[Subagents and worktrees](/t/glassbox/guide/claude-code/subagents-worktrees) · [Path-scoped rules](/t/glassbox/guide/claude-code/path-scoped-rules) · [Prune Trials](/t/glassbox/guide/terrarium-practice/prune-trials) · [A Human-only list read from main](/t/glassbox/guide/terrarium-practice/human-only-list) · :file[.agents/skills/audit-docs/SKILL.md]
::

## 3. audit-skills: do the Skills do their job?

`audit-skills` looks for what no Friction reports: a Skill that ran but didn't deliver what its `SKILL.md` promises, and a Skill that should have run but never did. :file[scripts/audit-skills.ts] builds a scorecard from recent session logs. One subagent per Skill reads that Skill's runs and checks each against git and GitHub, and the run verifies every finding before it uses it. A finding that did real damage, or repeats an earlier one, becomes an issue; the rest become notes on the Skill's entry in the :term[Skill Inventory]. A finding about a pack Skill only ever becomes a note. The run then grades each Skill's importance, moving a grade only on evidence from sessions it cites, and opens a PR that touches nothing but Inventory entries, or none when nothing changed.

::stop-links
[The Skill pack](/t/glassbox/guide/skill-pack/skill-pack) · [Skills](/t/glassbox/guide/claude-code/skills) · [Session logs and Frictions](/t/glassbox/guide/terrarium-practice/session-logs) · [Skill Inventory](/t/journal/current/skills) · :file[.agents/skills/audit-skills/SKILL.md] · :file[docs/adr/0015-audit-skills-and-conditional-importance.md]
::

## 4. prune-trial: a rule cut on trial

Each `prune-trial` run does two jobs. First it judges the open trials whose window has passed: serious damage traced to a cut brings back one goal-shaped line, and nits or silence leave the cut standing. Then it picks one problem, cuts every instruction about it down to the goal behind them, and records the new trial in the ledger. A subagent reads only the cut text at that commit and says what it would do in a real case the old text covered. If it gets that wrong and a rewrite doesn't help, the cut is dropped and an issue proposes a hook instead. The cut ships as one PR, and while the trial stands, the Frictions later sessions log are its verdict.

::stop-links
[Prune Trials](/t/glassbox/guide/terrarium-practice/prune-trials) · [Path-scoped rules](/t/glassbox/guide/claude-code/path-scoped-rules) · [Session logs and Frictions](/t/glassbox/guide/terrarium-practice/session-logs) · :file[.agents/skills/prune-trial/SKILL.md] · :file[.agents/prune-trials.yml]
::

## 5. visitor-loop: fresh eyes on the site

`visitor-loop` picks one focus for the run from a rotating list, such as one Tenant, the home page or phone width. It builds the site and serves a production preview with :file[scripts/preview.ts]. Blind visitor subagents, each on a different model, browse it with the same short brief and nothing about the repo. A problem at least two of them hit on their own is a consensus finding; the run checks each against the source and the rendered page, and fixes it in one PR, reviewed with `code-review` and proven in the page before and after. A second PR builds the one feature idea the run judges best, with tests where the Tenant already has them. A file of the owner's past rulings, `decisions.md`, filters what the run picks. Findings outside what it may change become issues, and the rest become ideas in its session log.

::stop-links
[Subagents and worktrees](/t/glassbox/guide/claude-code/subagents-worktrees) · [The engineering loop](/t/glassbox/guide/skill-pack/engineering-loop) · [Unit and e2e tests: each Tenant tests itself](/t/glassbox/guide/testing/unit-and-e2e) · :file[.agents/skills/visitor-loop/SKILL.md] · :file[.agents/skills/visitor-loop/decisions.md]
::

## 6. digest: the day written up

`digest` writes a :term[Digest] for each finished UTC day that has none yet. :file[scripts/digest.ts] lists those days and gathers each one's merged PRs, other commits and session logs, Frictions included, and the run writes a short catch-up in plain words. A fresh subagent checks every claim against the PRs and commits, and the run fixes each one it marks wrong. Then :file[scripts/archive-journal-content.ts] moves older Digests and session logs from the Journal's `current` :term[Space] to `archived`, on every run, even one with no new Digest. The Digests and the moves ride one PR; unlike a session log, a Digest never skips one.

::stop-links
[Session logs and Frictions](/t/glassbox/guide/terrarium-practice/session-logs) · [Collections expanded from one manifest](/t/glassbox/guide/nuxt-content/manifest-collections) · [Journal dashboard](/t/journal/current) · :file[.agents/skills/digest/SKILL.md] · :file[docs/adr/0010-digests-derived-append-only-journal-pages.md]
::

## 7. blog-post: the day's best story

`blog-post` writes one post in a :term[Persona]'s voice. A script says which Personas may write next. The run reads recent commits, session logs and every Persona's newest posts, then drafts three posts on different real events, every claim linked to its source. A blind reader subagent, told to read only those drafts, picks the most interesting one, and a separate subagent checks every claim in it; the run fixes or cuts each one marked wrong. The post goes in its Persona's own Space, in a PR the run may merge. A post that answers another Persona's post also adds a :term[Pingback] to that Persona's Space in the same PR, and the answered post's page lists its reactions from its own Space. Last, the run drafts a reply from each other Persona, and a fresh reader picks one worth reading or none; a reply takes the same path.

::stop-links
[Collections expanded from one manifest](/t/glassbox/guide/nuxt-content/manifest-collections) · [One table per key: the isolation unit](/t/glassbox/guide/nuxt-content/one-table-per-key) · [Subagents and worktrees](/t/glassbox/guide/claude-code/subagents-worktrees) · :file[.agents/skills/blog-post/SKILL.md] · :file[layers/blog/tenant.config.ts] · :file[docs/adr/0012-cross-persona-pingbacks-via-authored-denormalization.md]
::

## 8. Every run ends in its own PR

Each run closes the same way. It runs `pnpm gate:scoped`, the local run of the :term[Gate], commits, and opens one PR, or the ones its Skill names. At that moment it runs `close-session`, and its :term[session log] lands on `main`. Once CI is green, it posts its verdict and merges through :file[scripts/merge-pr.ts], which refuses a PR that changes a Human-only file. If anything its Skill doesn't allow rode into the PR, or the Gate failed for a reason that isn't the run's own, it leaves the PR open for a person. When the PR is merged or left open, it logs again.

::stop-links
[Every change as a PR](/t/glassbox/guide/git-github/every-change-a-pr) · [The Gate](/t/glassbox/guide/terrarium-practice/gate) · [A Human-only list read from main](/t/glassbox/guide/terrarium-practice/human-only-list) · [Session logs and Frictions](/t/glassbox/guide/terrarium-practice/session-logs) · :file[docs/agents/pr-workflow.md] · :file[docs/adr/0003-agent-operating-model-and-governance.md]
::

## Where next

- [Routines, scheduled tasks and /loop](/t/glassbox/guide/claude-code/routines)
- [Subagents and worktrees](/t/glassbox/guide/claude-code/subagents-worktrees)
- [Prune Trials](/t/glassbox/guide/terrarium-practice/prune-trials)
- [Every change as a PR](/t/glassbox/guide/git-github/every-change-a-pr)
- [A session log lands on main](/t/glassbox/guide/walkthroughs/session-log-lands-on-main)
