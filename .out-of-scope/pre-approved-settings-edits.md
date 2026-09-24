# Pre-approved `.claude/settings.json` edits

Agents do not get a standing permission to edit `.claude/settings.json`: the
permission prompt on that file stays.

## Why this is out of scope

The idea came from an unattended run whose subagent stalled for hours on the
prompt while wiring a guard. Pre-approving the edit looks like the fix, but:

- **It would not help where the stall happened.** A cloud session drops the
  whole `permissions.allow` array (`docs/agents/environment-caveats.md`,
  issue #288), and scheduled runs are cloud sessions.
- **It would let an agent disarm its own guards.** `settings.json` wires the
  `PreToolUse` guards. An agent free to edit it can switch them off before any
  human looks, so the prompt is a real safety check, not just friction.
- **The stall is prevented another way.** Unattended sessions are not sent to
  change guards at all (`docs/agents/guards.md`), and the prompt-stall itself is
  a documented caveat.

## Prior requests

- #1215 — "Dispatched subagent silently stalls indefinitely on an unapproved
  permission prompt" (part 2)
