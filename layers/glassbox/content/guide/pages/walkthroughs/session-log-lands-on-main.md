---
title: A session log lands on main
description: How an agent session's record of its work reaches the main branch without a pull request, in one commit built by low-level Git.
teaches: "Story: a session log reaching main without a PR, from the agent's side. Start: the agent runs close-session. End: the Journal's dashboard; pnpm validate:content checks it. Code: log-session, log-session.ts --author and --land, pending.scratch.json, Stop, SessionEnd, SessionStart hooks, transcript-trace.ts, main's schema, top-level fields it lacks dropped and named, the full log re-landed once it merges, other rejections held back; read-tree, commit-tree, push to refs/heads/main, retried. No A real case."
revision: '7ae232ae79144439d1b30cb974e9e14f7ae6163c'
revisionDate: '2026-11-12'
publishedAt: '2026-11-11T13:59:11Z'
---

An agent session finishes a piece of work and writes down what happened. This Walkthrough follows that record from the agent's side: from the moment the session judges its work done, through the hooks that complete the record from the transcript, to one commit on `main` that holds nothing else. It ends where the log is read.

## 1. The session decides it is done

When its work reaches a coherent state, such as a PR opened or a question answered, the agent runs the `close-session` skill. The agent judges the moment itself, from the skill's description; a hint after it opens or merges a PR reminds it, unless it has already run the skill since. Once the agent has written its part, hooks do the rest, but a session that never gets here leaves no :term[session log].

::lessons
[Session logs](/t/glassbox/guide/terrarium-practice/session-logs) · [Claude Code skills](/t/glassbox/guide/claude-code/skills) · [Hook-added context](/t/glassbox/guide/hooks/hook-added-context)
::

## 2. The agent writes only its judgement

`close-session` calls `log-session`, and the agent writes a small YAML file with the fields only it can know: its goal, a status, an outcome, a summary, the rules that steered or backed its work and the docs that helped, and every :term[friction]. `scripts/session/log-session.ts --author` checks and saves them to `.session-logs/pending.scratch.json`, a scratch file git ignores. It refuses to run from a linked git worktree, a second working folder of one repository, where a subagent shares its parent's scratch path.

::lessons
[Session logs](/t/glassbox/guide/terrarium-practice/session-logs) · [Git worktrees](/t/glassbox/guide/git-github/git-worktrees) · [Subagents](/t/glassbox/guide/agents/subagents)
::

## 3. The turn ends and a hook takes over

When Claude finishes responding, Claude Code fires the `Stop` hook wired in `.claude/settings.json`. It checks that a scratch file exists and, if so, runs `log-session.ts --land`, with the hook's payload on stdin; the payload names the session's transcript. Hooks on `SessionEnd` and on `SessionStart` at resume also run `--land`, in case `Stop` missed it. The lander never exits with an error, and if this exact scratch has landed in full already, it stops there.

::lessons
[Claude Code hooks](/t/glassbox/guide/hooks/hooks) · [Session logs](/t/glassbox/guide/terrarium-practice/session-logs)
::

## 4. The transcript supplies the facts

Nobody writes the rest of the log: `scripts/session/transcript-trace.ts` reads the transcript, Claude Code's record of every message and tool call, and each subagent's own transcript beside it. It derives the timings, models, tool counts, files read and edited, subagents, skills used and rules loaded; shell edits come from the session's own commits. A doc read through the shell counts only when the output shows enough of its distinctive lines. The trace and the scratch are then stitched into one entry.

::lessons
[Session logs](/t/glassbox/guide/terrarium-practice/session-logs) · [Subagents](/t/glassbox/guide/agents/subagents)
::

## 5. The entry is checked against main

The stitched entry must pass the session schema, and its file name is fixed: the session's start date, then its id. The lander does nothing if `main` already holds the same entry at that path. It also checks the entry against `main`'s copy of the schema, which the branch may have changed. Top-level fields `main` doesn't know yet are dropped and named, and land once the schema change merges; any other rejection holds the whole entry back.

::lessons
[Schema evolution](/t/glassbox/guide/verification/schema-evolution)
::

## 6. One file goes straight to main

Instead of `git commit`, which commits what is staged on the current branch, the lander uses git's plumbing, low-level commands meant for scripts, on a temporary index. The session's working copy and branch never change.

::excerpt{path="scripts/session/log-session.ts" lines="282-294"}
```ts
    git(['read-tree', base], cwd, { env: idxEnv }) // start from main's tree
    const blob = git(['hash-object', '-w', absPath], cwd).trim()
    git(['update-index', '--add', '--cacheinfo', `100644,${blob},${relPath}`], cwd, { env: idxEnv })
    const tree = git(['write-tree'], cwd, { env: idxEnv }).trim()
    // …
    const commit = git(['commit-tree', tree, '-p', base, '-m', subject, '-m', trailer], cwd, { env }).trim()
```
::

::lessons
[Git plumbing](/t/glassbox/guide/git-github/git-plumbing) · [Pull requests](/t/glassbox/guide/git-github/pull-requests)
::

## 7. The push retries until it lands

Before pushing, the lander diffs the new commit against `main` and refuses unless the log is the only file that changed. It pushes the commit to `refs/heads/main`, and if the push fails, say because another session's log landed first, it fetches and builds the commit again on the new `main`, a few times with growing waits. Each log has its own file, so two logs never conflict. The commit's message ends in a trailer naming the model and the session.

::lessons
[Commit and PR attribution](/t/glassbox/guide/git-github/attribution)
::

## 8. The log is read, and the session may log again

The log shows on the Journal's dashboard. Each run of `pnpm validate:content`, a step of the :term[gate], checks it along with every other log. If the session's work goes on, say its PR merges, it runs `close-session` again: the scratch changes, and the next `Stop` lands the new version over the old file. No other session edits it.

::lessons
[Session logs](/t/glassbox/guide/terrarium-practice/session-logs) · [Merge gate](/t/glassbox/guide/verification/gate)
::

## Where next

- [Session logs](/t/glassbox/guide/terrarium-practice/session-logs)
- [Claude Code hooks](/t/glassbox/guide/hooks/hooks)
- [Schema evolution](/t/glassbox/guide/verification/schema-evolution)
- [Commit and PR attribution](/t/glassbox/guide/git-github/attribution)
- [](/t/glassbox/guide/git-github/git-plumbing)
