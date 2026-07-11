// Pure presentation logic for the Atlas layer — rarity marks, the food-web
// relationship model (#70/#71), activity-rhythm geometry (#73), and color-
// signature CSS. Split out of the SFCs so the fiddly, correctness-sensitive parts
// (reverse-edge derivation, band math) are unit-testable without Nuxt, matching
// the journal Tenant's `utils/dashboard` pattern. Nuxt-free on purpose: the SFCs
// pass plain data in.

// ── Rarity (#69) ─────────────────────────────────────────────────────────────
export type Rarity = 'abundant' | 'common' | 'uncommon' | 'rare' | 'mythic'

export interface RarityMeta {
  grade: Rarity
  /** Filled dots out of five — the specimen-index / label mark. `mythic` is a lone star. */
  dots: number
  /** The single glyph used where a compact mark is wanted (food web, tight labels). */
  mark: string
  /** The naturalist's gloss for the legend. */
  gloss: string
}

// Ordered least → most precious. The dots ladder (5→1) reads "everywhere → almost
// never"; mythic breaks the ladder with a star, earning its extra ceremony (#69).
export const RARITIES: RarityMeta[] = [
  { grade: 'abundant', dots: 5, mark: '●', gloss: 'underfoot, daily' },
  { grade: 'common', dots: 4, mark: '●', gloss: 'seen most visits' },
  { grade: 'uncommon', dots: 3, mark: '◐', gloss: 'worth a note' },
  { grade: 'rare', dots: 2, mark: '◆', gloss: 'worth a plate' },
  { grade: 'mythic', dots: 0, mark: '✦', gloss: 'reported, never twice by the same observer' },
]

const RARITY_BY_GRADE: Record<Rarity, RarityMeta> = Object.fromEntries(
  RARITIES.map((r) => [r.grade, r]),
) as Record<Rarity, RarityMeta>

export function rarityMeta(grade: Rarity | undefined): RarityMeta {
  return (grade && RARITY_BY_GRADE[grade]) || RARITY_BY_GRADE.common
}

// ── Relationships / food web (#70/#71) ───────────────────────────────────────
export type InteractionKind = 'preys-on' | 'pollinates' | 'mimics' | 'shelters' | 'fears'

/** One authored directed edge (an `interactions` Document). */
export interface Edge {
  from: string
  to: string
  kind: InteractionKind
  note: string
}

/** How an edge reads from a given specimen's side. `out` = this specimen is the
 *  `from` (actor); `in` = it is the `to` (acted-upon), so the reverse label shows. */
export type Direction = 'out' | 'in'

const FORWARD: Record<InteractionKind, string> = {
  'preys-on': 'preys on',
  pollinates: 'pollinates',
  mimics: 'mimics',
  shelters: 'shelters',
  fears: 'fears',
}
const REVERSE: Record<InteractionKind, string> = {
  'preys-on': 'preyed on by',
  pollinates: 'pollinated by',
  mimics: 'mimicked by',
  shelters: 'sheltered by',
  fears: 'feared by',
}

/** The label an edge wears from one side — the single move that makes both
 *  directions visible from one authored fact (#71: "a creature knows its
 *  predators as well as its prey"). */
export function relationLabel(kind: InteractionKind, dir: Direction): string {
  return dir === 'out' ? FORWARD[kind] : REVERSE[kind]
}

/** A relation as it appears in one specimen's Relations section. */
export interface Relation {
  /** The counterpart specimen's slug. */
  other: string
  kind: InteractionKind
  dir: Direction
  /** The side-aware phrase, e.g. "pollinates" or "preyed on by". */
  label: string
  note: string
}

/** Every relation touching `slug`, from that specimen's point of view — both the
 *  edges it authors (`out`) and the edges that name it (`in`). Deterministically
 *  ordered so the section is stable across renders. Same-biome data only (the
 *  caller passes this biome's edges), so no cross-Space read (mirrors ADR-0012). */
export function relationsFor(slug: string, edges: Edge[]): Relation[] {
  const out: Relation[] = []
  for (const e of edges) {
    if (e.from === slug) {
      out.push({ other: e.to, kind: e.kind, dir: 'out', label: relationLabel(e.kind, 'out'), note: e.note })
    } else if (e.to === slug) {
      out.push({ other: e.from, kind: e.kind, dir: 'in', label: relationLabel(e.kind, 'in'), note: e.note })
    }
  }
  return out.sort((a, b) => a.label.localeCompare(b.label) || a.other.localeCompare(b.other))
}

// ── Activity rhythm (#73) ────────────────────────────────────────────────────
export type Band = [number, number]

/** True when hour `h` (0–23) falls inside any of a Specimen's active bands.
 *  Bands may wrap past midnight (e.g. [20, 4] means 20:00→04:00), so the wrap
 *  case is handled. Named with Specimen vocabulary, not generic `activeAt` —
 *  the auto-import namespace is global across every layer (tenant-layers.md
 *  §1), and `activeAt` is exactly generic enough for another Tenant to mint. */
export function specimenActiveAt(hour: number, bands: Band[]): boolean {
  return bands.some(([a, b]) => (a <= b ? hour >= a && hour < b : hour >= a || hour < b))
}

/** 24 booleans, midnight→midnight — the rhythm band's cells. */
export function rhythmCells(bands: Band[]): boolean[] {
  return Array.from({ length: 24 }, (_, h) => specimenActiveAt(h, bands))
}

// ── Color signature (#68) ────────────────────────────────────────────────────
export interface SignatureColor {
  name: string
  hex: string
}

// ── Specimen view model ──────────────────────────────────────────────────────
// The shape the pages project each `pages` Document into before handing it to
// the presentational components — so components never touch Nuxt Content's
// generated item types. Built once per page from the queried docs.
export interface SpecimenView {
  /** Path without the leading slash — the id interactions reference. */
  slug: string
  /** Space-relative document path (leading '/'). */
  path: string
  binomial: string // the page title
  common: string // commonName, or a fallback
  blurb: string // the page description — the index's one-line character
  classification?: string
  rarity?: Rarity
  size?: string
  diet?: string
  activity?: { label: string; bands: Band[] }
  signature?: { colors: SignatureColor[]; gloss: string }
  plate?: { number: string; conjectural?: boolean }
  illustration?: string
}

/** Specimen document path → slug: '/lumina-fabulae' → 'lumina-fabulae'; the Space
 *  root is ''. Named with Specimen vocabulary, not generic `slugOf` — same
 *  collision-risk reasoning as `specimenActiveAt` above (tenant-layers.md §1). */
export function specimenSlugOf(path: string): string {
  return path.replace(/^\//, '')
}

/** The subset of a queried `pages` Document the view is built from — a structural
 *  type so the pure mapper stays Nuxt-free while accepting the generated item. */
export interface RawSpecimenDoc {
  path: string
  title?: string
  description?: string
  commonName?: string
  classification?: string
  rarity?: Rarity
  size?: string
  diet?: string
  activity?: { label: string; bands: Band[] }
  signature?: { colors: SignatureColor[]; gloss: string }
  plate?: { number: string; conjectural?: boolean }
  illustration?: string
}

/** Project a queried Specimen Document into the view model the components read. */
export function toSpecimenView(d: RawSpecimenDoc): SpecimenView {
  return {
    slug: specimenSlugOf(d.path),
    path: d.path,
    binomial: d.title ?? specimenSlugOf(d.path),
    common: d.commonName ?? d.description ?? '',
    blurb: d.description ?? '',
    classification: d.classification,
    rarity: d.rarity,
    size: d.size,
    diet: d.diet,
    activity: d.activity,
    signature: d.signature,
    plate: d.plate,
    illustration: d.illustration,
  }
}

/** Inline CSS custom properties for a specimen's color signature — `--sig-1..3`,
 *  with `--sig-1` doubling as the catch-all accent. Applied to the specimen's own
 *  artifacts only; the biome palette still owns the frame (#68). */
export function signatureVars(colors: SignatureColor[] | undefined): Record<string, string> {
  const vars: Record<string, string> = {}
  ;(colors ?? []).slice(0, 3).forEach((c, i) => {
    vars[`--sig-${i + 1}`] = c.hex
  })
  return vars
}
