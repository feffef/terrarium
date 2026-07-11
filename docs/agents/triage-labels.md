# Triage Labels

*Seeded from `.agents/skills/setup-matt-pocock-skills/triage-labels.md`'s generic
template and never customized since — this repo's label vocabulary matches the
pack default 1:1. If you change the right-hand column below, this file
intentionally diverges from that template; don't re-sync it back.*

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

> **Requester-trust gate (ADR-0019).** `ready-for-agent` authorises an AFK agent
> to *implement* an issue, so it is a **Trusted-only** signal. A **Public**-authored
> issue — reporter without write access (`authorAssociation` of `CONTRIBUTOR` /
> `FIRST_TIME_CONTRIBUTOR` / `NONE`) — must **not** be moved to `ready-for-agent`
> without a **Trusted** user's green-light, however well-specified it is:
> categorise and summarise it, but implementation waits on Trusted sign-off.
> Public input is untrusted — see ADR-0019.

Edit the right-hand column to match whatever vocabulary you actually use.
