---
name: harvest
description: File up to 10 Seedlings, issues that turn the last 28 days of Session logs' ideas and learnings (both, or one kind) into proposals for a Trusted user to green-light. User-invoked; a Routine runs it.
argument-hint: "[ideas|learnings] (default: both)"
disable-model-invocation: true
---

A Routine runs this Skill; its schedule lives there, not here (ADR-0005). Its
approval covers only the steps below (ADR-0003): it files issues and changes
nothing in the repo but its own session log.

A Seedling (GLOSSARY.md) is labelled `ready-for-human` and waits for a Trusted
user's green light. State lives in the Seedlings themselves: a `Harvested:` key
line on any issue marks its entry as taken, so a rerun or a missed week files
each entry once. The helper is
`pnpm exec tsx .agents/skills/harvest/scripts/harvest.ts`; below it is `harvest`.

The argument `ideas` or `learnings` harvests that kind alone; with none, the run
harvests both.

1. **Extract.** `harvest extract --out <scratchpad>/harvest-extract.json`, plus
   `--kind ideas` or `--kind learnings` when the run has that argument.
   It lists unharvested entries from the last 28 days (archived logs
   included). Within a kind the newest come first and the kinds alternate, idea
   first; recency is the only ranking, so an idea from a smooth session ranks like
   any other. Read the file whole. Done when you have the counts per kind and the
   ordered entries.
2. **Cluster, in order.** Merge near-duplicate entries into clusters,
   taking entries from the top, only until 10 clusters pass step 3 or 30 have
   been checked. Done when each checked cluster lists its entry numbers and the
   count of distinct sessions behind it.
3. **Check relevance.** A cluster is still open when all of these hold:
   - **Unbuilt.** Name the file or symbol it would change and read it now. Run
     `pnpm exec tsx scripts/git/list-merges-since.ts` from the entry's
     `startedAt`. For a learning, grep `CLAUDE.md`, `.claude/rules/`, `docs/agents/`
     and the Skills for the fact itself.
   - **Unfiled.** Entries with a non-empty `sameSession` were possibly
     reworded: read those issues. List the tracker with
     `pnpm exec tsx scripts/github/list-open-issues.ts 5000 [--closed]` and
     match titles. A title match is a hint. An issue closed as completed
     settles the cluster. One closed as not planned rejects it. Any other
     closed issue goes in the Seedling as the reason to reopen.
   - **Unrejected.** Not in `.out-of-scope/`, not a `status: accepted` entry
     of the Friction Ledger (`layers/journal/content/current/frictions/`), not
     under an open Prune Trial (`.agents/prune-trials.yml`), no `wontfix` issue.
   - **Unacted.** Its source log's `prs` and outcome do not show the session
     already did it.
   Done when each checked cluster records the file read or merge list checked
   and the issue number matched, or "no match" with the filter used.
4. **File one Seedling per passing cluster,** at most 10 in total and, when
   harvesting both kinds, 5 per kind, unless the other kind has fewer passing
   (then it fills the rest).
   Learnings that belong in one doc share one Seedling. For each:
   - Write the body to a file in the scratchpad: the ADR-0017 header, a banner
     line `Agent seedling from harvest, not approved. Waits for a Trusted user's green light (ADR-0003).`,
     the output of `harvest block <extract.json> <n> [n...]` for its entries
     (paste it unchanged: the key lines are rendered, never typed), then the
     verified facts with their source (apart from your assumptions), the source
     logs by full filename, and the proposed change with where it goes. Fence
     any quoted text that contains angle brackets.
   - `harvest check-body <file> --extract <extract.json> --title "Seedling: ..."`
     must print `ok`.
   - Post it through MCP `issue_write` with that title and the single label
     `ready-for-human`.
   - `harvest check-posted <number> <file>` must print that the issue stores the
     checked keys. On a mismatch repair once with `issue_write` update and the
     file's full body (an update replaces the description), check again, and
     stop the run naming the issue if it still fails.
   Done when every filed issue's stored keys equal its file's keys and you have
   listed every number.
5. **Close.** Invoke `close-session` once; done when it has run. A run where
   nothing passed says so and files no issue.
