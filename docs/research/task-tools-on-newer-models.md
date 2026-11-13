# Task-list tools (TaskCreate/Get/List/Update, TodoWrite) on newer Claude models

Is it expected that newer models (Sonnet 5.5, Opus 5.5) never call Claude Code's
task-list tools? Answered 2026-11-13 from Anthropic's docs and the Claude Code
changelog, then checked against this repo's session logs. **Status: reference;
decides nothing.**

How to read the sources: doc pages were read through a summarising fetch tool, so
they are paraphrased and carry their URL. Changelog lines are quoted from the raw
file. Counts are from `layers/journal/content/*/sessions/*.yml` (a session's model
is the one with the most messages; `cliVersion` is the log's own field).

## Summary

- **Expected: yes.** Claude Code leaves the Task tools out on newer models by
  design, so zero use on `claude-sonnet-5-5` is the intended outcome.
- Default-on models are Opus 4.7, Sonnet 4.6, Haiku 4.5 and earlier (since
  Claude Code v2.1.268). Opt-in: `CLAUDE_CODE_ENABLE_TODO_TOOLS=1`,
  `--allowedTools TaskCreate`, or `--tools`.
- Stated reason: newer models track multi-step work without a written checklist,
  and the tool definitions and reminders cost context.
- **Not explained by the docs:** `claude-sonnet-5` sessions on CLI >= 2.1.233
  still used the tools (50 of 296; see Local data). Why is unknown.

## Docs (paraphrased)

- Tools are on by default only for Opus 4.7, Sonnet 4.6, Haiku 4.5 and earlier;
  unrecognised model IDs are off too. https://code.claude.com/docs/en/tools-reference ("Task tool availability")
- Reason: "On newer models, Claude keeps track of multi-step work without a
  written checklist, and the tools' definitions and reminders take up context."
  Same page.
- `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` turns them on for every model (v2.1.233+).
  `CLAUDE_CODE_ENABLE_TASKS` only chooses Task tools or legacy TodoWrite where
  they are available. https://code.claude.com/docs/en/env-vars
- Background and cloud sessions are said to provide the same tools on every
  model. Same tools-reference page. (This session's logs do not show it: see below.)
- Agent SDK: newer models need no todo list; opt in only for a progress UI or
  logging. https://code.claude.com/docs/en/agent-sdk/todo-tracking

## Changelog (quoted) https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md

- 2.1.233: "Todo/task-tracking tools (TaskCreate/Get/Update/List, TodoWrite) are
  no longer available on Opus 4.8, Sonnet 5, Fable 5, Mythos 5, and newer
  models; set `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` to bring them back"
- 2.1.268: "Changed the task-tracking tools ... to be offered only on Claude 3.x,
  Opus 4.0–4.7, Sonnet 4.0–4.6, Haiku 4.5; set `CLAUDE_CODE_ENABLE_TODO_TOOLS=1`
  elsewhere"
- 2.1.169: TaskCreate input repair and schema in validation errors for unloaded
  tools (context for `scripts/hooks/deferred-tool-guard.ts`).

## Local data (sessions that called TaskCreate / sessions)

| Model | CLI < 2.1.233 | 2.1.233–267 | >= 2.1.268 |
|---|---|---|---|
| `claude-sonnet-5` | 83 / 267 | 27 / 159 | 23 / 137 |
| `claude-opus-4-8` | 13 / 93 | - | - |
| `claude-fable-5` | 3 / 15 | - | - |
| `claude-opus-5-5` | - | - | 3 / 268 |
| `claude-sonnet-5-5` | - | - | 0 / 499 |

Sessions with no `cliVersion` (37) are left out.

- Use before v2.1.233 matches the changelog: the tools were on for those models.
- `claude-sonnet-5` kept using them after the removal (50 of 296 sessions). Not
  explained by anything found; the changelog says they were removed on Sonnet 5.
- Sonnet 5.5 and Opus 5.5 behave as documented (0 and 3 sessions).

## Not found

- No doc saying the tools are "deferred" behind ToolSearch; the docs say "left
  out". This session lists them as deferred tools, which may be a separate mechanism.
- No Anthropic prompting guidance on newer models and todo tools beyond the two
  doc sentences above; platform.claude.com and anthropic.com posts were not searched.
- Whether a CLAUDE.md line ("track multi-step work with TaskCreate") makes a model
  use them once offered: inferred from the SDK page, untested.
- Why `claude-sonnet-5` sessions used them after v2.1.233.
