# CLAUDE.md

Terrarium is a platform that agents build and improve; humans review and merge.

**Keep it short.** Write the least code and the fewest words that stay exact.
In instructions, state the goal; list steps only where a mistake is costly or
can't be undone. If a problem comes from one of our own instructions, cut or
simplify that instruction before you add a new one (ADR-0027).

## Docs you must read first

These are not optional. When a trigger applies, read the doc in full before you
act, once per session.

- **At session start:** `GLOSSARY-MAP.md`, then `GLOSSARY.md`. They define the
  words we use (Platform, Tenant, Space, Collection, Document, Skill, …). When
  you name a concept the glossary defines, use its term, not a synonym.
  Otherwise prefer plain, common words.
- **ADRs arrive as rules.** Each ADR's summary is a rule in `.claude/rules/`:
  the cross-cutting ones load at session start, the rest when you read or edit
  a file they govern or run a Skill they name. When a summary says so, read the
  full ADR before you act.
  Before you plan or recommend a change (an opinion asked in chat counts), find
  the ADRs that bind it with `grep -l <path-or-term> docs/adr/*` and read
  them.
- **Before your first git command** beyond `status` and `diff` (commit, fetch,
  pull, rebase, amend, reset, or `log`/`blame` to draw a conclusion):
  `docs/agents/git-conventions.md`.
- **Before your first GitHub operation** (`mcp__github__*` tool or `gh`):
  `docs/agents/github-integration.md`.
- **Before you push a branch, or open, update or merge a PR:**
  `docs/agents/pr-workflow.md`.
- **Before you file, triage or label an issue:** `docs/agents/issue-tracker.md`
  and `docs/agents/triage-labels.md`.
- **Before you act on an issue or PR from someone without write access, or
  from an outside agent:** `docs/agents/guest-contributions.md`.
- **Before you dispatch a subagent** that touches git or needs a worktree: the
  `dispatch-subagents` Skill.
- **Every subagent brief** asks it to return, in its final reply, a verdict
  (path, why it loaded or was read, useful yes/partly/no) on each rule and doc
  it loaded or read, and to keep scratch files in a scratchpad subfolder named
  for itself (subagents share one scratchpad).
- **Before you say a UI change works,** or take a screenshot:
  `docs/agents/verifying-ui-changes.md`.
- **Before you add or change a glossary term:** `docs/agents/domain.md`.
- **Before you debug a tool, push, network or permission error** that your
  diff doesn't explain: `docs/agents/environment-caveats.md`.

## Working conventions

- **Empty task prompt** (only a title arrived)? Stop and ask. Never guess the
  task from the branch name or past commits.
- **Stay on the branch your session started on.** If that is `main`, fetch
  `origin main` and cut a new branch first.
- **Invoke `close-session`** when you open a PR, and when a session only answers a question.
- **Merge your own PR** with `scripts/github/merge-pr.ts <number>` once ADR-0004 allows it.
- **Verify before you state.** Only call something settled (an id, a count, a
  cause, another session's claim) if you checked it this turn against the
  source. A count is a fact only after you read every item.
- **Question the premise.** Before you recommend, implement or harden a change,
  give each part a reason of your own from the current goal; drop the parts you
  can't, and add nothing beyond the ask.
- **Ask before building** something the Trusted user will see (the `grilling`
  Skill); don't assume. Data shapes: `.claude/rules/data-shapes.md`.
- **One home per fact.** Write each fact once; elsewhere, point to it. When a
  fact and reality differ, fix its home.
- **Code comments say WHY, never WHAT.** Default to no comment. When the why
  isn't obvious, point to the doc that holds it (an ADR, an issue).

## Repo layout

`app/`, `modules/` and `nuxt.config.ts` follow Nuxt's own layout. The parts
that are ours:

```
layers/<tenant>/          one Tenant: tenant.config.ts (its manifest — edit this),
                          content/<space>/<collection>/, GLOSSARY.md, tests/
shared/                   manifest types, expansion, routing (mostly Human-only: ADR-0004)
docs/adr/                 decisions
.claude/rules/            rules (ADR summaries, the human-merge list), loaded at
                          session start or when you touch a file or run a Skill they govern
docs/agents/              how-to docs for agents
docs/research/            dated reference notes
.agents/skills/           our Skills (.claude/skills/ links here)
.claude/workflows/        workflow scripts, each its Skill's code (ADR-0005)
scripts/                  repo tooling by area: gate/ (the gate and its checks), hooks/ (tool-call
                          guards and hints), session/ (session logs, Skill audit), github/, git/, ui/, lib/ (shared)
tests/                    Platform tests; each Tenant keeps its own in its layer
```

## Self-verification

- **Give any command that can take over 2 minutes** (the gate, a build, e2e) a
  `timeout` that outlasts it or `run_in_background: true` (a dispatched subagent
  can't background: `dispatch-subagents` §3); redirect output to a file.
- **Never use `pkill`,** and never chain a kill with `&&` or `;` (the commands
  after it can silently not run). Stop a preview or dev server with
  `scripts/ui/preview.ts stop <pid>`.
