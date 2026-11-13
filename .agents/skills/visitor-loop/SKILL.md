---
name: visitor-loop
description: Daily visit run — three Sonnet visitors, one blind and two informed, each with its own lens, browse one focus area of a live Terrarium; the run logs their ideas and its hard-won learnings for harvest and files verified bugs as issues. It changes no code.
disable-model-invocation: true
---

# visitor-loop

The Terrarium grows by being **visited**. Each run serves the site and sends
three visitors through one part of it, each looking through a different
**lens**: one sees the site blind, two know its recent history and may read
the repo. The run only reports what they saw: `harvest` turns its ideas and
learnings into Seedlings, and its bugs become issues for triage.

## Remit

The run changes nothing but its own session log, its confirmed bugs (one new
issue per group, or a comment on an open issue they fit) and its retro comment
on #3244: no branch or PR (ADR-0003).
Its Frictions are only where the run itself was bumpy, never site bugs.

## Today's focus

All three visitors see the same part of the Platform. A focus given as the
Skill's argument wins. Otherwise take row
`$(( ($(date -u +%s)/86400 - $(date -u -d 2026-09-29 +%s)/86400) % 7 ))`:

| # | Focus | Entry | Files | Note |
|---|-------|-------|-------|------|
| 0 | atlas | `/t/atlas` | `layers/atlas/` | |
| 1 | blog | `/t/blog` | `layers/blog/` | |
| 2 | journal | `/t/journal/current` | `layers/journal/` | |
| 3 | midden | `/t/midden` | `layers/midden/` | |
| 4 | tinkerfund | `/t/tinkerfund` | `layers/tinkerfund/` | |
| 5 | glassbox | `/t/glassbox/guide` | `layers/glassbox/` | Stay inside /t/glassbox/guide. |
| 6 | homepage | `/` | `app/pages/index.vue`, `app/components/HomeShowcase.vue` | |

The focus goes in the session log's summary.

## 1. Serve the site

On a fresh `origin/main`: `pnpm install`, `pnpm build`, then `pnpm exec tsx scripts/ui/preview.ts start` (production
preview, not `--dev`: visitors must see what the public sees). Done when the
printed `URL=` returns 200 for `/`.

## 2. Send three visitors

Read first: the `dispatch-subagents` Skill (every brief below follows it).

Write a **context file** in your scratchpad for the informed lenses, four
sections on today's focus, each "none" when empty:

- pages: the focus's Spaces (its keys in `.nuxt/routing.mjs`), each at
  `/t/<tenant>/<space>`, then the URL of each file from
  `find <files> -path '*/content/*/pages/*' -name '*.md'`. Leave out Spaces
  the focus's note excludes; the homepage has only `/`.
  A file's URL is `/t/<tenant>/<space>/<path>`, with any `NN.` prefix and
  `.md` dropped and `index.md` as its folder's root;
- merged changes: `git log origin/main --since=7.days --format='%h %ad %s' --date=short -- <files>`;
- ideas already logged: the notes in `pnpm exec tsx .agents/skills/visitor-loop/scripts/ideas.ts gather --days 7`
  that name the focus or its pages;
- open issues: the titles in `pnpm exec tsx scripts/github/list-open-issues.ts`
  that name the focus or its pages, with their numbers.

Then dispatch three read-only subagents **in one message**, all with
`model: sonnet`, one per lens:

| Lens | Access | Looks for |
|------|--------|-----------|
| first-time visitor | blind | What this place is, whether its paths lead somewhere, and whether you would come back. |
| content editor | informed | Wording that is unclear, wrong or out of voice; thin or missing pages; entries the area should have. |
| UI tester | informed | Broken links and controls, errors, empty or stuck states, layout faults, keyboard and screen-reader access; one screenshot of each kind of page at 390px. |

Each gets [`visitor-brief.md`](visitor-brief.md) verbatim, keeping only its
access block, with the URL, the focus's entry path and note (blank if none),
its lens row, the context file's path (informed only), a scratch directory
and a script directory (`.throwaway/visitor-blind/`, `visitor-editor/` or
`visitor-ui/`, as absolute paths) unique to that visitor filled in. The blind visitor gets nothing else: no
context file, no hints, no past findings. Note each visitor's agent id for
step 5. Done when all three reports are in; resume a
stalled visitor with `SendMessage`, never by re-dispatching. Then
`scripts/ui/preview.ts stop <pid>`.

## 3. Sort the reports

Write one tally in your scratchpad. Merge items the visitors reported more than
once, then mark each item:

- **bug**: the site breaks its own intent: a broken link or control, an error,
  a layout fault, a mobile or accessibility failure, a false statement. Check
  it yourself against the source and the rendered page before you mark it; a
  visitor can misread. Mark one you can't reproduce *dropped (not reproduced)*.
  Then match it against every open issue
  (`pnpm exec tsx scripts/github/list-open-issues.ts`): mark it *dropped (#N)*
  if an issue already states it, or *amend #N* if it fits one and adds a new
  page, symptom or evidence.
- **idea**: anything else worth doing, wording and taste included.
- **learning**: a fact this run spent real effort to establish (a visitor's
  hard-won note or your own checking) that a later session would otherwise
  find again the same way.
- **dropped (why)**: ruled out by a line in [`decisions.md`](decisions.md) or
  its family, or already logged in the last week
  (`pnpm exec tsx .agents/skills/visitor-loop/scripts/ideas.ts gather --days 7`).

Leave other checks to `harvest`. Done when every reported item is in the
tally with one mark, and every bug was checked against both its source and its
rendered page.

## 4. File bugs, draft the log

For each bug, give its URL, what breaks, how you confirmed it, and a
proposed fix. Add the *amend #N* bugs to their issue as one comment per issue
(`add_issue_comment`; never edit the issue body). Group the other bugs that
are closely related (one page or component, or one fault across pages) and
file one issue per group, labelled `needs-triage`, with a body per
`docs/agents/issue-tracker.md`'s "Filing an issue".

Then write the log's entries in a draft YAML in your scratchpad, in
`log-session`'s authored format:

- each **idea** is one `ideas` line naming the page, readable without this
  run's context;
- each **learning** is one `learnings` line;
- the run's own Frictions, as in any session.

Done when every bug is in a filed issue or an amending comment, and every
idea and learning in the draft.

## 5. Retro, then close

Run the retro in issue #3244: send each visitor its retro message by agent id,
then post the run's report there as one comment, following that issue's rules
and template. Log each problem the run hit outside visitor-loop itself
(another Skill, tool, hook or doc) as a Friction in the draft. Then invoke
`close-session`, writing the log from the draft.

Done when the report comment is posted and the authored log holds every entry
in the draft.
