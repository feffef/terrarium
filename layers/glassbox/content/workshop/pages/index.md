---
title: Workshop
description: What the next Glass Box curate run should know now, the curate runs so far, and when glassbox-update last fully checked each guide page.
revision: bf6b04225c5d9b7961c3113d94d6d5aadc60d011
revisionDate: 2026-11-06
---

Working state of the Glass Box improvement Skills, kept here so each run starts from the last one's findings. It is not part of the textbook.

## Memory

Each curate run rewrites this section from what it learned. It holds facts and leads, never procedures. Session ids below are shortened to their first characters.

### State of the guide

**Coverage.** The guide has 57 Lessons in 8 Subjects, 9 Walkthroughs and the overview:

- Claude Code: 13
- Installed Skills: 4
- Nuxt & Vue: 9
- Nuxt Content: 6
- Verification: 7
- Deploy: 2
- Git & GitHub: 7
- House rules: 9

The drafts Space holds one page, `walkthroughs/a-newcomers-first-hour`. Zod and TypeScript have no Subject of their own; they are taught inside Verification (`verification/06.schema-validation`, `verification/02.type-checking`), though the Glass Box glossary lists both among what the guide teaches.

**Strong.** Five Walkthroughs were promoted from drafts between 2026-11-02 and 2026-11-04, so 8 of the 10 Walkthroughs the spec (#1985) listed are now in the guide. The claim check works: it fixed 31 false claims in five runs.

**Weak.**
- **Installed Skills:** `skill-pack/02.planning-with-the-pack` and `skill-pack/03.engineering-skills` mostly retell upstream Skills, with little decided by Terrarium.
- **Long Lessons:** `git-github/05.attribution` (about 1,700 words, the longest) and `git-github/06.work-queue` (about 1,550).
- **Titles** are uneven (see the owner's direction below).
- **Gaps in numbering** left by folds: Nuxt Content has no 06, House rules no 06, Verification no 07 or 09.

**Recurring problems.**
- **False claims in text an improve run wrote.** `claude-code/13.session-transcripts`, a new Lesson from the 2026-11-04 run, carried two false claims found the next day. The 2026-11-05 schema-validation claim was also improve's own text (#2871). New text needs its own check.
- **Overlap between neighbouring Lessons.** Most structural steps so far moved a restated reason to one home. Four of the eight open leads below move text out of a Claude Code page.
- **Churn.** A page promoted or kept on one day was folded a few runs later. `nuxt-content/06.prose-overrides` was promoted on 2026-11-02 and folded into `nuxt-content/05.mdc-components` on 2026-11-05. `verification/09.invariant-tests` was kept by three runs and then folded into `verification/04.unit-and-e2e-tests` on 2026-11-05.
- **Titles that don't match.** The title and the file stem often differ (see below), and some titles name Terrarium's choice instead of the concept. `verification/07.timestamps-stored-as-strings` was one; it is now folded.

### Roadmap

**Next runs**, ranked:

1. **Claude Code structure.** It is the largest Subject. Four open leads move text out of its pages, and the owner wants it split (below).
2. **Title consistency.** It is the owner's direction, and the mismatches are listed below.
3. **The last draft.** Promote or remove `walkthroughs/a-newcomers-first-hour` (below), which empties the drafts Space.
4. **Installed Skills.** Its pages mostly retell upstream Skills (above). One move is open (`skill-pack/03.engineering-skills` into `skill-pack/01.skill-packs`), and one merge was refused (below).
5. **A git plumbing Lesson.** This is the open gap with the clearest source (below).
6. **The long Git & GitHub Lessons.** `git-github/05.attribution` teaches git hooks inside a page about attribution. The idea of a separate git hooks Lesson was raised once (session `013zxzeSvdGh`).
7. **The two cross-Subject moves whose history conflicts** (see Open leads): `verification/03.content-validation` and `nuxt-vue/06.use-async-data`.
8. **Small loose ends:**
   - `terrarium-practice/04.session-logs`' "Old logs never change" bullet doesn't link `verification/08.schema-evolution` (session `013zxzeSkTLm`; still true).
   - Retitle candidates earlier runs disagreed on: Self-improvement loop (`013zxzeQRYzC`), Workflow scripts (`013zxzeRoWcN`), Engineering skills and Hook-added context (`013zxzeSvdGh`).
   - Whether `git-github/06.work-queue`'s Why bullets still restate `terrarium-practice/01.human-in-the-loop` and `git-github/04.trust-tiers` (`013zxzeRoWcN`; not re-checked).

**The bigger arc.** The guide is moving from page polish to structure. The goals:
- Subjects cut the way a newcomer meets the tools;
- titles that name concepts consistently;
- no drafts;
- gaps filled where Terrarium relies on something no page teaches.

glassbox-update keeps existing text true, so curate can spend its runs on teaching and structure. Curate is judged by the owner's reviews. After about 5 to 7 curate runs, one review compares curate with improve (#2899).

### The owner's direction

These are the owner's decisions of direction, not findings. A new Subject still needs the owner's approval (the curate Skill's Remit). Where a cut is suggested below, it is a lead, not a decision.

- **Split up the Claude Code Subject.** One lead, inferred from the pages' topics:
  - instructions: `01.claude-md`, `02.path-scoped-rules`, `03.skills`;
  - hooks: `04.hooks`, `05.blocking-hooks`, `06.hook-added-context`, `13.session-transcripts`;
  - agents and automation: `07.subagents`, `09.workflow-scripts`, `10.routines`, `11.cloud-sessions`.

  `08.mcp-servers` and `12.permissions` would go with hooks or form a fourth group. The open moves between `02`, `05`, `06`, `08` and `13` suggest the hooks group is the most tangled.
- **Introduce a web standards Subject** for CSS and SVG: how Terrarium uses SVG so the repo needs no binary image files. On `main` the repo holds no PNG, JPEG, GIF, WebP or ICO file. Mermaid diagrams are pre-rendered to four SVGs in `app/assets/mermaid/`, and 24 Vue files contain an inline `<svg>` element. `app/utils/svg.ts` validates authored SVG, allowing static drawing elements only, before it reaches a page through `v-html`. Pages that already touch this, as leads for what might move:
  - `nuxt-vue/07.css-custom-properties` (the whole page);
  - `nuxt-content/07.mermaid-pre-rendering` (SVG output and the `--diagram-*` contract);
  - `verification/05.linting` (the only page that names `app/utils/svg.ts`, as a lint example);
  - CSS mentions in `nuxt-vue/05.vue-components` (ProgressBar's custom properties) and `walkthroughs/adding-a-tenant`.
- **Improve structure and titles for consistency.** Facts from the current pages:
  - Stem and title differ: `deploy/01.self-updating-container` (Continuous deployment), `git-github/01.every-change-a-pr` (Pull requests), `git-github/04.trust-tiers` (Author trust), `git-github/06.work-queue` (Issue triage labels), `claude-code/10.routines` (Scheduled tasks), `terrarium-practice/07.human-only-list` (Protected paths), `verification/06.schema-validation` (Zod refinements), `nuxt-vue/06.use-async-data` (Data fetching), `walkthroughs/adding-a-tenant` (Adding a site).
  - Some Claude Code titles carry the tool's name (Claude Code Skills, hooks, permissions) and others don't (Subagents, MCP servers).
  - `skill-pack/01.skill-packs` has the same title as its Subject, Installed Skills.
  - Capitals differ between Planning Skills and Engineering skills.
  - DECISIONS.md already settles two titles: Author trust stays, and field names replace project jargon.
- **Retire the drafts.** Each draft is either promoted into the guide or removed, until the drafts Space is empty. Whether the Space itself then goes away is still the owner's call. Only one draft is left, `walkthroughs/a-newcomers-first-hour`. A lead, not a decision:
  - *For promoting:* the 2026-11-04 run (`013zxzeT8tDd`) named its only blockers as a stale pin (2026-10-25), a long description and no `publishedAt`, and the spec listed it as a planned Walkthrough.
  - *For removing:* the 2026-11-03 run (`013zxzeQH3GS`) found it "tours the Journal". Three of its eight stops chip Journal pages, and Glass Box links the Journal as evidence rather than retelling it.

### Known gaps

**Missing Lessons within existing Subjects:**
- **Git plumbing** (Git & GitHub). Building a commit without a checkout, which the session-log lander relies on. Only stop 6 of `walkthroughs/session-log-lands-on-main` shows it, and no guide page names `GIT_INDEX_FILE`. This lead has been open since 2026-11-05.
- **Git hooks** (Git & GitHub). Taught only inside `git-github/05.attribution`. Raised once.
- **UI checks** (Verification). `scripts/ui/` (preview, screenshot, eval-in-page) is named only on `claude-code/07.subagents`. This is likely a gap, not yet confirmed by a run.
- **Journal digests and pingbacks.** ADR-0010 and ADR-0012 are the only ADRs no guide page cites. They may be uncovered on purpose, as Journal internals; no run has decided.

**Topics that would need a new Subject:**
- **Web standards: CSS and SVG** (the owner's direction above).
- No other topic in the record calls for a new Subject.

**Claims earlier runs could not source** (session `013zxzeQH3GS`; update's claim check owns these):
- the two incident stories on `terrarium-practice/07.human-only-list`;
- whether a Routine runs `dependabot-sweep`. PR #2869 found no Routine file for it, yet `claude-code/10.routines` lists it.

### Steps already decided

These are page changes earlier improve runs weighed and turned down. Each stays decided until something on `main` changes the reason it was turned down.

**Dropped** (a researcher or the run rejected it):
- **Folding `skill-pack/02.planning-with-the-pack` into `skill-pack/01.skill-packs`** (2026-11-02). The proposal kept only the wayfinder-on-GitHub mapping and the ready-for-agent rule. It was dropped because the page's tour of seven Skills is upstream and Skill Inventory content, so a fold would leave Terrarium's own two facts with no Lesson. Raise it again only if the page loses those facts.
- **Moving the two-tier definition and the identity-not-text rule from `terrarium-practice/01.human-in-the-loop` to `git-github/04.trust-tiers`** (2026-11-03). Dropped because human-in-the-loop already links them there. Nothing needs to move.
- **Moving the do-not-apply-ready-for-agent rule from `skill-pack/02.planning-with-the-pack` to `git-github/06.work-queue`** (2026-11-03). Dropped because work-queue's "Who sets the state" Excerpt already holds it.
- **Moving the payload-size reason and the query-outside-useAsyncData warning from `nuxt-content/04.query-collection` to `nuxt-vue/06.use-async-data`** (2026-11-03). Both pages state them. It was dropped, and a later session (`013zxzeQH3GS`) proposed a ruling that the payload-size reason lives on Data fetching and Query collection only links to it.
- **Moving the resolver facts from `nuxt-content/02.multi-tenant-isolation` to `nuxt-vue/02.file-routing`, beside `useSpace`** (2026-11-04). Dropped as undoing recent work. Isolation keeps the resolver's testability.

**Refused** (both as undoing a recent change):
- **Merging `skill-pack/03.engineering-skills` into `skill-pack/02.planning-with-the-pack`** (2026-11-04). The record likely means it would undo the 2026-11-02 split of `planning-with-the-pack`. The open lead into `skill-pack/01.skill-packs` is a different home for the same page.
- **Splitting the unattended triage sweep out of `git-github/06.work-queue`** (2026-11-05). The page had just received Out-of-scope records on 2026-11-04, so the record suggests the split came too soon. Its length is still a live problem.

### Open leads

These moves were raised by the 2026-11-04 or 2026-11-05 run (the first by both) and never decided. They are leads, not rulings.

- **`verification/03.content-validation` to `verification/06.schema-validation`**: the `utcTimestamp` refinement, the Timestamps-are-refined-strings reason, and the `toISOString` and `Date.parse` watch items. Content validation would keep one sentence and a link. *Conflict:* on 2026-11-02 a move of the same material into Schema validation was dropped, on 2026-11-03 it was put on Content validation instead, and session `013zxzeT8tDd` proposed a ruling that it stays there.
- **A Lesson `git-github/08.git-plumbing`** (see Known gaps).
- **`claude-code/13.session-transcripts` to `terrarium-practice/04.session-logs`**: the Session logs paragraph (`extractTrace` derives the mechanical half). The transcripts page would keep a link.
- **`claude-code/06.hook-added-context` to `claude-code/13.session-transcripts`**: the subagent-reader watch item and the say-once mechanism (transcript lookup by agent id). Hook-added context would keep the Say it once reason and a link.
- **`claude-code/02.path-scoped-rules` to `claude-code/06.hook-added-context`**: the `adr-read-hint` paragraph. Path-scoped rules would keep `skill-rules-hint`, `bash-rules-hint` and a link.
- **`claude-code/08.mcp-servers` to `claude-code/05.blocking-hooks`**: the matcher Excerpts (matched by name, or by server) and the Name-tools-not-the-server reason. MCP servers would keep full-name loading and servers-from-the-host.
- **`nuxt-vue/06.use-async-data` to `nuxt-content/04.query-collection`**: the Return-what-the-page-reads watch item (`select` and payload size). *Conflict:* this runs against the dropped step and the proposed ruling above, which keep the payload reason on Data fetching.
- **`skill-pack/03.engineering-skills` into `skill-pack/01.skill-packs`**: the implement, tdd and code-review loop and the one fixed review step. Terrarium adds no decision of its own beyond pointers.

## Curate runs

Newest first.

::workshop-runs
::

## Update checks

When glassbox-update last fully checked each guide page, oldest check first.

::workshop-checks
::
