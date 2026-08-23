# The subagent background guard (issues #694, #964)

**A dispatched subagent must finish every command inside the turn that starts
it.** Nothing wakes a stopped subagent: the task-notification wake reaches only
the main session, `Monitor` does not resume one, and only an orchestrator
`SendMessage` does. So run checks in the foreground with an explicit `timeout`
(≤ 600000 ms), and split a step that would exceed 10 minutes into separate
calls. Orchestrators are untouched by all of this.

`scripts/subagent-background-guard.ts` enforces it rather than trusting the
prose — three prior wording passes did not hold (#602, #712, #694). In subagent
or undeterminable context it denies a `Bash` call with `run_in_background:
true`, a command whose own text backgrounds via a trailing `&` or `nohup … &`,
and a `Monitor` call. It **fails closed**: an unparseable payload or a crash in
the guard denies too.

Two live limits worth knowing before you conclude the guard failed:

- **The `Monitor` deny is currently unreachable.** `.claude/settings.json`
  routes `Monitor` to `scripts/deferred-tool-guard.ts`, not here, so
  `checkMonitorCall` is implemented and unit-tested but nothing invokes it for
  a real `Monitor` call (issue #964 fixed the script, not the wiring).
- **The command-text scan is not a shell parser** (#964's accepted trade-off):
  an `&` reached only through command substitution, a here-doc, or ANSI-C
  quoting can false-positive or false-negative.

Context detection, the `sh` pre-filter that keeps the hot path to one `grep`,
and the `--dry-run` CLI are all in the script; `tests/unit/subagent-background-guard.spec.ts`
exercises them.
