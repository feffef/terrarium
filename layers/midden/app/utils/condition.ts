// The single-homed condition-grade table for the Midden Tenant (#523/#526).
// Every condition-aware component reads its label and definition FROM HERE; the
// definition string is authored exactly once (never a second copy).
// The tenant.config.ts `condition` enum backs this table's `grade` values.
//
// Nuxt-free on purpose (mirrors layers/atlas/app/utils/biomes.ts): the SFCs read
// the exported table and lookup helper, so the ordering guarantee is
// unit-testable without Nuxt. Lives in `utils/` so Nuxt auto-imports the exports
// into the layer's components.
//
// Post-MVP simplification (owner-directed, see layers/midden/CONTEXT.md): the
// per-grade glyph geometry that used to live here was dropped when the flattened
// visitor experience moved condition off an SVG mark decoded via hover/tooltip
// and onto plain text, read directly on the find.

// The six grades in their LOCKED decay-then-orthogonal order (#523):
//   fresh → intact → fragmentary → dissolved   sit on the erosion axis;
//   never-activated                            breaks onto its own axis
//                                              (complete but never fired);
//   lost                                       breaks the family entirely.
// This is the enum from layers/midden/tenant.config.ts, order-significant here.
export type Grade =
  | 'fresh'
  | 'intact'
  | 'fragmentary'
  | 'dissolved'
  | 'never-activated'
  | 'lost'

export interface ConditionMeta {
  grade: Grade
  /** The curator's short display label, shown as visible text. */
  label: string
  /** The one-line, fixed, curator-voice definition — shown once, on the
   *  landing legend. Authored once, here; never re-authored at a call site. */
  definition: string
}

// The one authored table. Order IS the decay-then-orthogonal order (#523) and is
// relied on by GradeLegend and any tally rendering — do not re-sort at call sites.
export const CONDITION_GRADES: ConditionMeta[] = [
  {
    grade: 'fresh',
    label: 'Fresh',
    definition: 'Discarded so recently the edges are still sharp; reads as if it might yet be picked back up.',
  },
  {
    grade: 'intact',
    label: 'Intact',
    definition: 'Whole and legible, but settled — plainly finished with, its surfaces beginning to dull.',
  },
  {
    grade: 'fragmentary',
    label: 'Fragmentary',
    definition: 'Survives only in pieces; enough remains to date and read, but the whole is broken.',
  },
  {
    grade: 'dissolved',
    label: 'Dissolved',
    definition: 'Nearly gone — an outline in the record where the substance has worn away to almost nothing.',
  },
  {
    grade: 'never-activated',
    label: 'Never activated',
    definition: 'Complete and unblemished, yet never once put to use — built, and never fired.',
  },
  {
    grade: 'lost',
    label: 'Lost',
    definition: 'Gone without trace; known only that it once existed. Nothing survives to quote or grade further.',
  },
]

const BY_GRADE: Record<Grade, ConditionMeta> = Object.fromEntries(
  CONDITION_GRADES.map((c) => [c.grade, c]),
) as Record<Grade, ConditionMeta>

/** All six grades in their canonical decay-then-orthogonal order (#523). */
export const CONDITION_ORDER: Grade[] = CONDITION_GRADES.map((c) => c.grade)

/** Look up one grade's {label, definition}. Falls back to `lost` for an
 *  unknown grade — the safest read: it claims nothing survived rather than
 *  fabricating a preservation state the record can't support. */
export function conditionMeta(grade: Grade | undefined): ConditionMeta {
  return (grade && BY_GRADE[grade]) || BY_GRADE.lost
}
