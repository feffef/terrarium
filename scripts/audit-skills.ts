// The audit-skills helper (ADR-0015): the deterministic half of the `audit-skills`
// Skill. It does ONLY the mechanical gathering — join the on-disk Skills, their
// Inventory entries, and how each was used across the newest N session logs — and
// emits compact JSON. The Skill reads that JSON and makes every *judgement*
// (conditional importance, which sessions were "of the kind a Skill serves",
// which role prose to rewrite); keeping judgement out of here is the point
// (predictable process, low token cost, no re-improvised parser each run).
//
// Usage:  tsx scripts/audit-skills.ts [--window N] [--now <iso>]
//   Prints a scorecard: the window of sessions considered (newest first) and,
//   per Skill, whether it is on disk / catalogued, its current importance+role,
//   its SKILL.md description, and every windowed session that used it.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parse as parseYaml } from 'yaml'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** The default observation window: the 40 newest session logs (by `endedAt`). */
export const DEFAULT_WINDOW = 40

/** Paths this helper reads. */
export const SESSIONS_DIR = 'tenants/journal/content/current/sessions'
export const INVENTORY_DIR = 'tenants/journal/content/current/skills'
export const SKILLS_DIR = '.agents/skills'
/** The lockfile of externally-sourced Skills (the pack). A Skill named here is
 *  NOT ours to edit — its SKILL.md is pack-owned (ADR-0005), so `audit-skills`
 *  tunes its Inventory grade but never refers its frontmatter to `frictions-to-fixes`. */
export const SKILLS_LOCK = 'skills-lock.json'

// ── Types ───────────────────────────────────────────────────────────────────

export interface WindowSession {
  session: string
  kind: string
  goal: string
  summary: string
  endedAt: string
  skillsUsed: { name: string; reason: string }[]
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
  catalogued: boolean
  /** In the external pack (`skills-lock.json`) — its SKILL.md is not ours to patch. */
  external: boolean
  category: string | null
  importance: string | null
  role: string | null
  description: string | null
  useCount: number
  usedIn: UsageHit[]
}
export interface Scorecard {
  windowSize: number
  sessionsConsidered: number
  window: WindowSession[]
  skills: SkillRow[]
}

// ── Pure core (unit-tested) ───────────────────────────────────────────────────

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
 *  disk, catalogued, or observed in use — so orphans surface both ways:
 *  on-disk-but-uncatalogued AND catalogued-but-gone. `external` marks pack Skills
 *  (their frontmatter is not ours to patch). Sorted by name. */
export function buildSkillRows(
  onDisk: Map<string, OnDiskSkill>,
  catalogued: Map<string, InventoryEntry>,
  usage: Map<string, UsageHit[]>,
  external: Set<string>,
): SkillRow[] {
  const names = new Set<string>([...onDisk.keys(), ...catalogued.keys(), ...usage.keys()])
  return [...names].sort().map((name) => {
    const entry = catalogued.get(name)
    const hits = usage.get(name) ?? []
    return {
      name,
      onDisk: onDisk.has(name),
      catalogued: catalogued.has(name),
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

// ── FS IO (thin shell) ────────────────────────────────────────────────────────

function readSessions(cwd = root): WindowSession[] {
  const dir = join(cwd, SESSIONS_DIR)
  if (!existsSync(dir)) return []
  const out: WindowSession[] = []
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.yml'))) {
    const raw = parseYaml(readFileSync(join(dir, f), 'utf8')) as Record<string, unknown>
    if (!raw || typeof raw !== 'object') continue
    const used = Array.isArray(raw.skillsUsed) ? raw.skillsUsed : []
    out.push({
      session: String(raw.session ?? ''),
      kind: String(raw.kind ?? ''),
      goal: String(raw.goal ?? ''),
      summary: String(raw.summary ?? '').replace(/\s+/g, ' ').trim(),
      endedAt: String(raw.endedAt ?? ''),
      skillsUsed: used.map((u: Record<string, unknown>) => ({
        name: String(u.name ?? ''),
        reason: String(u.reason ?? '').replace(/\s+/g, ' ').trim(),
      })),
    })
  }
  return out
}

/** Parse a SKILL.md's YAML frontmatter (between the first two `---` fences). */
function readFrontmatter(text: string): Record<string, unknown> {
  const m = text.match(/^---\n([\s\S]*?)\n---/)
  if (!m) return {}
  const parsed = parseYaml(m[1] as string) as Record<string, unknown>
  return parsed && typeof parsed === 'object' ? parsed : {}
}

function readOnDiskSkills(cwd = root): Map<string, OnDiskSkill> {
  const dir = join(cwd, SKILLS_DIR)
  const out = new Map<string, OnDiskSkill>()
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    const md = join(dir, name, 'SKILL.md')
    if (!existsSync(md)) continue
    const fm = readFrontmatter(readFileSync(md, 'utf8'))
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

// ── Command ─────────────────────────────────────────────────────────────────

export function scorecard(windowSize = DEFAULT_WINDOW, cwd = root): Scorecard {
  const all = readSessions(cwd)
  const window = pickWindow(all, windowSize)
  const rows = buildSkillRows(readOnDiskSkills(cwd), readInventory(cwd), tallyUsage(window), readLock(cwd))
  return { windowSize, sessionsConsidered: all.length, window, skills: rows }
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
