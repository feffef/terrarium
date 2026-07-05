// The digest helper (ADR-0010): the deterministic half of the `digest` Skill.
// It does ONLY the fiddly, bug-prone mechanics — enumerate closed-and-undigested
// UTC days, gather one day's git + session-log materials, and read the inventory
// the index overview needs — and emits compact JSON. The Skill turns that JSON
// into prose; keeping the prose out of here is the point (predictable process,
// low token cost). The UTC-boundary and attribution logic lives in pure,
// unit-tested functions; the git/FS IO is a thin shell around them.
//
// Usage:  tsx scripts/digest.ts <command> [args]
//   list [--now <iso>]     print closed UTC days that have activity but no digest
//   gather <YYYY-MM-DD>     print one day's materials as JSON
//
// (The index overview needs no command: the Journal's Space landing is a live
// dashboard that queries the digest pages directly — a new Digest appears with
// no baking. See ADR-0010.)
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parse as parseYaml } from 'yaml'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** The Journal paths this helper reads. Digests are pages under a subfolder (ADR-0010). */
export const DIGESTS_DIR = 'tenants/journal/content/current/pages/digests'
export const SESSIONS_DIR = 'tenants/journal/content/current/sessions'

// ── Types ───────────────────────────────────────────────────────────────────

export interface Commit {
  sha: string
  at: Date // committer date — the day the work landed
  subject: string
  body: string
  isMerge: boolean
}
export interface Pr {
  number: number
  title: string
}
export interface SessionFriction {
  severity: string
  description: string
}
export interface SessionMaterial {
  session: string
  kind: string
  goal: string
  outcome: string
  status: string
  prs: number[]
  frictions: SessionFriction[]
}
export interface DayMaterials {
  date: string
  prs: Pr[] // merged/referenced PRs — the "Shipped" spine
  otherCommits: string[] // direct-to-main work that isn't a PR merge or a session log
  sessions: SessionMaterial[]
  rollup: {
    prsMerged: number
    commits: number
    sessions: number
    frictionsBySeverity: Record<string, number>
  }
}

// ── Pure core (unit-tested) ───────────────────────────────────────────────────

/** The UTC calendar day (YYYY-MM-DD) a timestamp falls in. */
export function utcDay(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** A UTC day is "closed" once its final instant has passed — the next midnight UTC
 *  is at or before `now`. Today is never closed, so it is never digested (ADR-0010). */
export function dayIsClosed(day: string, now: Date): boolean {
  const end = new Date(`${day}T00:00:00Z`)
  end.setUTCDate(end.getUTCDate() + 1)
  return end.getTime() <= now.getTime()
}

const PR_MERGE = /^Merge pull request #(\d+)/
const PR_SQUASH = /\(#(\d+)\)\s*$/
const SESSION_LOG_COMMIT = /^journal\(sessions\): log /

/** The PR a commit represents, or null. Handles GitHub merge commits
 *  ("Merge pull request #N …", title on the first body line) and squash merges
 *  ("subject (#N)"). */
export function prFromCommit(c: Commit): Pr | null {
  const merge = c.subject.match(PR_MERGE)
  if (merge) {
    const title = c.body.split('\n').map((l) => l.trim()).find(Boolean) ?? c.subject
    return { number: Number(merge[1]), title }
  }
  const squash = c.subject.match(PR_SQUASH)
  if (squash) {
    return { number: Number(squash[1]), title: c.subject.replace(PR_SQUASH, '').trim() }
  }
  return null
}

/** Fold a day's commits + sessions into the materials the Skill authors from.
 *  Session-log commits are dropped from `otherCommits` — they're the logs the
 *  `sessions` section already covers, not shipped work. */
export function buildDayMaterials(
  date: string,
  commits: Commit[],
  sessions: SessionMaterial[],
): DayMaterials {
  const prs: Pr[] = []
  const otherCommits: string[] = []
  for (const c of commits) {
    const pr = prFromCommit(c)
    if (pr) {
      prs.push(pr)
      continue
    }
    if (c.isMerge) continue // a merge with no parseable PR ref — noise
    if (SESSION_LOG_COMMIT.test(c.subject)) continue // covered by the sessions section
    otherCommits.push(c.subject)
  }
  const frictionsBySeverity: Record<string, number> = {}
  for (const s of sessions) {
    for (const f of s.frictions) {
      frictionsBySeverity[f.severity] = (frictionsBySeverity[f.severity] ?? 0) + 1
    }
  }
  return {
    date,
    prs,
    otherCommits,
    sessions,
    rollup: {
      prsMerged: prs.length,
      commits: commits.length,
      sessions: sessions.length,
      frictionsBySeverity,
    },
  }
}

/** The closed UTC days that saw activity but have no digest yet — the backfill
 *  set, oldest first (ADR-0010: every missing closed day, today excluded). */
export function closedUndigestedDays(
  activeDays: Iterable<string>,
  existing: Set<string>,
  now: Date,
): string[] {
  return [...new Set(activeDays)]
    .filter((d) => dayIsClosed(d, now) && !existing.has(d))
    .sort()
}

// ── Git / FS IO (thin shell) ──────────────────────────────────────────────────

const SEP = '\x1f' // field separator (unit sep)
const REC = '\x1e' // record separator

function readCommits(cwd = root): Commit[] {
  const out = execFileSync(
    'git',
    ['log', `--pretty=format:%H${SEP}%cI${SEP}%P${SEP}%s${SEP}%b${REC}`],
    { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  )
  return out
    .split(REC)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((rec) => {
      const [sha, iso, parents, subject, body = ''] = rec.split(SEP)
      return {
        sha: sha ?? '',
        at: new Date(iso ?? ''),
        subject: subject ?? '',
        body,
        isMerge: (parents ?? '').trim().split(/\s+/).filter(Boolean).length > 1,
      }
    })
}

function readSessions(cwd = root): { endedAt: Date; material: SessionMaterial }[] {
  const dir = join(cwd, SESSIONS_DIR)
  if (!existsSync(dir)) return []
  const out: { endedAt: Date; material: SessionMaterial }[] = []
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.yml'))) {
    const raw = parseYaml(readFileSync(join(dir, f), 'utf8')) as Record<string, unknown>
    if (!raw || typeof raw !== 'object') continue
    const frictions = Array.isArray(raw.frictions) ? raw.frictions : []
    const prs = Array.isArray(raw.prs) ? raw.prs : []
    out.push({
      endedAt: new Date(raw.endedAt as string | Date),
      material: {
        session: String(raw.session ?? ''),
        kind: String(raw.kind ?? ''),
        goal: String(raw.goal ?? ''),
        outcome: String(raw.outcome ?? ''),
        status: String(raw.status ?? ''),
        prs: prs.map((p) => Number(p)).filter((n) => !Number.isNaN(n)),
        frictions: frictions.map((fr: Record<string, unknown>) => ({
          severity: String(fr.severity ?? ''),
          description: String(fr.description ?? '').replace(/\s+/g, ' ').trim(),
        })),
      },
    })
  }
  return out
}

function existingDigestDays(cwd = root): Set<string> {
  const dir = join(cwd, DIGESTS_DIR)
  if (!existsSync(dir)) return new Set()
  return new Set(
    readdirSync(dir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
      .map((f) => f.slice(0, 10)),
  )
}

// ── Commands ──────────────────────────────────────────────────────────────────

export function cmdList(now: Date, cwd = root): string[] {
  const active = new Set<string>()
  for (const c of readCommits(cwd)) active.add(utcDay(c.at))
  for (const s of readSessions(cwd)) active.add(utcDay(s.endedAt))
  return closedUndigestedDays(active, existingDigestDays(cwd), now)
}

export function cmdGather(date: string, cwd = root): DayMaterials {
  const commits = readCommits(cwd).filter((c) => utcDay(c.at) === date)
  const sessions = readSessions(cwd)
    .filter((s) => utcDay(s.endedAt) === date)
    .map((s) => s.material)
  return buildDayMaterials(date, commits, sessions)
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`digest: ${msg}`)
  process.exit(1)
}

function main(): void {
  const argv = process.argv.slice(2)
  const cmd = argv[0]
  const nowIdx = argv.indexOf('--now')
  const now = nowIdx >= 0 && argv[nowIdx + 1] ? new Date(argv[nowIdx + 1] as string) : new Date()

  if (cmd === 'list') {
    process.stdout.write(cmdList(now).join('\n') + '\n')
  } else if (cmd === 'gather') {
    const date = argv[1]
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) fail('gather requires a YYYY-MM-DD date')
    process.stdout.write(JSON.stringify(cmdGather(date), null, 2) + '\n')
  } else {
    fail(`unknown command "${cmd ?? ''}" — expected: list | gather <date>`)
  }
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
}
