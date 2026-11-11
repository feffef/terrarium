---
name: harvest
description: File up to 10 Seedlings, self-contained issues that turn the last 28 days of Session logs' ideas and learnings (both, or one kind) into proposals for a Trusted user to green-light, preferring Tenant, content and UI ideas and leaving Frictions to frictions-to-fixes. User-invoked; a Routine runs it.
argument-hint: "[ideas|learnings] (default: both)"
disable-model-invocation: true
---

A Routine runs this Skill; its schedule lives there, not here (ADR-0005). Its
approval covers only the steps below (ADR-0003): it files issues and changes
nothing in the repo but its own session log.

`harvest` files positive ideas the Friction Ledger does not carry, preferring
those for Tenants, content and the UI; `frictions-to-fixes` owns the pains. A
Seedling (GLOSSARY.md) is labelled
`ready-for-human` and waits for a Trusted user's green light. State lives in the
Seedlings themselves: a `Harvested:` key line on any issue marks its entry as
taken, so a rerun or a missed week files each entry once. The helper is
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
2. **Cluster, in order.** Merge near-duplicate entries into clusters, taking
   entries from the top, and label each cluster **product** (what a visitor or
   the owner sees or uses on the site: a Tenant, its content, the UI) or
   **workflow** (how agents are instructed, fenced or equipped: `CLAUDE.md`,
   rules, ADRs, Skills, guards, hooks, the gate, scripts agents run). The label
   outranks recency: check every product cluster before the first workflow one.
   Stop when step 4's quota is filled or 30 clusters have been checked. Done when
   each checked cluster lists its entry numbers, its label and the count of
   distinct sessions behind it.
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
   - **Unrejected.** Not in `.out-of-scope/`, not under an open Prune Trial
     (`.agents/prune-trials.yml`), no `wontfix` issue.
   - **Beyond the Ledger.** Read the Ledger's summaries with
     `grep -H '^summary:' layers/journal/content/current/frictions/*.yml`. An entry
     that names the cluster's problem, whatever its status, means
     `frictions-to-fixes` owns it. A cluster the Ledger covers in part stays,
     narrowed to the part it misses.
   - **Simplifying.** The change gives the Platform a capability it lacks or
     makes it simpler, and retires as much as it adds: a new flag, file, check or
     concept names the one it replaces.
   - **Unacted.** Its source log's `prs` and outcome do not show the session
     already did it.
   Done when each checked cluster records the file read or merge list checked,
   the issue number matched or "no match" with the filter used, the Ledger entry
   that covers it or "none", and what the change retires or simplifies.
4. **File one Seedling per passing cluster,** at most 10 in total and, when
   harvesting both kinds, 5 per kind, unless the other kind has fewer passing
   (then it fills the rest). At most 3 of them are workflow clusters, however
   few product clusters passed. Learnings that belong in one doc share one
   Seedling. For each:
   - Read its source logs whole (each entry's `file`): the entry alone lacks the
     story.
   - Write the body to a scratchpad file as [`body-template.md`](body-template.md)
     says (read it first).
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
