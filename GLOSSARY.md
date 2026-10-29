# Glossary — Platform

> The terms every agent needs whatever the task (ADR-0021). Tenants and their
> glossaries: [`GLOSSARY-MAP.md`](./GLOSSARY-MAP.md).

## Glossary

### Platform
The single Nuxt Content codebase, repository and deployable container that hosts
every Tenant and every Space. There is exactly one. (The metaphor is commercial
real estate: the Platform is the building, Tenants lease it, and each uses
several Spaces.)

### Tenant
A distinct product/site within the Platform, with its own components (its
"fit-out") and content model; that code is what sets it apart from a Space.
Tenants are isolated from each other (ADR-0025). "Multi-tenant" means this
architecture, not paying customers. A Tenant is implemented as a
Nuxt layer: say "Tenant" for the domain concept and "layer" only for the Nuxt
mechanism.

### Space
An isolated content variant within a Tenant. Spaces of one Tenant share its
components and content model but none of its content data. Each Tenant names
its own Spaces (the Journal: `current` and `archived`; a website might use
`prod`, `uat` and `dev`).

### Collection
The structure of one type of content within a Space (e.g. `blog`, `pages`).
Each Tenant × Space × Collection becomes its own collection, built from the
Tenant's manifest (ADR-0002, ADR-0013).

### Document
One content entry within a Collection: one row or file.

### Collection kind
A named, shared shape a Collection may opt into so other Tenants can read it
through the **Catalog**. Its contract is a minimum, merged with the Collection's
own schema. A Collection with no kind stays hidden from other Tenants
(ADR-0025).

### Session
One continuous Claude Code working session against the Platform, identified by
its Claude session id. At **Session closure** it authors a **session log**: a
Journal record of its goal, how far it got, what it read, which Skills it used,
every **Friction** it hit, and optionally its **learnings** (knowledge it
inferred rather than read) and **ideas** (see Idea). A session log is ground
truth, not a projection of repo state (ADR-0008). It records the Session's
**kind**; `log-session` defines the values.

### Idea
An optional note in a session log: an ambitious, concrete proposal for the
Platform's or a Tenant's future, specific enough to become an issue. Noted, not
planned.

### Session closure
The point where a Session's work is complete and in a coherent, honest state:
the trigger for its session log. Not the same as merged; the Session judges it
itself. Always say "Session closure", never bare "closure" (a lexical closure in
JS/TS).

### Friction
One recorded pain-point within a Session: something that went wrong, was
needlessly complex, or wasted effort or tokens. It has a description, a possible
solution and a severity (grading: `log-session`).

### Friction Ledger
An **Inventory** of Friction clusters: one entry per root cause, with each
occurrence by Session and each PR meant to fix it. `frictions-to-fixes`
maintains it.

### Skill
A Claude Code skill that encodes a repeatable capability for developing the
Platform.

### Skill Inventory
An **Inventory** of the Skills in use, each with its **role** and
**importance**, kept current by `audit-skills`. An Inventory is a derived,
current-state readout refreshed in place, not appended to.

### Importance (of a Skill)
How essential a Skill is when its kind of work comes up, never how often it
runs. The grades are defined in `audit-skills` (ADR-0015).

### Role (of a Skill)
A Skill Inventory entry's plain-prose account of what the Skill is for on this
Platform.

### Workflow
A saved Claude Code workflow script: a fixed sequence of agent steps a **Skill**
runs so they can't be skipped or reordered (ADR-0005). Not the GitHub Actions
workflow that runs the **Gate**.

### Routine
A scheduled trigger, set up outside the repo, that runs one **Skill**. The Skill
holds what the run does; the Routine holds only when (ADR-0005).

### Agent Authorship
The invariant that agents author essentially all content and code; **Trusted**
users converse, direct and review (ADR-0003). **Public** users only report
(ADR-0020).

### Observability
The invariant that the Platform is built to be watched. Every change except a session log lands as a
commit in a gated PR, and every **Session** authors a **session log** with its
**Frictions**. The **Friction Ledger** and **Skill Inventory** read those logs
back to steer self-improvement, and the **Journal** publishes them. The
**Blog** and its **Personas** retell the same activity in plain language.

### Self-improvement loop
How the Platform fixes itself, semi-autonomously. Each **Session** logs its
**Frictions**; **Routines** run `frictions-to-fixes` (into the **Friction
Ledger**, then fix PRs), `audit-skills` (into the **Skill Inventory**) and
`audit-docs` (doc fixes). What they can't fix themselves they file as
`needs-triage` issues, which the owner's `clear-backlog` run takes up. Every PR
still clears the **Gate**, and a human decides what ADR-0004 reserves.

### Catalog
The build-time projection of every Collection that opted into a **Collection
kind**, grouped by kind: the read primitive across Tenants (ADR-0025).

### Aggregator
A view whose job is to read across Tenants (a search, an activity feed). It
reads the **Catalog** and writes nothing; dedicated ones are Spaces of the
Commons Tenant (ADR-0025).

### Trusted
A user with write access to the repository. May direct agents, approve new work
(ADR-0003) and merge what ADR-0004 reserves for a human. Opposite: **Public**.

### Public
A user without write access: can open issues and fork PRs, but not direct
agents, approve work or merge (ADR-0020).

### Gate
The objective bar every change must clear before it lands (ADR-0004), run
locally and in CI; CI's run decides the merge. Its steps form two tiers,
**Floor** and **Heavy**.

### Floor
The **Gate** tier that always runs, whatever changed.

### Heavy
The costly **Gate** tier, skipped when every changed path is **Inert**; a
change of only **Inert** paths and Skill files skips just its build and
browser tests.

### Full gate
**Floor** plus **Heavy**.

### Inert
A changed path that provably cannot affect the **Heavy** tier. A property of the
path, not of the change's importance (`scripts/gate/gate.ts`).

### Human-only
A path whose PR a **Trusted** human must merge, whatever the **Gate** says,
except as ADR-0004 allows (the list is
`.claude/rules/adr-0004-human-merge.md`). Agents may
still author changes to it.

### Rule
A short instruction that reaches an agent on its own: at session start, or when
it works on the files or runs the **Skill** the Rule names (ADR-0029). Either an
ADR's summary or an instruction about specific files.

### Prune Trial
One problem's instructions pruned to their goal and left standing for a fixed
window, so later Sessions' **Frictions** show whether the cut text was
load-bearing (ADR-0027; the `prune-trial` Skill).

### Proposal
An intended change an agent can't push itself, written down for a human to apply
by hand, and deleted once applied (`docs/proposals/README.md`).

## Retired terms

Still in older text; avoid them in new writing.

- **`sync`**, **`consolidate`**, **`codify`**: old names for scheduled
  self-improvement jobs. Name the actual Skill instead. The plain verbs are fine.
- **Sparks**: the old name for **ideas** (early on, learnings too).
- **chartered job**, **ledger row**: ADR-0003's former table of what scheduled
  jobs may change. Say "scheduled Skill".
- **Journal entry**: say "session log" (or "research write-up").
