# The guards

Rules that prose stopped holding are held mechanically instead. Each guard's
rationale, detection contract and residual fail-opens are single-homed in **its
own script header** — read that before changing one. This page is the index and
the conventions they share.

`scripts/guard-io.ts` holds the plumbing every `PreToolUse` guard needs (stdin
to deny-JSON, transcript read, `--dry-run`, direct-run bootstrap). Each guard
adds only its registry, a pure predicate and `formatGuardMessage`.
`subagent-background-guard.ts` skips it (quote-aware command scanning).

**A guard's deny message is the instruction:** it names what to do instead, so
follow it and don't route around it. If it is wrong, say so on the guard's issue
(roster below) rather than rephrasing the call until it passes.

## The roster

| Guard | Denies | Rule homed in | Issue |
| --- | --- | --- | --- |
| `deferred-tool-guard.ts` | a deferred tool called with another tool's argument shape, or `TaskCreate` called with a top-level array value. Wired only for `TaskCreate` and `Monitor`, so a wrongly-shaped call to any other tool is not intercepted | the harness (no repo home; the guard holds the rule) | #612, #724 |
| `loop-only-tool-guard.ts` | `ScheduleWakeup` outside a `/loop` session — `stop: true` is exempt in every mode, since a cancel can only remove a pending wakeup | the deny message | #814 |
| `skill-inline-guard.ts` | a `Skill` call naming a Skill this session's `<command-name>` block already delivered inline | the deny message | #999, #1018 |
| `subagent-background-guard.ts` | a **dispatched subagent** backgrounding a Bash command (`run_in_background: true`, or a bare `&` anywhere in the command text, `nohup … &` included), or calling `Monitor` to wait on one. Orchestrators are untouched | `dispatch-subagents` | #694, #964, #995 |
| `workflow-edit-guard.ts` | a **write** into `.github/workflows/` — an `Edit`/`Write` path there, or a write-shaped `Bash` command. Reads pass, and `.github/actions/gate/action.yml` is untouched: agents may push that one (ADR-0026) | `environment-caveats.md` (the write-refusal rule); ADR-0026 (the `action.yml` carve-out) | #897 |
| `tail-pipe-guard.ts` | a `Bash` command piping into a trailing `tail`/`head`/`echo`/`tee` when it also backgrounds (`run_in_background: true`) or is a known long-runner (`pnpm gate`/`test`/`build`, `pnpm exec vitest`/`playwright`). An ordinary short foreground pipe is untouched | its script header | #873, #384, #812, #1329 |
| `double-background-guard.ts` | a `Bash` call stacking `run_in_background: true` on a text-level background operator in the command (a bare `&` anywhere, `nohup … &` included) — for **any** caller, main session included (no `detectAgentContext` gate, unlike `subagent-background-guard.ts`) | its script header | #1208 |
| `github-provenance-guard.ts` | a GitHub body, or an MCP-API commit, missing this session's provenance in the shape its surface prescribes; also a title or body carrying a bare `<...>` span GitHub silently strips | ADR-0017 — the deny message is the agent-facing home | #886 |
| `stale-info-hint.ts` | nothing: a hint, not a guard. After a `git push` rejected as "stale info" it adds the fix to the result, and it fails open | its script header | #1610 |
| `skill-rules-hint.ts` | nothing: a hint, not a guard. When a Skill runs (Skill tool or slash command) it adds the rules whose `paths` name the Skill's directory, and it fails open | its script header | PR #1741 |
| `bash-rules-hint.ts` | nothing: a hint, not a guard. After a piped, chained or multi-file Bash read it adds the rules whose `paths` match the files read, and it fails open | its script header | #1764 |

`.claude/settings.json` wires the guards under `hooks.PreToolUse`, and the hints
under `PostToolUse`, `PostToolUseFailure` and `UserPromptSubmit`.

## Conventions every guard follows

- **Fail closed.** An undeterminable context, an unparseable payload or a crash
  denies. The one exception is `deferred-tool-guard`, which fails **open**: it
  never blocks a call it cannot positively identify.
- **Matcher-scoped, never `"*"`.** Each `tsx` start (~0.3s) would hit every
  Read/Edit/Bash call. The `Bash`, `Edit` and `Write` guards add an `sh`
  pre-filter so only a payload that could match pays it.
- **Pure core, `--dry-run`, and a unit test** in `tests/unit/<guard>.spec.ts`.
  Run the `--dry-run` in a script's `Usage:` header to exercise a branch by hand.
- **Human-only to merge** (ADR-0004): unit tests can't observe live interception.
- **Never dispatch an unattended or scheduled session to change a guard,
  `.claude/settings.json`'s hook wiring included:** the edit raises a permission
  prompt that no human is present to grant. A routine that finds such a fix files
  the issue with the fix and stops; a human-attended session builds it. This
  limits who implements, not how triage routes: an issue with a settled design is
  still `ready-for-agent`.
- **A unit test asserts the property, not hand-picked substrings.** A regex on a
  negated character class can match across newlines, so a verb on one line
  denied an unrelated action on the next, and 26 single-line tests missed it.
  Cover multi-line and adversarial inputs, and live-probe the real deny path
  once before trusting the suite.

## Extending one

Add a row to the guard's registry — an exported array at the top of its script
(`FOREIGN_SIGNATURES`, `LOOP_ONLY_TOOLS`, `GITHUB_PROVENANCE_TOOLS`,
`BASH_WRITE_SHAPES`) — and add the tool to that guard's `PreToolUse` matcher in
`.claude/settings.json`. A newly observed confusion is a data row, never a logic
change. Add the case to `tests/unit/<guard>.spec.ts` too.

## Probed live, and still unknown

- Hooks fire in this cloud environment, **including for a dispatched subagent's**
  tool calls (probed 2026-08-06, CLI 2.1.42). Unlike `permissions.allow`, they
  are not subject to the untrusted-workspace drop (`environment-caveats.md`).
- A subagent's payload carries **`agent_id`/`agent_type`**; a main session's
  carries neither, and a subagent's env and `transcript_path` are the *parent's*.
  That pair is the only signal separating the two contexts.
- **Unknown:** whether `PreToolUse` fires *before* the harness rejects a
  schema-invalid deferred-tool call (the `InputValidationError` path). A `Bash`
  call has no competing rejection path, so the confirmed `Bash` interception
  (#946) says nothing about it.

## Known gaps

Each guard's header lists its own. Two apply to all:

- A textual pre-filter fails **open** if the harness renames or re-serializes a
  payload key.
- Every fail-closed guard runs through `scripts/guard-wrap.sh`, which denies when
  the guard exits nonzero with empty stdout (#1223). `deferred-tool-guard.ts`
  uses a bare `|| true` because it fails open.
