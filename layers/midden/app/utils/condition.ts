// The single-homed condition-grade table for the Midden Tenant (#523/#526/#527).
// Every condition-aware component — ConditionGlyph, ConditionTooltip, GradeLegend
// — reads its glyph, label, and definition FROM HERE; the definition string is
// authored exactly once (#527: never a second copy of the tooltip/legend text).
// The tenant.config.ts `condition` enum backs this table's `grade` values.
//
// Nuxt-free on purpose (mirrors layers/atlas/app/utils/biomes.ts): the SFCs read
// the exported table and lookup helper, so the ordering guarantee and the glyph
// geometry are unit-testable without Nuxt. Lives in `utils/` so Nuxt auto-imports
// the exports into the layer's components.

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
  /** The curator's short display label, shown as visible text beside the glyph. */
  label: string
  /** The one-line, fixed, curator-voice definition — the tooltip AND legend text
   *  (#527). Authored once, here; never re-authored at a call site. */
  definition: string
  /** The named glyph geometry this grade renders (see GLYPHS below). Two grades
   *  never share a glyph — never-activated and lost are deliberately distinct. */
  glyph: GlyphName
}

// ── Glyph geometry (#523) ────────────────────────────────────────────────────
// The visual encoding is NOT a linear ramp. It is single-homed here as inline
// SVG path/rendering data so ConditionGlyph.vue stays a thin renderer; the shape
// family's meaning is the locked part, the exact coordinates are ours.
//
//   Erosion axis (a filled sherd, decaying):
//     fresh        — solid, crisp full disc.
//     intact       — solid disc, softened (rounded, gently feathered edge).
//     fragmentary  — the disc visibly broken: a gap bitten out of the body.
//     dissolved    — an eroded, low-opacity boundary; the body all but gone.
//   Orthogonal axis:
//     never-activated — crisp FULL outline, UNFILLED. "Complete but never fired."
//     lost            — its own gravestone silhouette: a hollow arch-top (rounded
//                       top, flat base) outline. Deliberately a DIFFERENT outline
//                       shape from never-activated's circle, so the two most-
//                       confusable grades read as clearly distinct (#523).
export type GlyphName = Grade

/** How one glyph is drawn, in a 24×24 viewBox. `fill`/`stroke`/`opacity` toggles
 *  keep ConditionGlyph.vue declarative — it maps these onto the SVG element. */
export interface GlyphSpec {
  /** SVG path `d` for the glyph body. */
  d: string
  /** Whether the body is filled (erosion axis) or outline-only (orthogonal axis). */
  filled: boolean
  /** Body opacity 0–1 — dissolved reads as an all-but-gone boundary. */
  opacity: number
  /** Soft edge: intact/dissolved get a gentle feathering; crisp grades don't. */
  soft: boolean
}

// A centred disc for the erosion axis. `fresh` and `never-activated` share this
// circle geometry but differ on `filled` — that is the encoding, not an accident.
const DISC = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z'
// The fragmentary sherd: an arc with a wedge bitten out of the lower-right, so
// the body reads as broken rather than merely small — two disc segments with a
// missing quadrant between them.
const SHERD_BROKEN =
  'M12 3a9 9 0 0 0-6.36 15.36L12 12ZM12 3a9 9 0 0 1 8.49 6 9 9 0 0 1 .2 5L12 12Z'
// The gravestone: a hollow headstone — rounded arch top, straight shoulders, flat
// base. Intentionally NOT a circle, to separate it from never-activated's outline.
const GRAVESTONE = 'M6 21V10a6 6 0 0 1 12 0v11Z'

export const GLYPHS: Record<GlyphName, GlyphSpec> = {
  fresh: { d: DISC, filled: true, opacity: 1, soft: false },
  intact: { d: DISC, filled: true, opacity: 0.9, soft: true },
  fragmentary: { d: SHERD_BROKEN, filled: true, opacity: 0.95, soft: false },
  dissolved: { d: DISC, filled: true, opacity: 0.32, soft: true },
  'never-activated': { d: DISC, filled: false, opacity: 1, soft: false },
  lost: { d: GRAVESTONE, filled: false, opacity: 1, soft: false },
}

// The one authored table. Order IS the decay-then-orthogonal order (#523) and is
// relied on by GradeLegend and any tally rendering — do not re-sort at call sites.
export const CONDITION_GRADES: ConditionMeta[] = [
  {
    grade: 'fresh',
    label: 'Fresh',
    definition: 'Discarded so recently the edges are still sharp; reads as if it might yet be picked back up.',
    glyph: 'fresh',
  },
  {
    grade: 'intact',
    label: 'Intact',
    definition: 'Whole and legible, but settled — plainly finished with, its surfaces beginning to dull.',
    glyph: 'intact',
  },
  {
    grade: 'fragmentary',
    label: 'Fragmentary',
    definition: 'Survives only in pieces; enough remains to date and read, but the whole is broken.',
    glyph: 'fragmentary',
  },
  {
    grade: 'dissolved',
    label: 'Dissolved',
    definition: 'Nearly gone — an outline in the record where the substance has worn away to almost nothing.',
    glyph: 'dissolved',
  },
  {
    grade: 'never-activated',
    label: 'Never activated',
    definition: 'Complete and unblemished, yet never once put to use — built, and never fired.',
    glyph: 'never-activated',
  },
  {
    grade: 'lost',
    label: 'Lost',
    definition: 'Gone without trace; known only that it once existed. Nothing survives to quote or grade further.',
    glyph: 'lost',
  },
]

const BY_GRADE: Record<Grade, ConditionMeta> = Object.fromEntries(
  CONDITION_GRADES.map((c) => [c.grade, c]),
) as Record<Grade, ConditionMeta>

/** All six grades in their canonical decay-then-orthogonal order (#523). */
export const CONDITION_ORDER: Grade[] = CONDITION_GRADES.map((c) => c.grade)

/** Look up one grade's {label, definition, glyph}. Falls back to `lost` for an
 *  unknown grade — the safest read: it claims nothing survived rather than
 *  fabricating a preservation state the record can't support. */
export function conditionMeta(grade: Grade | undefined): ConditionMeta {
  return (grade && BY_GRADE[grade]) || BY_GRADE.lost
}

/** The glyph geometry for a grade, via its meta. */
export function glyphFor(grade: Grade | undefined): GlyphSpec {
  return GLYPHS[conditionMeta(grade).glyph]
}
