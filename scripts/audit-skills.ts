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
//   than one Skill's edit) — `orphanedSessions` (issue #349; candidates come
//   from every merged pull request's recorded originating session, with no
//   time window at all, issue #738 — read `orphanScan` before reading an empty
//   list as "no orphans"; a resolved same-run mis-file — a flagged commit's
//   added file later removed by another commit — is excluded rather than
//   surfaced, issue #574, but is itemised in `orphanSuppressionLog` so the
//   suppression itself stays auditable, issue #754), the two
//   manual-nudge-closure signals `humanPromptedClosures` and
//   `manuallyRescuedClosures` (the counterpart to `orphanedSessions`: a session
//   that DID log, but only because a human nudged it — invisible to the orphan
//   check because the log now exists; a session id can be permanently
//   dismissed from this signal once it's tracked and fixed, issue #426, or —
//   for `manuallyRescuedClosures` and `orphanedSessions` — annotated with a
//   `resolvedBy` cutoff instead, which keeps the entry visible rather than
//   dropping it, issue #447 item 4) — and
//   `skillSessionFiles`, a skill → file-path map (all-time, not windowed, but
//   capped per Skill at `MAX_SKILL_SESSION_FILES`, issue #426) for a targeted
//   full-log deep-read once a regression is suspected for a specific Skill;
//   `skillSessionFileTotals` carries the true, uncapped count alongside it.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parse as parseYaml } from 'yaml'
import { isExternalSession } from '../shared/schemas/session.ts'
import { isParentlessBoundaryCommit, SESSION_TRAILER } from './git-helpers.ts'
import {
  envToken,
  hasGhBinary,
  parseNextLink,
  parseOwnerRepo,
  pickFetchStrategy,
  type FetchStrategy,
} from './list-open-issues.ts'
import { readProvenanceHeader } from './provenance-header.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** The default observation window: the 40 newest session logs (by `endedAt`). */
export const DEFAULT_WINDOW = 40
/** Sessions considered on each side of a Skill-edit commit for the regression watch. */
export const REGRESSION_BRACKET = 5
/** Most-recent edit commits considered per Skill — only the latest matters most
 *  for "did the last change help", and every extra one multiplies the scorecard's
 *  size across every own Skill with edit history. */
export const MAX_EDITS_PER_SKILL = 1
/** Calendar window bounding the work-commit scan behind `manuallyRescuedClosures`
 *  ONLY. It deliberately no longer reaches the orphan check, whose candidates now
 *  come from merged pull requests with no window at all (issue #738) — that check
 *  is the one a windowed scan silently truncated. A rescue is a *timing* signal
 *  about a recent close, so a short window costs it nothing. */
export const WORK_COMMIT_SCAN_DAYS = 4
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
  'session_01CGdWVh7DctbuH1sro8Xs4x', // #483
  'session_01VsqSAkCvbaLvAVsySvXvdg', // #483
  'session_012NCZUhy7qDirkjp8t6YiNy', // #792, recorded on the #483 thread
])
/** Session id → resolving issue/PR reference, for a `manuallyRescuedClosures`
 *  incident that's been triaged but should stay **visible** rather than
 *  disappear outright (unlike `DISMISSED_MANUALLY_RESCUED_CLOSURES`, which
 *  fully suppresses an entry) — the annotated entry keeps its `resolvedBy`
 *  cutoff so a future run doesn't re-read it as fresh evidence, while a
 *  reader can still see the incident happened and where it was tracked
 *  (issue #447 item 4). Append an entry here once its resolving issue/PR is
 *  known; use `DISMISSED_MANUALLY_RESCUED_CLOSURES` instead when the entry
 *  should disappear entirely. */
export const RESOLVED_MANUALLY_RESCUED_CLOSURES: ReadonlyMap<string, string> = new Map()
/** Session id → resolving issue/PR reference, for an `orphanedSessions`
 *  entry that's been triaged and should stay visible with a `resolvedBy`
 *  cutoff rather than resurface as fresh evidence on every run — the
 *  `orphanedSessions` counterpart to `RESOLVED_MANUALLY_RESCUED_CLOSURES`
 *  (issue #447 item 4; `orphanedSessions` has no full-suppression mechanism
 *  of its own, so this annotation is its only cutoff lever). */
export const RESOLVED_ORPHANED_SESSIONS: ReadonlyMap<string, string> = new Map()
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
  /** Set when `RESOLVED_ORPHANED_SESSIONS` names this session — see that
   *  constant for what the annotation means. */
  resolvedBy?: string
}
/** Why an orphan candidate was suppressed — the two levers are attributed
 *  separately so a reader can tell an automatic rule from a hand-written
 *  annotation (issue #754). */
export type OrphanSuppressionReason = 'misfile-cleanup' | 'resolved-annotation'
/** One line of the orphan suppression log: a candidate one of the levers acted
 *  on, reported rather than silently dropped (issue #754). A rule that moves
 *  ADR-0009's `close-session`-invocation-rate metric must leave an audit trail,
 *  or a false suppression is indistinguishable from a healthy denominator.
 *  The two reasons are **asymmetric**, which is why this is a log and not a list
 *  of removals: a `misfile-cleanup` entry is *removed from* `orphanedSessions`;
 *  a `resolved-annotation` entry is *still listed* there, annotated with its
 *  `resolvedBy` cutoff (issue #447 item 4). */
export interface OrphanSuppressionEntry {
  session: string
  commits: string[]
  date: string
  reason: OrphanSuppressionReason
  /** The added-then-removed session-log path `resolvedMisfilePath` matched on —
   *  `misfile-cleanup` only. */
  path?: string
  /** `RESOLVED_ORPHANED_SESSIONS`' reference — `resolved-annotation` only. */
  resolvedBy?: string
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
  /** Set when `RESOLVED_MANUALLY_RESCUED_CLOSURES` names this session — see
   *  that constant for what the annotation means, and `OrphanedSession.resolvedBy`
   *  for the sibling signal's identical shape. */
  resolvedBy?: string
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
  /** Whether the orphan candidate source could be read at all (issue #738).
   *  `scanned: false` means `orphanedSessions` is empty because nothing was
   *  looked at — read this BEFORE reading that empty list as a clean sweep. */
  orphanScan: OrphanScanStatus
  /** The audit trail of every orphan candidate a suppression lever acted on —
   *  always present, `[]` when nothing was suppressed. An entry here does not
   *  imply the candidate left `orphanedSessions`: only `misfile-cleanup` does,
   *  `resolved-annotation` leaves it listed and annotated (see the interface,
   *  issue #754). */
  orphanSuppressionLog: OrphanSuppressionEntry[]
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

/** One raw record as read off the GitHub REST `pulls` list endpoint, trimmed to
 *  what the orphan check reads. */
export interface RawPullRequestApiRecord {
  number: number
  body: string | null
  merged_at: string | null
  merge_commit_sha: string | null
}

/** Whether the orphan check's candidate source could be read at all, and how
 *  much of it there was. The failure arm is the whole point of issue #738: a
 *  source that could not be read must stay distinguishable from one that was
 *  read and found nothing, because the silent version of that difference is
 *  what let a real orphan pass as a clean sweep. Reported on the scorecard;
 *  carries no candidate data, so it stays cheap to include on every run. */
export type OrphanScanStatus =
  | { scanned: true; mergedPullRequests: number; withSession: number }
  | { scanned: false; reason: string }

/** `OrphanScanStatus` plus the candidates themselves — the reader's own return
 *  shape, kept separate so the scorecard reports the status without carrying one
 *  entry per merged pull request. */
export type PullRequestScan = { status: OrphanScanStatus; refs: SessionTrailerRef[] }

/** One commit's added/removed file paths (`git log --name-status`) along
 *  `origin/main`'s first-parent line — the raw material `resolvedMisfilePath`
 *  diffs against to catch a same-run mis-file cleanup (issue #574). First-parent
 *  because an orphan candidate is now keyed on its pull request's MERGE commit
 *  (issue #738), and a merge only carries a file list on that line. */
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

/** The legacy `Claude-Session:` footer's id, in genuine TRAILER POSITION — its
 *  own line, not mid-sentence. The anchor and the id-shape check are both
 *  load-bearing, not tidying: PR #120's body explains the trailer format inline
 *  (`… (\`Claude-Session: https://claude.ai/code/session_01…\`) …`) and the
 *  unanchored `SESSION_TRAILER` matched it, inventing an orphan for the elided
 *  id `session_01…\`)`. That is issue #692's class of bug — a quoted marker read
 *  as authorship — and `SESSION_TRAILER` stays as-is because other readers
 *  (`session-id-guard.ts`) want its looser reach. */
function legacyTrailerSession(body: string): string | undefined {
  for (const line of body.split('\n')) {
    if (!/^Claude-Session:/.test(line)) continue
    const id = line.match(SESSION_TRAILER)?.[1]
    if (id && /^[A-Za-z0-9_-]+$/.test(id)) return id
  }
  return undefined
}

/** The session a merged pull request records as its origin, shaped as the same
 *  `SessionTrailerRef` the comparison already consumes so only the *source*
 *  changes (issue #738). `null` for a closed-unmerged pull request, or a merged
 *  one whose body carries no session marker at all — a body predating #737's
 *  fix can lack one, and contributing no candidate is the honest outcome there.
 *
 *  Only the two DELIBERATE authorship markers count: ADR-0017's header (anchored
 *  at the body's start) and the legacy `Claude-Session:` footer (anchored to its
 *  own line — see `legacyTrailerSession`). `sessionIdsIn` is deliberately NOT
 *  used: it reads any session URL wherever it appears, so a body quoting another
 *  session would be attributed to it (issue #692's class of bug), and a
 *  mis-attributed candidate is a fabricated orphan.
 *
 *  Keyed on the merge commit so `resolvedMisfilePath` can still match this
 *  candidate against `readCommitFileChanges`; `pr-<number>` is the fallback for
 *  a merged pull request GitHub reports without one, since dropping the
 *  candidate to preserve a tidy sha is the silent truncation this issue exists
 *  to remove. */
export function pullRequestSessionRef(record: RawPullRequestApiRecord): SessionTrailerRef | null {
  if (!record.merged_at) return null
  const body = record.body ?? ''
  const session = readProvenanceHeader(body)?.sessionId ?? legacyTrailerSession(body)
  if (!session) return null
  return { sha: record.merge_commit_sha || `pr-${record.number}`, date: record.merged_at, session }
}

/** Every merged pull request's originating session, as the candidate set the
 *  orphan comparison runs against (issue #738). Ordering and per-session
 *  grouping are `groupSessionReferences`' job, not this one's. */
export function parseMergedPullRequests(records: RawPullRequestApiRecord[]): SessionTrailerRef[] {
  return records.map(pullRequestSessionRef).filter((ref): ref is SessionTrailerRef => ref !== null)
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
 *  matches an orphan's own actual age. Compares by parsed epoch, not raw
 *  string — see `findManuallyRescuedClosures`'s inline comment for why
 *  (mixed `git %aI` UTC offsets defeat a lexicographic compare). */
export function groupSessionReferences(
  refs: SessionTrailerRef[],
): Map<string, { commits: string[]; date: string }> {
  const out = new Map<string, { commits: string[]; date: string }>()
  for (const { sha, date, session } of refs) {
    const entry = out.get(session) ?? { commits: [], date }
    entry.commits.push(sha)
    if (Date.parse(date) < Date.parse(entry.date)) entry.date = date
    out.set(session, entry)
  }
  return out
}

/** True when a path is one a session log could have been mis-filed to — the
 *  scope of the mis-file this check suppresses. Deliberately does NOT require
 *  the candidate session's own id: a mis-file is by definition filed under the
 *  *wrong* id (issue #574), so matching on the candidate's id would never fire. */
export function isSessionLogPath(path: string): boolean {
  return (
    path.endsWith('.yml') && (path.startsWith(`${SESSIONS_DIR}/`) || path.startsWith(`${ARCHIVED_SESSIONS_DIR}/`))
  )
}

/** The SESSION LOG path a commit referencing the orphan-candidate session added
 *  and some other commit in `changes` later removed — a same-run mis-file (e.g.
 *  a CLI-transcript-id session log filed under the wrong id) cleaned up before
 *  it became a genuine orphan, not a real gap (issue #574) — or `null` when no
 *  such path exists. Returns the path rather than a bare boolean so the
 *  suppression it drives can name what triggered it (issue #754). Matches on
 *  the exact path only; a rename that changes the path doesn't count as a
 *  removal of the original.
 *
 *  The `isSessionLogPath` scope is load-bearing, not a tidy-up: without it any
 *  added-then-deleted file suppressed the whole session, so a session that
 *  folded a doc into its single home and deleted the standalone file went
 *  unreported across four consecutive daily sweeps (issue #747). */
export function resolvedMisfilePath(commits: string[], changes: CommitFileChange[]): string | null {
  const bySha = new Map(changes.map((c) => [c.sha, c]))
  for (const sha of commits) {
    const change = bySha.get(sha)
    if (!change) continue
    for (const path of change.added) {
      if (!isSessionLogPath(path)) continue
      // Epoch, not string compare — the same mixed-offset hazard
      // `groupSessionReferences` guards against (issue #747).
      const addedAt = Date.parse(change.date)
      if (changes.some((c) => c.sha !== sha && Date.parse(c.date) > addedAt && c.removed.includes(path))) return path
    }
  }
  return null
}

/** Attaches `resolvedBy` to `obj` when `resolved` names `id` — the one shared
 *  shape `findOrphanedSessions` and `findManuallyRescuedClosures` both need
 *  for their `resolvedBy` annotation (see `RESOLVED_MANUALLY_RESCUED_CLOSURES`
 *  for what the annotation means, issue #447 item 4). */
function withResolvedBy<T extends object>(
  obj: T,
  id: string,
  resolved: ReadonlyMap<string, string>,
): T & { resolvedBy?: string } {
  const resolvedBy = resolved.get(id)
  return resolvedBy ? { ...obj, resolvedBy } : obj
}

/** Both halves of the orphan check, so no suppression is invisible: `orphaned`
 *  is issue #349's signal, `suppressed` is the orphan suppression log — every
 *  candidate a lever acted on (issue #754). Both sorted oldest-first — the most
 *  actionable triage order (issue #349). `fileChanges` (default `[]`, backward
 *  compatible) feeds `resolvedMisfilePath` to drop a resolved same-run mis-file
 *  rather than surface it as a fresh orphan (issue #574) — that candidate is
 *  removed from `orphaned`. `resolved` (default `RESOLVED_ORPHANED_SESSIONS`)
 *  feeds `withResolvedBy` above, and is asymmetric to it: an annotated candidate
 *  stays listed in `orphaned` *and* is attributed in `suppressed`. */
export function findOrphanedSessions(
  refs: SessionTrailerRef[],
  knownSessionIds: Set<string>,
  fileChanges: CommitFileChange[] = [],
  resolved: ReadonlyMap<string, string> = RESOLVED_ORPHANED_SESSIONS,
): { orphaned: OrphanedSession[]; suppressed: OrphanSuppressionEntry[] } {
  const grouped = groupSessionReferences(refs)
  const orphaned: OrphanedSession[] = []
  const suppressed: OrphanSuppressionEntry[] = []
  for (const [session, { commits, date }] of grouped) {
    if (knownSessionIds.has(session)) continue
    const misfilePath = resolvedMisfilePath(commits, fileChanges)
    if (misfilePath) {
      suppressed.push({ session, commits, date, reason: 'misfile-cleanup', path: misfilePath })
      continue
    }
    const resolvedBy = resolved.get(session)
    if (resolvedBy) suppressed.push({ session, commits, date, reason: 'resolved-annotation', resolvedBy })
    orphaned.push(withResolvedBy({ session, commits, date }, session, resolved))
  }
  // Epoch, not string compare — same mixed-offset hazard groupSessionReferences
  // guards against, one level up: two different sessions' dates can carry
  // different `git %aI` offsets, and a lexicographic compare can misorder them.
  const oldestFirst = (a: { date: string }, b: { date: string }) => Date.parse(a.date) - Date.parse(b.date)
  return { orphaned: orphaned.sort(oldestFirst), suppressed: suppressed.sort(oldestFirst) }
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
 *  this check has no calendar recency window of its own. `resolved` (default
 *  `RESOLVED_MANUALLY_RESCUED_CLOSURES`) feeds `withResolvedBy` above — the
 *  lighter-touch alternative to `dismissed`. Sorted by gap, largest first
 *  (most conspicuous rescue first). */
export function findManuallyRescuedClosures(
  refs: SessionTrailerRef[],
  sessions: WindowSession[],
  minGapHours = RESCUED_GAP_HOURS,
  dismissed: ReadonlySet<string> = DISMISSED_MANUALLY_RESCUED_CLOSURES,
  resolved: ReadonlyMap<string, string> = RESOLVED_MANUALLY_RESCUED_CLOSURES,
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
    out.push(
      withResolvedBy(
        { session: s.session, endedAt: s.endedAt, lastWorkCommit: last, gapHours: Math.round(gapHours * 10) / 10 },
        s.session,
        resolved,
      ),
    )
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

/** Reduce one parsed session log to its `SessionFile`, or `null` when the log is
 *  EXTERNAL (ADR-0009 amendment): a log authored by a different harness/toolchain
 *  is excluded from the self-improvement corpus entirely — its frictions,
 *  skill-usage, and regression signal reflect a toolchain our fixes don't touch.
 *  Dropping it here removes it from every downstream signal at once (window,
 *  usage tally, regression brackets, `skillSessionFiles`, human-prompted /
 *  misclassified / rescued closures). `skillNames` cross-checks each `skillsUsed`
 *  entry against the real Skills on disk (`filterSkillsUsed`, issue #545). */
export function toSessionFile(
  raw: Record<string, unknown>,
  file: string,
  skillNames: ReadonlySet<string>,
): SessionFile | null {
  if (isExternalSession(raw)) return null
  const used = Array.isArray(raw.skillsUsed) ? raw.skillsUsed : []
  const frictions = Array.isArray(raw.frictions) ? raw.frictions : []
  return {
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
    file,
  }
}

// ── FS IO (thin shell) ────────────────────────────────────────────────────────

/** Reads every session log with its source file path attached (`SessionFile`),
 *  dropping EXTERNAL logs via `toSessionFile` (ADR-0009 amendment). `skillNames`
 *  cross-checks each `skillsUsed` entry against the real Skills on disk
 *  (`filterSkillsUsed`, issue #545) — defaults to a fresh `readSkillNames(cwd)`
 *  read, but `scorecard()` passes one in so the directory is only read once per run. */
function readSessionFiles(cwd = root, skillNames: ReadonlySet<string> = readSkillNames(cwd)): SessionFile[] {
  const dir = join(cwd, SESSIONS_DIR)
  if (!existsSync(dir)) return []
  const out: SessionFile[] = []
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.yml'))) {
    const raw = parseYaml(readFileSync(join(dir, f), 'utf8')) as Record<string, unknown>
    if (!raw || typeof raw !== 'object') continue
    const entry = toSessionFile(raw, `${SESSIONS_DIR}/${f}`, skillNames)
    if (entry) out.push(entry)
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

/** Scoped to `origin/main` per CLAUDE.md's git-log guidance, not `--all`. Feeds
 *  `manuallyRescuedClosures` only — see `WORK_COMMIT_SCAN_DAYS` for why the
 *  orphan check no longer reads from here (issue #738). */
function readSessionTrailers(cwd = root, days = WORK_COMMIT_SCAN_DAYS): SessionTrailerRef[] {
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

/** Unwindowed, and along `origin/main`'s first-parent line — see
 *  `CommitFileChange` for why both (issue #738). Scoped to `origin/main`, not
 *  `--all`, per CLAUDE.md's git-log guidance. History this can't see (a shallow
 *  clone) only costs a suppression, so a candidate surfaces as a visible orphan
 *  rather than disappearing — the safe direction for issue #747's lesson. */
function readCommitFileChanges(cwd = root): CommitFileChange[] {
  let raw: string
  try {
    raw = execFileSync(
      'git',
      ['log', 'origin/main', '--first-parent', '--name-status', `--pretty=format:${REC}%H${SEP}%aI`],
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

// ── GitHub IO (thin shell) ───────────────────────────────────────────────────
//
// The orphan check's candidate source (issue #738). It sits behind the same
// boundary as the git readers above — everything below returns raw records, and
// every judgement is made by the pure `parseMergedPullRequests`/
// `findOrphanedSessions` pair, so the comparison stays testable with no network.
//
// The `gh`/`rest` strategy switch (`pickFetchStrategy`, `parseNextLink`,
// `hasGhBinary`, `envToken`, `parseOwnerRepo`) is single-homed in
// `list-open-issues.ts` (issue #505) and imported at the top of this file.

function readOriginUrl(cwd: string): string {
  return execFileSync('git', ['remote', 'get-url', 'origin'], { cwd, encoding: 'utf8' }).trim()
}

function readClosedPullRequestsViaGh(owner: string, repo: string, cwd: string): RawPullRequestApiRecord[] {
  const raw = execFileSync(
    'gh',
    ['api', '--method', 'GET', `repos/${owner}/${repo}/pulls`, '-f', 'state=closed', '-f', 'per_page=100', '--paginate', '--jq', '.[]'],
    { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
  )
  return raw
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as RawPullRequestApiRecord)
}

// See `poll-guest-tickets.ts`'s `curlGetPage` for why `curl` over `fetch` here
// (issue #567) — mirrored, down to the header/body temp-file split that makes
// `Link`-header pagination readable.
function curlGetPage(url: string, token: string, cwd: string): { status: string; body: string; linkHeader: string | null } {
  const dir = mkdtempSync(join(tmpdir(), 'audit-skills-'))
  const headerFile = join(dir, 'headers')
  const bodyFile = join(dir, 'body')
  try {
    const status = execFileSync(
      'curl',
      [
        '-sS',
        '-o',
        bodyFile,
        '-D',
        headerFile,
        '-w',
        '%{http_code}',
        '-H',
        `Authorization: Bearer ${token}`,
        '-H',
        'Accept: application/vnd.github+json',
        '-H',
        'User-Agent: terrarium-audit-skills',
        url,
      ],
      { cwd, encoding: 'utf8' },
    ).trim()
    const headers = readFileSync(headerFile, 'utf8')
    const linkLine = headers.split(/\r?\n/).find((l) => /^link:/i.test(l))
    return {
      status,
      body: readFileSync(bodyFile, 'utf8'),
      linkHeader: linkLine ? linkLine.slice(linkLine.indexOf(':') + 1).trim() : null,
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** Walks pages by NUMBER on our own `repos/{owner}/{repo}` URL, using the `Link`
 *  header only as the "is there another page" signal rather than following its
 *  URL. GitHub answers this endpoint with `rel="next"` pointing at the numeric
 *  `repositories/{id}/pulls` form, which this environment's agent proxy rejects
 *  outright ("Numeric-ID repository paths … are not supported through this
 *  proxy"), so following it verbatim 403s on page 2 — and a partial scan that
 *  reads as complete is exactly the failure issue #738 exists to remove. */
function readClosedPullRequestsViaRest(
  owner: string,
  repo: string,
  token: string,
  cwd: string,
): RawPullRequestApiRecord[] {
  const out: RawPullRequestApiRecord[] = []
  for (let page = 1; ; page++) {
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=closed&per_page=100&page=${page}`
    const { status, body, linkHeader } = curlGetPage(url, token, cwd)
    if (status[0] !== '2') throw new Error(`GitHub REST API request to ${url} failed: HTTP ${status}`)
    out.push(...(JSON.parse(body) as RawPullRequestApiRecord[]))
    if (parseNextLink(linkHeader) === null) return out
  }
}

function readClosedPullRequests(strategy: FetchStrategy, owner: string, repo: string, cwd: string): RawPullRequestApiRecord[] {
  if (strategy === 'gh') return readClosedPullRequestsViaGh(owner, repo, cwd)
  const token = envToken()
  if (!token) throw new Error('rest strategy chosen with no GH_TOKEN/GITHUB_TOKEN set')
  return readClosedPullRequestsViaRest(owner, repo, token, cwd)
}

/** Every merged pull request's originating session — the orphan check's whole
 *  candidate set, unbounded in time (issue #738). Every failure to reach the
 *  source returns `scanned: false` with the reason rather than an empty set: an
 *  empty set is a claim that nothing is orphaned, and this reader is not
 *  entitled to make that claim when it could not look. */
export function readPullRequestSessionRefs(cwd = root): PullRequestScan {
  try {
    const originUrl = readOriginUrl(cwd)
    const ownerRepo = parseOwnerRepo(originUrl)
    if (ownerRepo === null) {
      return { status: { scanned: false, reason: `could not parse owner/repo from origin remote: ${originUrl}` }, refs: [] }
    }
    const strategy = pickFetchStrategy(hasGhBinary(cwd), Boolean(envToken()))
    if (strategy === null) {
      return {
        status: {
          scanned: false,
          reason: '`gh` is not installed and neither GH_TOKEN nor GITHUB_TOKEN is set',
        },
        refs: [],
      }
    }
    const records = readClosedPullRequests(strategy, ownerRepo.owner, ownerRepo.repo, cwd)
    const merged = records.filter((r) => r.merged_at !== null)
    const refs = parseMergedPullRequests(merged)
    return { status: { scanned: true, mergedPullRequests: merged.length, withSession: refs.length }, refs }
  } catch (err) {
    return { status: { scanned: false, reason: err instanceof Error ? err.message : String(err) }, refs: [] }
  }
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
  const scan = readPullRequestSessionRefs(cwd)
  const orphans = findOrphanedSessions(scan.refs, readKnownSessionIds(cwd), readCommitFileChanges(cwd))
  return {
    windowSize,
    sessionsConsidered: all.length,
    window,
    skills: rows,
    regressionChecks: checks,
    regressionSessions: sessions,
    orphanedSessions: orphans.orphaned,
    orphanScan: scan.status,
    orphanSuppressionLog: orphans.suppressed,
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
