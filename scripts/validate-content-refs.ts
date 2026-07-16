// Referential-integrity + MDC structural checks (issue #446), a sibling to
// `validate-content.ts` in the same fast pre-build step. Where that script
// validates each Document's *shape* against its Collection's Zod schema in
// isolation, this one validates *cross-references between* Documents, and a
// page's Markdown **body** — neither of which a per-document `safeParse` can
// see. Two things sail through `validate-content.ts` today that this catches:
//
//   - A food-web `interactions` edge (or an `observations.specimen`) naming a
//     slug that isn't a real Specimen `pages` Document in the same Biome —
//     each field is independently a valid string, so the schema has nothing
//     to reject.
//   - A Specimen page's MDC body: an `::phase-note{of="X"}` naming a phase the
//     page never declared, an `::sighting{date="D"}` citing no real ledger
//     entry, more/fewer than one `::phase-note` per declared phase, more/fewer
//     than one `::almanac`, or an MDC container left unclosed (the regression
//     that motivated this: an unclosed `::almanac` silently degrades to plain
//     prose — no schema violation, no render error, ADR-0004 gap).
//   - A Midden `artifacts` Document's `site` naming no real `pages` slug in
//     the same (Tenant, Space), its `stratum` being blank, or its `provenance`
//     reference being obviously malformed (issue #520 — see the
//     "Provenance existence check" block comment below for the deliberately
//     soft scope).
//
// Scope: this pass only fires on a (Tenant, Space) that actually has an
// Atlas-shaped collection (a `pages` Document with `phenology`, alongside
// `interactions`/`observations`) or a Midden-shaped `artifacts` collection —
// it is a no-op for `journal`/`blog`, whose `pages` Documents never declare
// `phenology` and never have an `artifacts` sibling.
//
// Usage:  pnpm validate:content   (runs this after validate-content.ts;
//         see package.json)       Exits 0 if every reference resolves and
//                                 every Specimen body is structurally sound,
//                                 1 otherwise.
import { execFileSync } from 'node:child_process'
import { globSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { expand, loadManifests, root, type ExpandedCollection } from '../shared/expand.ts'
import { DIG_SEASON_SLUGS } from '../layers/midden/app/utils/strata.ts'
import { parseDocument, splitFrontmatter } from './validate-content.ts'

export interface RefViolation {
  /** The collection key (e.g. `atlas_canopy_pages`) or interactions/observations key. */
  key: string
  /** Path to the offending file, relative to the repo root. */
  file: string
  messages: string[]
}

export interface RefReport {
  /** (Tenant, Space) groups actually checked — i.e. ones that had a `pages`
   *  Collection to build a Specimen-slug set from. */
  groupsChecked: number
  filesChecked: number
  violations: RefViolation[]
}

// ── MDC body scanning ────────────────────────────────────────────────────────
// A colon-fenced directive — `::tag{attrs}` (a "leaf") or `:::tag{attrs}` (a
// "container", may nest a leaf inside) — is closed by a bare line of the SAME
// colon count. This mirrors every Specimen body in the repo today (verified
// against all 15): `::almanac`/`::sighting` are 2-colon leaves, `:::phase-note`
// is a 3-colon container. This is deliberately a lighter structural scan, not
// a full MDC/remark-directive parser (see issue #446's design note) — it is
// provably sufficient to catch the unclosed-container regression: an unclosed
// tag leaves its stack entry unpopped at end-of-body.

export interface DirectiveInstance {
  tag: string
  attrs: Record<string, string>
  line: number
}

export interface UnclosedDirective {
  tag: string
  /** How many colons the opening fence used — so the message can show the exact
   *  fence a matching close needs (`::`/`:::`/…). */
  colons: number
  line: number
}

const OPEN_RE = /^(:{2,})([a-zA-Z][\w-]*)(\{[^}]*\})?\s*$/
const CLOSE_RE = /^(:{2,})\s*$/
const ATTR_RE = /([\w-]+)\s*=\s*"([^"]*)"/g

function parseAttrs(raw: string | undefined): Record<string, string> {
  const attrs: Record<string, string> = {}
  if (!raw) return attrs
  for (const m of raw.matchAll(ATTR_RE)) attrs[m[1] as string] = m[2] as string
  return attrs
}

/** Scan a page body for colon-fenced MDC directives. Skips fenced code blocks
 *  (` ``` `) so a colon-only line inside a code sample is never mistaken for a
 *  directive close. Returns every directive instance found (whether or not it
 *  was ever closed) plus the directives still open at end-of-body. */
export function scanDirectives(body: string): { instances: DirectiveInstance[]; unclosed: UnclosedDirective[] } {
  const stack: { tag: string; colons: number; line: number }[] = []
  const instances: DirectiveInstance[] = []
  const unclosed: UnclosedDirective[] = []
  let inCodeFence = false

  const lines = body.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const trimmed = (lines[i] as string).trim()
    if (trimmed.startsWith('```')) {
      inCodeFence = !inCodeFence
      continue
    }
    if (inCodeFence) continue

    const open = OPEN_RE.exec(trimmed)
    if (open) {
      const colons = (open[1] as string).length
      const tag = open[2] as string
      stack.push({ tag, colons, line: i + 1 })
      instances.push({ tag, attrs: parseAttrs(open[3]), line: i + 1 })
      continue
    }
    const close = CLOSE_RE.exec(trimmed)
    if (close) {
      const colons = (close[1] as string).length
      for (let j = stack.length - 1; j >= 0; j--) {
        if (stack[j]!.colons === colons) {
          // Report nested entries the truncation below is about to discard —
          // still open above the match, so this close never reached them —
          // the same way an unclosed entry left open at end-of-body is reported.
          for (const dropped of stack.slice(j + 1)) unclosed.push({ ...dropped })
          stack.length = j
          break
        }
      }
    }
  }

  unclosed.push(...stack.map((s) => ({ tag: s.tag, colons: s.colons, line: s.line })))
  unclosed.sort((a, b) => a.line - b.line)
  return { instances, unclosed }
}

// ── Reference-resolution table ──────────────────────────────────────────────
// A tag absent from this table is not checked — a future reference-bearing tag
// (e.g. `:season{of}` against `GLASS_SEASONS`) is a small, local addition here.
// `::season-note`/`:season` themselves (enumerated in issue #446) are
// intentionally absent: those components were retired from atlas content (0
// occurrences today), so there's nothing to resolve — the table stays
// extensible if they return.

interface PageRefContext {
  /** This page's own declared `phenology.phases[].name` set. */
  phaseNames: Set<string>
  /** Every `observations.date` in this (Tenant, Space) — the biome's ledger. */
  observationDates: Set<string>
}

interface TagResolver {
  /** The attribute holding the reference value, e.g. `of` or `date`. */
  attr: string
  /** The failure message (sans context) when `value` does not resolve, or `null` when it does. */
  resolve: (value: string, ctx: PageRefContext) => string | null
}

const TAG_RESOLVERS: Record<string, TagResolver> = {
  'phase-note': {
    attr: 'of',
    resolve: (value, ctx) =>
      ctx.phaseNames.has(value)
        ? null
        : `names no phase this page declares (declared: ${[...ctx.phaseNames].join(', ') || '(none)'})`,
  },
  sighting: {
    attr: 'date',
    resolve: (value, ctx) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'is not a valid "YYYY-MM-DD" date'
      return ctx.observationDates.has(value) ? null : "matches no observation in this biome's field log"
    },
  },
}

// ── Per-Specimen-body checks (structural + reference resolution) ───────────

function checkSpecimenBody(body: string, phaseNames: Set<string>, observationDates: Set<string>): string[] {
  const msgs: string[] = []
  const { instances, unclosed } = scanDirectives(body)

  for (const u of unclosed) {
    const fence = ':'.repeat(u.colons)
    msgs.push(`line ${u.line}: "${fence}${u.tag}" is never closed (no matching bare "${fence}" line found)`)
  }

  const almanacCount = instances.filter((i) => i.tag === 'almanac').length
  if (almanacCount !== 1) {
    msgs.push(`expected exactly one "::almanac" block, found ${almanacCount}`)
  }

  const phaseNoteCounts = new Map<string, number>()
  for (const inst of instances) {
    if (inst.tag === 'phase-note') {
      const of = inst.attrs.of
      if (of !== undefined) phaseNoteCounts.set(of, (phaseNoteCounts.get(of) ?? 0) + 1)
    }

    const resolver = TAG_RESOLVERS[inst.tag]
    if (!resolver) continue
    const value = inst.attrs[resolver.attr]
    if (value === undefined) {
      msgs.push(`line ${inst.line}: "::${inst.tag}" has no "${resolver.attr}" attribute to resolve`)
      continue
    }
    const err = resolver.resolve(value, { phaseNames, observationDates })
    if (err) msgs.push(`line ${inst.line}: ${inst.tag}{${resolver.attr}="${value}"} ${err}`)
  }

  for (const phase of phaseNames) {
    const count = phaseNoteCounts.get(phase) ?? 0
    if (count !== 1) msgs.push(`phase "${phase}" has ${count} "::phase-note" block(s) in the body; expected exactly 1`)
  }

  return msgs
}

// ── Collection-level checks (interactions / observations) ──────────────────

function checkInteractions(
  col: ExpandedCollection,
  projectRoot: string,
  specimenSlugs: Set<string>,
  violations: RefViolation[],
): number {
  const cwd = join(projectRoot, col.cwdRel)
  let checked = 0
  for (const rel of globSync(col.include, { cwd })) {
    checked++
    const data = parseDocument(join(cwd, rel))
    const file = join(col.cwdRel, rel)
    const msgs: string[] = []
    const from = typeof data.from === 'string' ? data.from : undefined
    const to = typeof data.to === 'string' ? data.to : undefined
    if (from !== undefined && !specimenSlugs.has(from)) msgs.push(`from: "${from}" is not a Specimen in this biome`)
    if (to !== undefined && !specimenSlugs.has(to)) msgs.push(`to: "${to}" is not a Specimen in this biome`)
    if (from !== undefined && to !== undefined && from === to) {
      msgs.push(`from/to: self-edge ("${from}" → "${to}") is not allowed`)
    }
    if (msgs.length) violations.push({ key: col.key, file, messages: msgs })
  }
  return checked
}

function checkObservations(
  col: ExpandedCollection,
  projectRoot: string,
  specimenSlugs: Set<string>,
  violations: RefViolation[],
): { checked: number; dates: Set<string> } {
  const cwd = join(projectRoot, col.cwdRel)
  const dates = new Set<string>()
  let checked = 0
  for (const rel of globSync(col.include, { cwd })) {
    checked++
    const data = parseDocument(join(cwd, rel))
    if (typeof data.date === 'string') dates.add(data.date)
    const specimen = typeof data.specimen === 'string' ? data.specimen : undefined
    if (specimen !== undefined && !specimenSlugs.has(specimen)) {
      violations.push({
        key: col.key,
        file: join(col.cwdRel, rel),
        messages: [`specimen: "${specimen}" is not a Specimen in this biome`],
      })
    }
  }
  return { checked, dates }
}

// ── Collection-level check (artifacts / Midden, issues #518/#519/#520) ─────
//
// A Midden `artifacts` Document's `site` is a cross-reference this pass
// validates the same way `checkInteractions`/`checkObservations` validate
// Atlas's `from`/`to`/`specimen` — a string field the per-document Zod schema
// cannot check against a sibling Document's real slug set.

/**
 * `stratum` cross-checks against the canonical dig-season list
 * (`layers/midden/app/utils/strata.ts`'s `DIG_SEASON_SLUGS`, per
 * `layers/midden/CONTEXT.md`'s "Dig season" term) — a value that isn't a
 * real dig-season slug is caught here the same way `checkInteractions`/
 * `checkObservations` catch a slug naming no real Specimen (issue #519).
 */
function checkStratum(stratum: string): string[] {
  if (stratum.trim() === '') return ['stratum: must not be empty']
  if (!DIG_SEASON_SLUGS.includes(stratum)) {
    return [`stratum: "${stratum}" is not a known dig season (expected one of: ${DIG_SEASON_SLUGS.join(', ')})`]
  }
  return []
}

/**
 * Provenance existence check (issue #520). The goal is catching a TYPO'd
 * provenance reference, not proving the referent is still live — a
 * `dissolved`/`lost` Artifact's referent is EXPECTED to be gone (that's the
 * whole point of cataloguing it). And CI checks out with `actions/checkout@v7`
 * and no `fetch-depth` override (`.github/workflows/gate.yml`), so CI's own
 * clone is SHALLOW — it can prove a hash is malformed, but it can never prove
 * a well-formed hash's commit doesn't exist (only that it isn't reachable from
 * the shallow tip). So this check is deliberately soft:
 *   - `commit`: format-validate `hash` (hex, 7-40 chars) — a malformed hash is
 *     always a violation. A well-formed hash gets a best-effort
 *     `git cat-file -e` confirmation attempt, but a failed lookup is NEVER
 *     itself a violation (it fails constantly on a shallow clone, or on a
 *     hash from history genuinely not fetched) — only a genuinely malformed
 *     hash is.
 *   - `file`: no strong check is possible without full history either —
 *     validate `path` is a plausible repo-relative path (non-empty, no
 *     leading "/", reasonable characters) and stop there.
 *   - `branch`: validate `name` is non-empty and slug-like.
 *   - `dependency`/`skill`: validate `name` is non-empty.
 *   - `pr`: nothing to add — `number` is already `z.number().int().positive()`
 *     in the Zod schema.
 * Don't "fix" this into a deep-history dependency — the shallow-clone
 * constraint above is the point, not a gap.
 */
function checkProvenance(provenance: unknown, projectRoot: string): string[] {
  const p = provenance && typeof provenance === 'object' ? (provenance as Record<string, unknown>) : {}
  const kind = typeof p.kind === 'string' ? p.kind : undefined

  switch (kind) {
    case 'commit': {
      const hash = typeof p.hash === 'string' ? p.hash : ''
      if (!/^[0-9a-fA-F]{7,40}$/.test(hash)) {
        return [`provenance.hash: "${hash}" does not look like a plausible git hash (7-40 hex chars)`]
      }
      // Best-effort confirmation only — see the block comment above for why a
      // failed lookup here never becomes a violation.
      try {
        execFileSync('git', ['cat-file', '-e', `${hash}^{commit}`], { cwd: projectRoot, stdio: 'ignore' })
      } catch {
        // Not found on this (possibly shallow) clone — not evidence of a typo.
      }
      return []
    }
    case 'file': {
      const path = typeof p.path === 'string' ? p.path : ''
      if (path.trim() === '' || path.startsWith('/') || !/^[\w./-]+$/.test(path)) {
        return [`provenance.path: "${path}" is not a plausible repo-relative path`]
      }
      return []
    }
    case 'branch': {
      const name = typeof p.name === 'string' ? p.name : ''
      if (name.trim() === '' || !/^[\w][\w./-]*$/.test(name)) {
        return [`provenance.name: "${name}" is not a plausible branch name`]
      }
      return []
    }
    case 'dependency':
    case 'skill': {
      const name = typeof p.name === 'string' ? p.name : ''
      if (name.trim() === '') return [`provenance.name: must not be empty`]
      return []
    }
    case 'pr':
      return [] // `number`'s shape is already schema-enforced.
    default:
      return [] // an unrecognized/missing "kind" is a schema violation, not this pass's job.
  }
}

function checkArtifacts(
  col: ExpandedCollection,
  projectRoot: string,
  siteSlugs: Set<string>,
  violations: RefViolation[],
): number {
  const cwd = join(projectRoot, col.cwdRel)
  let checked = 0
  for (const rel of globSync(col.include, { cwd })) {
    checked++
    const data = parseDocument(join(cwd, rel))
    const file = join(col.cwdRel, rel)
    const msgs: string[] = []

    const site = typeof data.site === 'string' ? data.site : undefined
    if (site !== undefined && !siteSlugs.has(site)) {
      msgs.push(`site: "${site}" is not a "pages" Document in this Space`)
    }

    if (typeof data.stratum === 'string') msgs.push(...checkStratum(data.stratum))

    msgs.push(...checkProvenance(data.provenance, projectRoot))

    if (msgs.length) violations.push({ key: col.key, file, messages: msgs })
  }
  return checked
}

// ── Main pass ────────────────────────────────────────────────────────────────

interface PhenologyFrontmatter {
  phenology?: { phases?: { name?: unknown }[] }
}

function phaseNamesOf(frontmatter: Record<string, unknown>): Set<string> {
  const fm = frontmatter as PhenologyFrontmatter
  const names = (fm.phenology?.phases ?? [])
    .map((p) => p.name)
    .filter((n): n is string => typeof n === 'string')
  return new Set(names)
}

/** Group expanded collections by (tenant, space) and run the referential +
 *  structural checks on every group that has a `pages` Collection — pure aside
 *  from the file reads, mirroring `validateContent()` in `validate-content.ts`. */
export function validateReferences(cols: ExpandedCollection[], projectRoot = root): RefReport {
  const violations: RefViolation[] = []
  let filesChecked = 0
  let groupsChecked = 0

  const groups = new Map<string, ExpandedCollection[]>()
  for (const c of cols) {
    const gk = `${c.tenant}/${c.space}`
    const list = groups.get(gk)
    if (list) list.push(c)
    else groups.set(gk, [c])
  }

  for (const groupCols of groups.values()) {
    const pagesCol = groupCols.find((c) => c.collection === 'pages' && c.type === 'page')
    if (!pagesCol) continue // no routed guide in this Space — nothing to key Specimens off

    const pagesCwd = join(projectRoot, pagesCol.cwdRel)
    const pageRelFiles = globSync(pagesCol.include, { cwd: pagesCwd }).sort()

    const specimenSlugs = new Set<string>()
    const pageBodies = new Map<string, { file: string; frontmatter: Record<string, unknown>; body: string }>()
    for (const rel of pageRelFiles) {
      filesChecked++
      const slug = rel.replace(/\.md$/, '')
      if (slug === 'index') continue // the Biome landing page, not a Specimen
      const raw = readFileSync(join(pagesCwd, rel), 'utf8')
      const { frontmatter, body } = splitFrontmatter(raw)
      specimenSlugs.add(slug)
      pageBodies.set(slug, { file: join(pagesCol.cwdRel, rel), frontmatter, body })
    }

    const interactionsCol = groupCols.find((c) => c.collection === 'interactions')
    const observationsCol = groupCols.find((c) => c.collection === 'observations')
    const artifactsCol = groupCols.find((c) => c.collection === 'artifacts')
    if (
      !interactionsCol &&
      !observationsCol &&
      !artifactsCol &&
      ![...pageBodies.values()].some((p) => phaseNamesOf(p.frontmatter).size > 0)
    ) {
      continue // an ordinary (non-Atlas/Midden-shaped) pages-only Space — nothing this pass can check
    }
    groupsChecked++

    if (interactionsCol) filesChecked += checkInteractions(interactionsCol, projectRoot, specimenSlugs, violations)

    let observationDates = new Set<string>()
    if (observationsCol) {
      const result = checkObservations(observationsCol, projectRoot, specimenSlugs, violations)
      filesChecked += result.checked
      observationDates = result.dates
    }

    if (artifactsCol) filesChecked += checkArtifacts(artifactsCol, projectRoot, specimenSlugs, violations)

    for (const { file, frontmatter, body } of pageBodies.values()) {
      const phaseNames = phaseNamesOf(frontmatter)
      if (phaseNames.size === 0) continue // not a Specimen field note (no phenology declared)
      const msgs = checkSpecimenBody(body, phaseNames, observationDates)
      if (msgs.length) violations.push({ key: pagesCol.key, file, messages: msgs })
    }
  }

  return { groupsChecked, filesChecked, violations }
}

// ── CLI ─────────────────────────────────────────────────────────────────────

function printReport(report: RefReport): void {
  for (const v of report.violations) {
    console.error(`\n${v.key}  (${v.file})`)
    for (const m of v.messages) console.error(`  - ${m}`)
  }
  const status = report.violations.length === 0 ? 'PASS' : 'FAIL'
  console.log(
    `\nvalidate-content-refs: ${status} — ${report.groupsChecked} (tenant,space) group(s), ` +
      `${report.filesChecked} file(s) checked, ${report.violations.length} violation(s)`,
  )
}

function main(): void {
  const report = validateReferences(expand(loadManifests()), root)
  printReport(report)
  if (report.violations.length > 0) process.exit(1)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
