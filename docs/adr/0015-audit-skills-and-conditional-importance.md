# 15. Skill Inventory upkeep: conditional importance & the `audit-skills` auditor

Date: 2026-07-06

Status: Accepted

> **Amended by [ADR-0018](0018-tenant-layers-under-layers-directory.md) (2026-07-07).**
> Tenant layers moved from `tenants/` to Nuxt's conventional `layers/` directory;
> `tenants/…` paths below reflect the pre-rename layout.

> **Amended (2026-07-08).** "A schedule is deferred, exactly as `digest`'s trigger
> is" (Decision, cadence bullet) is now historical: `digest` has since gained a
> schedule, making it the first live autonomous job (Skill + trigger, ADR-0005).
> `audit-skills` now also runs on a schedule, not on-demand-only.
>
> **Amended (2026-07-09).** `audit-skills` gains a bounded self-merge tier —
> third name on ADR-0003's exemption list, after `digest`/`audit-docs`. Scope:
> only `layers/journal/content/current/skills/*.yml` edits citing the
> bright-line evidence rule above (now symmetric for promote and demote). A
> frontmatter concern citing that same rule may file/comment on a
> `needs-triage` issue directly (search first); the lower-confidence
> regression-watch signal never files or edits on its own — only a session-log
> `learnings`/`ideas` note, or a comment corroborating an issue the bright-line
> rule already opened. Full detail in `audit-skills/SKILL.md`.

## Context

The Skill set is the project's core deliverable (ADR-0005), and the loop only ever
*grows* it: `codify` mints new Skills, `frictions-to-fixes` patches a SKILL.md when
a friction names one. Nothing tended the set as a whole. The **Skill Inventory**
(`tenants/journal/content/current/skills/`) — the curated "use these" list agents
are pointed at (`CLAUDE.md`) — is hand-maintained, and its two evaluative fields
drift: it held 14 entries against 25 on-disk Skills, and `importance` was a
flat `core | supporting | peripheral` scale where 9 of 14 entries piled into
`supporting`, carrying almost no signal.

Two things were wrong beyond mere staleness:

1. **`importance` conflated two axes.** It read as a single global scale, so a
   *rare-but-essential* Skill (`blog-post` — the tool for blog work, but blog
   sessions are rare) could only be graded `core` (overstating its global weight)
   or `supporting` (understating that it is *the* tool for its job). Grading by raw
   frequency actively penalises the Skills you most want to keep.
2. **No routine derived the fields from evidence.** Session logs already record
   `skillsUsed` per session, so "used, and in what kind of session" is measurable —
   but nobody measured it, and the fields were never checked against reality.

Scope was deliberately cut during design (grill-with-docs, issue #136): *helpfulness*
/ friction-per-use was **dropped** (a confounded signal — hard sessions use more
Skills *and* log more frictions), leaving **usage** as the honest core.

The term "catalogue" had also crept in as overloaded jargon — the Journal glossary
already defines this readout as an **Inventory** (ADR-0008), and routing used
"catalog" for an unrelated concept. Retired in favour of **Skill Inventory**.

## Decision

- **`importance` is *conditional essentialness*** — how essential a Skill is *when
  its kind of work occurs*, **never** raw frequency — re-derived each run from the
  observation window. Enum widened to
  **`essential | specialist | supporting | peripheral`** (`core`→`essential` rename;
  `specialist` added for narrow-but-essential). Grades and the "conditional, never
  disuse-alone" rule are defined in `CONTEXT.md`. Frequency lives only in the `role`
  prose. `role` carries a **≤ ~50 word** guideline (schema comment) — it states
  role + importance-to-project, not a copy of the Skill's own description.

- **A grade drops only on *opportunity-missed* evidence**, never disuse alone: the
  Skill was absent from **≥2 windowed sessions of the kind it serves**. A Skill
  unused only because its kind of session did not occur keeps its grade. This yields
  a self-correcting loop: demote-and-flag → (frontmatter fixed) → Skill fires again →
  next run re-promotes.

- **`audit-skills` is a `sync`-family Skill, not a new chartered job.** ADR-0003's
  `sync` is a *remit* ("keep living documentation matching real repo state") realised
  by several Skills: `digest` keeps the digest feed honest, `audit-skills` keeps the
  Inventory honest. It reads the **40 newest session logs**, and:
  - **writes only** the Inventory's `importance` + `role` (and *creates* entries for
    observed-but-uncatalogued Skills). It **never touches `.agents/skills/`**;
  - **files a frontmatter-suspect issue** — a *referral to `frictions-to-fixes`*
    (which owns SKILL.md) — when a Skill was absent from ≥2 sessions of its kind,
    the signature of a `description` that mis-fires. Importance does not gate this:
    a low-graded Skill is exactly where a broken `description` hides.

- **Scope: tune both categories, refer only our own.** `importance`/`role` tuning
  covers **all** catalogued Skills, external pack Skills included — their Inventory
  entry records their *fit to this project* (the majority of entries), which drifts
  like any other; grading a pack Skill's importance-here is not *evolving the Skill*,
  so ADR-0005's "used, not evolved here" stance holds. But the **frontmatter-suspect
  referral is our-own-Skills-only**: a pack Skill's SKILL.md is not ours to patch (a
  re-install clobbers edits), so `audit-skills` never refers it to `frictions-to-fixes`.
  The helper marks pack Skills `external` (from `skills-lock.json`) so the split is
  robust regardless of whether a Skill is catalogued yet.

- **Split of mechanics vs judgement, per the `digest` pattern.** A unit-tested
  `scripts/audit-skills.ts` joins the three sources (on-disk Skills, Inventory
  entries, windowed `skillsUsed`) into a compact scorecard; the Skill's session makes
  every judgement. Both products land through the **ordinary gated PR** (ADR-0003) /
  the referral issue — never the ADR-0009 direct-to-main path.

- **Cadence: on-demand for v1.** User-invoked (`disable-model-invocation: true`);
  a schedule is deferred, exactly as `digest`'s trigger is.

## Consequences

- The `importance` enum change is a strict-schema **rename + add**, so the schema and
  all existing entries move together (done: the four `core` entries → `essential`).
  `specialist` starts unused; `audit-skills` assigns it from evidence over time.
- The Inventory's evaluative fields become a **rolling judgement**, not a frozen
  hand-assignment — grades can move run to run as usage shifts, which is the point.
- "Skill Inventory" replaces "catalogue" across docs, app, and routing (`catalog` →
  "collection index"). Session logs and archived content are left as-is (append-only
  history).
- The auditor only ever *proposes* (gated PR / triage issue); retiring a Skill —
  removing a deliverable — stays net-new-shaped and human-gated (ADR-0003), so
  `audit-skills` demotes toward `peripheral` and refers, but never deletes.
- `audit-skills` is a bounded first slice of the standing-inventory maintenance the
  chartered `sync` job (ADR-0003) will eventually formalise; it does not claim the
  `sync` name.
