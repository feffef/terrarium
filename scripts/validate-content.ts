// Fast, local, content-only validation (issue #133). Validates every Tenant's
// content against its Collection's Zod schema WITHOUT paying the cost of a
// full `nuxt build` + `pnpm test:e2e` — a content-only Markdown/YAML edit
// shouldn't need the whole safety gate (ADR-0004) just to see a typo'd
// frontmatter field.
//
// Why this exists rather than trusting `pnpm build`: `nuxt build` parses every
// content file into the SQLite content DB using each Collection's Zod schema
// only to derive SQL *column types* (`generateCollectionTableDefinition` /
// `generateCollectionInsert` in `@nuxt/content`) — it does not actually run
// the schema's `safeParse` against the parsed frontmatter anywhere in that
// path. A `.strict()` schema's extra-field check, an enum's membership check,
// a `.refine()` — none of them reject the build today. (Verified empirically
// while building this script: an out-of-enum `fromPersona` and an extra field
// on a `.strict()` Pingback both sailed through a clean `pnpm build`.) So this
// script is not a "fast subset" of an existing check — it is the first place
// these Collection schemas actually get evaluated against real content.
//
// Reuses the single source of truth instead of re-deriving it: `loadManifests()`
// + `expand()` (`shared/expand.ts`) are the exact same calls `content.config.ts`
// makes to turn Tenant manifests into keyed collections, each carrying the
// Collection's live Zod schema object, its content dir, and its glob include
// pattern. This script only adds the file IO + `schema.safeParse()` call that
// `@nuxt/content`'s own build pipeline turns out not to make.
//
// Usage:  pnpm validate:content
//   Exits 0 if every Document matches its Collection's schema, 1 otherwise
//   (with every violation listed: collection key, file, and the Zod issue).
//
// Scope: content only. Does NOT run `pnpm test:e2e` or any other part of the
// full gate, but IS wired in as its own `pnpm gate` step and CI's dedicated
// 'L1 · content validation' job (ADR-0004 amendment, gate.yml).
import { globSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parse as parseYaml } from 'yaml'
import { expand, loadManifests, root, type ExpandedCollection } from '../shared/expand.ts'

/** Coerce a parsed YAML/JSON value into a plain object, or `{}` for anything
 *  else (`null`, a scalar, an array) — a Document's data is always a record. */
function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

export interface SchemaViolation {
  /** The collection key, e.g. `blog_david_pingbacks`. */
  key: string
  /** Path to the offending file, relative to the repo root. */
  file: string
  /** One human-readable message per failed Zod issue. */
  messages: string[]
}

export interface ValidationReport {
  collectionsChecked: number
  documentsChecked: number
  violations: SchemaViolation[]
}

/** Extract a Markdown file's leading YAML frontmatter (between the first two
 *  `---` fences). Returns `{}` when there is none — a page schema's fields
 *  are always optional additions on top of `@nuxt/content`'s built-ins
 *  (title/description/body/seo/…), which this script does not re-validate:
 *  those are synthesized by `@nuxt/content` itself, not authored frontmatter. */
function readFrontmatter(text: string): Record<string, unknown> {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return {}
  return asRecord(parseYaml(m[1] as string))
}

/** Parse one content file into the plain object its Collection schema validates
 *  against. `.md` → frontmatter only (the body isn't part of the authored
 *  schema); `.yml`/`.yaml`/`.json` → the whole file, matching how a `data`
 *  Collection's Document is entirely its frontmatter. */
function parseDocument(absPath: string): Record<string, unknown> {
  const raw = readFileSync(absPath, 'utf8')
  if (absPath.endsWith('.md')) return readFrontmatter(raw)
  if (absPath.endsWith('.yml') || absPath.endsWith('.yaml')) return asRecord(parseYaml(raw))
  if (absPath.endsWith('.json')) return asRecord(JSON.parse(raw))
  throw new Error(`don't know how to parse "${absPath}" (unsupported extension)`)
}

/** Validate every Document in every expanded Collection that carries a schema.
 *  Pure aside from the file reads — takes the already-expanded collections so
 *  it's testable against a hand-built list, not just the real `layers/` tree. */
export function validateContent(cols: ExpandedCollection[], projectRoot = root): ValidationReport {
  let documentsChecked = 0
  let collectionsChecked = 0
  const violations: SchemaViolation[] = []

  for (const col of cols) {
    const schema = col.schema
    if (!schema) continue // page Collection with no additional schema — nothing authored to check
    collectionsChecked++

    const cwd = join(projectRoot, col.cwdRel)
    const relFiles = globSync(col.include, { cwd })
    for (const rel of relFiles) {
      const absPath = join(cwd, rel)
      documentsChecked++
      let data: Record<string, unknown>
      try {
        data = parseDocument(absPath)
      } catch (err) {
        violations.push({
          key: col.key,
          file: join(col.cwdRel, rel),
          messages: [err instanceof Error ? err.message : String(err)],
        })
        continue
      }
      const res = schema.safeParse(data)
      if (!res.success) {
        violations.push({
          key: col.key,
          file: join(col.cwdRel, rel),
          messages: res.error.issues.map((i) => {
            const where = i.path.join('.')
            return where ? `${where}: ${i.message}` : i.message
          }),
        })
      }
    }
  }

  return { collectionsChecked, documentsChecked, violations }
}

// ── CLI ─────────────────────────────────────────────────────────────────────

function printReport(report: ValidationReport): void {
  for (const v of report.violations) {
    console.error(`\n${v.key}  (${v.file})`)
    for (const m of v.messages) console.error(`  - ${m}`)
  }
  const status = report.violations.length === 0 ? 'PASS' : 'FAIL'
  console.log(
    `\nvalidate-content: ${status} — ${report.collectionsChecked} collections, ` +
      `${report.documentsChecked} documents checked, ${report.violations.length} violation(s)`,
  )
}

function main(): void {
  const report = validateContent(expand(loadManifests()), root)
  printReport(report)
  if (report.violations.length > 0) process.exit(1)
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
