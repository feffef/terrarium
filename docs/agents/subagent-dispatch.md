# Subagent dispatch-brief conventions

Three recurring dispatch-brief gaps, each hit by a distinct session before
this doc existed. General dispatch-brief hygiene that applies to any
subagent (worktree-isolated or not) — not specific to PRs, so it lives here
rather than in `pr-workflow.md`.

## Bank progress before continuing

A long-running subagent's brief should instruct it to persist each
iteration's artifacts to disk before starting the next step. A transient API
failure mid-run (e.g. a 500) can kill the subagent with no warning; without
banked progress, that loses everything the subagent produced up to that
point, not just the in-flight step.

## Pin an explicit SHA, don't resolve a shared moving ref

When dispatching multiple concurrent subagents into **one shared checkout**
(not an `isolation: 'worktree'` dispatch — see CLAUDE.md's "Three distinct
worktree-isolation mechanisms" for that split), never have them independently
resolve `FETCH_HEAD`/`HEAD`. A sibling's fetch can move the shared ref out
from under another subagent mid-run — silently, since each subagent still
gets *a* valid answer, just against the wrong commit (once, an entirely
different PR's head). Pin and pass each subagent the exact SHA it should
operate against instead.

## Front-load grounding data

An ideation/exploration dispatch brief should include basic corpus
statistics (counts, kinds, grades — whatever the domain's cheap grep-able
facts are) up front, rather than let the subagent spend effort discovering
constraints a single query would have surfaced first. A subagent that
develops a flagship idea the data already rules out is effort spent
re-deriving what the dispatcher already had cheap access to.
