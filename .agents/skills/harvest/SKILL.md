---
name: harvest
description: File up to 10 Seedlings (plus a retro on this Skill), self-contained issues that turn the last 7 days of Session logs' ideas and learnings (both, or one kind) into proposals for a Trusted user to green-light, preferring Tenant, content and UI ideas and leaving Frictions to frictions-to-fixes. It runs autonomously, or interactively with a person.
argument-hint: "[ideas|learnings] (default: both)"
disable-model-invocation: true
---

Its approval covers only the steps below (ADR-0003): it files issues and
changes nothing in the repo but its own session log.

`harvest` files positive ideas the Friction Ledger does not carry, preferring
those for Tenants, content and the UI; `frictions-to-fixes` owns the pains. A
Seedling (GLOSSARY.md) is labelled
`ready-for-human` and waits for a Trusted user's green light. State lives in the
Seedlings themselves: a `Harvested:` key line on any issue marks its entry as
taken, so a rerun or a missed run files each entry once. The helper is
`pnpm exec tsx .agents/skills/harvest/scripts/harvest.ts`; below it is `harvest`.

The argument `ideas` or `learnings` harvests that kind alone; with none, the run
harvests both.

1. **Extract.** `harvest extract --out <scratchpad>/harvest-extract.json`, plus
   `--kind ideas` or `--kind learnings` when the run has that argument.
   It lists unharvested entries from the last 7 days (archived logs
   included). Within a kind the newest come first and the kinds alternate, idea
   first; recency is the only ranking, so an idea from a smooth session ranks like
   any other. Then redirect `harvest list <scratchpad>/harvest-extract.json` to
   `<scratchpad>/harvest-list.txt` and read that file whole: every
   entry in that order, with each session's start, PRs, goal, outcome and source
   file printed once before its first entry. It holds everything steps 2 and 3
   read; use `jq` on the JSON only for more on an entry (the list's last lines
   show how). Done when you have the counts per kind and the last entry's number.
2. **Cluster, in order.** Merge near-duplicate entries into clusters, taking
   entries from the top, and label each cluster **product** (what a visitor or
   the owner sees or uses on the site: a Tenant, its content, the UI) or
   **workflow** (how agents are instructed, fenced or equipped: `CLAUDE.md`,
   rules, ADRs, Skills, guards, hooks, the gate, scripts agents run). The label
   outranks recency: check every product cluster before the first workflow one.
   Stop when step 4's quota is filled or 30 clusters have been checked.
3. **Check relevance.** Write `<scratchpad>/harvest-checks.md`, one block per
   cluster, product clusters first: a `## <name>` line, then `label:`
   (product or workflow), `entries:` (their numbers), `sessions:` (a count), one
   `field: evidence` line per test below (`unbuilt`, `unfiled`, `unrejected`,
   `ledger`, `simplifying`, `unacted`) and `verdict:` `open` or `dropped <test>`.
   A dropped cluster needs only the failed test's evidence. Evidence is what you
   read or ran, and a search that printed nothing is not evidence until you know
   its pattern can match. Do not filter script output with `head` or `tail`.
   Step 4 starts only when `harvest check-clusters <that file> --extract
   <extract.json>` passes. A cluster is open when all of these hold:
   - **Unbuilt.** Name the file or symbol it would change and read it now. Run
     `pnpm exec tsx scripts/git/list-merges-since.ts` from its session's start
     (`started` in the list). For a learning, grep `CLAUDE.md`, `.claude/rules/`, `docs/agents/`
     and the Skills for the fact itself.
   - **Unfiled.** Entries the list marks "same session in issues" were possibly
     reworded: read those issues. List the tracker with
     `pnpm exec tsx scripts/github/list-open-issues.ts 5000 [--closed]` and
     match titles. A title match is a hint. Read a closed issue's `stateReason`:
     `completed` settles the cluster, `not_planned` rejects it. Any other
     closed issue goes in the Seedling as the reason to reopen.
   - **Unrejected.** Not in `.out-of-scope/`, not under an open Prune Trial
     (`trial-territory.ts <files or words>` in `prune-trial/scripts/`), no
     `wontfix` issue, not ruled out by a Tenant's `GLOSSARY.md` or
     `.agents/skills/visitor-loop/decisions.md`.
   - **Beyond the Ledger.** Read every summary line it prints:
     `grep -H '^summary:' layers/journal/content/current/frictions/*.yml`. An entry
     that names the cluster's problem, whatever its status, means
     `frictions-to-fixes` owns it. A cluster the Ledger covers in part stays,
     narrowed to the part it misses.
   - **Simplifying** (workflow clusters only; a product cluster that adds files
     is welcome). An idea gives the Platform a capability it lacks or
     makes it simpler, and retires as much as it adds: a new flag, file, check or
     concept names the one it replaces. A learning is a fact for its home doc:
     it passes when the doc lacks it and two sessions raised it or it cost one a
     wrong turn.
   - **Unacted.** Its source log's `prs` and outcome do not show the session
     already did it.
4. **File one Seedling per passing cluster,** at most 10 in total and, when
   harvesting both kinds, 5 per kind, unless the other kind has fewer passing
   (then it fills the rest). At most 3 of them are workflow clusters, however
   few product clusters passed. A cluster that joins ideas and learnings counts
   toward the kind of most of its entries, ties to idea; its product or workflow
   label still decides the 3-workflow cap. Learnings that belong in one doc
   share one Seedling. Read `docs/agents/issue-tracker.md` and
   `triage-labels.md` first, once. For each:
   - Read its source logs whole (each entry's `file`): the entry alone lacks the
     story.
   - Write the body to a scratchpad file as [`body-template.md`](body-template.md)
     says (read it first).
   - If the Seedling would add or change what visitors or the owner see, list
     the three questions of `clear-backlog` §2 as its open questions.
   - `harvest check-body <file> --extract <extract.json> --title "Seedling: ..."`
     must print `ok`.
   - Post it through MCP `issue_write` with that title, the label
     `ready-for-human` and its area labels (`auto-triage`'s "Area labels").
   - `harvest check-posted <number> <file>` must print that the issue stores the
     checked keys. On a mismatch repair once with `issue_write` update and the
     file's full body (an update replaces the description), check again, and
     stop the run naming the issue if it still fails.
   Done when every filed issue's stored keys equal its file's keys and you have
   listed every number.
5. **Retro.** Read and follow `.agents/skills/retro/SKILL.md` (it is installed and
   never edited; read the file, the Skill tool refuses a model call of it), applied to
   this run and limited to this Skill's steps, `body-template.md` and the
   helper; problems elsewhere stay Frictions in the session log. Skip a candidate
   an open issue or open Ledger entry holds, naming it. Its final step, to
   present candidates, becomes one more Seedling in the retro's order of
   severity, outside step 4's caps, titled `Seedling: retro ...` and keyed
   `Harvested: <your session id> retro`
   (`check-body` accepts that key alone). Write, check, post and verify it as
   step 4's bullets say. Nothing to file: say so.
6. **Close.** Invoke `close-session` once; done when it has run. Its summary
   counts the clusters checked, passed and dropped. A run where nothing passed
   says so and files no issue.
