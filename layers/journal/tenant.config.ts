// Manifest for the Journal Tenant — the Platform's self-documentation (GLOSSARY.md).
// Declarative intent only (ADR-0002, ADR-0013).
import { z } from 'zod'
import { defineTenant } from '../../shared/manifest'
import { sessionSchema } from '../../shared/schemas/session'

// A plain UTC calendar date. Used where
// a fact is date-scoped (at most one entry per day) rather than ordered within a
// day, so second-level precision would be unused precision, not extra safety.
const utcDate = z
  .string()
  .refine(
    (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)),
    'must be a UTC date, e.g. 2026-07-05',
  )

export const skillSchema = z
  .object({
    name: z.string(),
    category: z.enum(['platform-operation', 'general-engineering']),
    importance: z.enum(['essential', 'routine', 'specialist', 'supporting', 'peripheral']),
    // ≤ 12 words, plain language, no ADR/PR/session references — what a
    // first-time visitor reads before (optionally) opening `role` below.
    // Authored for `essential`/`routine`/`specialist` Skills, the ones
    // the Inventory page shows in full; `supporting`/`peripheral` skip it
    // (visitor-loop fix, 2026-09-26).
    gist: z.string().optional(),
    // The Skill's role and importance to this project, not a copy of its
    // own description, and free of PR/issue/session ids (ADR-0015). Length:
    // `.agents/skills/audit-skills/SKILL.md` step 5.
    role: z.string(),
    // Integrity pin for EXTERNAL pack Skills only (those keyed in
    // skills-lock.json): sha256 of the installed `SKILL.md`, verified by
    // `pnpm verify:skills-lock` so a pack Skill can't be silently edited
    // (ADR-0015). Machine-managed — do NOT hand-edit; regenerate with
    // `pnpm verify:skills-lock --write`. Absent on our own Skills.
    installedSha256: z.string().optional(),
    // `audit-skills`' own record, not rendered on the site (ADR-0015). Each
    // entry is one run's citable finding; PR/issue/session ids go here, not
    // in `role`. How long entries stay: `audit-skills/SKILL.md` step 5.
    observations: z.array(
      z.object({
        date: utcDate,
        note: z.string(),
      }),
    ),
  })
  .strict()

// The Friction Ledger (GLOSSARY.md). `frictions-to-fixes`' SKILL.md holds its
// lifecycle. Counts and first/last-seen dates derive from `occurrences`;
// nothing here is a hand-written total.
export const frictionClusterSchema = z
  .object({
    name: z.string(),
    // One plain sentence a visitor can read (issue #2093).
    summary: z.string(),
    // For agents clustering Frictions: the root mechanism, then the signals
    // that identify a new occurrence.
    cause: z.string(),
    // Where a fix lands. `safe` is dispatchable; `guard-or-hook` and
    // `human-only` need a human-attended session or merge (ADR-0004,
    // docs/agents/guards.md); `outside` is the harness or a service this
    // repo cannot change.
    surface: z.enum(['safe', 'human-only', 'guard-or-hook', 'outside']),
    // `open`: no open issue or PR covers it. `tracked`: one does. `on-trial`:
    // inside a Prune Trial's territory (ADR-0027). `fixed`: the fix merged
    // on `fixedOn`, so `fixes` holds one dated it (the manifest takes no
    // cluster-level refine; `tests/unit/ledger-content.spec.ts` checks).
    status: z.enum(['open', 'tracked', 'on-trial', 'fixed']),
    fixedOn: utcDate.optional(),
    // Agents' notes on the status, not rendered: the tracking issue, the
    // trial's territory match, what a fix left open. Merged PRs go in `fixes`.
    ref: z.string().optional(),
    // The merged PRs meant to fix (part of) the cause, oldest first: what the
    // Ledger shows as "Merged PRs to fix it"; a merge does not prove the fix held. `date` is the merge date.
    fixes: z
      .array(z.object({ pr: z.number().int().positive(), date: utcDate, summary: z.string() }))
      .default([]),
    // One per session, or a session read twice by overlapping windows would
    // inflate the recurrence count.
    occurrences: z
      .array(
        z.object({
          session: z.string(),
          date: utcDate,
          severity: sessionSchema.shape.frictions.element.shape.severity,
          // A copy of the session's friction this occurrence is about, whose
          // severity is `severity`, so a later run can re-cluster without
          // reading the session logs (`scripts/ledger-occurrence.ts` prints it).
          description: z.string(),
          solution: z.string(),
        }),
      )
      .refine((occ) => new Set(occ.map((o) => o.session)).size === occ.length, 'a session is listed twice'),
  })
  .strict()

export default defineTenant({
  name: 'journal',
  // A lifecycle split: `current` is the live week, `archived` the older entries
  // (issue #868). It also exercises ADR-0004's L3 isolation invariant: this
  // layer's e2e checks an archived route doesn't leak `current` content.
  spaces: ['current', 'archived'],
  collections: {
    // Rendered documentation pages — 1:1 file → route within the Space.
    pages: {
      type: 'page',
      kind: 'page', // opt into the cross-Tenant #catalog (ADR-0025)
      source: '**/*.md',
      // A Digest's one-line headline (`summary`) comes from the `page` kind's
      // contract (shared/kinds.ts, ADR-0025); the Journal home page lists it
      // live (ADR-0010). Ordinary pages omit it.
      schema: z.object({
        // `page` type already supplies path/title/description/body/seo.
        badge: z.string().optional(),
        // A Space root's short plain lead, shown above the "New here?" cards.
        lead: z.string().optional(),
        // Dashboard on-ramp opt-in (the "New here?" cards on the Space landing).
        // A page surfaces itself as a card by setting `onramp` to its sort order
        // (lowest first); `onrampLabel`/`onrampBlurb` carry the card's teaser copy,
        // kept distinct from the page's own title/description. Ordinary pages omit
        // all three. Consumed in app/pages/t/journal/[space]/index.vue.
        onramp: z.number().int().positive().optional(),
        onrampLabel: z.string().optional(),
        onrampBlurb: z.string().optional(),
      }),
    },
    // The Platform's Skill Inventory — structured data, not routed. Strict → L1.
    // Its purpose is NOT to restate each Skill's own description, but to record
    // its *role and importance to this project*. Skills are installed wholesale
    // from an external pack (skills-lock.json), so this is where they get
    // Terrarium-specific context (ADR-0015). The
    // `audit-skills` Skill keeps it current.
    skills: {
      type: 'data',
      source: '**/*.yml',
      schema: skillSchema,
    },
    // Session logs — one append-only, honest self-report per Claude session
    // (ADR-0009). The shape is now the shared **`session` collection kind**
    // (ADR-0025): its schema is single-homed in `shared/schemas/session.ts` and
    // referenced by `kind` here, so the Commons Timeline can read sessions across
    // the Catalog without re-declaring the schema. `scripts/log-session.ts`
    // validates authored logs against that same shared schema.
    sessions: { type: 'data', kind: 'session', source: '**/*.yml' },
    frictions: {
      type: 'data',
      source: '**/*.yml',
      schema: frictionClusterSchema,
    },
  },
})
