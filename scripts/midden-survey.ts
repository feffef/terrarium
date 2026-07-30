// The midden-survey helper: the mechanical half of the `midden-survey` Skill's
// candidate sweep (layers/midden/CONTEXT.md — "The inclusion bar"). It
// enumerates the git-derivable kinds of discarded thing — files deleted from
// `origin/main` and dependencies dropped from `package.json` — screens out what
// the machine can already rule out (noise paths, rename-detected moves, paths
// regrown in the current tree, deps re-added, candidates already catalogued as
// Midden artifacts), and prints the rest as a JSON report for the Skill to
// carry through the judgment half of the two-gate test. It decides NOTHING
// curatorial: condition, stratum, and the catalog note stay curator-authored
// (#526), and Gate A/B judgment calls stay with the running agent.
//
// PR and branch candidates are not this script's job — they live on GitHub,
// not in git, so the Skill sweeps them via the GitHub MCP tools.
//
// Usage:  tsx scripts/midden-survey.ts [--since YYYY-MM-DD]
//   Prints the JSON report. Refuses to run on a shallow clone: a grafted
//   boundary commit silently truncates the deletion history (CLAUDE.md's
//   shallow-clone rule), so a shallow sweep would report "nothing more found"
//   falsely — deepen first (`git fetch --unshallow origin main`).
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { parse as parseYaml } from 'yaml'
import { fetchOriginMain } from './git-helpers.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const FIELD_SEP = '\x1f'

// ── Types ───────────────────────────────────────────────────────────────────

/** The deleting/dropping commit a candidate points back at — the evidence the
 *  curator dates and quotes from (an artifact's `inscription` often quotes the
 *  commit subject verbatim). */
interface CommitMeta {
  hash: string
  isoDate: string
  subject: string
}

/** One file deleted from `origin/main` and (so far) not regrown. */
export interface DeletionCandidate extends CommitMeta {
  path: string
}

/** One dependency dropped from `package.json` and (so far) not re-added. */
export interface DependencyRemovalCandidate extends CommitMeta {
  name: string
}

// ── Pure core (unit-tested) ───────────────────────────────────────────────────

/**
 * Parse `git log --diff-filter=D -M --name-only --format=%H<SEP>%cI<SEP>%s`
 * output into one candidate per deleted path. `-M` matters upstream: rename
 * detection reclassifies a moved file as R, not D, so a rename never reaches
 * this parser — the cheapest mechanical slice of Gate B (identity continued
 * under a new name).
 */
export function parseDeletionLog(raw: string): DeletionCandidate[] {
  const out: DeletionCandidate[] = []
  let current: CommitMeta | undefined
  for (const line of raw.split('\n')) {
    if (line.includes(FIELD_SEP)) {
      const [hash = '', isoDate = '', subject = ''] = line.split(FIELD_SEP)
      current = { hash, isoDate, subject }
    } else if (line.trim() !== '' && current) {
      out.push({ path: line.trim(), ...current })
    }
  }
  return out
}

/**
 * Paths whose deletion is process residue, not discarded work — never Midden
 * candidates, so screened before any judgment:
 *  - `layers/journal/content/` — session logs and digests are archived by
 *    moving files (ADR-0009's machinery), so deletions there are churn;
 *  - `.claude/skills/` — symlinks mirroring `.agents/skills/`, where the real
 *    deletion (if any) already shows up.
 */
export function isNoisePath(path: string): boolean {
  return path.startsWith('layers/journal/content/') || path.startsWith('.claude/skills/')
}

/**
 * Whether a removed `"name": "value"` line from a package.json diff plausibly
 * names a dependency, not a script or metadata entry. Shape-only heuristic
 * (a diff hunk carries no block context): the name must be a valid npm package
 * name and the value a version-range-looking string. What slips through (e.g.
 * a removed top-level `"version"`) is caught by the current-manifest screen or
 * the curator — this only has to keep script-line churn out of the report.
 */
export function isDependencyLine(name: string, value: string): boolean {
  const packageName = /^(@[a-z0-9~][\w.-]*\/)?[a-z0-9~][\w.-]*$/
  const versionLike = /^([~^><=]|\d|\*|workspace:|npm:|github:|git\+|https?:\/\/|file:|latest$|next$)/
  return packageName.test(name) && !value.includes(' ') && versionLike.test(value)
}

const DIFF_DEP_LINE = /^([-+])\s*"([^"]+)":\s*"([^"]*)",?\s*$/

/**
 * Parse `git log -p --format=%H<SEP>%cI<SEP>%s -- package.json` output into
 * one candidate per dependency line removed and NOT re-added in the same
 * commit (a version bump removes and re-adds the same name — that is an
 * update, not a drop).
 */
export function parseDependencyRemovals(raw: string): DependencyRemovalCandidate[] {
  const out: DependencyRemovalCandidate[] = []
  let current: CommitMeta | undefined
  let removed: string[] = []
  let readded = new Set<string>()

  const flush = () => {
    if (!current) return
    for (const name of removed) {
      if (!readded.has(name)) out.push({ name, ...current })
    }
    removed = []
    readded = new Set()
  }

  for (const line of raw.split('\n')) {
    if (line.includes(FIELD_SEP)) {
      flush()
      const [hash = '', isoDate = '', subject = ''] = line.split(FIELD_SEP)
      current = { hash, isoDate, subject }
      continue
    }
    const m = DIFF_DEP_LINE.exec(line)
    if (!m) continue
    const [, sign = '', name = '', value = ''] = m
    if (!isDependencyLine(name, value)) continue
    if (sign === '-') removed.push(name)
    else readded.add(name)
  }
  flush()
  return out
}

/** Split deletion candidates on the mechanical half of Gate B: a path present
 *  again in the current `origin/main` tree has regrown — the corpse is not a
 *  corpse — and is reported separately rather than silently dropped, since a
 *  regrown path may interest the resurrection-minded curator too. */
export function screenRegrown(
  candidates: DeletionCandidate[],
  currentTreePaths: Set<string>,
): { gone: DeletionCandidate[]; regrown: DeletionCandidate[] } {
  const gone: DeletionCandidate[] = []
  const regrown: DeletionCandidate[] = []
  for (const c of candidates) (currentTreePaths.has(c.path) ? regrown : gone).push(c)
  return { gone, regrown }
}

/**
 * One identity key per catalogued provenance (tenant.config.ts's discriminated
 * union), so a candidate can be matched against what the trench already holds.
 * Commit hashes normalize to their 7-char prefix — artifacts quote both short
 * and full forms. Returns undefined for a shape it doesn't recognize (the
 * artifact schema should make that impossible; this just refuses to guess).
 */
export function provenanceKey(p: Record<string, unknown>): string | undefined {
  switch (p.kind) {
    case 'file':
      return typeof p.path === 'string' ? `file:${p.path}` : undefined
    case 'dependency':
    case 'branch':
    case 'skill':
      return typeof p.name === 'string' ? `${p.kind}:${p.name}` : undefined
    case 'pr':
      return typeof p.number === 'number' ? `pr:${p.number}` : undefined
    case 'commit':
      return typeof p.hash === 'string' ? `commit:${p.hash.slice(0, 7)}` : undefined
    default:
      return undefined
  }
}

/**
 * The repo path a provenance declares, for the two kinds that carry one:
 * `file` (required) and `commit` (optional — a commit-kind artifact about one
 * path names it). The other four kinds have no `path` field in the schema
 * (layers/midden/tenant.config.ts), so they screen nothing by path — inferring
 * one would be a curatorial guess, not a read (#752).
 */
export function provenancePath(p: Record<string, unknown>): string | undefined {
  if (p.kind !== 'file' && p.kind !== 'commit') return undefined
  return typeof p.path === 'string' ? p.path : undefined
}

/** What the trench and the stores already hold, in the two shapes a candidate
 *  is matched against: identity keys, and the paths artifacts declare. */
export interface CataloguedIndex {
  keys: Set<string>
  paths: Set<string>
}

export function cataloguedIndex(provenances: Record<string, unknown>[]): CataloguedIndex {
  const keys = new Set<string>()
  const paths = new Set<string>()
  for (const p of provenances) {
    const key = provenanceKey(p)
    if (key) keys.add(key)
    const path = provenancePath(p)
    if (path) paths.add(path)
  }
  return { keys, paths }
}

/**
 * Whether a deletion candidate's path is one the trench already declares. A
 * catalogued path ending in `/` denotes a directory (an artifact about a whole
 * retired folder), so it screens everything beneath it — a deletion candidate
 * is always an individual file, and exact matching would miss them all (#752).
 */
export function isCataloguedPath(path: string, cataloguedPaths: Set<string>): boolean {
  if (cataloguedPaths.has(path)) return true
  for (const catalogued of cataloguedPaths) {
    if (catalogued.endsWith('/') && path.startsWith(catalogued)) return true
  }
  return false
}

export function screenCatalogued<T>(
  candidates: T[],
  isCatalogued: (c: T) => boolean,
): { fresh: T[]; catalogued: T[] } {
  const fresh: T[] = []
  const catalogued: T[] = []
  for (const c of candidates) (isCatalogued(c) ? catalogued : fresh).push(c)
  return { fresh, catalogued }
}

// ── Git / filesystem shell (thin) ────────────────────────────────────────────

function git(args: string[], cwd = root): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

function assertNotShallow(cwd = root): void {
  if (git(['rev-parse', '--is-shallow-repository'], cwd).trim() === 'true') {
    throw new Error(
      'this clone is shallow — the deletion sweep would silently truncate at the graft boundary. ' +
        'Run `git fetch --unshallow origin main` first (CLAUDE.md, shallow-clone rule).',
    )
  }
}

function readDeletionLog(cwd = root, sinceIso?: string): string {
  const args = ['log', 'origin/main', '--diff-filter=D', '-M', '--name-only', `--format=%H${FIELD_SEP}%cI${FIELD_SEP}%s`]
  if (sinceIso) args.push(`--since=${sinceIso}`)
  return git(args, cwd)
}

function readDependencyLog(cwd = root, sinceIso?: string): string {
  const args = ['log', 'origin/main', '-p', `--format=%H${FIELD_SEP}%cI${FIELD_SEP}%s`]
  if (sinceIso) args.push(`--since=${sinceIso}`)
  args.push('--', 'package.json')
  return git(args, cwd)
}

function readCurrentTreePaths(cwd = root): Set<string> {
  return new Set(git(['ls-tree', '-r', '--name-only', 'origin/main'], cwd).split('\n').filter(Boolean))
}

/** Every dependency name in the current `origin/main` package.json, across
 *  all dep blocks — the Gate-B screen for a dropped dependency (re-added ⇒
 *  regrown). */
function readCurrentDependencyNames(cwd = root): Set<string> {
  const pkg = JSON.parse(git(['show', 'origin/main:package.json'], cwd)) as Record<string, unknown>
  const names = new Set<string>()
  for (const block of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    const deps = pkg[block]
    if (deps && typeof deps === 'object') for (const name of Object.keys(deps)) names.add(name)
  }
  return names
}

const ARTIFACTS_DIRS = ['layers/midden/content/trench/artifacts', 'layers/midden/content/stores/artifacts']

/** Every artifact already catalogued in the trench or the stores, indexed by
 *  identity key and by declared path. */
function readCataloguedIndex(cwd = root): CataloguedIndex {
  const provenances: Record<string, unknown>[] = []
  for (const dir of ARTIFACTS_DIRS) {
    for (const file of readdirSync(join(cwd, dir))) {
      if (!file.endsWith('.yml')) continue
      const doc = parseYaml(readFileSync(join(cwd, dir, file), 'utf8')) as {
        provenance?: Record<string, unknown>
      }
      if (doc.provenance) provenances.push(doc.provenance)
    }
  }
  return cataloguedIndex(provenances)
}

// ── Command ─────────────────────────────────────────────────────────────────

/** The JSON contract the `midden-survey` Skill consumes: fresh candidates on
 *  top, everything the machine screened out reported underneath (never
 *  silently dropped — CLAUDE.md's no-silent-caps discipline). */
export interface SurveyReport {
  since: string | null
  deletedFiles: DeletionCandidate[]
  droppedDependencies: DependencyRemovalCandidate[]
  screenedOut: {
    noisePaths: number
    regrownPaths: string[]
    readdedDependencies: string[]
    alreadyCatalogued: string[]
  }
}

export function surveyReport(cwd = root, sinceIso?: string): SurveyReport {
  assertNotShallow(cwd)
  // See `fetchOriginMain`'s doc comment (./git-helpers.ts) for why this is
  // called before every read, and why a failure here is left fatal.
  fetchOriginMain(cwd)

  const catalogued = readCataloguedIndex(cwd)

  const allDeletions = parseDeletionLog(readDeletionLog(cwd, sinceIso))
  const signal = allDeletions.filter((c) => !isNoisePath(c.path))
  const { gone, regrown } = screenRegrown(signal, readCurrentTreePaths(cwd))
  const files = screenCatalogued(gone, (c) => isCataloguedPath(c.path, catalogued.paths))

  const allRemovals = parseDependencyRemovals(readDependencyLog(cwd, sinceIso))
  const currentDeps = readCurrentDependencyNames(cwd)
  const stillGone = allRemovals.filter((r) => !currentDeps.has(r.name))
  const deps = screenCatalogued(stillGone, (r) => catalogued.keys.has(`dependency:${r.name}`))

  return {
    since: sinceIso ?? null,
    deletedFiles: files.fresh,
    droppedDependencies: deps.fresh,
    screenedOut: {
      noisePaths: allDeletions.length - signal.length,
      regrownPaths: regrown.map((c) => c.path),
      readdedDependencies: allRemovals.filter((r) => currentDeps.has(r.name)).map((r) => r.name),
      alreadyCatalogued: [
        ...files.catalogued.map((c) => `file:${c.path}`),
        ...deps.catalogued.map((r) => `dependency:${r.name}`),
      ],
    },
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`midden-survey: ${msg}`)
  process.exit(1)
}

function main(): void {
  const argv = process.argv.slice(2)
  let since: string | undefined
  const sinceAt = argv.indexOf('--since')
  if (sinceAt !== -1) {
    since = argv[sinceAt + 1]
    if (!since || !/^\d{4}-\d{2}-\d{2}$/.test(since)) fail('--since expects YYYY-MM-DD')
  }
  process.stdout.write(JSON.stringify(surveyReport(root, since), null, 2) + '\n')
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
}
