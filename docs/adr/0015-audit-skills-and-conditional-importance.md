# 15. Skill Inventory upkeep: conditional importance & the `audit-skills` auditor

Date: 2026-07-06

Status: Accepted

> **Amended by [ADR-0018](0018-tenant-layers-under-layers-directory.md) (2026-07-07).**
> Tenant layers moved from `tenants/` to Nuxt's conventional `layers/` directory;
> `tenants/…` paths below reflect the pre-rename layout.

> **Amended (2026-07-08).** "A schedule is deferred, exactly as `digest`'s trigger
> is" (Decision, cadence bullet) is now historical: `digest` has since gained a
> **nightly schedule** — an external Routine fires `/digest` daily, making it the
> first live autonomous job (Skill + trigger, ADR-0005; its PR lands per
> ADR-0003's digest auto-merge amendment). `audit-skills` itself remains
> on-demand; **its** schedule is still deferred.
>
> **Amended (2026-07-09).** The note directly above is now itself stale, and
> this amendment both corrects it and grants `audit-skills` a bounded self-merge
> tier — the drift between the two is worth naming plainly: `audit-skills`
> **gained its own nightly Routine** (`0 2 * * *`) without this ADR being
> updated, so "on-demand... deferred" no longer described reality. Caught only
> because it came up in conversation, not because anything checks it — exactly
> the class of drift `audit-docs` exists to catch, here in the ADR that defines
> this Skill's own cadence.
>
> **Self-merge**: `audit-skills` joins `digest` and `audit-docs` as the
> **third** name on ADR-0003's "no self-merge" exemption list (ADR-0004's
> low-risk content tier), bounded tightly: a run may self-merge its gated PR on
> a green gate **only when the PR touches exclusively
> `layers/journal/content/current/skills/*.yml`**, and only when every
> grade/role change in it cites the Decision's bright-line evidence rule
> (≥2-session opportunity-missed, **now symmetric** — a promotion needs the same
> citable evidence a demotion does, not just a demotion). The "never touches
> `.agents/skills/`" boundary from the original Decision is **unchanged** — a
> frontmatter concern is now **logged as a friction in the run's own session
> log** rather than filed as a GitHub issue directly, so it flows through
> `frictions-to-fixes`'s existing file-issue → dispatch → review-and-merge
> pipeline (ADR-0003's mid-term review-agent, author ≠ merger) instead of a
> second, competing issue-filing path to the same surface.
>
> **Two new capabilities, both notes-only — never self-merged, never a direct
> edit:** a **regression watch** brackets the sessions immediately before/after
> each of a Skill's own recent `SKILL.md` edit commits (manual or
> `audit-docs`-authored) and judges whether behavior plausibly changed —
> inherently a small-sample, confounded signal, so a finding is recorded only as
> the run's own session-log **`learnings`** entry (CONTEXT.md → Session), a
> hedged note for a future reader, never a trigger for a grade change on its
> own. And the run may propose a **new Skill, or splitting/retiring an existing
> one**, recorded as its own session-log **`ideas`** entry — concrete enough to
> become an issue, but this Skill never creates, splits, or retires anything
> itself (net-new/creative work stays human-green-lit, ADR-0003).

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
