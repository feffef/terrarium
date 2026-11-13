---
name: visitor-loop
description: Daily visit run — three Sonnet visitors, one blind and two informed, each with its own lens, browse one focus area of a live Terrarium; the run logs their ideas and its hard-won learnings for harvest and raises verified bugs as Frictions. It changes no code.
disable-model-invocation: true
---

# visitor-loop

The Terrarium grows by being **visited**. Each run serves the site and sends
three visitors through one part of it, each looking through a different
**lens**: one sees the site blind, two know its recent history and may read
the repo. The run only reports what they saw: `harvest` turns its ideas and
learnings into Seedlings, and `frictions-to-fixes` takes up its bugs.

## Remit

The run changes nothing but its own session log and its retro comment on
#3244: no branch, PR or issue (ADR-0003). Everything it finds goes into that
log (step 4).

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

Write a **context file** in your scratchpad for the informed lenses, three
sections on today's focus, each "none" when empty:

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
| UI tester | informed | Broken links and controls, errors, empty or stuck states, layout faults, the 390px view, keyboard and screen-reader access. |

Each gets [`visitor-brief.md`](visitor-brief.md) verbatim, keeping only its
access block, with the URL, the focus's entry path and note (blank if none),
its lens row, the context file's path (informed only) and a scratch directory
unique to that visitor filled in. The blind visitor gets nothing else: no
context file, no hints, no past findings. Done when all three reports are in; resume a
stalled visitor with `SendMessage`, never by re-dispatching. Then
`scripts/ui/preview.ts stop <pid>`.

## 3. Sort the reports

Write one tally in your scratchpad. Merge items the visitors reported more than
once, then mark each item:

- **bug**: the site breaks its own intent: a broken link or control, an error,
  a layout fault, a mobile or accessibility failure, a false statement. Check
  it yourself against the source and the rendered page before you mark it; a
  visitor can misread. Mark one you can't reproduce *dropped (not reproduced)*.
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

## 4. Log

Invoke `close-session`. In the log:

- each **bug** is a Friction: `description` names the URL and what breaks,
  `solution` the fix, `severity` how badly it hurts a visitor, on
  `log-session`'s scale;
- each **idea** is one `ideas` line naming the page, readable without this
  run's context;
- each **learning** is one `learnings` line;
- the run's own Frictions follow, as in any session.

Done when every bug, idea and learning in the tally is in the authored log.

## 5. Retro

Run the retro in issue #3244: send each visitor its retro message, then post
the run's report there as one comment, following that issue's rules and
template. Log everything unrelated to visitor-loop itself as a Friction, never
as an issue. Then invoke `close-session` again.

Done when the report comment is posted and those Frictions are in the log.
