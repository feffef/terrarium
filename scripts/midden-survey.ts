// The midden-survey helper: the mechanical half of the `midden-survey` Skill's
// candidate sweep (layers/midden/CONTEXT.md — "The inclusion bar"). It
// enumerates the git-derivable kinds of discarded thing — files deleted from
// `origin/main` and dependencies dropped from `package.json` — screens out what
// the machine can already rule out (noise paths, files that moved rather than
// died, paths regrown in the current tree, deps re-added, candidates already
// catalogued as Midden artifacts), and prints the rest as a JSON report for the Skill to
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

/** `:<srcmode> <dstmode> <srcsha> <dstsha> <status>\t<path>[\t<newpath>]` */
const RAW_DIFF_LINE = /^:\d{6} \d{6} ([0-9a-f]+) [0-9a-f]+ ([DR])\d*\t(.*)$/

/** `<mode> blob <sha>\t<path>` */
const LS_TREE_LINE = /^\d{6} blob ([0-9a-f]+)\t(.+)$/

// ── Types ───────────────────────────────────────────────────────────────────

/** The deleting/dropping commit a candidate points back at — the evidence the
 *  curator dates and quotes from (an artifact's `inscription` often quotes the
 *  commit subject verbatim). */
interface CommitMeta {
  hash: string
  isoDate: string
  subject: string
}

/** One file deleted from `origin/main` and (so far) not regrown. `blob` is the
 *  content it held when it died — the identity `screenRelocated` looks for in
 *  the current tree, and the handle a curator reads it back with
 *  (`git cat-file -p <blob>`). */
export interface DeletionCandidate extends CommitMeta {
  path: string
  blob: string
}

/** One file that did not die: the same thing stands at another path in the
 *  current tree. A Gate-B exclusion, not a candidate — the Midden records what
 *  the Platform discarded, never what it carried forward under a new shape
 *  (layers/midden/CONTEXT.md, "The inclusion bar"). */
export interface Relocation extends CommitMeta {
  path: string
  newPath: string
}

/** One dependency dropped from `package.json` and (so far) not re-added. */
export interface DependencyRemovalCandidate extends CommitMeta {
  name: string
}

// ── Pure core (unit-tested) ───────────────────────────────────────────────────

/** What the deletion sweep carries back: the deaths to judge, and the moves
 *  git itself paired off — reported rather than dropped, since a rename it
 *  reclassified out of the deletion set is a Gate-B exclusion the curator
 *  still wants to see (#753). */
export interface DeletionLog {
  deletions: DeletionCandidate[]
  renames: Relocation[]
}

/**
 * Parse `git log --diff-filter=DR -M --raw --no-abbrev --format=%H<SEP>%cI<SEP>%s`
 * output. `-M` pairs a move made *within one commit* into an R entry; `--raw`
 * is what makes that pairing (and each deleted file's pre-image blob) visible
 * here instead of discarded before the script sees it.
 */
export function parseDeletionLog(raw: string): DeletionLog {
  const deletions: DeletionCandidate[] = []
  const renames: Relocation[] = []
  let current: CommitMeta | undefined
  for (const line of raw.split('\n')) {
    if (line.includes(FIELD_SEP)) {
      const [hash = '', isoDate = '', subject = ''] = line.split(FIELD_SEP)
      current = { hash, isoDate, subject }
      continue
    }
    const m = RAW_DIFF_LINE.exec(line)
    if (!m || !current) continue
    const [, blob = '', status = '', rest = ''] = m
    const [path = '', newPath = ''] = rest.split('\t')
    if (status === 'D') deletions.push({ path, blob, ...current })
    else if (newPath) renames.push({ path, newPath, ...current })
  }
  return { deletions, renames }
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

/** The current `origin/main` tree in the two shapes Gate B is checked against:
 *  every path, and every blob held by exactly **one** path today.
 *
 *  Uniqueness is what turns content into an identity. A blob several live paths
 *  share (an empty file, a boilerplate `defineNuxtConfig({})`) names no
 *  particular survivor, so a candidate matching it is left to be reported: a
 *  false candidate costs the curator one Gate-B judgment call, a false screen
 *  loses a real corpse from a tool whose whole job is finding them (#753). */
export interface CurrentTree {
  paths: Set<string>
  uniqueBlobPaths: Map<string, string>
}

/** Parse `git ls-tree -r origin/main` output into a `CurrentTree`. */
export function indexCurrentTree(raw: string): CurrentTree {
  const paths = new Set<string>()
  const pathsByBlob = new Map<string, string[]>()
  for (const line of raw.split('\n')) {
    const m = LS_TREE_LINE.exec(line)
    if (!m) continue
    const [, blob = '', path = ''] = m
    paths.add(path)
    const held = pathsByBlob.get(blob)
    if (held) held.push(path)
    else pathsByBlob.set(blob, [path])
  }
  const uniqueBlobPaths = new Map<string, string>()
  for (const [blob, held] of pathsByBlob) {
    const only = held.length === 1 ? held[0] : undefined
    if (only !== undefined) uniqueBlobPaths.set(blob, only)
  }
  return { paths, uniqueBlobPaths }
}

/** The half of Gate B no same-path comparison can reach: a file whose content
 *  stands somewhere else in the current tree moved rather than died, even when
 *  the move happened in a different commit from the deletion and git's
 *  per-commit rename detection could never have paired the two (#753, and the
 *  `tenants/` → `layers/` relocation reported in #730).
 *
 *  Identity only — exact content, uniquely held. A file moved *and* rewritten
 *  stays a candidate on purpose: whether it has a living successor is the
 *  curator's Gate-B call, which `.agents/skills/midden-survey/SKILL.md` §3
 *  keeps out of this script. */
export function screenRelocated(
  candidates: DeletionCandidate[],
  uniqueBlobPaths: Map<string, string>,
): { gone: DeletionCandidate[]; relocated: Relocation[] } {
  const gone: DeletionCandidate[] = []
  const relocated: Relocation[] = []
  for (const c of candidates) {
    const newPath = uniqueBlobPaths.get(c.blob)
    if (newPath !== undefined && newPath !== c.path) {
      relocated.push({ path: c.path, newPath, hash: c.hash, isoDate: c.isoDate, subject: c.subject })
    } else {
      gone.push(c)
    }
  }
  return { gone, relocated }
}

/** One `relocations` entry: both paths, since "it came back where it was" and
 *  "it lives somewhere else now" are facts a curator reads differently. */
export function relocationLabel(r: Pick<Relocation, 'path' | 'newPath'>): string {
  return `${r.path} → ${r.newPath}`
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

/**
 * One path a catalogued artifact declares, and what it is allowed to screen.
 *
 * The two kinds that carry a `path` do not mean the same thing by it: a `file`
 * provenance means "this file is the artifact", but a `commit` provenance means
 * "the path this commit touched" — usually a discarded fragment of a file that
 * outlives it. So a commit-kind declaration screens only the deletion its own
 * commit performed; a later, unrelated deletion of that same path is a genuine
 * uncatalogued corpse, and hiding it would be a false negative in a discovery
 * tool (#761).
 */
export interface CataloguedPath {
  key: string
  onlyIfDeletedBy?: string
}

/** What the trench and the stores already hold, in the two shapes a candidate
 *  is matched against: identity keys, and the paths artifacts declare — each
 *  path carrying the identity key of the artifact declaring it, so a screened
 *  candidate can name what screened it (#757 review). */
export interface CataloguedIndex {
  keys: Set<string>
  paths: Map<string, CataloguedPath>
}

export function cataloguedIndex(provenances: Record<string, unknown>[]): CataloguedIndex {
  const keys = new Set<string>()
  const paths = new Map<string, CataloguedPath>()
  for (const p of provenances) {
    const key = provenanceKey(p)
    if (key) keys.add(key)
    const path = provenancePath(p)
    // First declaration wins, so a re-run reports the same screening artifact.
    if (path && !paths.has(path)) {
      const entry: CataloguedPath = { key: key ?? `${String(p.kind)}:?` }
      // Same 7-char normalization as `provenanceKey`, matched against the
      // deleting commit `parseDeletionLog` attaches to every candidate.
      if (p.kind === 'commit' && typeof p.hash === 'string') entry.onlyIfDeletedBy = p.hash.slice(0, 7)
      paths.set(path, entry)
    }
  }
  return { keys, paths }
}

/**
 * The catalogued artifact already declaring a deletion candidate's path — its
 * identity key — or undefined if none does. A catalogued path ending in `/`
 * denotes a directory (an artifact about a whole retired folder), so it screens
 * everything beneath it — a deletion candidate is always an individual file,
 * and exact matching would miss them all (#752). A commit-kind declaration
 * screens only the deletion its own commit performed (see `CataloguedPath`).
 */
export function cataloguedPathVia(
  candidate: Pick<DeletionCandidate, 'path' | 'hash'>,
  cataloguedPaths: Map<string, CataloguedPath>,
): string | undefined {
  const deletedBy = candidate.hash.slice(0, 7)
  const screens = (entry: CataloguedPath) => !entry.onlyIfDeletedBy || entry.onlyIfDeletedBy === deletedBy

  const exact = cataloguedPaths.get(candidate.path)
  if (exact && screens(exact)) return exact.key
  for (const [catalogued, entry] of cataloguedPaths) {
    if (catalogued.endsWith('/') && candidate.path.startsWith(catalogued) && screens(entry)) return entry.key
  }
  return undefined
}

/**
 * One `alreadyCatalogued` entry: the candidate's own identity, plus the
 * catalogued artifact that screened it whenever that is a different one — the
 * audit trail that lets a curator tell an exact file-kind match from a
 * commit-kind or directory-prefix one, and so catch a wrong screen (#757 review).
 */
export function cataloguedLabel(candidateKey: string, via: string | undefined): string {
  return !via || via === candidateKey ? candidateKey : `${candidateKey} (via ${via})`
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
  const args = [
    'log',
    'origin/main',
    '--diff-filter=DR',
    '-M',
    '--raw',
    '--no-abbrev',
    `--format=%H${FIELD_SEP}%cI${FIELD_SEP}%s`,
  ]
  if (sinceIso) args.push(`--since=${sinceIso}`)
  return git(args, cwd)
}

function readDependencyLog(cwd = root, sinceIso?: string): string {
  const args = ['log', 'origin/main', '-p', `--format=%H${FIELD_SEP}%cI${FIELD_SEP}%s`]
  if (sinceIso) args.push(`--since=${sinceIso}`)
  args.push('--', 'package.json')
  return git(args, cwd)
}

function readCurrentTree(cwd = root): CurrentTree {
  return indexCurrentTree(git(['ls-tree', '-r', 'origin/main'], cwd))
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
    relocations: string[]
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

  const log = parseDeletionLog(readDeletionLog(cwd, sinceIso))
  const deletions = log.deletions.filter((c) => !isNoisePath(c.path))
  const renames = log.renames.filter((r) => !isNoisePath(r.path))
  const noisePaths = log.deletions.length - deletions.length + (log.renames.length - renames.length)

  const tree = readCurrentTree(cwd)
  const { gone: notRegrown, regrown } = screenRegrown(deletions, tree.paths)
  const { gone, relocated } = screenRelocated(notRegrown, tree.uniqueBlobPaths)
  const files = screenCatalogued(gone, (c) => cataloguedPathVia(c, catalogued.paths) !== undefined)

  const allRemovals = parseDependencyRemovals(readDependencyLog(cwd, sinceIso))
  const currentDeps = readCurrentDependencyNames(cwd)
  const stillGone = allRemovals.filter((r) => !currentDeps.has(r.name))
  const deps = screenCatalogued(stillGone, (r) => catalogued.keys.has(`dependency:${r.name}`))

  return {
    since: sinceIso ?? null,
    deletedFiles: files.fresh,
    droppedDependencies: deps.fresh,
    screenedOut: {
      noisePaths,
      regrownPaths: regrown.map((c) => c.path),
      relocations: [...renames, ...relocated].map(relocationLabel),
      readdedDependencies: allRemovals.filter((r) => currentDeps.has(r.name)).map((r) => r.name),
      alreadyCatalogued: [
        ...files.catalogued.map((c) => cataloguedLabel(`file:${c.path}`, cataloguedPathVia(c, catalogued.paths))),
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
