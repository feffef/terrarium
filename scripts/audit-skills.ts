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
//   than one Skill's edit) — `orphanedSessions` (issue #349; a resolved
//   same-run mis-file — a flagged commit's added file later removed by
//   another commit — is excluded rather than surfaced, issue #574), the two
//   manual-nudge-closure signals `humanPromptedClosures` and
//   `manuallyRescuedClosures` (the counterpart to `orphanedSessions`: a session
//   that DID log, but only because a human nudged it — invisible to the orphan
//   check because the log now exists; a session id can be permanently
//   dismissed from this signal once it's tracked and fixed, issue #426) — and
//   `skillSessionFiles`, a skill → file-path map (all-time, not windowed, but
//   capped per Skill at `MAX_SKILL_SESSION_FILES`, issue #426) for a targeted
//   full-log deep-read once a regression is suspected for a specific Skill;
//   `skillSessionFileTotals` carries the true, uncapped count alongside it.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parse as parseYaml } from 'yaml'
import { isParentlessBoundaryCommit, SESSION_TRAILER } from './git-helpers.ts'

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
/** The exact keyword a session records — in a friction's `description` — when a
 *  human, not the session's own judgement, prompted its closure (`close-session`
 *  SKILL.md is the single home for the rule). Grepping for it turns the
 *  otherwise-invisible manual nudge into a counted signal. */
export const HUMAN_PROMPTED_CLOSURE = 'HUMAN-PROMPTED-CLOSURE'
/** Gap (hours) between a session's last work commit and its own closure beyond
 *  which the closure reads as manually rescued rather than self-judged. Grounded
 *  in observed data: healthy sessions close within minutes-to-~½h of their last
 *  work commit, while the motivating rescue (session_019pNrz, #397) idled ~16h.
 *  Tunable — set well above the healthy tail, well below a genuine rescue. */
export const RESCUED_GAP_HOURS = 6
/** Session ids already fully tracked and resolved on a `manuallyRescuedClosures`
 *  incident — suppressed so a fixed incident stops resurfacing in every future
 *  scorecard (issue #426; `findManuallyRescuedClosures` has no recency window
 *  of its own, unlike `orphanedSessions`' calendar window). Append a session id
 *  here once its tracking issue/PR has landed; this dismisses the scorecard
 *  *signal* only — the session log itself is untouched. */
export const DISMISSED_MANUALLY_RESCUED_CLOSURES: ReadonlySet<string> = new Set([
  'session_019pNrzTQb3EV2SJBWXs1bXG', // #397, fixed by #411
])
/** Session ids already tracked on a `humanPromptedClosures` standing thread —
 *  suppressed so an already-acknowledged entry stops resurfacing in every future
 *  scorecard (issue #540; `findHumanPromptedClosures` has no recency window of
 *  its own, so without this the standing thread can't distinguish a genuinely
 *  new recurrence from the same old already-recorded entries). Append a session
 *  id here once its presence on the thread has been recorded; this dismisses the
 *  scorecard *signal* only — the session log itself is untouched. */
export const DISMISSED_HUMAN_PROMPTED_CLOSURES: ReadonlySet<string> = new Set([
  'session_015gQvuX4uBkjpzW9yovabVz', // #483
  'session_01Y11Fou1pRvTW2ucEt1dhX8', // #483
])
/** Above this many session-file hits, `skillSessionFiles` caps that Skill's
 *  list to the newest `MAX_SKILL_SESSION_FILES` rather than handing Phase B
 *  (`audit-skills` SKILL.md step 4) an ever-growing full-file read — a
 *  very-high-usage essential Skill (e.g. close-session, log-session) can rack
 *  up 100+ files, and a literal read-every-file doesn't scale (issue #426). */
export const MAX_SKILL_SESSION_FILES = 40

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
  /** True when a friction `description` carries the `HUMAN_PROMPTED_CLOSURE`
   *  keyword — the session logged, but a human had to nudge it (`close-session`
   *  SKILL.md). Scanned only over `description`, never `solution`/summary text,
   *  so a session that merely *discusses* the keyword doesn't false-positive. */
  humanPromptedClosure: boolean
  /** The mechanical `entrypoint` trace field (e.g. `remote_trigger`), '' when
   *  absent — the strong derived signal `findMisclassifiedKind` cross-checks
   *  the authored `kind` against (issue #449 Gap 2). */
  entrypoint: string
}
/** A Skill's on-disk facts: it exists, and its SKILL.md frontmatter `description`. */
export interface OnDiskSkill {
  description: string
}
/** One `observations` entry (ADR-0015 amendment, 2026-07-13) — a prior run's
 *  citable finding about this Skill, kept separate from `role` so PR/session
 *  refs don't leak into the rendered "use these" prose. */
export interface Observation {
  date: string
  note: string
}
/** A Skill's Inventory entry (the tunable record). */
export interface InventoryEntry {
  category: string
  importance: string
  role: string
  /** Prior runs' citable findings, oldest first — read-only context for this
   *  run's own judgement (ADR-0015 amendment, 2026-07-13). */
  observations: Observation[]
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
  /** Prior runs' citable findings for this Skill — [] if uninventoried or none
   *  yet recorded (ADR-0015 amendment, 2026-07-13). */
  observations: Observation[]
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
/** A session that logged but flagged its own closure as human-prompted (the
 *  `HUMAN_PROMPTED_CLOSURE` friction keyword). */
export interface HumanPromptedClosure {
  session: string
  endedAt: string
}
/** A session whose closure landed a long time after its last work commit — the
 *  timing counterpart to `HumanPromptedClosure`, catching a manual rescue even
 *  when the session didn't log the keyword. `gapHours` is that delay. */
export interface ManuallyRescuedClosure {
  session: string
  endedAt: string
  /** ISO date of the session's most recent work commit on `origin/main`. */
  lastWorkCommit: string
  gapHours: number
}
/** A session whose authored `kind` contradicts a strong derived signal — today
 *  just `entrypoint: 'remote_trigger'` implying `kind: autonomous` (issue #449
 *  Gap 2). A reporting/flagging finding, not an auto-correction. */
export interface MisclassifiedKind {
  session: string
  kind: string
  entrypoint: string
  endedAt: string
}

export interface Scorecard {
  windowSize: number
  sessionsConsidered: number
  window: WindowSession[]
  skills: SkillRow[]
  regressionChecks: RegressionCheck[]
  regressionSessions: WindowSession[]
  orphanedSessions: OrphanedSession[]
  /** Sessions whose own log flagged a human-prompted closure (keyword grep). */
  humanPromptedClosures: HumanPromptedClosure[]
  /** Sessions whose authored `kind` contradicts the `remote_trigger` derived
   *  signal (issue #449 Gap 2). */
  misclassifiedKind: MisclassifiedKind[]
  /** Sessions whose closure landed >`RESCUED_GAP_HOURS` after their last work
   *  commit — a manual rescue detectable from timing alone (see the interface). */
  manuallyRescuedClosures: ManuallyRescuedClosure[]
  /** Skill name → every session log file (repo-relative path) that named it in
   *  `skillsUsed`, across ALL history — not windowed, not bracketed. Cheap
   *  (paths only). The deep-read entry point once a regression is suspected for
   *  a specific Skill: `Read` each file directly for its full, un-truncated
   *  record (full friction text, outcome, status, …) rather than trusting the
   *  compact extract used everywhere else in this scorecard. Newest first,
   *  capped per Skill at `MAX_SKILL_SESSION_FILES` — a very-high-usage
   *  essential Skill would otherwise hand this deep-read an ever-growing
   *  full-file read (issue #426). See `skillSessionFileTotals` for whether a
   *  given Skill's list was actually capped. */
  skillSessionFiles: Record<string, string[]>
  /** Skill name → the true, uncapped hit count `skillSessionFiles` counts
   *  against `MAX_SKILL_SESSION_FILES` (issue #426). A Skill's list above was
   *  capped iff this total exceeds `skillSessionFiles[name].length` — the
   *  signal that a regression watch should corroborate with
   *  `orphanedSessions`/`manuallyRescuedClosures` rather than trust the file
   *  list as this Skill's exhaustive history. */
  skillSessionFileTotals: Record<string, number>
}

/** A session paired with the repo-relative path it was read from. */
export interface SessionFile {
  session: WindowSession
  file: string
}

// ── Pure core (unit-tested) ───────────────────────────────────────────────────

/** Drops a `skillsUsed` entry whose name doesn't match a real Skill directory
 *  under `.agents/skills/` — a session log occasionally names something that
 *  isn't an actual Skill (e.g. "model"), and that pseudo-entry would otherwise
 *  surface as noise throughout the scorecard (issue #545, #426's "solution 1",
 *  left unimplemented when #426 closed). */
export function filterSkillsUsed(
  used: { name: string; reason: string }[],
  validNames: ReadonlySet<string>,
): { name: string; reason: string }[] {
  return used.filter((u) => validNames.has(u.name))
}

/** Skill name → every session log file that named it in `skillsUsed`, across
 *  ALL sessions passed in (the caller decides windowed vs. all-time — this
 *  helper only groups), newest-first and capped at `maxFiles` per Skill
 *  (`MAX_SKILL_SESSION_FILES`) — a very-high-usage Skill would otherwise grow
 *  this list without bound (issue #426). Paths only, no content, so it stays
 *  cheap regardless of session count. Pair with `buildSkillSessionFileTotals`
 *  for the true (uncapped) count. */
export function buildSkillSessionFiles(
  entries: SessionFile[],
  maxFiles = MAX_SKILL_SESSION_FILES,
): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  const newestFirst = [...entries].sort((a, b) => b.session.endedAt.localeCompare(a.session.endedAt))
  for (const { session, file } of newestFirst) {
    const seen = new Set<string>()
    for (const u of session.skillsUsed) {
      if (!u.name || seen.has(u.name)) continue
      seen.add(u.name)
      const files = out[u.name] ?? []
      if (files.length < maxFiles) files.push(file)
      out[u.name] = files
    }
  }
  return out
}

/** The true, uncapped per-Skill hit count `buildSkillSessionFiles` counts
 *  against `maxFiles` — lets a reader tell a capped list (issue #426) from a
 *  complete one: capped iff this total exceeds `skillSessionFiles[name].length`. */
export function buildSkillSessionFileTotals(entries: SessionFile[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const { session } of entries) {
    const seen = new Set<string>()
    for (const u of session.skillsUsed) {
      if (!u.name || seen.has(u.name)) continue
      seen.add(u.name)
      out[u.name] = (out[u.name] ?? 0) + 1
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
      observations: entry?.observations ?? [],
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

/** Skips a parentless commit via the shared `isParentlessBoundaryCommit` guard
 *  (#292, single-homed in `./git-helpers.ts`). Expects `readSkillEdits`'s
 *  `git log` format. */
export function parseSkillEditLog(raw: string, skillsDir = SKILLS_DIR): Map<string, SkillEdit[]> {
  const out = new Map<string, SkillEdit[]>()
  const prefix = `${skillsDir}/`
  for (const block of raw.split(REC).map((b) => b.trim()).filter(Boolean)) {
    const lines = block.split('\n')
    const header = lines[0] ?? ''
    const [sha, parents, date, subject] = header.split(SEP)
    if (!sha || !date) continue
    if (isParentlessBoundaryCommit(parents ?? '')) continue
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

/** One commit's added/removed file paths (`git log --name-status`), scoped to
 *  the same `origin/main` + `ORPHAN_WINDOW_DAYS` window as `SessionTrailerRef` —
 *  the raw material `isResolvedMisfile` diffs against to catch a same-run
 *  mis-file cleanup (issue #574). */
export interface CommitFileChange {
  sha: string
  date: string // commit author date, UTC ISO-8601 (git %aI)
  added: string[]
  removed: string[]
}

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

/** Expects `readCommitFileChanges`'s `git log --name-status` format: a header
 *  line (`sha` SEP `date`) followed by `STATUS\tpath` lines. A rename
 *  (`R100\told\tnew`, only emitted when git's rename detection fires) counts
 *  as removing `old` and adding `new`. */
export function parseCommitFileChanges(raw: string): CommitFileChange[] {
  const out: CommitFileChange[] = []
  for (const block of raw.split(REC).map((b) => b.trim()).filter(Boolean)) {
    const lines = block.split('\n')
    const header = lines[0] ?? ''
    const [sha, date] = header.split(SEP)
    if (!sha || !date) continue
    const added: string[] = []
    const removed: string[] = []
    for (const line of lines.slice(1)) {
      const m = line.match(/^([AMDRC])\d*\t([^\t]+)(?:\t(.+))?$/)
      if (!m) continue
      const [, status, path, renamedTo] = m
      if (status === 'A') added.push(path as string)
      else if (status === 'D') removed.push(path as string)
      else if (status === 'R') {
        removed.push(path as string)
        if (renamedTo) added.push(renamedTo)
      }
    }
    out.push({ sha, date, added, removed })
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

/** True when a commit that references the orphan-candidate session added a
 *  file that some other commit in `changes` later removed — a same-run
 *  mis-file (e.g. a CLI-transcript-id session log filed under the wrong id)
 *  cleaned up before it became a genuine orphan, not a real gap (issue #574).
 *  Matches on the exact path only; a rename that changes the path doesn't
 *  count as a removal of the original. */
export function isResolvedMisfile(commits: string[], changes: CommitFileChange[]): boolean {
  const bySha = new Map(changes.map((c) => [c.sha, c]))
  for (const sha of commits) {
    const change = bySha.get(sha)
    if (!change) continue
    for (const path of change.added) {
      if (changes.some((c) => c.sha !== sha && c.date > change.date && c.removed.includes(path))) return true
    }
  }
  return false
}

/** Sorted oldest-first — the most actionable triage order (issue #349).
 *  `fileChanges` (default `[]`, backward compatible) feeds `isResolvedMisfile`
 *  to drop a resolved same-run mis-file rather than surface it as a fresh
 *  orphan (issue #574). */
export function findOrphanedSessions(
  refs: SessionTrailerRef[],
  knownSessionIds: Set<string>,
  fileChanges: CommitFileChange[] = [],
): OrphanedSession[] {
  const grouped = groupSessionReferences(refs)
  const out: OrphanedSession[] = []
  for (const [session, { commits, date }] of grouped) {
    if (knownSessionIds.has(session)) continue
    if (isResolvedMisfile(commits, fileChanges)) continue
    out.push({ session, commits, date })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

/** True when any friction `description` carries the exact keyword. Only
 *  descriptions are passed in — `close-session` mandates the keyword there, and
 *  scanning `solution`/summary text would flag a session that merely *discusses*
 *  the regression (e.g. the PR that introduced the keyword). */
export function hasHumanPromptedClosure(frictionDescriptions: string[]): boolean {
  return frictionDescriptions.some((d) => d.includes(HUMAN_PROMPTED_CLOSURE))
}

/** The logged sessions that flagged a human-prompted closure, oldest-first. A
 *  session id in `dismissed` (default `DISMISSED_HUMAN_PROMPTED_CLOSURES`) is
 *  skipped outright — an already-tracked standing-thread entry that would
 *  otherwise resurface in every future run (issue #540), mirroring the sibling
 *  `findManuallyRescuedClosures`' dismissal of already-fixed incidents. */
export function findHumanPromptedClosures(
  sessions: WindowSession[],
  dismissed: ReadonlySet<string> = DISMISSED_HUMAN_PROMPTED_CLOSURES,
): HumanPromptedClosure[] {
  return sessions
    .filter((s) => s.humanPromptedClosure && !dismissed.has(s.session))
    .map((s) => ({ session: s.session, endedAt: s.endedAt }))
    .sort((a, b) => a.endedAt.localeCompare(b.endedAt) || a.session.localeCompare(b.session))
}

/** Sessions whose closure landed at least `minGapHours` after their last work
 *  commit — a manual rescue the binary orphan check misses because the log now
 *  exists. `refs` supplies each session's work commits (the log-landing commit
 *  itself carries no `Claude-Session` trailer, so it never counts as work);
 *  `sessions` supplies the closure moment (`endedAt`). A session with no work
 *  commit in `refs`, or a non-positive gap, is not a rescue. A session id in
 *  `dismissed` (default `DISMISSED_MANUALLY_RESCUED_CLOSURES`) is skipped
 *  outright — an already-tracked-and-fixed incident that would otherwise
 *  resurface in every future run (issue #426), since unlike `orphanedSessions`
 *  this check has no calendar recency window of its own. Sorted by gap,
 *  largest first (most conspicuous rescue first). */
export function findManuallyRescuedClosures(
  refs: SessionTrailerRef[],
  sessions: WindowSession[],
  minGapHours = RESCUED_GAP_HOURS,
  dismissed: ReadonlySet<string> = DISMISSED_MANUALLY_RESCUED_CLOSURES,
): ManuallyRescuedClosure[] {
  // Compare by parsed epoch, not string: `git %aI` stamps carry the committer's
  // local offset (both `Z` and `+02:00` appear in practice), and a `+02:00`
  // string can sort after a real-time-later `Z` string.
  const latestWork = new Map<string, string>()
  for (const { session, date } of refs) {
    const cur = latestWork.get(session)
    if (!cur || Date.parse(date) > Date.parse(cur)) latestWork.set(session, date)
  }
  const out: ManuallyRescuedClosure[] = []
  for (const s of sessions) {
    if (dismissed.has(s.session)) continue
    const last = latestWork.get(s.session)
    if (!last || !s.endedAt) continue
    const gapHours = (Date.parse(s.endedAt) - Date.parse(last)) / 3_600_000
    if (!Number.isFinite(gapHours) || gapHours < minGapHours) continue
    out.push({
      session: s.session,
      endedAt: s.endedAt,
      lastWorkCommit: last,
      gapHours: Math.round(gapHours * 10) / 10,
    })
  }
  return out.sort((a, b) => b.gapHours - a.gapHours || a.session.localeCompare(b.session))
}

/** Sessions whose authored `kind` contradicts the `entrypoint: 'remote_trigger'`
 *  derived signal — a Routine-fired run implies `autonomous` per CONTEXT.md's
 *  Session definitions (issue #449 Gap 2). Anchored only on sessions that
 *  actually carry `remote_trigger`, so a legitimately interactive session that
 *  merely lacks the field never false-positives. Sorted oldest-first, matching
 *  `findOrphanedSessions`'s triage order. */
export function findMisclassifiedKind(sessions: WindowSession[]): MisclassifiedKind[] {
  return sessions
    .filter((s) => s.entrypoint === 'remote_trigger' && s.kind !== 'autonomous')
    .map((s) => ({ session: s.session, kind: s.kind, entrypoint: s.entrypoint, endedAt: s.endedAt }))
    .sort((a, b) => a.endedAt.localeCompare(b.endedAt) || a.session.localeCompare(b.session))
}

// ── FS IO (thin shell) ────────────────────────────────────────────────────────

/** Reads every session log with its source file path attached (`SessionFile`).
 *  `skillNames` cross-checks each `skillsUsed` entry against the real Skills
 *  on disk (`filterSkillsUsed`, issue #545) — defaults to a fresh
 *  `readSkillNames(cwd)` read, but `scorecard()` passes one in so the
 *  directory is only read once per run. */
function readSessionFiles(cwd = root, skillNames: ReadonlySet<string> = readSkillNames(cwd)): SessionFile[] {
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
        skillsUsed: filterSkillsUsed(
          used.map((u: Record<string, unknown>) => ({
            name: String(u.name ?? ''),
            reason: String(u.reason ?? '').replace(/\s+/g, ' ').trim(),
          })),
          skillNames,
        ),
        frictions: frictions
          .map((fr: Record<string, unknown>) => String(fr.severity ?? ''))
          .filter(Boolean),
        humanPromptedClosure: hasHumanPromptedClosure(
          frictions.map((fr: Record<string, unknown>) => String(fr.description ?? '')),
        ),
        entrypoint: String(raw.entrypoint ?? ''),
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

/** Same window as `readSessionTrailers` — the mis-file and its same-run
 *  cleanup both land within it (issue #574). Scoped to `origin/main`, not
 *  `--all`, per CLAUDE.md's git-log guidance. */
function readCommitFileChanges(cwd = root, days = ORPHAN_WINDOW_DAYS): CommitFileChange[] {
  let raw: string
  try {
    raw = execFileSync(
      'git',
      ['log', 'origin/main', `--since=${days} days ago`, '--name-status', `--pretty=format:${REC}%H${SEP}%aI`],
      { cwd, encoding: 'utf8' },
    )
  } catch {
    return []
  }
  return parseCommitFileChanges(raw)
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

/** Real Skill directory names under `.agents/skills/` — those containing a
 *  SKILL.md. The single read `filterSkillsUsed` cross-checks `skillsUsed`
 *  entries against (issue #545); also backs `readOnDiskSkills` below so the
 *  directory listing logic isn't duplicated. */
function readSkillNames(cwd = root): Set<string> {
  const dir = join(cwd, SKILLS_DIR)
  const out = new Set<string>()
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    if (existsSync(join(dir, name, 'SKILL.md'))) out.add(name)
  }
  return out
}

function readOnDiskSkills(cwd = root, skillNames: ReadonlySet<string> = readSkillNames(cwd)): Map<string, OnDiskSkill> {
  const dir = join(cwd, SKILLS_DIR)
  const out = new Map<string, OnDiskSkill>()
  for (const name of skillNames) {
    const fm = readFrontmatter(readFileSync(join(dir, name, 'SKILL.md'), 'utf8'), name)
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
    const observations = Array.isArray(raw.observations) ? raw.observations : []
    out.set(String(raw.name), {
      category: String(raw.category ?? ''),
      importance: String(raw.importance ?? ''),
      role: String(raw.role ?? '').replace(/\s+/g, ' ').trim(),
      observations: observations.map((o: Record<string, unknown>) => ({
        date: String(o.date ?? ''),
        note: String(o.note ?? '').replace(/\s+/g, ' ').trim(),
      })),
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
  const skillNames = readSkillNames(cwd)
  const files = readSessionFiles(cwd, skillNames)
  const all = files.map((e) => e.session)
  const window = pickWindow(all, windowSize)
  const external = readLock(cwd)
  const rows = buildSkillRows(readOnDiskSkills(cwd, skillNames), readInventory(cwd), tallyUsage(window), external)
  const { checks, sessions } = buildRegressionChecks(all, readSkillEdits(cwd), external)
  const trailers = readSessionTrailers(cwd)
  const orphanedSessions = findOrphanedSessions(trailers, readKnownSessionIds(cwd), readCommitFileChanges(cwd))
  return {
    windowSize,
    sessionsConsidered: all.length,
    window,
    skills: rows,
    regressionChecks: checks,
    regressionSessions: sessions,
    orphanedSessions,
    humanPromptedClosures: findHumanPromptedClosures(all),
    manuallyRescuedClosures: findManuallyRescuedClosures(trailers, all),
    misclassifiedKind: findMisclassifiedKind(all),
    skillSessionFiles: buildSkillSessionFiles(files),
    skillSessionFileTotals: buildSkillSessionFileTotals(files),
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
