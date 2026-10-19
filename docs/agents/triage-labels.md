# Triage Labels

*Seeded from `.agents/skills/setup-matt-pocock-skills/triage-labels.md`. The
labels match the pack default 1:1; only the requester-trust note below is
repo-specific. A changed right-hand column is a deliberate divergence: don't
re-sync it.*

Skills name five canonical triage roles. This table maps each to the label
string used in this repo's tracker; when a skill mentions a role (e.g. "apply
the AFK-ready triage label"), use that string.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Needs a person: a judgment call, a decision or a human merge |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

> **Who sets the state.** Only triage sets `ready-for-agent` and
> `ready-for-human`: `triage`, `auto-triage`, `clear-backlog` and the guest
> pipeline. Every other Skill files its issues `needs-triage`, however settled
> they look, except a spec on hold, which carries no label (`issue-tracker.md`,
> Specs). When it adds a significant fact the thread lacks to an existing
> issue, it may set `needs-triage` so the next `clear-backlog` run picks it up.

> **Requester-trust gate.** A Public issue reaches `ready-for-agent` only
> after a Trusted user approves it (ADR-0020), except in the guest pipeline
> (ADR-0023). What the `auto-triage` sweep may label: ADR-0022.
