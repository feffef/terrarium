# ADR-0009: A session's own log goes straight to `main`, without a PR

Each session writes one honest log of its work, and a script commits that one
file straight to `main`, without a PR. Nothing else takes this path. The agent
writes only the judgement half; the rest comes from the session's transcript.

## Scope

- **What skips the PR.** Only a session's own log, one file in the Journal's
  current sessions folder. Everything else goes through a gated PR (ADR-0003),
  including archive moves of old logs and the landing script's own code.
- **One script holds the boundary.** `scripts/log-session.ts` alone lands a
  log. It builds the commit from `main`, so none of the session's other work
  rides along, and refuses a commit that touches another path or a log that
  fails the schema.
- **When a session logs.** At Session closure, which the agent judges itself
  through the `close-session` Skill. Opening a PR is one such point, and the
  log then says the PR is in review. When the work merges, stops or is
  blocked, the session logs again and replaces its earlier log. A session
  with no PR logs too.
- **Who writes what.** The agent writes the goal, status, outcome, summary,
  every Friction, and why the docs and Skills it names mattered. Timings,
  models, tools, files read and edited, subagents and loaded rules come from
  the transcript. A doc counts as read when a command's output showed enough
  of it. The agent may mark a read credited from a command's output "not read";
  it is then dropped and logged as a Friction, so detector errors stay visible.
- **Landed logs stay as they are.** No other session edits a log, not even to
  fix its wording.
- **The schema only grows.** No log is ever migrated, so every old log must
  stay valid. A new optional field is fine at any time. A required, renamed or
  narrower field needs a new schema version beside the old one; a log with no
  version is version 1.
- **Logs from outside agents** are marked `external`. They stay on the Timeline
  and dashboard, but Friction mining and the Skill audit skip them; only their
  ideas are used. Their authors can't push to `main`, so such a log travels in
  the contributor's PR, the one case of a log in a PR.

## Why

- A log records what only the session knew (ADR-0008), so it is worth most
  when every session logs, honestly. A PR per log is a cost that makes agents
  skip or flatten logs, and no PR fits every session: some open none, some
  several, some see theirs rejected.
- The gate stops broken builds and unsafe code. A log is schema-checked data
  that changes no code or route, so once valid it cannot break the build. The
  script that bounds the exception is itself gated.
- Agents misreport facts the transcript records exactly. Only judgement needs
  the agent.
- Nothing can prompt the agent at teardown, and teardown may have no network.
  So the agent writes its part while working, and hooks land it at the end of
  that turn, with fallbacks at teardown and resume.
- One invalid log fails the whole build, and old logs can't be rebuilt.
- An outside agent's Frictions describe tools our fixes can't reach; its ideas
  apply anywhere.

## Rejected alternatives

- **Land each log through a PR,** its own or the work's. See *Why*.
- **Land the log only at session end.** That hook can't prompt the agent,
  can't tell a pause from an end, and can fail with no network.
- **A hook that reminds or blocks until a log exists, at every pause.** It is
  runtime code the gate can't test. The one reminder we keep is narrow:
  `read-first-hint.ts` says to invoke `close-session` after a PR opens. A Skill
  whose use we measure is the cheaper bet for the rest.
- **Find shell reads by parsing the command.** Each glob, loop or `cd` needs
  a new rule.

## When to revisit

- The audit keeps finding merged PRs whose session left no log despite that
  reminder: widen the reminder hook.
- `landedBy` shows no landings by a fallback hook over a trial window: retire
  that hook.
- The landing script gets its own GitHub identity (#1689): narrow its bypass.

## Consequences

- `main`'s protection lets the owner's credential, which the script uses, push
  anything. Only the script narrows that to one file.
- A session that never reaches closure leaves no log; a missing log beats a
  partial one.

## See

- `scripts/log-session.ts` and `.claude/settings.json`: authoring, landing and
  its hooks, the filename, `landedBy`.
- `scripts/session-trace.ts`, `scripts/shell-reads.ts`: derived fields and
  shell-read thresholds.
- `shared/schemas/session.ts`: the schema, versions, `isExternalSession`.
- The `close-session` and `log-session` Skills: closure, statuses, authoring.
- `.agents/skills/digest/scripts/archive-journal-content.ts`: how many logs stay in `current`.
- `docs/agents/guest-contributions.md`: an outside agent's log.
- `docs/research/github-branch-protection-vs-autonomous-log-commits.md`:
  `main`'s ruleset.
