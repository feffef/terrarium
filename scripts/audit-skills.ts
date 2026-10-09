// The audit-skills helper (ADR-0015): the deterministic half of the `audit-skills`
// Skill. It gathers — usage of every Skill across the last N days of session
// logs, the Inventory entries, which own Skills get a behaviour check, and the
// closure-completeness signals — and prints compact JSON. Every judgement stays
// with the Skill's session.
//
// Usage:  tsx scripts/audit-skills.ts [--days N]
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parse as parseYaml } from 'yaml'
import { isContentPath } from './session-trace.ts'
import { isExternalSession } from '../shared/schemas/session.ts'
import { SESSION_TRAILER } from './git-helpers.ts'
import {
  envToken,
  hasGhBinary,
  parseOwnerRepo,
  pickFetchStrategy,
  type FetchStrategy,
} from './list-open-issues.ts'
import { readProvenanceHeader } from './provenance-header.ts'
import { ARCHIVED_SESSIONS_DIR, readSessionLogs, SESSIONS_DIR } from './session-logs.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** The observation window, in days before now. Time-based rather than a session
 *  count, so the scheduled Routines' own runs can't shrink it to a couple of days. */
export const DEFAULT_WINDOW_DAYS = 7
/** An own Skill used in at least this many windowed sessions gets a behaviour check. */
export const BEHAVIOUR_CHECK_MIN_USES = 3

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
/** Session id → resolving issue/PR reference, for an `orphanedSessions` entry
 *  already triaged: it stays visible with a `resolvedBy` cutoff rather than
 *  resurfacing as fresh evidence — the orphan check has no time window
 *  (issue #738), so this is its only cutoff lever (issue #447 item 4). */
export const RESOLVED_ORPHANED_SESSIONS: ReadonlyMap<string, string> = new Map([
  ['session_019aeaoPHYWMJVekmUvTMhQ9', '#736'],
  ['session_01QdPGeF2hNwJLtnvzv1Rsi1', '#1063'],
])

/** Paths this helper reads. */
export const INVENTORY_DIR = 'layers/journal/content/current/skills'
export const SKILLS_DIR = '.agents/skills'
/** The external pack's lockfile — a Skill named here is not ours to edit (ADR-0015). */
export const SKILLS_LOCK = 'skills-lock.json'

// Exported so the unit tests can build synthetic `git log` output with them.
export const SEP = '\x1f' // field separator
export const REC = '\x1e' // record separator

// ── Types ───────────────────────────────────────────────────────────────────

/** One parsed, internal (non-external) session log. */
export interface Session {
  session: string
  /** Repo-relative path of the log — what a behaviour-check subagent reads. */
  file: string
  kind: string
  goal: string
  /** Brackets the run against `SkillRow.changes`: a change landed after this
   *  instant is one the run never saw. */
  startedAt: string
  endedAt: string
  /** Skill names only, filtered to real Skills on disk (issue #545). */
  skillsUsed: string[]
  /** Skills a friction or learning names — where a Skill's absence is felt. */
  mentioned: string[]
  /** `skillsUsed` entries a human reached for (a slash command or a direct ask). */
  humanInvoked: string[]
  /** A friction `description` carries `HUMAN_PROMPTED_CLOSURE` (`close-session`). */
  humanPromptedClosure: boolean
  /** `docsRead` paths, feeding `docReadCounts`. */
  docsRead: string[]
}
/** A windowed session as printed — what the Skill judges "kind of work" from. */
export type WindowSession = Omit<Session, 'humanPromptedClosure' | 'docsRead' | 'mentioned' | 'humanInvoked'>
export interface OnDiskSkill {
  description: string
  /** False when its frontmatter sets `disable-model-invocation: true`. */
  modelInvoked: boolean
  /** `scripts/*.ts` paths its SKILL.md names — its resources, watched for
   *  changes alongside its own folder. */
  scripts: string[]
}
/** One first-parent `origin/main` commit and the paths it touched; `landedAt`
 *  is its committer date in UTC — when runs started seeing the change. */
export interface Landing {
  sha: string
  landedAt: string
  paths: string[]
}
/** One `observations` entry (ADR-0015 amendment, 2026-07-13). */
export interface Observation {
  date: string
  note: string
}
export interface InventoryEntry {
  category: string
  importance: string
  role: string
  observations: Observation[]
}
export interface SkillRow {
  name: string
  onDisk: boolean
  inventoried: boolean
  /** In the external pack — its SKILL.md is not ours to patch. */
  external: boolean
  modelInvoked: boolean
  category: string | null
  importance: string | null
  role: string | null
  observations: Observation[]
  description: string | null
  /** Windowed sessions that used it, and their ids (resolve against `window`). */
  useCount: number
  usedIn: string[]
  /** Windowed sessions whose frictions or learnings name it — candidates to read, not a count. */
  mentionedIn: string[]
  /** Windowed sessions where a human invoked it. */
  humanInvokedIn: string[]
  /** Across every session log on record, current and archived. */
  allTimeUses: number
  lastUsed: string | null
  /** What landed touching this Skill's folder or a script it names since the
   *  earliest `usedIn` run started, newest first. Empty: every run is graded
   *  against the files on disk. Otherwise a run whose `startedAt` precedes a
   *  landing answers to the text before it (`git show <sha>^:<path>`) —
   *  untested by it, not broken (#1479, #1515). The CLI warns on stderr for
   *  each behaviour-checked Skill this is non-empty for. */
  changes: Landing[]
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
}

export interface Scorecard {
  windowDays: number
  /** Sessions ending at or after this instant are in the window. */
  since: string
  window: WindowSession[]
  skills: SkillRow[]
  /** Own Skills used in ≥ `BEHAVIOUR_CHECK_MIN_USES` windowed sessions. */
  behaviourChecks: string[]
  orphanedSessions: OrphanedSession[]
  /** Read before trusting an empty `orphanedSessions`: `scanned: false` means
   *  nothing was looked at (issue #738). */
  orphanScan: OrphanScanStatus
  /** Every orphan candidate a suppression lever acted on (issue #754). Only
   *  `misfile-cleanup` removes one from `orphanedSessions`; a
   *  `resolved-annotation` stays listed there with its `resolvedBy`. */
  orphanSuppressionLog: OrphanSuppressionEntry[]
  humanPromptedClosures: HumanPromptedClosure[]
  manuallyRescuedClosures: ManuallyRescuedClosure[]
  /** Path → how many windowed sessions opened it.
   *
   *  **This docstring is the single home for how to read a doc-read count**
   *  (read by `audit-docs` and `frictions-to-fixes`). A doc a Skill tells you
   *  to read, sitting at 0, is evidence the pointer isn't landing — but only
   *  ever *corroborating* evidence, for three independent reasons: a
   *  topic-scoped doc reads 0 because that work didn't come up; a `cat`/`grep`
   *  inspection is invisible to the trace by design; and since subagent reads
   *  are folded into the parent's list (`session-trace.ts`'s
   *  `foldSubagentTrace`), "opened" can mean a subagent opened it, not the
   *  session that hit the friction. Never a finding alone. */
  docReadCounts: Record<string, number>
}

// ── Pure core (unit-tested) ───────────────────────────────────────────────────

/** The sessions that ended at or after `since`, newest first (ties by id). */
export function pickWindow(sessions: readonly Session[], since: string): Session[] {
  const from = Date.parse(since)
  return sessions
    .filter((s) => Date.parse(s.endedAt) >= from)
    .sort((a, b) => b.endedAt.localeCompare(a.endedAt) || b.session.localeCompare(a.session))
}

/** Skill name → the ids of the sessions that used it (or, via `field`, named or
 *  human-invoked it), in the given order. */
export function tallyUsage(
  sessions: readonly Session[],
  field: 'skillsUsed' | 'mentioned' | 'humanInvoked' = 'skillsUsed',
): Map<string, string[]> {
  const byName = new Map<string, string[]>()
  for (const s of sessions) {
    for (const name of new Set(s[field])) byName.set(name, [...(byName.get(name) ?? []), s.session])
  }
  return byName
}

/** Skill name → the newest `endedAt` of any session that used it. */
export function lastUsed(sessions: readonly Session[]): Map<string, string> {
  const out = new Map<string, string>()
  for (const s of sessions) {
    for (const name of s.skillsUsed) {
      const cur = out.get(name)
      if (!cur || s.endedAt > cur) out.set(name, s.endedAt)
    }
  }
  return out
}

/** One row per Skill that is on disk, inventoried, or used — so a gap shows
 *  either way (on disk but uninventoried, inventoried but gone). Sorted by name. */
export function buildSkillRows(
  onDisk: Map<string, OnDiskSkill>,
  inventory: Map<string, InventoryEntry>,
  windowSessions: readonly Session[],
  allSessions: readonly Session[],
  external: ReadonlySet<string>,
  landings: readonly Landing[] = [],
): SkillRow[] {
  const windowed = tallyUsage(windowSessions)
  const mentioned = tallyUsage(windowSessions, 'mentioned')
  const humanInvoked = tallyUsage(windowSessions, 'humanInvoked')
  const allTime = tallyUsage(allSessions)
  const last = lastUsed(allSessions)
  const names = new Set<string>([...onDisk.keys(), ...inventory.keys(), ...allTime.keys()])
  return [...names].sort().map((name) => {
    const entry = inventory.get(name)
    const usedIn = windowed.get(name) ?? []
    return {
      name,
      onDisk: onDisk.has(name),
      inventoried: inventory.has(name),
      external: external.has(name),
      modelInvoked: onDisk.get(name)?.modelInvoked ?? false,
      category: entry?.category ?? null,
      importance: entry?.importance ?? null,
      role: entry?.role ?? null,
      observations: entry?.observations ?? [],
      description: onDisk.get(name)?.description ?? null,
      useCount: usedIn.length,
      usedIn,
      mentionedIn: mentioned.get(name) ?? [],
      humanInvokedIn: humanInvoked.get(name) ?? [],
      allTimeUses: allTime.get(name)?.length ?? 0,
      lastUsed: last.get(name) ?? null,
      changes: pickSkillChanges(landings, name, onDisk.get(name)?.scripts ?? [], earliestStart(windowSessions, usedIn)),
    }
  })
}

/** The `scripts/*.ts` paths a SKILL.md names, deduplicated, in order of first mention. */
export function scriptsNamedIn(skillMd: string): string[] {
  return [...new Set(skillMd.match(/\bscripts\/[\w.-]+\.ts\b/g) ?? [])]
}

/** Expects `readLandings`' `git log --name-only` format: a header line (`sha`
 *  SEP `committer date`) then one path per line. Dates are normalised to UTC so
 *  they compare against a log's `startedAt` as plain strings. */
export function parseLandings(raw: string): Landing[] {
  const out: Landing[] = []
  for (const block of raw.split(REC).map((b) => b.trim()).filter(Boolean)) {
    const [header, ...paths] = block.split('\n')
    const [sha, date] = (header ?? '').split(SEP)
    const epoch = Date.parse(date ?? '')
    if (!sha || !Number.isFinite(epoch)) continue
    out.push({ sha, landedAt: new Date(epoch).toISOString(), paths: paths.map((p) => p.trim()).filter(Boolean) })
  }
  return out
}

/** The earliest `startedAt` among `ids`' sessions, or `null` when none started. */
export function earliestStart(sessions: readonly Session[], ids: readonly string[]): string | null {
  const starts = sessions.filter((s) => ids.includes(s.session) && s.startedAt).map((s) => s.startedAt)
  return starts.length ? starts.reduce((a, b) => (a < b ? a : b)) : null
}

/** The landings since `from` that touched `.agents/skills/<name>/` or one of
 *  `scripts`, each narrowed to those paths; none when no run started. */
export function pickSkillChanges(landings: readonly Landing[], name: string, scripts: readonly string[], from: string | null): Landing[] {
  if (from === null) return []
  const own = `${SKILLS_DIR}/${name}/`
  return landings.flatMap((l) => {
    const paths = l.paths.filter((p) => p.startsWith(own) || scripts.includes(p))
    return paths.length && l.landedAt >= from ? [{ ...l, paths }] : []
  })
}

/** Own, on-disk Skills used often enough in the window to judge their behaviour. */
export function pickBehaviourChecks(rows: readonly SkillRow[], minUses = BEHAVIOUR_CHECK_MIN_USES): string[] {
  return rows.filter((r) => r.onDisk && !r.external && r.useCount >= minUses).map((r) => r.name)
}

/** Path → how many sessions opened it; a session reading a path twice counts once. */
export function buildDocReadCounts(sessions: readonly Session[]): Record<string, number> {
  const counts = new Map<string, number>()
  for (const s of sessions) {
    for (const path of new Set(s.docsRead)) counts.set(path, (counts.get(path) ?? 0) + 1)
  }
  return Object.fromEntries([...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))
}

/** A `skillsUsed` reason saying a human, not the agent, reached for the Skill. */
const HUMAN_INVOKED = /slash command|\b(?:user|owner|human)\b.{0,20}\b(?:ask|asked|invoked|requested)\b/i

/** Whether `text` names `skill` as a whole token — `grilling` never matches inside
 *  `grill-with-docs`, and `/code-review` matches. */
export function namesSkill(text: string, skill: string): boolean {
  return new RegExp(`(?<![\\w-])${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`, 'i').test(text)
}

/** One parsed log as a `Session`, or `null` for an EXTERNAL log — excluded from
 *  the self-improvement corpus entirely (ADR-0009 amendment). `skillNames` drops
 *  a `skillsUsed` entry that isn't a real Skill, e.g. "model" (issue #545). */
export function toSession(raw: Record<string, unknown>, file: string, skillNames: ReadonlySet<string>): Session | null {
  if (isExternalSession(raw)) return null
  const used = (Array.isArray(raw.skillsUsed) ? raw.skillsUsed : [])
    .filter((u: Record<string, unknown>) => skillNames.has(String(u.name ?? '')))
  const frictions = Array.isArray(raw.frictions) ? raw.frictions : []
  const learnings = Array.isArray(raw.learnings) ? raw.learnings : []
  const prose = [
    ...frictions.flatMap((fr: Record<string, unknown>) => [fr.description, fr.solution]),
    ...learnings,
  ].map((t) => String(t ?? '')).join('\n')
  return {
    session: String(raw.session ?? ''),
    file,
    kind: String(raw.kind ?? ''),
    goal: String(raw.goal ?? ''),
    startedAt: String(raw.startedAt ?? ''),
    endedAt: String(raw.endedAt ?? ''),
    skillsUsed: used.map((u: Record<string, unknown>) => String(u.name)),
    mentioned: [...skillNames].filter((n) => namesSkill(prose, n)),
    humanInvoked: used
      .filter((u: Record<string, unknown>) => HUMAN_INVOKED.test(String(u.reason ?? '')))
      .map((u: Record<string, unknown>) => String(u.name)),
    humanPromptedClosure: hasHumanPromptedClosure(frictions.map((fr: Record<string, unknown>) => String(fr.description ?? ''))),
    // session-trace.ts's noise rule, reapplied on read to clean older logs.
    docsRead: (Array.isArray(raw.docsRead) ? raw.docsRead : [])
      .map((d: Record<string, unknown>) => String(d.path ?? ''))
      .filter(isContentPath),
  }
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
 *  (`provenance-footer.ts`, `github-provenance-guard.ts`) want its looser reach. */
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

/** Both halves of the orphan check, so no suppression is invisible: `orphaned`
 *  is issue #349's signal, `suppressed` is the orphan suppression log — every
 *  candidate a lever acted on (issue #754). Both sorted oldest-first — the most
 *  actionable triage order (issue #349). `fileChanges` (default `[]`, backward
 *  compatible) feeds `resolvedMisfilePath` to drop a resolved same-run mis-file
 *  rather than surface it as a fresh orphan (issue #574) — that candidate is
 *  removed from `orphaned`. `resolved` (default `RESOLVED_ORPHANED_SESSIONS`)
 *  is asymmetric to the mis-file lever: an annotated candidate
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
    orphaned.push(resolvedBy ? { session, commits, date, resolvedBy } : { session, commits, date })
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

/** The sessions that flagged a human-prompted closure, oldest first. */
export function findHumanPromptedClosures(sessions: readonly Session[]): HumanPromptedClosure[] {
  return sessions
    .filter((s) => s.humanPromptedClosure)
    .map((s) => ({ session: s.session, endedAt: s.endedAt }))
    .sort((a, b) => a.endedAt.localeCompare(b.endedAt) || a.session.localeCompare(b.session))
}

/** Sessions whose closure landed at least `minGapHours` after their last work
 *  commit — a manual rescue the orphan check misses because the log now exists.
 *  `refs` supplies each session's work commits (the log-landing commit carries no
 *  `Claude-Session` trailer, so it never counts as work). Largest gap first. */
export function findManuallyRescuedClosures(
  refs: SessionTrailerRef[],
  sessions: readonly Session[],
  minGapHours = RESCUED_GAP_HOURS,
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
    const last = latestWork.get(s.session)
    if (!last || !s.endedAt) continue
    const gapHours = (Date.parse(s.endedAt) - Date.parse(last)) / 3_600_000
    if (!Number.isFinite(gapHours) || gapHours < minGapHours) continue
    out.push({ session: s.session, endedAt: s.endedAt, lastWorkCommit: last, gapHours: Math.round(gapHours * 10) / 10 })
  }
  return out.sort((a, b) => b.gapHours - a.gapHours || a.session.localeCompare(b.session))
}

// ── FS IO (thin shell) ────────────────────────────────────────────────────────

/** Every internal session log, current and archived. */
function readSessions(cwd: string, skillNames: ReadonlySet<string>): Session[] {
  return readSessionLogs(cwd, { archived: true }).flatMap(({ file, data }) => toSession(data, file, skillNames) ?? [])
}

/** An archived session is still a valid log, not an orphan. */
function readKnownSessionIds(cwd = root): Set<string> {
  return new Set(readSessionLogs(cwd, { archived: true }).map(({ data }) => String(data.session ?? '')).filter(Boolean))
}

/** Scoped to `origin/main` per CLAUDE.md's git-log guidance, not `--all`. Feeds
 *  `manuallyRescuedClosures` only — see `WORK_COMMIT_SCAN_DAYS` for why the
 *  orphan check no longer reads from here (issue #738). */
export function readSessionTrailers(cwd = root, days = WORK_COMMIT_SCAN_DAYS): SessionTrailerRef[] {
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
export function readCommitFileChanges(cwd = root): CommitFileChange[] {
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

/** Along `origin/main`'s first-parent line, so a change's date is when it
 *  landed, not when its branch commit was authored. Scoped to `origin/main`, not
 *  `--all`, per CLAUDE.md's git-log guidance. */
export function readLandings(cwd = root, since: string): Landing[] {
  let raw: string
  try {
    raw = execFileSync(
      'git',
      ['log', 'origin/main', '--first-parent', `--since=${since}`, '--name-only', `--pretty=format:${REC}%H${SEP}%cI`, '--', SKILLS_DIR, 'scripts'],
      { cwd, encoding: 'utf8' },
    )
  } catch {
    return []
  }
  return parseLandings(raw)
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

function readOnDiskSkills(cwd: string, skillNames: ReadonlySet<string>): Map<string, OnDiskSkill> {
  const out = new Map<string, OnDiskSkill>()
  for (const name of skillNames) {
    const text = readFileSync(join(cwd, SKILLS_DIR, name, 'SKILL.md'), 'utf8')
    const fm = readFrontmatter(text, name)
    out.set(name, {
      description: String(fm.description ?? '').replace(/\s+/g, ' ').trim(),
      modelInvoked: fm['disable-model-invocation'] !== true,
      scripts: scriptsNamedIn(text),
    })
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

// ── GitHub IO (thin shell) ───────────────────────────────────────────────────
//
// The orphan check's candidate source (issue #738). It sits behind the same
// boundary as the git readers above — everything below returns raw records, and
// every judgement is made by the pure `parseMergedPullRequests`/
// `findOrphanedSessions` pair, so the comparison stays testable with no network.
//
// The `gh`/`rest` strategy switch (`pickFetchStrategy`, `hasGhBinary`,
// `envToken`, `parseOwnerRepo`) is single-homed in `list-open-issues.ts`
// (issue #505) and imported at the top of this file.

function readOriginUrl(cwd: string): string {
  return execFileSync('git', ['remote', 'get-url', 'origin'], { cwd, encoding: 'utf8' }).trim()
}

const PULLS_PER_PAGE = 100

/** Walks pages by NUMBER and stops on the first page shorter than `perPage` —
 *  it never follows GitHub's `Link` URL. For `pulls`, `rel="next"` points at
 *  the numeric `repositories/{id}/pulls` form, which this environment's agent
 *  proxy 403s; `gh api --paginate` follows it verbatim (issue #1514). A short
 *  page, not `Link`, is the stop signal because `gh api` without `--include`
 *  returns no headers. Throws on any mid-walk failure rather than returning
 *  the pages already read: a partial scan that reads as complete is exactly
 *  the failure issue #738 exists to remove. */
export function walkPagesUntilShort<T>(
  pageUrl: (page: number) => string,
  fetchPage: (url: string) => T[],
  perPage = PULLS_PER_PAGE,
): T[] {
  const out: T[] = []
  for (let page = 1; ; page++) {
    let records: T[]
    try {
      records = fetchPage(pageUrl(page))
    } catch (err) {
      const cause = err instanceof Error ? err.message : String(err)
      throw new Error(`paged listing INCOMPLETE at page ${page} after ${out.length} record(s): ${cause}`, { cause: err })
    }
    out.push(...records)
    if (records.length < perPage) return out
  }
}

function ghGetPage(path: string, cwd: string): RawPullRequestApiRecord[] {
  const raw = execFileSync('gh', ['api', '--method', 'GET', path], { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
  return JSON.parse(raw) as RawPullRequestApiRecord[]
}

// See `poll-guest-tickets.ts`'s `curlGetPage` for why `curl` over `fetch` here
// (issue #567).
function curlGetPage(url: string, token: string, cwd: string): RawPullRequestApiRecord[] {
  const dir = mkdtempSync(join(tmpdir(), 'audit-skills-'))
  const bodyFile = join(dir, 'body')
  try {
    const status = execFileSync(
      'curl',
      [
        '-sS',
        '-o',
        bodyFile,
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
    if (status[0] !== '2') throw new Error(`GitHub REST API request to ${url} failed: HTTP ${status}`)
    return JSON.parse(readFileSync(bodyFile, 'utf8')) as RawPullRequestApiRecord[]
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function readClosedPullRequests(strategy: FetchStrategy, owner: string, repo: string, cwd: string): RawPullRequestApiRecord[] {
  const path = (page: number) => `repos/${owner}/${repo}/pulls?state=closed&per_page=${PULLS_PER_PAGE}&page=${page}`
  if (strategy === 'gh') return walkPagesUntilShort(path, (p) => ghGetPage(p, cwd))
  const token = envToken()
  if (!token) throw new Error('rest strategy chosen with no GH_TOKEN/GITHUB_TOKEN set')
  return walkPagesUntilShort((page) => `https://api.github.com/${path(page)}`, (url) => curlGetPage(url, token, cwd))
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

export function scorecard(windowDays = DEFAULT_WINDOW_DAYS, cwd = root, now = Date.now()): Scorecard {
  const skillNames = readSkillNames(cwd)
  const all = readSessions(cwd, skillNames)
  const since = new Date(now - windowDays * 86_400_000).toISOString()
  const window = pickWindow(all, since)
  const skills = buildSkillRows(readOnDiskSkills(cwd, skillNames), readInventory(cwd), window, all, readLock(cwd), readLandings(cwd, since))
  const scan = readPullRequestSessionRefs(cwd)
  const orphans = findOrphanedSessions(scan.refs, readKnownSessionIds(cwd), readCommitFileChanges(cwd))
  return {
    windowDays,
    since,
    window: window.map(({ session, file, kind, goal, startedAt, endedAt, skillsUsed }) => ({ session, file, kind, goal, startedAt, endedAt, skillsUsed })),
    skills,
    behaviourChecks: pickBehaviourChecks(skills),
    orphanedSessions: orphans.orphaned,
    orphanScan: scan.status,
    orphanSuppressionLog: orphans.suppressed,
    humanPromptedClosures: findHumanPromptedClosures(window),
    manuallyRescuedClosures: findManuallyRescuedClosures(readSessionTrailers(cwd), window),
    docReadCounts: buildDocReadCounts(window),
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`audit-skills: ${msg}`)
  process.exit(1)
}

function main(): void {
  const argv = process.argv.slice(2)
  const i = argv.indexOf('--days')
  const days = i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : DEFAULT_WINDOW_DAYS
  if (!Number.isInteger(days) || days <= 0) fail('--days must be a positive integer')
  const card = scorecard(days)
  for (const row of card.skills) {
    if (card.behaviourChecks.includes(row.name) && row.changes.length) {
      console.error(`audit-skills: warning: ${row.name} changed while its runs were happening (${row.changes.length} landing(s), see its \`changes\`) — a run that started before one is graded against the earlier text`)
    }
  }
  process.stdout.write(JSON.stringify(card, null, 2) + '\n')
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
}
