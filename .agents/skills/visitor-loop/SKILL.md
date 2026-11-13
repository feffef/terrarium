---
name: visitor-loop
description: Daily visit run — three blind Sonnet visitors, each with its own lens, browse one focus area of a live Terrarium; the run logs their ideas and its hard-won learnings for harvest and raises verified bugs as Frictions. It changes no code.
disable-model-invocation: true
---

# visitor-loop

The Terrarium grows by being **visited**. Each run serves the site and sends
three blind visitors through one part of it, each looking through a different
**lens**. The run only reports what they saw: `harvest` turns its ideas and
learnings into Seedlings, and `frictions-to-fixes` takes up its bugs.

## Remit

The run changes nothing but its own session log: no branch, PR or issue
(ADR-0003). Everything it keeps goes into that log (step 4).

## Today's focus

All three visitors see the same part of the Platform. A focus given as the
Skill's argument wins. Otherwise take row
`$(( ($(date -u +%s)/86400 - $(date -u -d 2026-09-29 +%s)/86400) % 7 ))`:

| # | Focus | Entry | Note |
|---|-------|-------|------|
| 0 | atlas | `/t/atlas` | |
| 1 | blog | `/t/blog` | |
| 2 | journal | `/t/journal/current` | |
| 3 | midden | `/t/midden` | |
| 4 | tinkerfund | `/t/tinkerfund` | |
| 5 | glassbox | `/t/glassbox/guide` | Stay inside /t/glassbox/guide. |
| 6 | homepage | `/` | |

The focus goes in the session log's summary.

## 1. Serve the site

On a fresh `origin/main`: `pnpm install`, `pnpm build`, then `pnpm exec tsx scripts/ui/preview.ts start` (production
preview, not `--dev`: visitors must see what the public sees). Done when the
printed `URL=` returns 200 for `/`.

## 2. Send three visitors

Read first: the `dispatch-subagents` Skill (every brief below follows it).

Dispatch three read-only subagents **in one message**, all with `model: sonnet`,
one per lens:

| Lens | Looks for |
|------|-----------|
| first-time visitor | What this place is, whether its paths lead somewhere, and whether you would come back. |
| content editor | Wording that is unclear, wrong or out of voice; thin or missing pages; entries the area should have. |
| UI tester | Broken links and controls, errors, empty or stuck states, layout faults, the 390px view, keyboard and screen-reader access. |

Each gets [`visitor-brief.md`](visitor-brief.md) verbatim, with the URL, the
focus's entry path and note (blank if none), its lens row and a scratch
directory unique to that visitor filled in. They get no repo context, no hints,
no list of past findings: a primed visitor is not a blind one. Done when all
three reports are in; resume a stalled visitor with `SendMessage`, never by
re-dispatching. Then `scripts/ui/preview.ts stop <pid>`.

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

## 4. Log and close

Invoke `close-session`. In the log:

- each **bug** is a Friction: `description` names the URL and what breaks,
  `solution` the fix, `severity` how badly it hurts a visitor, on
  `log-session`'s scale;
- each **idea** is one `ideas` line naming the page, readable without this
  run's context;
- each **learning** is one `learnings` line;
- the run's own Frictions follow, as in any session.

Done when every bug, idea and learning in the tally is in the committed log.
