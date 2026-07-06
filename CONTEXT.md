# Context — Multi-tenant Nuxt Content Platform

> Glossary only. No implementation details, no specs. Terms are the project's
> ubiquitous language; challenge any usage that conflicts with a definition here.

## The metaphor

Commercial real estate. The **Platform** is one building. A **Tenant** leases it
and does its own fit-out (its own components/branding). Each Tenant uses several
**Spaces** for different purposes (a prod floor, a dev lab, a demo showroom).
Landlords lease *spaces* to *tenants* — the two terms come from one world.

## Glossary

### Platform
The single Nuxt Content codebase, repository, and deployable container that hosts
every Tenant and every Space. There is exactly one Platform. (In the metaphor:
the building. In Nuxt terms: the one Nuxt app / container.)

### Tenant
A logically distinct product/site within the Platform, with its **own Vue/Nuxt
components** and its own content model. Many Tenants coexist in the one Platform.
Its distinguishing feature vs. a Space is that it owns *code/components* (its
"fit-out"), not just content. Examples: the marketing Tenant; the
living-documentation Tenant. "Multi-tenant" is used in the architectural sense
(isolated logical unit), not "external paying customer."

A Tenant is **implemented as a Nuxt layer**. "Tenant" and "layer" are not
synonyms, though: "Tenant" is the domain concept, "layer" the Nuxt primitive it
maps to. Say "Tenant" in domain/product sentences; say "layer" only when
discussing the Nuxt mechanism.

**Isolation stance:** full isolation for now — each Tenant is self-contained, no
shared code between Tenants. A shared layer (design system, common components)
*may* be introduced later **if** a concrete cross-cutting concern proves it
worth the coupling — but it is not assumed, not designed for, and not a Tenant.

### Space
An isolated content variant within a Tenant. Spaces of the same Tenant share the
Tenant's components and content *model* but have completely separated content
*data*. The **set of Spaces is defined per-Tenant** — names, count, and meaning
vary by Tenant; the Platform treats them generically. For example, the
Journal Tenant uses `current` (live) and `archived` (retired snapshots). A
customer-facing website Tenant might instead use `prod` (live
content), `uat` (customer testing), and `dev` (developer playground) — the same
Collections in each, but fully separated content *data* per Space.

### Collection
The structure of one *type* of content within a Space (e.g. `blog`, `pages`,
`authors`). Maps 1:1 to a Nuxt Content `defineCollection` → one SQLite table.
Several Collections live inside one Space. Physical isolation is achieved by
keying each generated collection as Tenant × Space × type
(e.g. `marketing_prod_blog`).

### Document
An individual content entry within a Collection — one row / one file.

### Journal (Tenant)
The one Tenant whose content is the Platform's documentation *of itself*. It
holds three kinds of content. **Inventories** are curated/derived current-state
readouts — the Skill Inventory today; the inventory of Tenants/Spaces/Collections
and CI/drift health later, via the `sync` job. **Journal entries** are primary,
append-only records the agents author themselves — session logs, research
write-ups, and nascent ideas (planned). **Digests** are derived, append-only
daily summaries of Platform activity (see Digest). The journal entries are honest
self-reports — what a session did, what it read, where it struggled — and are the
key signal the self-improvement jobs (`consolidate`, `codify`) mine for recurring
friction. It is a Tenant like any other — no authorship asymmetry (see Agent
Authorship). Typically one such Tenant; its Spaces are `current` (live) and
`archived` (retired snapshots). (Earlier framed as "Living Documentation / a
derived status report"; renamed once it became clear its essence is an
append-only journal, not a current-state readout.)

### Blog (Tenant)
The Platform's second Tenant: a simple blog reporting on the Terrarium experiment
itself, from several angles. Its Spaces are **Personas** (see Persona) — each an
isolated `pages` collection of blog posts plus a `pingbacks` collection. Distinct
from the **Journal**: the Journal is honest, primary/derived self-*documentation*
(session logs, digests, inventories); the Blog is *in-character commentary* —
subjective, voice-driven, and explicitly non-authoritative. Its routed collection
is named `pages` per the Platform convention (ADR-0006), though it holds what the
UI and the `blog-post` Skill call **posts**.

### Persona
A Space of the Blog Tenant, embodying one authorial voice reporting on the
Terrarium. The Space slug **is** the persona's name. Three today: **David**
(`david`) — a neutral, curious observer who watches and describes without drawing
early conclusions; **Karen** (`karen`) — hostile to agentic AI development, snarky,
seizes on whatever failed; **Kevin** (`kevin`) — easily impressed and quietly
afraid agents will take his job. Each Persona's Space opens with a landing
(`pages/index.md`) that titles its blog and states its leaning in a short intro, so
the stance is legible without decoding the name; the fuller voice is defined in the
`blog-post` Skill. A Persona authors posts only into its **own** Space — the one
exception is writing a **Pingback** stub into another Persona's Space. "Persona" is
the Blog Tenant's word for a Space — say "Persona" in blog/product sentences,
"Space" for the Platform mechanism.

### Pingback
A record that one Persona's blog post reacted to another Persona's post. Modeled
as a Document in a `pingbacks` **data** collection living in the *reacted-to*
Persona's Space — denormalized there at author time (persona/path/title/blurb
inlined), so surfacing it is a **same-Space read**, never a cross-Space runtime
query (ADR-0012). The reacting post is itself a first-class post in its own Space,
optionally headed by a `reactsTo` reference to the post it answers.

### Session
One continuous Claude Code working session against the Platform, identified by a
stable Claude session id. It is the unit of self-reporting: at its end a session
authors a **session log** — a Journal entry recording, honestly, its goal, how
far it got, what it read, which Skills it used, and every **Friction** it hit. A
session may span several branches or PRs, or none; its log is authored regardless
of where the work went, or whether any code was committed at all. Session logs
are ground truth, not a projection of repo state (see Journal).

### Friction
A single recorded pain-point within a Session: something that went wrong, was
unnecessarily complex, or wasted effort or tokens. Each carries a **description**,
a possible **solution**, and a **severity** graded `nit` → `blocker`. Frictions
are the primary signal the self-improvement jobs (`consolidate`, `codify`) mine
for recurring pain, so agents report **every** friction honestly — even nits. A
tagging taxonomy is deliberately *not* fixed up front: it is meant to **emerge**
from clustering real frictions once enough have accumulated, rather than be
guessed before there is data.

### Digest
A derived, append-only, time-boxed Journal Document: one immutable page per
**closed UTC day**, summarizing Platform activity across all Tenants, mined from
git history and session logs. It differs from the two other Journal content kinds
on one axis each: unlike an **Inventory** (also derived, but a current-state
readout that is *overwritten* each sync) a Digest is historical and never
rewritten once its day closes; unlike a **Journal entry** (also append-only, but
*primary* — authored from scratch by the agent) a Digest is *derived* by
condensing existing records. The Platform's `index` overview is an Inventory; the
per-day summaries are Digests.

### Agent Authorship
Platform-wide invariant: **agents are the authors of record for essentially all
content and code.** Humans converse, direct, and review; agents write to the
filesystem and commit via gated PRs. "Authored" vs "derived" content differ only
in the agent's *input* (a human conversation vs repo state), not in the
mechanism. This is why strict schemas and the safety gate matter: agents write
everything, so machine-checkable contracts are the guardrail.

### Skill
A Claude Code skill (`.claude/skills/*`) that encodes a repeatable capability for
developing or consolidating the Platform. The Skill set is a first-class,
ever-growing part of the project — as much a deliverable as the Nuxt code.

### Importance (of a Skill)
A Skill Inventory entry's grade for how much a Skill matters to the Platform — a
judgement of **conditional essentialness** (how essential the Skill is *when its
kind of work occurs*), never raw frequency, so a rare-but-essential Skill is not
graded down for the rarity of its domain. Four grades:
- **essential** — essential *and broad*: its absence would be felt across many
  kinds of session (e.g. `log-session`, `domain-modeling`).
- **specialist** — essential *within a specific kind* of work, even when that work
  is rare (e.g. `blog-post`).
- **supporting** — genuinely useful but not essential; work proceeds without it.
- **peripheral** — marginal or superseded: little observed pull even when it could
  have applied.
Disuse *alone* never lowers a grade; a grade drops only on evidence that a Skill
was **not used in sessions of the kind it serves** (opportunity missed, not merely
absent).

### Codify
The Platform's self-improvement loop: an autonomous job that turns a repeated
manual pattern into a new, committed Skill. It is one of a small set of chartered
autonomous jobs — alongside `sync`, `drift-check`, `consolidate`, and `triage` —
that *tend and consolidate* the Platform rather than decide what should exist.
**Planned concept, not yet built:** no autonomous jobs run today. The term is
defined here so Skills and journal content can refer to it consistently until it
exists.

### Spawn (a Tenant / Space)
To add a new Tenant or Space to the Platform via source changes on a feature
branch (agent-authored), reviewed and merged, then shipped by tagging a release.
It is **never** a runtime operation. "Spawning" produces code + content files and
collection definitions; a build bakes them into the next container image. A
spawned small Tenant is a "microsite."

## Cardinality
- Platform 1 — N Tenant
- Tenant 1 — N Space   (the Space set is declared per Tenant)
- Space 1 — N Collection
- Collection 1 — N Document
- Content data is isolated per (Tenant, Space, Collection).
