// The audit-skills helper (ADR-0015): the deterministic half of the `audit-skills`
// Skill. It does ONLY the mechanical gathering — join the on-disk Skills, their
// Inventory entries, how each was used across the newest N session logs, and (for
// our own Skills) the session history bracketing their own recent SKILL.md edit
// commits — and emits compact JSON. The Skill reads that JSON and makes every
// *judgement* (conditional importance, which sessions were "of the kind a Skill
// serves", which role prose to rewrite, whether a bracketed edit plausibly
// changed behavior); keeping judgement out of here is the point (predictable
// process, low token cost, no re-improvised parser each run).
//
// Usage:  tsx scripts/audit-skills.ts [--window N]
//   Prints a scorecard: the window of sessions considered (newest first, each
//   with a friction-severity summary), per-Skill usage/grade/description join,
//   `regressionChecks` — each own Skill's most recent edit commit with the
//   sessions immediately before/after it (session ids only; resolve against
//   `regressionSessions`, deduped since the same session commonly brackets more
//   than one Skill's edit) — `orphanedSessions` (issue #349) — and
//   `skillSessionFiles`, a skill → file-path map (all-time, not windowed) for a
//   targeted full-log deep-read once a regression is suspected for a specific Skill.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parse as parseYaml } from 'yaml'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** The default observation window: the 40 newest session logs (by `endedAt`). */
export const DEFAULT_WINDOW = 40
/** Sessions considered on each side of a Skill-edit commit for the regression watch. */
export const REGRESSION_BRACKET = 5
/** Most-recent edit commits considered per Skill — only the latest matters most
 *  for "did the last change help", and every extra one multiplies the scorecard's
 *  size across every own Skill with edit history. */
export const MAX_EDITS_PER_SKILL = 1
/** Calendar, not session-count, window (issue #349) — the point is catching
 *  every zero-log session, not just the newest ones. */
export const ORPHAN_WINDOW_DAYS = 4

/** Paths this helper reads. */
export const SESSIONS_DIR = 'layers/journal/content/current/sessions'
export const ARCHIVED_SESSIONS_DIR = 'layers/journal/content/archived/sessions'
export const INVENTORY_DIR = 'layers/journal/content/current/skills'
export const SKILLS_DIR = '.agents/skills'
/** The lockfile of externally-sourced Skills (the pack). A Skill named here is
 *  NOT ours to edit — its SKILL.md is pack-owned (ADR-0005), so `audit-skills`
 *  tunes its Inventory grade but never refers its frontmatter to `frictions-to-fixes`. */
export const SKILLS_LOCK = 'skills-lock.json'

// Exported so the unit tests can build synthetic `git log` output with them.
export const SEP = '\x1f' // field separator
export const REC = '\x1e' // record separator

// ── Types ───────────────────────────────────────────────────────────────────

export interface WindowSession {
  session: string
  kind: string
  goal: string
  summary: string
  endedAt: string
  skillsUsed: { name: string; reason: string }[]
  /** Friction severities only (nit/minor/moderate/major/blocker) — a compact
   *  count+severity signal for the regression watch. Full description/solution
   *  text lives only in the session log itself; read that directly (via
   *  `skillSessionFiles`) once a regression is actually suspected, rather than
   *  paying for full friction text in every session up front. */
  frictions: string[]
}
/** A Skill's on-disk facts: it exists, and its SKILL.md frontmatter `description`. */
export interface OnDiskSkill {
  description: string
}
/** A Skill's Inventory entry (the tunable record). */
export interface InventoryEntry {
  category: string
  importance: string
  role: string
}
/** One session that invoked a Skill inside the window — the evidence rows the
 *  Skill judges "kind of work" from. */
export interface UsageHit {
  session: string
  kind: string
  goal: string
}
export interface SkillRow {
  name: string
  onDisk: boolean
  inventoried: boolean
  /** In the external pack (`skills-lock.json`) — its SKILL.md is not ours to patch. */
  external: boolean
  category: string | null
  importance: string | null
  role: string | null
  description: string | null
  useCount: number
  usedIn: UsageHit[]
}
/** One commit touching a Skill's own `.agents/skills/<name>/` directory. */
export interface SkillEdit {
  sha: string
  date: string // commit author date, UTC ISO-8601 (git %aI)
  subject: string
}
/** One own-Skill edit, bracketed by up to `n` sessions immediately before and
 *  after its commit date — raw material for judging whether behavior around a
 *  Skill changed after a manual or `audit-docs` edit to its `SKILL.md`. Purely
 *  mechanical: it brackets, it does not conclude "regression" (ADR-0015).
 *  `before`/`after` are session ids, not full objects — look them up in the
 *  Scorecard's `regressionSessions` (deduped: the same session commonly
 *  brackets several Skills' edits, and embedding it once per check bloated the
 *  scorecard well past what's worth handing a Skill run in one shot). */
export interface RegressionCheck {
  skill: string
  edit: SkillEdit
  before: string[]
  after: string[]
}
/** issue #349's orphaned-session signal. */
export interface OrphanedSession {
  session: string
  commits: string[]
  date: string
}
export interface Scorecard {
  windowSize: number
  sessionsConsidered: number
  window: WindowSession[]
  skills: SkillRow[]
  regressionChecks: RegressionCheck[]
  regressionSessions: WindowSession[]
  orphanedSessions: OrphanedSession[]
  /** Skill name → every session log file (repo-relative path) that named it in
   *  `skillsUsed`, across ALL history — not windowed, not bracketed. Cheap
   *  (paths only). The deep-read entry point once a regression is suspected for
   *  a specific Skill: `Read` each file directly for its full, un-truncated
   *  record (full friction text, outcome, status, …) rather than trusting the
   *  compact extract used everywhere else in this scorecard. */
  skillSessionFiles: Record<string, string[]>
}

/** A session paired with the repo-relative path it was read from. */
export interface SessionFile {
  session: WindowSession
  file: string
}

// ── Pure core (unit-tested) ───────────────────────────────────────────────────

/** Skill name → every session log file that named it in `skillsUsed`, across
 *  ALL sessions passed in (the caller decides windowed vs. all-time — this
 *  helper only groups). Paths only, no content, so it stays cheap regardless
 *  of session count. */
export function buildSkillSessionFiles(entries: SessionFile[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const { session, file } of entries) {
    const seen = new Set<string>()
    for (const u of session.skillsUsed) {
      if (!u.name || seen.has(u.name)) continue
      seen.add(u.name)
      const files = out[u.name] ?? []
      files.push(file)
      out[u.name] = files
    }
  }
  return out
}

/** The newest `n` sessions by `endedAt` (ISO), most-recent first. Ties broken by
 *  `session` id so the order is stable and deterministic across runs. */
export function pickWindow(sessions: WindowSession[], n: number): WindowSession[] {
  return [...sessions]
    .sort((a, b) => b.endedAt.localeCompare(a.endedAt) || b.session.localeCompare(a.session))
    .slice(0, n)
}

/** Per-Skill usage across a window: how many of the windowed sessions invoked it,
 *  and which (name → hits). A Skill listed twice in one session counts once. */
export function tallyUsage(window: WindowSession[]): Map<string, UsageHit[]> {
  const byName = new Map<string, UsageHit[]>()
  for (const s of window) {
    const seen = new Set<string>()
    for (const u of s.skillsUsed) {
      if (!u.name || seen.has(u.name)) continue
      seen.add(u.name)
      const hits = byName.get(u.name) ?? []
      hits.push({ session: s.session, kind: s.kind, goal: s.goal })
      byName.set(u.name, hits)
    }
  }
  return byName
}

/** Join the sources into one row per Skill — the union of every name that is on
 *  disk, inventoried, or observed in use — so orphans surface both ways:
 *  on-disk-but-not-inventoried AND inventoried-but-gone. `external` marks pack
 *  Skills (their frontmatter is not ours to patch). Sorted by name. */
export function buildSkillRows(
  onDisk: Map<string, OnDiskSkill>,
  inventory: Map<string, InventoryEntry>,
  usage: Map<string, UsageHit[]>,
  external: Set<string>,
): SkillRow[] {
  const names = new Set<string>([...onDisk.keys(), ...inventory.keys(), ...usage.keys()])
  return [...names].sort().map((name) => {
    const entry = inventory.get(name)
    const hits = usage.get(name) ?? []
    return {
      name,
      onDisk: onDisk.has(name),
      inventoried: inventory.has(name),
      external: external.has(name),
      category: entry?.category ?? null,
      importance: entry?.importance ?? null,
      role: entry?.role ?? null,
      description: onDisk.get(name)?.description ?? null,
      useCount: hits.length,
      usedIn: hits,
    }
  })
}

/** All sessions with `endedAt` strictly before `editDate` (up to `n`, nearest
 *  first) and all sessions at-or-after it (up to `n`, nearest first). Anchored
 *  at an arbitrary timestamp rather than "now", unlike `pickWindow` — an edit
 *  can sit outside the primary recency window entirely. */
export function bracketSessions(
  sessions: WindowSession[],
  editDate: string,
  n = REGRESSION_BRACKET,
): { before: WindowSession[]; after: WindowSession[] } {
  const sorted = [...sessions].sort((a, b) => a.endedAt.localeCompare(b.endedAt))
  const before = sorted.filter((s) => s.endedAt < editDate).slice(-n)
  const after = sorted.filter((s) => s.endedAt >= editDate).slice(0, n)
  return { before, after }
}

/** For each own (non-external) Skill's `maxEditsPerSkill` most recent edit
 *  commits, bracket the sessions around it. Skips a Skill with no edits, and
 *  skips an edit with no session data on either side (nothing to compare).
 *  Returns checks referencing session ids plus the deduped pool of sessions
 *  those ids resolve against — the same session routinely brackets more than
 *  one Skill's edit, and embedding its full object every time is the single
 *  biggest driver of scorecard size. */
export function buildRegressionChecks(
  allSessions: WindowSession[],
  editsByName: Map<string, SkillEdit[]>,
  external: Set<string>,
  n = REGRESSION_BRACKET,
  maxEditsPerSkill = MAX_EDITS_PER_SKILL,
): { checks: RegressionCheck[]; sessions: WindowSession[] } {
  const checks: RegressionCheck[] = []
  const pool = new Map<string, WindowSession>()
  for (const [name, edits] of editsByName) {
    if (external.has(name)) continue
    const recent = [...edits].sort((a, b) => b.date.localeCompare(a.date)).slice(0, maxEditsPerSkill)
    for (const edit of recent) {
      const { before, after } = bracketSessions(allSessions, edit.date, n)
      if (before.length === 0 && after.length === 0) continue
      for (const s of before) pool.set(s.session, s)
      for (const s of after) pool.set(s.session, s)
      checks.push({ skill: name, edit, before: before.map((s) => s.session), after: after.map((s) => s.session) })
    }
  }
  checks.sort((a, b) => a.skill.localeCompare(b.skill) || b.edit.date.localeCompare(a.edit.date))
  const sessions = [...pool.values()].sort((a, b) => a.endedAt.localeCompare(b.endedAt))
  return { checks, sessions }
}

/** Skips a parentless commit (empty `%P`) — issue #292: git diffs it against
 *  the empty tree, so it would misattribute as a real edit to every Skill it
 *  lists. Expects `readSkillEdits`'s `git log` format. */
export function parseSkillEditLog(raw: string, skillsDir = SKILLS_DIR): Map<string, SkillEdit[]> {
  const out = new Map<string, SkillEdit[]>()
  const prefix = `${skillsDir}/`
  for (const block of raw.split(REC).map((b) => b.trim()).filter(Boolean)) {
    const lines = block.split('\n')
    const header = lines[0] ?? ''
    const [sha, parents, date, subject] = header.split(SEP)
    if (!sha || !date || !parents) continue
    const names = new Set<string>()
    for (const path of lines.slice(1)) {
      if (!path.startsWith(prefix)) continue
      const name = path.slice(prefix.length).split('/')[0]
      if (name) names.add(name)
    }
    for (const name of names) {
      const list = out.get(name) ?? []
      list.push({ sha, date, subject: subject ?? '' })
      out.set(name, list)
    }
  }
  return out
}

export interface SessionTrailerRef {
  sha: string
  date: string // commit author date, UTC ISO-8601 (git %aI)
  session: string
}

// Not just the current `session_<id>` shape — captures whatever follows the
// trailer URL's final slash, since at least one early session log used a
// bare UUID instead (2026-07-05-576a49a2-*.yml).
const SESSION_TRAILER = /Claude-Session:\s*\S*\/(\S+)/

/** Expects `readSessionTrailers`'s `git log` format. */
export function parseSessionTrailers(raw: string): SessionTrailerRef[] {
  const out: SessionTrailerRef[] = []
  for (const block of raw.split(REC).map((b) => b.trim()).filter(Boolean)) {
    const nl = block.indexOf('\n')
    const header = nl >= 0 ? block.slice(0, nl) : block
    const body = nl >= 0 ? block.slice(nl + 1) : ''
    const [sha, date] = header.split(SEP)
    if (!sha || !date) continue
    const m = body.match(SESSION_TRAILER)
    if (!m) continue
    out.push({ sha, date, session: m[1] as string })
  }
  return out
}

/** `date` is the earliest, not latest, commit referencing the session —
 *  matches an orphan's own actual age. */
export function groupSessionReferences(
  refs: SessionTrailerRef[],
): Map<string, { commits: string[]; date: string }> {
  const out = new Map<string, { commits: string[]; date: string }>()
  for (const { sha, date, session } of refs) {
    const entry = out.get(session) ?? { commits: [], date }
    entry.commits.push(sha)
    if (date < entry.date) entry.date = date
    out.set(session, entry)
  }
  return out
}

/** Sorted oldest-first — the most actionable triage order (issue #349). */
export function findOrphanedSessions(
  refs: SessionTrailerRef[],
  knownSessionIds: Set<string>,
): OrphanedSession[] {
  const grouped = groupSessionReferences(refs)
  const out: OrphanedSession[] = []
  for (const [session, { commits, date }] of grouped) {
    if (knownSessionIds.has(session)) continue
    out.push({ session, commits, date })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

// ── FS IO (thin shell) ────────────────────────────────────────────────────────

/** Reads every session log with its source file path attached (`SessionFile`). */
function readSessionFiles(cwd = root): SessionFile[] {
  const dir = join(cwd, SESSIONS_DIR)
  if (!existsSync(dir)) return []
  const out: SessionFile[] = []
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.yml'))) {
    const raw = parseYaml(readFileSync(join(dir, f), 'utf8')) as Record<string, unknown>
    if (!raw || typeof raw !== 'object') continue
    const used = Array.isArray(raw.skillsUsed) ? raw.skillsUsed : []
    const frictions = Array.isArray(raw.frictions) ? raw.frictions : []
    out.push({
      session: {
        session: String(raw.session ?? ''),
        kind: String(raw.kind ?? ''),
        goal: String(raw.goal ?? ''),
        summary: String(raw.summary ?? '').replace(/\s+/g, ' ').trim(),
        endedAt: String(raw.endedAt ?? ''),
        skillsUsed: used.map((u: Record<string, unknown>) => ({
          name: String(u.name ?? ''),
          reason: String(u.reason ?? '').replace(/\s+/g, ' ').trim(),
        })),
        frictions: frictions
          .map((fr: Record<string, unknown>) => String(fr.severity ?? ''))
          .filter(Boolean),
      },
      file: `${SESSIONS_DIR}/${f}`,
    })
  }
  return out
}

/** An archived session is still a valid log, not an orphan. */
function readKnownSessionIds(cwd = root): Set<string> {
  const ids = new Set<string>()
  for (const dir of [SESSIONS_DIR, ARCHIVED_SESSIONS_DIR]) {
    const full = join(cwd, dir)
    if (!existsSync(full)) continue
    for (const f of readdirSync(full).filter((f) => f.endsWith('.yml'))) {
      const raw = parseYaml(readFileSync(join(full, f), 'utf8')) as Record<string, unknown>
      const id = raw && typeof raw === 'object' ? String(raw.session ?? '') : ''
      if (id) ids.add(id)
    }
  }
  return ids
}

/** Scoped to `origin/main` per CLAUDE.md's git-log guidance, not `--all`. */
function readSessionTrailers(cwd = root, days = ORPHAN_WINDOW_DAYS): SessionTrailerRef[] {
  let raw: string
  try {
    raw = execFileSync(
      'git',
      ['log', 'origin/main', `--since=${days} days ago`, `--pretty=format:${REC}%H${SEP}%aI%n%B`],
      { cwd, encoding: 'utf8' },
    )
  } catch {
    return []
  }
  return parseSessionTrailers(raw)
}

/** Parse a SKILL.md's YAML frontmatter (between the first two `---` fences). A
 *  single malformed frontmatter (e.g. an unquoted `key: value` colon inside a
 *  plain-scalar `description`) warns to stderr and degrades to `{}` rather than
 *  aborting the whole run — one bad Skill shouldn't block auditing every other
 *  one. `label` is only for that warning. */
function readFrontmatter(text: string, label: string): Record<string, unknown> {
  const m = text.match(/^---\n([\s\S]*?)\n---/)
  if (!m) return {}
  try {
    const parsed = parseYaml(m[1] as string) as Record<string, unknown>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (err) {
    console.error(
      `audit-skills: warning: ${label}'s SKILL.md frontmatter failed to parse (${err instanceof Error ? err.message.split('\n')[0] : String(err)}) — treating its description as empty`,
    )
    return {}
  }
}

function readOnDiskSkills(cwd = root): Map<string, OnDiskSkill> {
  const dir = join(cwd, SKILLS_DIR)
  const out = new Map<string, OnDiskSkill>()
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    const md = join(dir, name, 'SKILL.md')
    if (!existsSync(md)) continue
    const fm = readFrontmatter(readFileSync(md, 'utf8'), name)
    out.set(name, { description: String(fm.description ?? '').replace(/\s+/g, ' ').trim() })
  }
  return out
}

function readInventory(cwd = root): Map<string, InventoryEntry> {
  const dir = join(cwd, INVENTORY_DIR)
  const out = new Map<string, InventoryEntry>()
  if (!existsSync(dir)) return out
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.yml'))) {
    const raw = parseYaml(readFileSync(join(dir, f), 'utf8')) as Record<string, unknown>
    if (!raw || typeof raw !== 'object' || !raw.name) continue
    out.set(String(raw.name), {
      category: String(raw.category ?? ''),
      importance: String(raw.importance ?? ''),
      role: String(raw.role ?? '').replace(/\s+/g, ' ').trim(),
    })
  }
  return out
}

/** The names of externally-packed Skills (keys of `skills-lock.json` → `skills`). */
function readLock(cwd = root): Set<string> {
  const file = join(cwd, SKILLS_LOCK)
  if (!existsSync(file)) return new Set()
  const lock = JSON.parse(readFileSync(file, 'utf8')) as { skills?: Record<string, unknown> }
  return new Set(Object.keys(lock.skills ?? {}))
}

/** Missing git history (e.g. a shallow clone) degrades to no edit data, not a crash. */
function readSkillEdits(cwd = root): Map<string, SkillEdit[]> {
  let raw: string
  try {
    raw = execFileSync(
      'git',
      ['log', '--name-only', `--pretty=format:${REC}%H${SEP}%P${SEP}%aI${SEP}%s`, '--', SKILLS_DIR],
      { cwd, encoding: 'utf8' },
    )
  } catch {
    return new Map()
  }
  return parseSkillEditLog(raw)
}

// ── Command ─────────────────────────────────────────────────────────────────

export function scorecard(windowSize = DEFAULT_WINDOW, cwd = root): Scorecard {
  const files = readSessionFiles(cwd)
  const all = files.map((e) => e.session)
  const window = pickWindow(all, windowSize)
  const external = readLock(cwd)
  const rows = buildSkillRows(readOnDiskSkills(cwd), readInventory(cwd), tallyUsage(window), external)
  const { checks, sessions } = buildRegressionChecks(all, readSkillEdits(cwd), external)
  const orphanedSessions = findOrphanedSessions(readSessionTrailers(cwd), readKnownSessionIds(cwd))
  return {
    windowSize,
    sessionsConsidered: all.length,
    window,
    skills: rows,
    regressionChecks: checks,
    regressionSessions: sessions,
    orphanedSessions,
    skillSessionFiles: buildSkillSessionFiles(files),
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`audit-skills: ${msg}`)
  process.exit(1)
}

function main(): void {
  const argv = process.argv.slice(2)
  const wIdx = argv.indexOf('--window')
  const windowSize = wIdx >= 0 && argv[wIdx + 1] ? Number(argv[wIdx + 1]) : DEFAULT_WINDOW
  if (!Number.isInteger(windowSize) || windowSize <= 0) fail('--window must be a positive integer')
  process.stdout.write(JSON.stringify(scorecard(windowSize), null, 2) + '\n')
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
}
