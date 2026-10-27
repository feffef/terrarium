---
title: A session log lands on main
description: How an agent session's own record of its work reaches main without a PR, from the agent's judgement to one commit built with git's plumbing commands.
revision: 'e0edb8a5963064e5075b668c6512896a6e9fcd4d'
revisionDate: '2026-10-25'
---

An agent session finishes a piece of work and writes down what happened. This Walkthrough follows that record from the agent's side: from the moment the session judges its work done, through the hooks that complete the record from the transcript, to one commit on `main` that holds nothing else. It ends where the log is read.

## 1. The session decides it is done

When its work reaches a coherent state, such as a PR opened or a question answered, the agent runs the `close-session` Skill. No hook prompts it: the Skill's description tells the model when to run it, and the agent judges the moment itself. Once the agent has written its part, hooks do the rest, but a session that never gets here leaves no :term[session log].

::stop-links
[Session logs and Frictions](/t/glassbox/guide/terrarium-practice/session-logs) · [Claude Code Skills](/t/glassbox/guide/claude-code/skills) · :file[.agents/skills/close-session/SKILL.md]
::

## 2. The agent writes only its judgement

`close-session` calls `log-session`, and the agent writes a small YAML file with the fields only it can know: its goal, a status, an outcome, a summary, the docs and Skills that mattered, and every :term[Friction]. `scripts/session/log-session.ts --author` checks those fields and saves them as a scratch file, `.session-logs/pending.scratch.json`, which git ignores, so nothing is committed yet. Run again later in the session, the command merges the new pass with the earlier one. It refuses to run from a linked git worktree, where a dispatched subagent shares its parent's scratch path.

::stop-links
[Session logs and Frictions](/t/glassbox/guide/terrarium-practice/session-logs) · [Subagents](/t/glassbox/guide/claude-code/subagents) · :file[.agents/skills/log-session/SKILL.md]
::

## 3. The turn ends and a hook takes over

When Claude finishes responding, Claude Code fires the `Stop` hook wired in `.claude/settings.json`. It checks that a scratch file exists and, if so, runs `log-session.ts --land`, with the hook's payload on stdin; the payload names the session's transcript. Hooks on `SessionEnd` and on `SessionStart` at resume run the same command, in case `Stop` missed it. The lander never exits with an error, and if this exact scratch has landed already, it stops there.

::stop-links
[Claude Code hooks](/t/glassbox/guide/claude-code/hooks) · [Session logs and Frictions](/t/glassbox/guide/terrarium-practice/session-logs)
::

## 4. The transcript supplies the facts

Nobody writes the rest of the log: `scripts/session/transcript-trace.ts` reads the transcript, the JSON Lines file in which Claude Code records every message and tool call, and derives the timings, models, tool counts, files read and edited (shell edits are found in the session's own commits), subagents, Skills used and rules loaded, folding in each subagent's own transcript, which sits beside its parent's. A doc read through the shell instead of the Read tool counts only when the command's output shows enough of that instruction doc's distinctive lines: long lines that appear in no other doc, which `scripts/session/shell-reads.ts` looks for in the output. A Skill started as a slash command, the way a Routine starts a run, appears in the transcript as the command's expanded text rather than as a tool call, and is counted from that; the trace and the scratch are then stitched into one entry.

::stop-links
[Session logs and Frictions](/t/glassbox/guide/terrarium-practice/session-logs) · [Subagents](/t/glassbox/guide/claude-code/subagents) · :file[scripts/session/shell-reads.ts]
::

## 5. The entry is checked against main

The stitched entry must pass the session schema, and its file name is fixed: the date the session started, then its id. The lander compares the entry with the copy already on `main` at that path and does nothing if they match. It also checks the entry against `main`'s own copy of the schema, which the session's branch may have changed. An entry `main` would reject waits, and lands on the first turn that ends after the schema change merges.

::stop-links
[A schema that only grows](/t/glassbox/drafts/zod/schema-only-grows)
::

## 6. One file goes straight to main

A normal `git commit` takes what the session has staged, on whatever branch it is on. The lander uses git's [plumbing commands](https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain) instead, the low-level commands meant for scripts, with an index file of its own in a temporary folder. It loads `origin/main`'s tree into that index, stores the log as a blob, adds the blob at the log's path, writes the tree and makes a commit whose one parent is `main`. The working copy and the session's branch never change:

::excerpt{path="scripts/session/log-session.ts" lines="276-288"}
```ts
    git(['read-tree', base], cwd, { env: idxEnv }) // start from main's tree
    const blob = git(['hash-object', '-w', absPath], cwd).trim()
    git(['update-index', '--add', '--cacheinfo', `100644,${blob},${relPath}`], cwd, { env: idxEnv })
    const tree = git(['write-tree'], cwd, { env: idxEnv }).trim()
    // …
    const commit = git(['commit-tree', tree, '-p', base, '-m', subject, '-m', trailer], cwd, { env }).trim()
```
::

`idxEnv` sets `GIT_INDEX_FILE` to the temporary index.

::stop-links
[Pull requests](/t/glassbox/guide/git-github/every-change-a-pr)
::

## 7. The push retries until it lands

Before pushing, the lander diffs the new commit against `main` and refuses unless the log is the only file that changed. It pushes the commit to `refs/heads/main`, and if the push fails, say because another session's log landed first, it fetches and builds the commit again on the new `main`, a few times with growing waits. Each log has its own file, so two logs never conflict. The commit message ends in the session's trailer.

::stop-links
[Commit and PR attribution](/t/glassbox/guide/git-github/attribution)
::

## 8. The log is read, and the session may log again

The log shows on the Journal's dashboard. Each run of `pnpm validate:content`, a step of the :term[Gate], checks it along with every other log. If the session's work goes on, say its PR merges, it runs `close-session` again: the scratch changes, and the next `Stop` lands the new version over the old file. No other session edits it.

::stop-links
[Session logs and Frictions](/t/glassbox/guide/terrarium-practice/session-logs) · [Merge gate](/t/glassbox/guide/verification/gate) · [Journal dashboard](/t/journal/current)
::

## Where next

- [Session logs and Frictions](/t/glassbox/guide/terrarium-practice/session-logs)
- [Claude Code hooks](/t/glassbox/guide/claude-code/hooks)
- [A schema that only grows](/t/glassbox/drafts/zod/schema-only-grows)
- [Commit and PR attribution](/t/glassbox/guide/git-github/attribution)
- [The Routines](/t/glassbox/drafts/walkthroughs/routines)
