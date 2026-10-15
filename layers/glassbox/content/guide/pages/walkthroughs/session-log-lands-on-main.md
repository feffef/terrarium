---
title: A session log lands on main
description: How an agent session's own record of its work reaches main without a PR, from the agent's judgement to one commit built with git's plumbing commands.
revision: '8fecf8b4e1b32da82557e42f42b2045bd12a05bb'
revisionDate: '2026-10-15'
---

An agent session finishes a piece of work and writes down what happened. This Walkthrough follows that record from the agent's side: from the moment the session judges its work done, through the hooks that complete the record from the transcript, to one commit on `main` that holds nothing else. It ends where later sessions read it.

## 1. The session decides it is done

When its work reaches a coherent state, such as a PR opened or a question answered, the agent runs the `close-session` Skill. Nothing prompts it: the Skill's description tells the model when to run it, and the agent judges the moment itself. Everything after this stop runs on its own, but a session that never gets here leaves no :term[session log].

::stop-links
[Session logs and Frictions](/t/glassbox/guide/terrarium-practice/session-logs) · [Skills](/t/glassbox/guide/claude-code/skills) · :file[.agents/skills/close-session/SKILL.md]
::

## 2. The agent writes only its judgement

`close-session` calls `log-session`. The agent writes a small YAML file with the fields only it can know: its goal, a status, an outcome, a summary, the docs and Skills that mattered, and every :term[Friction]. `scripts/log-session.ts --author` checks those fields and saves them as a scratch file, `.session-logs/pending.scratch.json`, which git ignores. Nothing is committed yet. Run again later in the session, the command merges the new pass with the earlier one. It refuses to run from a linked git worktree, where a dispatched subagent shares its parent's scratch path.

::stop-links
[Session logs and Frictions](/t/glassbox/guide/terrarium-practice/session-logs) · [Subagents and worktrees](/t/glassbox/guide/claude-code/subagents-worktrees) · :file[.agents/skills/log-session/SKILL.md] · :file[scripts/log-session.ts]
::

## 3. The turn ends and a hook takes over

When Claude finishes responding, Claude Code fires the `Stop` hook wired in `.claude/settings.json`. It checks that a scratch file exists and, if so, runs `log-session.ts --land`, with the hook's payload on stdin; the payload names the session's transcript. Hooks on `SessionEnd` and on `SessionStart` at resume run the same command, in case `Stop` missed it. The lander never exits with an error, and if this exact scratch has landed already, it stops there.

::stop-links
[Hooks](/t/glassbox/guide/claude-code/hooks) · :file[.claude/settings.json] · :file[docs/adr/0009-session-logs-commit-directly-to-main.md]
::

## 4. The transcript supplies the facts

Nobody writes the rest of the log. `scripts/session-trace.ts` reads the transcript, the JSON Lines file in which Claude Code records every message and tool call, and derives the timings, models, tool counts, files read and edited, subagents, Skills used and rules loaded. Each subagent has its own transcript beside its parent's, and those are folded in. A doc read through the shell instead of the Read tool counts only when the command's output showed enough of it, which :file[scripts/shell-reads.ts] checks line by line. A Skill started as a slash command, the way a Routine starts a run, appears in the transcript as the command's expanded text rather than as a tool call, and is counted from that. The trace and the scratch are then stitched into one entry.

::stop-links
[Session logs and Frictions](/t/glassbox/guide/terrarium-practice/session-logs) · [Subagents and worktrees](/t/glassbox/guide/claude-code/subagents-worktrees) · :file[scripts/session-trace.ts] · :file[scripts/shell-reads.ts]
::

## 5. The entry is checked against main

The stitched entry must pass the session schema, and its file name is fixed: the date the session started, then its id. The lander compares the entry with the copy already on `main` at that path and does nothing if they match. It also checks the entry against `main`'s own copy of the schema, which the session's branch may have changed. An entry `main` would reject waits, and lands on the first turn that ends after the schema change merges.

::stop-links
[A schema that only grows](/t/glassbox/guide/zod/schema-only-grows) · :file[shared/schemas/session.ts] · :file[scripts/log-session.ts]
::

## 6. One file goes straight to main

A normal `git commit` takes what the session has staged, on whatever branch it is on. The lander uses git's [plumbing commands](https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain) instead, the low-level commands meant for scripts, with an index file of its own in a temporary folder. It loads `origin/main`'s tree into that index, stores the log as a blob, adds the blob at the log's path, writes the tree and makes a commit whose one parent is `main`. The working copy and the session's branch never change:

::excerpt{path="scripts/log-session.ts" lines="366-378"}
```ts
    git(['read-tree', base], { env: idxEnv, cwd }) // start from main's tree
    const blob = git(['hash-object', '-w', absPath], { cwd })
    git(['update-index', '--add', '--cacheinfo', `100644,${blob},${relPath}`], { env: idxEnv, cwd })
    const tree = git(['write-tree'], { env: idxEnv, cwd })
    // …
    const commit = git(['commit-tree', tree, '-p', base, '-m', subject, '-m', trailer], { env, cwd })
```
::

`idxEnv` sets `GIT_INDEX_FILE` to the temporary index. Before pushing, the lander diffs the new commit against `main` and refuses unless the log is the only file that changed. It pushes the commit to `refs/heads/main`. If the push fails, say because another session's log landed first, it fetches and builds the commit again on the new `main`, a few times with growing waits. Each log has its own file, so two logs never conflict. The commit message ends in the session's trailer.

::stop-links
[Every change as a PR](/t/glassbox/guide/git-github/every-change-a-pr) · [Provenance headers and commit trailers](/t/glassbox/guide/git-github/provenance-headers) · :file[scripts/log-session.ts] · :file[docs/adr/0009-session-logs-commit-directly-to-main.md]
::

## 7. Later sessions read it, and the session may log again

The log shows on the Journal's dashboard. Each run of `pnpm validate:content`, a step of the :term[Gate], checks it along with every other log. `frictions-to-fixes` groups its Frictions in the :term[Friction Ledger], `audit-skills` reads which Skills it used, and an open :term[Prune Trial] reads its Frictions as part of its verdict. If the session's work goes on, say its PR merges, it runs `close-session` again: the scratch changes, and the next `Stop` lands the new version over the old file. No other session edits it.

::stop-links
[Session logs and Frictions](/t/glassbox/guide/terrarium-practice/session-logs) · [The Gate](/t/glassbox/guide/terrarium-practice/gate) · [Prune Trials](/t/glassbox/guide/terrarium-practice/prune-trials) · [Friction Ledger](/t/journal/current/frictions) · [Journal dashboard](/t/journal/current)
::

## Where next

- [Session logs and Frictions](/t/glassbox/guide/terrarium-practice/session-logs)
- [Hooks](/t/glassbox/guide/claude-code/hooks)
- [A schema that only grows](/t/glassbox/guide/zod/schema-only-grows)
- [Provenance headers and commit trailers](/t/glassbox/guide/git-github/provenance-headers)
- [The Routines](/t/glassbox/guide/walkthroughs/routines)
