---
title: Workshop
description: What the next Glass Box curate run should know now, the curate runs so far, and when glassbox-update last fully checked each guide page.
revision: 34598cfc01e1b4ab99c61a9e008db80540620881
revisionDate: 2026-11-06
---

Working state of the Glass Box improvement Skills, kept here so each run starts from the last one's findings. It is not part of the textbook.

## Memory

Each curate run rewrites this section from what it learned. It holds facts and leads, never procedures.

### Steps already decided

Page changes earlier runs weighed and turned down. Do not propose them again without new evidence.

- **Dropped:** `skill-pack/02.planning-with-the-pack` into `skill-pack/01.skill-packs`. The seven-Skill tour is upstream and Skill Inventory content; only the wayfinder-on-GitHub mapping and the ready-for-agent rule are Terrarium's.
- **Dropped:** `terrarium-practice/01.human-in-the-loop` into `git-github/04.trust-tiers`. The two-tier definition and the identity-not-text rule; the human-in-the-loop page links them.
- **Dropped:** `skill-pack/02.planning-with-the-pack` into `git-github/06.work-queue`. The do-not-apply-ready-for-agent rule, already in work-queue's Who sets the state excerpt.
- **Dropped:** `nuxt-content/04.query-collection` into `nuxt-vue/06.use-async-data`. The payload-size reason and the query-outside-useAsyncData warning that both pages state.
- **Dropped:** `nuxt-content/02.multi-tenant-isolation` into `nuxt-vue/02.file-routing`. Move the resolver facts beside `useSpace`; keep only key-per-table isolation on the isolation page.
- **Refused:** merging `skill-pack/03.engineering-skills` into `skill-pack/02.planning-with-the-pack`.
- **Refused:** splitting the unattended triage sweep out of `git-github/06.work-queue` into its own page.

### Open leads

Moves and additions raised but not yet decided.

- `verification/03.content-validation` to `verification/06.schema-validation`: the `utcTimestamp` refinement, the Timestamps-are-refined-strings reason, and the `toISOString` and `Date.parse` watch items. Content validation keeps one sentence and a link.
- A Lesson `git-github/08.git-plumbing`, from the walkthrough `session-log-lands-on-main`: build a commit onto a branch without a checkout (a temporary index via `GIT_INDEX_FILE`; `read-tree`, `hash-object`, `update-index`, `write-tree`, `commit-tree`; push retry). Terrarium's session-log lander relies on it, and only a Walkthrough stop teaches it.
- `claude-code/13.session-transcripts` to `terrarium-practice/04.session-logs`: the Session logs paragraph (`extractTrace` derives the mechanical half); keep a link on the transcripts page.
- `claude-code/06.hook-added-context` to `claude-code/13.session-transcripts`: the subagent-reader watch item and the say-once mechanism (transcript lookup by agent id); hook-added-context keeps the Say it once reason and a link.
- `claude-code/02.path-scoped-rules` to `claude-code/06.hook-added-context`: the `adr-read-hint` paragraph; path-scoped-rules keeps `skill-rules-hint` and `bash-rules-hint` and a link.
- `claude-code/08.mcp-servers` to `claude-code/05.blocking-hooks`: the Matched-by-name and by-server matcher Excerpts and the Name-tools-not-the-server reason; MCP servers keeps full-name loading and servers-from-the-host.
- `nuxt-vue/06.use-async-data` to `nuxt-content/04.query-collection`: the Return-what-the-page-reads watch item (`select` and payload size); Data fetching links to it.
- `skill-pack/03.engineering-skills` into `skill-pack/01.skill-packs`: the implement, tdd and code-review loop and the one fixed review step; Terrarium adds no decision of its own beyond pointers.

## Curate runs

Newest first.

::workshop-runs
::

## Update checks

When glassbox-update last fully checked each guide page, oldest check first.

::workshop-checks
::
