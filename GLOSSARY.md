# Glossary — Platform

> The **Platform glossary** (ADR-0021; see
> [`GLOSSARY-MAP.md`](./GLOSSARY-MAP.md)): the concepts every agent needs
> regardless of task, plus a roster of the Tenants. Tenant-local vocabulary lives
> in `layers/<tenant>/GLOSSARY.md`. This file is a glossary only: no
> implementation details, no specs. Challenge any usage that conflicts with a
> definition here.

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
"fit-out"), not just content. See the **Tenants** roster below for the current
list. "Multi-tenant" is used in the architectural
sense (isolated logical unit), not "external paying customer."

A Tenant is **implemented as a Nuxt layer**, but the words aren't synonyms:
"Tenant" is the domain concept, "layer" the Nuxt primitive it maps to. Say
"Tenant" in domain/product sentences and "layer" only for the Nuxt mechanism.

**Isolation stance:** full isolation by default — each Tenant is self-contained, no shared code between Tenants; Tenants read each other only through the **Catalog** (ADR-0025). A shared layer (design system, common components)
*may* be introduced later **if** a concrete cross-cutting concern proves it
worth the coupling — but it is not assumed, not designed for, and not a Tenant.

### Space
An isolated content variant within a Tenant. Spaces of the same Tenant share the
Tenant's components and content *model* but have completely separated content
*data*. The **set of Spaces is defined per-Tenant** — names, count, and meaning
vary by Tenant; the Platform treats them generically. For example, the
Journal Tenant uses `current` (live) and `archived` (retired snapshots). A
customer-facing website Tenant might instead use `prod` (live
content), `uat` (customer testing), and `dev` (developer playground). The Blog, Atlas and Marquee give a Space a Tenant-specific name and meaning — a **Persona**, a **Biome** and a **Screening** respectively (defined in their own glossaries).

### Collection
The structure of one *type* of content within a Space (e.g. `blog`, `pages`,
`authors`). Several Collections live inside one Space; each Tenant × Space ×
Collection becomes its own collection, built from the Tenant's manifest
(ADR-0002, ADR-0013).

### Document
An individual content entry within a Collection — one row / one file.

### Collection kind
A named, shared shape a Collection may opt into, so code in other Tenants can
read it through the **Catalog**. Its contract is a minimum, merged with the
Collection's own schema. Separate from a Collection's type. A Collection with no
kind stays hidden from other Tenants (ADR-0025).

### Session
One continuous Claude Code working session against the Platform, identified by a
stable Claude session id. It is the unit of self-reporting: at **Session closure**
a session authors a **session log** — a Journal record of, honestly, its
goal, how far it got, what it read, which Skills it used, and every **Friction**
it hit (see Session closure). It
may also carry, *only when the work sparked them*, two optional notes: **learnings**
(useful knowledge the session inferred during the work, not read from the repo,
which would be a doc read; a Friction's positive twin) and **ideas** (see
Idea). A session may
span several branches or PRs, or none, and its log is authored either way, even
if no code was committed. Session logs are ground truth, not a projection of
repo state (see the Journal Tenant).

A session log may be **external**: authored by a different agent / harness /
environment than our Claude Code toolchain. An external log is still a real, honest
record and stays visible in the Timeline and dashboard; the schema marks it with an
optional `external` flag (absent means internal). ADR-0009 says what the flag
changes for self-improvement mining.

Every session log records the Session's **kind** — where it sat on the autonomy
spectrum, judged by **who prompted**: **interactive** (a human prompted again
after kickoff — steered, answered, redirected), **delegated** (exactly one human
prompt, the kickoff, with no human prompt after it), or **autonomous** (no human
prompt at all — the Session was started by a schedule or by another Session, not
a person). Prompts injected by machinery — a scheduled self check-in, a webhook
event, a hook reminder — arrive as user messages but are **not** human prompts
and never make a Session interactive. Kind is descriptive of what happened, never a grant of
authority: what a Session may merge is governed elsewhere and does not vary by
kind.

### Idea
An optional note in a **session log**: an ambitious, concrete proposal for the
Platform's or a Tenant's future — creative and specific enough that a later
reader could turn it straight into a GitHub issue, not a vague hunch. An idea is
not yet planned work, just noted.

### Session closure
The point at which a **Session**'s active work is **complete and in a coherent,
honest state** — the trigger for authoring its **session log**. Closure is
**not** the same as merged: a Session usually reaches closure with its PR still
in review (it merges later, often in another Session), and a Session that opens
no PR at all — research, a question answered — reaches closure too. It is the
Session's own **self-judged** call, typically reached *before* the Session
literally ends. (Always say "**Session** closure," never bare "closure," which
in a JS/TS codebase also reads as a lexical closure — a different thing.)

### Friction
A single recorded pain-point within a Session: something that went wrong, was
unnecessarily complex, or wasted effort or tokens. Each carries a **description**,
a possible **solution**, and a **severity** graded `nit < minor < moderate <
major < blocker`:
- `nit` — a small annoyance with no real cost (an awkward phrasing, a slightly
  off default).
- `minor` — a real but contained papercut (extra steps, a few wasted tokens)
  that didn't change the outcome.
- `moderate` — cost meaningful time or tokens, or forced a workaround, but the
  session still reached its goal.
- `major` — derailed part of the session (a wrong turn undone, a redo from
  scratch) or degraded the outcome.
- `blocker` — the session could not proceed on its goal at all without a
  workaround or human help.

Grade by the cost *this instance* actually incurred, not by how notorious the
failure class is — a mistake fully caught before landing (self-review, or a
guard working exactly as designed) stays `nit`/`minor`. Recurrence is tracked
separately, by occurrence count, not by inflating each instance's severity. A
few named Frictions are graded by a fixed rule instead, stated where each is
used (`log-session`, `close-session`, `docs/agents/pr-workflow.md`).

Frictions are the primary signal the self-improvement Skills mine — for recurring
pain (`frictions-to-fixes`), and as the verdict on an open **Prune Trial**
(`prune-trial`) — so agents report **every** friction honestly, even nits.
Frictions that share a cause are grouped in the **Friction Ledger**, not tagged.

### Friction Ledger
An Inventory of the Platform's Friction clusters: one entry per root cause, with
every occurrence by Session and every merged PR meant to fix it, so recurrence is
counted over weeks, not one run's window. `frictions-to-fixes` maintains it.

### Skill
A Claude Code skill that encodes a repeatable capability for developing or
consolidating the Platform (see `CLAUDE.md` for where Skills live on disk).
The Skill set is a first-class, ever-growing part of the project — as much a
deliverable as the Nuxt code.

### Skill Inventory
A curated, derived current-state readout of which Skills to actually use and each
one's **role** and **importance** to this Platform. It
is kept current by the `audit-skills` Skill. It and the **Friction Ledger** are
**Inventories** — the general category of derived, current-state readouts that
are refreshed in place rather than appended to (contrast the Digest, a
daily summary defined in the Journal glossary).

### Importance (of a Skill)
A Skill Inventory entry's grade for how much a Skill matters to the Platform — a
judgement of **conditional essentialness** (how essential the Skill is *when its
kind of work occurs*), never raw frequency, so a rare-but-essential Skill is not
graded down for the rarity of its domain. Five grades:
- **essential** — essential *and broad*: its absence would be felt across many
  kinds of session (e.g. `log-session`, `domain-modeling`).
- **routine** — the Platform's standing operation: the Skill *is* a scheduled
  Routine's job, driving whole unattended sessions of its own rather than being
  reached for inside someone else's (e.g. `digest`, `audit-docs`). Assigned from the observed fact that scheduled sessions run it, not from breadth, so it doesn't compete with `essential`. A Skill that is merely *fireable* on an interval but in practice invoked by hand is not `routine`.
- **specialist** — essential *within a specific kind* of work, even when that work
  is rare (e.g. `atlas-specimen`).
- **supporting** — genuinely useful but not essential; work proceeds without it.
- **peripheral** — marginal or superseded: little observed pull even when it could
  have applied.
Disuse *alone* never lowers a grade, and a grade moves only on cited session
evidence (ADR-0015; `audit-skills` step 5 says what evidence counts).

### Role (of a Skill)
A Skill Inventory entry's plain-prose account of what the Skill is for and why
it matters to this Platform — not a copy of the Skill's own description, and
kept reference-free (no PR/issue/session ids). See `audit-skills/SKILL.md` for
the exact length guideline and refresh rule.

### Workflow
A saved Claude Code workflow script: a fixed sequence of agent steps that a
**Skill** runs so the model cannot skip or reorder them. It is that Skill's code,
named by it and kept in `.claude/workflows/` (ADR-0005). Not the GitHub Actions
workflow that runs the **Gate** in CI (ADR-0026).

### Routine
A scheduled trigger, set up outside the repo, that runs one **Skill**. The Skill
holds what the run does; the Routine holds only when (ADR-0005). A **Trusted**
user who sets one up approves that Skill's runs (ADR-0003).

### Agent Authorship
Platform-wide invariant: **agents are the authors of record for essentially all
content and code.** **Trusted** users (those with write access) converse, direct,
and review; agents write to the filesystem and commit via gated PRs. "Authored" vs
"derived" content differ only in the agent's *input* (a human conversation vs repo
state), not in the mechanism. This is why strict schemas and the safety gate
matter: agents write everything, so machine-checkable contracts are the guardrail.
A **Public** visitor cannot direct agents — they only *report* (open issues / fork
PRs), and agents treat that input as untrusted data (see Trusted / Public below,
and ADR-0020).

### Observability
Platform-wide invariant, alongside Agent Authorship: the Platform is built to be
watched, not just to run itself. Its substrate is **traceability**: every change
to content, rules or code lands as a git commit inside a gated PR, so raw history
is always reconstructable. Three further altitudes sit on top of it. The
**Journal** turns the raw history into an accessible, public-facing overview of
current activity. The **Blog** re-tells the same activity at a higher,
plain-language altitude. The **Personas** add a self-reflection angle on top of
that, reading the same activity back from several distinct points of view. Four
altitudes, one underlying activity.

### Catalog
The build-time projection of every Collection that opted into a **Collection
kind**, grouped by kind, derived from the same manifest expansion as the routing
map. It is the read primitive for reading across Tenants (ADR-0025).

### Aggregator
A view whose job is to read across Tenants, such as a search or an activity
feed. It reads the **Catalog**, writes nothing, and is an ordinary Tenant layer.
Dedicated views live as Spaces of the Commons Tenant (ADR-0025).

### Trusted
A user with **write access** to the repository: the owner and invited
collaborators, with equal standing except in the guest pipeline, which only the
owner runs and merges (ADR-0020). A Trusted user may direct agents,
approve new work (ADR-0003), and merge the PRs ADR-0004 reserves for a human.
Its opposite is **Public**.

### Public
A user **without** write access. They can open issues and fork PRs, but cannot
direct agents, approve work or merge. ADR-0020 says how agents treat their text;
ADR-0023 has the guest-pipeline exception.

### Gate
The objective, layered bar every change must clear before it lands (ADR-0004);
formally the *safety gate*, but "the Gate" everywhere in practice. It is one
bar that runs locally and in CI; CI's run is **authoritative**: it decides
whether a gated PR may merge. Its steps split into a
**Floor** and a **Heavy** tier; running both is a **Full gate**. Objective by
construction: it asks machine-checkable questions only, so it can be trusted
without trusting the author (see **Agent Authorship**).

### Floor
The **Gate** tier that always runs, whatever changed. Named for a minimum never gone below, not for speed.

### Heavy
The **Gate** tier that may be skipped when every changed path is **Inert**. Named
for cost: these are the steps expensive enough to be worth not running. Skipping
is one-directional — any uncertainty runs them.

### Full gate
**Floor** plus **Heavy** — the whole **Gate** (see **Heavy** for when it's
skipped).

### Inert
A changed path that provably cannot affect the **Heavy** tier, so running Heavy
against it could only re-confirm the previous answer. A property of the *path*,
not of the change's importance: an Inert change may still be substantial. Only a
changeset that is entirely Inert may skip all of Heavy; `scripts/gate.ts` holds
the narrower skips.

### Human-only
A surface that a **Trusted** human must **merge** — never merged by an agent,
whatever the **Gate** says (the list is the `paths` of
`.claude/rules/adr-0004-human-merge.md`; ADR-0004). It constrains merging
only: agents author changes to Human-only surfaces routinely, and review is the
control.

### Rule
A short instruction that reaches an agent on its own: at session start, or when
the agent works on the files or runs the **Skill** it names (ADR-0029). A Rule
is either an ADR's summary or an instruction about specific files, which it
holds or points to. Instructions that matter on an action are not Rules.

### Prune Trial
One problem's instructions pruned down to the goal behind them and left standing
for a fixed window, on the premise that whether a rule is load-bearing is settled
by removing it and observing, not by reading it (ADR-0027). Open trials are
tracked in a ledger the `prune-trial` Skill maintains; the **Frictions** logged
while one stands are its verdict, and only that Skill delivers it — other
Sessions record side-effects rather than restoring the pruned prose.

### Proposal
An intended change that an agent cannot push itself, written down for a human to
apply by hand. A Proposal records *pending* intent, so it is deleted once
applied; one left behind is a claim about the world that is no longer true. Gate
steps need none: they live in an action agents can push (ADR-0026). See `docs/proposals/README.md` for the format.

## Tenants

The Platform hosts these Tenants. Each has its own glossary
(vocabulary + reason-to-exist) co-located with its code; this roster is the
pointer into them (see `GLOSSARY-MAP.md`).

- **Journal** — the Platform's self-documentation: session logs, inventories, and
  digests, rendered at `/t/journal/current`. Platform infrastructure, not a demo
  Tenant (ADR-0008). → [`layers/journal/GLOSSARY.md`](./layers/journal/GLOSSARY.md)
- **Blog** — in-character, deliberately non-authoritative commentary on the
  experiment, from several Personas (David, Karen, Kevin, Eyra). A demo/content
  Tenant. →
  [`layers/blog/GLOSSARY.md`](./layers/blog/GLOSSARY.md)
- **Atlas** — a fictional natural-history field guide; the design-heavy showpiece.
  A demo/content Tenant. → [`layers/atlas/GLOSSARY.md`](./layers/atlas/GLOSSARY.md)
- **Midden** — an archaeology-themed catalogue of the Platform's own discarded
  work. A demo/content Tenant. →
  [`layers/midden/GLOSSARY.md`](./layers/midden/GLOSSARY.md)
- **Marquee** — a movie-blog microsite covering the Marvel Cinematic Universe
  in in-universe story order, one chapter per film. A guest-requested
  demo/content Tenant (ADR-0023, issue #551). →
  [`layers/marquee/GLOSSARY.md`](./layers/marquee/GLOSSARY.md)
- **Tinkerfund** — a crowdfunding shop for fun, mostly useless inventions; a
  design showcase in which every interaction is simulated in the browser. A
  demo/content Tenant. → [`layers/tinkerfund/GLOSSARY.md`](./layers/tinkerfund/GLOSSARY.md)
- **Glass Box** — a textbook of the concepts Terrarium is built on, with
  Terrarium as the worked example. A content Tenant (issue #1985). →
  [`layers/glassbox/GLOSSARY.md`](./layers/glassbox/GLOSSARY.md)
- **Commons** — the first **Aggregator**: cross-Tenant Search and Timeline
  Spaces; not a demo/content Tenant (ADR-0025, issue #642). →
  [`layers/commons/GLOSSARY.md`](./layers/commons/GLOSSARY.md)

## Retired terms

Coined earlier, since drifted or unused. Recorded so their meaning stays legible
in old docs and ADRs, but **avoid them in new writing** (an ADR drops them when
rewritten, ADR-0030).

- **`sync`**, **`consolidate`** — speculative names for scheduled self-improvement
  *jobs*, coined before the work existed. The work grew real names instead: name
  the actual Skill (`digest`, `audit-docs`, `audit-skills`, `frictions-to-fixes`)
  or "the self-improvement Skills." The ordinary verb "consolidate" is unaffected
  — it is fine to say a Skill consolidates facts.
- **`codify`** — same speculative taxonomy (a job that mints a new Skill). Avoid
  it as a job-name. It stays a good plain word for its literal sense — turning a
  concept, or a chunk of a Skill's workflow, into code — so reach for it only
  there.
- **`Spawn`** — was glossary shorthand for adding a Tenant/Space; never really
  used, and overloaded with "spawn a sub-agent." Just say "add a Tenant/Space."
- **Sparks** — the old name for **ideas** (early on, learnings too); older
  digests and session logs still say it.
- **chartered job**, **ledger row** — ADR-0003's former table of what each
  scheduled job may change. Say "scheduled Skill" and point to its `SKILL.md`.
- **Journal entry** — an umbrella term for the Journal's primary append-only
  records; retired in favour of the concrete "session log" (and "research
  write-up").

## Cardinality
- Platform 1 — N Tenant
- Tenant 1 — N Space   (the Space set is declared per Tenant)
- Space 1 — N Collection
- Collection 1 — N Document
- Content data is isolated per (Tenant, Space, Collection).
