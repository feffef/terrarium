// Manifest for the Journal Tenant — the Platform's self-documentation (CONTEXT.md).
// Declarative intent only — `content.config.ts` builds the keyed collections
// from this manifest at config-evaluation time (ADR-0002/0013); nothing is
// generated into the repo.
import { z } from 'zod'
import { defineTenant } from '../../shared/manifest'

// A plain UTC calendar date. Used where
// a fact is date-scoped (at most one entry per day) rather than ordered within a
// day, so second-level precision would be unused precision, not extra safety.
const utcDate = z
  .string()
  .refine(
    (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)),
    'must be a UTC date, e.g. 2026-07-05',
  )

export default defineTenant({
  name: 'journal',
  // Two Spaces so the isolation invariant (ADR-0004 L3) is actually exercised:
  // same collections, physically separate content per Space.
  spaces: ['current', 'archived'],
  collections: {
    // Rendered documentation pages — 1:1 file → route within the Space.
    pages: {
      type: 'page',
      kind: 'page', // opt into the cross-Tenant #catalog (ADR-0025)
      source: '**/*.md',
      // A Digest's one-line day-headline (`summary`, ADR-0010 — the source the
      // `digest` Skill bakes into the index's "recent digests" preview) rides in
      // from the `page` kind's contract (shared/kinds.ts, ADR-0025); ordinary
      // pages simply omit it.
      schema: z.object({
        // `page` type already supplies path/title/description/body/seo.
        badge: z.string().optional(),
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
    // Terrarium-specific context; CLAUDE.md points agents here. The
    // `audit-skills` Skill keeps it current.
    skills: {
      type: 'data',
      source: '**/*.yml',
      schema: z
        .object({
          name: z.string(),
          category: z.enum(['platform-operation', 'general-engineering']),
          importance: z.enum(['essential', 'specialist', 'supporting', 'peripheral']),
          // ≤ ~50 words — a tight paragraph on the Skill's role + importance to
          // this project, NOT a copy of its own description; deeper detail lives
          // in the Skill's own docs. ~80 is the outer limit; beyond that, trim.
          // Reference-free: no concrete PR/issue/session ids — those belong in
          // `observations` below (ADR-0015 amendment, 2026-07-13).
          role: z.string(),
          // Integrity pin for EXTERNAL pack Skills only (those keyed in
          // skills-lock.json): sha256 of the installed `SKILL.md`, verified by
          // `pnpm verify:skills-lock` so a pack Skill can't be silently edited
          // (ADR-0015). Machine-managed — do NOT hand-edit; regenerate with
          // `pnpm verify:skills-lock --write`. Absent on our own Skills.
          installedSha256: z.string().optional(),
          // A purely internal, `audit-skills`-owned log — NOT rendered in the
          // journal blog (ADR-0015 amendment, 2026-07-13). Each entry is one
          // run's citable finding (a role/grade change, a regression note, a
          // new/split/retire idea) — PR/issue/session ids belong here, not in
          // `role`. Append-only: a run adds an entry, it never rewrites or
          // drops an earlier one.
          observations: z.array(
            z.object({
              date: utcDate,
              note: z.string(),
            }),
          ),
        })
        .strict(),
    },
    // Session logs — one append-only, honest self-report per Claude session
    // (ADR-0009). The shape is now the shared **`session` collection kind**
    // (ADR-0025): its schema is single-homed in `shared/schemas/session.ts` and
    // referenced by `kind` here, so the Commons Timeline can read sessions across
    // the Catalog without re-declaring the schema. `scripts/log-session.ts`
    // validates authored logs against that same shared schema.
    sessions: { type: 'data', kind: 'session', source: '**/*.yml' },
  },
})
