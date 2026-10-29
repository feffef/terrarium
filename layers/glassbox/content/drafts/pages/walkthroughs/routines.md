---
title: The Routines
description: What Terrarium's scheduled runs do, one Routine at a time, from the docs and the Skills to the site, the day's news and the day's story. A run that changes something ends in its own PR.
revision: 'e0edb8a5963064e5075b668c6512896a6e9fcd4d'
revisionDate: '2026-10-25'
publishedAt: '2026-10-25T07:50:00Z'
---

Some of Terrarium's work happens without anyone asking. A :term[Routine] starts a session on a timer, and the session runs one Skill. This Walkthrough follows those runs from the session's side, one stop per Routine, between a stop on how a run starts and one on how it ends. The [Skill Inventory](/t/journal/current/skills) shows which Skills the Routines run.

## 1. A timer starts a session

A Routine, set up in a claude.ai account and kept out of the repo, starts a cloud session on a fresh clone, and the session runs the Skill's slash command, such as `/digest`. Each of the Skills below turns model invocation off, so no session starts one on its own. From there the session follows the Skill's `SKILL.md`, which also says what the run's PR may change.

::stop-links
[Scheduled tasks](/t/glassbox/guide/claude-code/routines) · [Claude Code Skills](/t/glassbox/guide/claude-code/skills) · [Cloud sessions](/t/glassbox/guide/claude-code/cloud-sessions)
::

## 2. audit-docs: the docs checked against the code

`audit-docs` reviews the repo's own prose, from `CLAUDE.md` to its Skills, for drift, duplication, wordiness and contradiction, and fixes only the findings that separate checker subagents confirm from primary sources. It never edits session logs, blog posts or the pack's Skills, and never cuts a reason that keeps an old mistake from coming back: retiring one is a :term[Prune Trial]'s call. The fixes land in one PR the run merges itself; fixes a person must merge, such as an ADR edit or a change to another :term[Human-only] file, go into a second PR, and a conflict no source settles becomes an issue.

::stop-links
[Subagents](/t/glassbox/guide/claude-code/subagents) · [Path-specific rules](/t/glassbox/guide/claude-code/path-scoped-rules) · [Prune Trials](/t/glassbox/drafts/terrarium-practice/prune-trials) · [Protected paths](/t/glassbox/guide/terrarium-practice/human-only-list) · :file[.agents/skills/audit-docs/SKILL.md]
::

## 3. audit-skills: do the Skills do their job?

`audit-skills` checks recent session logs for a Skill that ran but didn't deliver what its `SKILL.md` promises, and for one that should have run but didn't, with one subagent per Skill. It may change only :term[Skill Inventory] entries, with notes on what it found and a Skill's importance (moved only on evidence from sessions it cites), and the cost rows kept for each Routine's runs. A finding that did real damage or repeats an earlier one becomes an issue, unless it is about a pack Skill, and its changes leave in one PR, or none when nothing changed.

::stop-links
[Skill packs](/t/glassbox/guide/skill-pack/skill-packs) · [Claude Code Skills](/t/glassbox/guide/claude-code/skills) · [Session logs and Frictions](/t/glassbox/guide/terrarium-practice/session-logs) · [Skill Inventory](/t/journal/current/skills) · :file[.agents/skills/audit-skills/SKILL.md]
::

## 4. prune-trial: a rule cut on trial

`prune-trial` first judges the open trials whose window has passed: a `major` or `blocker` Friction traced to the cut brings back one goal-shaped line; nits, minor and moderate Frictions and silence leave it standing. Then it cuts the instructions about one problem down to their goal and opens a new trial for them. It may change instruction prose, never the pack's Skills, and an ADR only in a trial a Trusted user started. The cut leaves in one PR; a cut that a subagent can't act on is dropped, and an issue proposes a hook instead.

::stop-links
[Prune Trials](/t/glassbox/drafts/terrarium-practice/prune-trials) · [Path-specific rules](/t/glassbox/guide/claude-code/path-scoped-rules) · [Session logs and Frictions](/t/glassbox/guide/terrarium-practice/session-logs)
::

## 5. visitor-loop: fresh eyes on the site

`visitor-loop` serves a production preview of the site and sends blind visitor subagents, each on a different model, through it with no knowledge of the repo, then a read-only subagent keeps, refines or drops each finding and the chosen feature against the ADRs, glossaries and issues. The run fixes the problems at least two visitors hit on their own, in one PR, and builds the one feature idea it judges best in a second. Both stay inside existing Tenants and the app files an agent may merge. A finding outside that becomes an issue, and the rest become ideas in its session log.

::stop-links
[Subagents](/t/glassbox/guide/claude-code/subagents) · [Engineering Skills](/t/glassbox/guide/skill-pack/engineering-skills) · [Testing](/t/glassbox/guide/verification/unit-and-e2e-tests) · :file[.agents/skills/visitor-loop/SKILL.md] · :file[.agents/skills/visitor-loop/decisions.md]
::

## 6. digest: the day written up

`digest` writes a :term[Digest] for each finished UTC day that has activity but no Digest, from that day's merged PRs, commits and session logs, and has a subagent check every claim. On every run it also moves older Digests and session logs from the Journal's `current` :term[Space] to `archived`. It may change only those Digests, those moves and the Journal index's intro, all in one PR: a Digest never goes straight to `main`.

::stop-links
[Session logs and Frictions](/t/glassbox/guide/terrarium-practice/session-logs) · [Content collections](/t/glassbox/guide/nuxt-content/manifest-collections) · [Journal dashboard](/t/journal/current) · :file[.agents/skills/digest/SKILL.md] · :file[docs/adr/0010-digests-derived-append-only-journal-pages.md]
::

## 7. blog-post: the day's best story

`blog-post` drafts three posts on real recent events in a :term[Persona]'s voice, every claim linked to its source, and a blind reader subagent picks one, which a separate subagent fact-checks before it ships. It may change only that post, in its Persona's own Space, and for a post that answers another Persona, a :term[Pingback] in that Persona's Space. The post leaves in one PR, and a reply from another Persona, if a fresh reader picks one, takes the same path.

::stop-links
[Content collections](/t/glassbox/guide/nuxt-content/manifest-collections) · [Multi-tenant isolation](/t/glassbox/guide/nuxt-content/multi-tenant-isolation) · :file[docs/adr/0012-cross-persona-pingbacks-via-authored-denormalization.md]
::

## 8. A run that changes something ends in its own PR

Each run that changes something closes the same way: it commits, has the change reviewed, runs `pnpm gate:scoped`, the local run of the :term[Gate], on the final head, and opens one PR, or the ones its Skill names. At that moment it runs `close-session`, and its :term[session log] lands on `main`. Once CI is green, it posts its verdict, naming the head commit it reviewed, and merges through `scripts/github/merge-pr.ts`, which refuses a PR that changes a Human-only file or has no such verdict. If anything its Skill doesn't allow rode into the PR, or the Gate failed for a reason that isn't the run's own, it leaves the PR open for a person, and once the PR is merged or left open, it logs again.

::stop-links
[Pull requests](/t/glassbox/guide/git-github/every-change-a-pr) · [Merge gate](/t/glassbox/guide/verification/gate) · [Protected paths](/t/glassbox/guide/terrarium-practice/human-only-list) · [Session logs and Frictions](/t/glassbox/guide/terrarium-practice/session-logs)
::

## Where next

- [Scheduled tasks](/t/glassbox/guide/claude-code/routines)
- [Subagents](/t/glassbox/guide/claude-code/subagents)
- [Prune Trials](/t/glassbox/drafts/terrarium-practice/prune-trials)
- [Pull requests](/t/glassbox/guide/git-github/every-change-a-pr)
- [A session log lands on main](/t/glassbox/drafts/walkthroughs/session-log-lands-on-main)
