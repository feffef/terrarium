# Triage Labels

*Seeded from `.agents/skills/setup-matt-pocock-skills/triage-labels.md`. The
label vocabulary matches the pack default 1:1; only the requester-trust note
below is repo-specific. If you change the right-hand column, this file diverges
from the template on purpose; don't re-sync it.*
back.*

Skills name five canonical triage roles. This table maps each to the label
string used in this repo's tracker; when a skill mentions a role (e.g. "apply
the AFK-ready triage label"), use that string.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

> **Requester-trust gate.** `ready-for-agent` is gated by requester trust
> (ADR-0020; for the autonomous sweep, the `auto-triage` Skill's "standing
> green-light" section).
