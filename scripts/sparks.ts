// The sparks helper (issue #440): the deterministic data layer behind the
// journal dashboard's cross-session "Sparks" feed. It reads every session
// log's `ideas`/`learnings` with session provenance and folds them into
// clusters via a NAIVE, MECHANICAL keyword-overlap signal — no model or
// semantic pass (the owner's green-light on #440 scoped this prototype to the
// mechanical path only; a new runtime dependency would also escalate the
// merge bar, ADR-0004). This is the reusable input a later ideas-to-issue
// promotion step would consume — promotion itself is out of scope here.
//
// Mirrors `scripts/digest.ts`'s split: pure, unit-tested core (keyword
// extraction, overlap scoring, clustering) behind a thin FS/CLI shell.
//
// Usage:  tsx scripts/sparks.ts gather [--threshold <n>]
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parse as parseYaml } from 'yaml'
import { isExternalSession } from '../shared/schemas/session.ts'
import { SESSIONS_DIR } from './digest.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// ── Types ───────────────────────────────────────────────────────────────────

export type SparkKind = 'idea' | 'learning'

export interface SessionSparkMaterial {
  session: string
  endedAt: string // ISO
  ideas: string[]
  learnings: string[]
}

export interface SparkRecord {
  spark: string
  kind: SparkKind
  session: string
  date: string // the session's endedAt (ISO) — when this spark was authored
}

export interface SparkCluster {
  label: string
  sparks: SparkRecord[]
}

// ── Pure core (unit-tested) ───────────────────────────────────────────────────

// A small, deliberately generic stopword list — enough to strip connective
// filler from agent-authored prose so keyword overlap reflects topic words,
// not shared grammar. Not exhaustive: a missed filler word only weakens a
// cluster match, it doesn't corrupt one — acceptable for a mechanical-only
// signal (#440), not a claim of linguistic correctness.
const STOP_WORDS = new Set([
  'about', 'across', 'after', 'agent', 'agents', 'also', 'and', 'before', 'being',
  'between', 'both', 'call', 'could', 'doing', 'done', 'down', 'each', 'every',
  'from', 'have', 'here', 'into', 'issue', 'issues', 'just', 'like', 'make',
  'made', 'more', 'most', 'much', 'must', 'never', 'onto', 'only', 'other',
  'over', 'same', 'session', 'sessions', 'should', 'some', 'such', 'take',
  'taken', 'than', 'that', 'their', 'them', 'then', 'there', 'these', 'this',
  'those', 'they', 'through', 'under', 'until', 'upon', 'used', 'using', 'very',
  'wants', 'were', 'what', 'when', 'where', 'which', 'while', 'will', 'with',
  'within', 'without', 'would', 'your',
])

/** The significant, deduped keywords in a spark's free text: lowercased,
 *  punctuation-stripped, short/stop words dropped. */
export function sparkKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
  return [...new Set(words)].sort()
}

/** Jaccard overlap between two keyword sets — 0 when either is empty. */
export function keywordOverlap(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0
  const setB = new Set(b)
  const intersection = a.filter((w) => setB.has(w)).length
  const union = new Set([...a, ...b]).size
  return union === 0 ? 0 : intersection / union
}

// Tuned empirically against the real session-log corpus (289 sparks as of
// #440): 0.25 left 267/278 clusters as singletons (too tight to surface any
// signal); 0.15 groups a meaningful ~10% into multi-item clusters — spot-
// checked coherent (e.g. GitHub-authorship-identity learnings, permission-
// allowlist frictions) — while the majority genuinely are one-off. See the
// PR description for the full mechanical-vs-semantic finding.
export const CLUSTER_THRESHOLD = 0.15

/** Greedy single-link clustering on keyword overlap: each item joins the
 *  first existing cluster whose accumulated keyword set clears `threshold`,
 *  else starts its own. Order-dependent (first-fit, not globally optimal) —
 *  the deliberately cheap mechanical signal this prototype is scoped to
 *  (#440), not a semantic pass. */
export function clusterByKeywords<T extends { keywords: string[] }>(
  items: T[],
  threshold = CLUSTER_THRESHOLD,
): T[][] {
  const clusters: T[][] = []
  const clusterKeywords: string[][] = []
  for (const item of items) {
    const i = clusterKeywords.findIndex((k) => keywordOverlap(item.keywords, k) >= threshold)
    if (i >= 0) {
      clusters[i]!.push(item)
      clusterKeywords[i] = [...new Set([...clusterKeywords[i]!, ...item.keywords])]
    } else {
      clusters.push([item])
      clusterKeywords.push(item.keywords)
    }
  }
  return clusters
}

/** A cluster's label: its two most-shared keywords (frequency desc, then
 *  alpha) — a cheap stand-in for a real theme name. Falls back to "general"
 *  when every member's keywords stripped to nothing (all-stopword sparks). */
export function clusterLabel(items: { keywords: string[] }[]): string {
  const freq = new Map<string, number>()
  for (const item of items) for (const k of item.keywords) freq.set(k, (freq.get(k) ?? 0) + 1)
  const top = [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 2)
    .map(([k]) => k)
  return top.length ? top.join(' · ') : 'general'
}

/** Flatten every session's `ideas`/`learnings` into individually-provenanced
 *  records, preserving each array's authored order. */
export function gatherSparkRecords(sessions: SessionSparkMaterial[]): SparkRecord[] {
  const out: SparkRecord[] = []
  for (const s of sessions) {
    for (const idea of s.ideas) out.push({ spark: idea, kind: 'idea', session: s.session, date: s.endedAt })
    for (const learning of s.learnings) out.push({ spark: learning, kind: 'learning', session: s.session, date: s.endedAt })
  }
  return out
}

/** Sparks folded into clusters, biggest (most-recurring) first — the "what
 *  recurs" ordering the dashboard feed wants (#440). Ties broken by label. */
export function buildSparkClusters(records: SparkRecord[], threshold = CLUSTER_THRESHOLD): SparkCluster[] {
  const withKeywords = records.map((r) => ({ ...r, keywords: sparkKeywords(r.spark) }))
  return clusterByKeywords(withKeywords, threshold)
    .map((cluster) => ({
      label: clusterLabel(cluster),
      sparks: cluster.map(({ keywords: _keywords, ...r }) => r),
    }))
    .sort((a, b) => b.sparks.length - a.sparks.length || a.label.localeCompare(b.label))
}

/** Reduce one parsed session log to its spark material, or `null` when it has
 *  nothing to gather. An EXTERNAL session (ADR-0009 amendment) keeps its `ideas`
 *  — a good idea is toolchain-agnostic — but drops its `learnings`, which reflect
 *  a different harness's development and don't generalize to ours. Internal
 *  sessions are unchanged (both fields kept). */
export function readSparkMaterial(raw: Record<string, unknown>): SessionSparkMaterial | null {
  const ideas = Array.isArray(raw.ideas) ? raw.ideas.map(String) : []
  const learnings = isExternalSession(raw)
    ? []
    : Array.isArray(raw.learnings)
      ? raw.learnings.map(String)
      : []
  if (!ideas.length && !learnings.length) return null // nothing to gather from this log
  return {
    session: String(raw.session ?? ''),
    endedAt: new Date(raw.endedAt as string | Date).toISOString(),
    ideas,
    learnings,
  }
}

// ── Git / FS IO (thin shell) ──────────────────────────────────────────────────

function readSessionSparkMaterials(cwd = root): SessionSparkMaterial[] {
  const dir = join(cwd, SESSIONS_DIR)
  if (!existsSync(dir)) return []
  const out: SessionSparkMaterial[] = []
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.yml'))) {
    const raw = parseYaml(readFileSync(join(dir, f), 'utf8')) as Record<string, unknown>
    if (!raw || typeof raw !== 'object') continue
    const material = readSparkMaterial(raw)
    if (material) out.push(material)
  }
  // Deterministic regardless of readdirSync's FS-dependent iteration order.
  return out.sort((a, b) => a.endedAt.localeCompare(b.endedAt) || a.session.localeCompare(b.session))
}

// ── Commands ──────────────────────────────────────────────────────────────────

export function cmdGather(cwd = root, threshold = CLUSTER_THRESHOLD): { total: number; clusters: SparkCluster[] } {
  const records = gatherSparkRecords(readSessionSparkMaterials(cwd))
  return { total: records.length, clusters: buildSparkClusters(records, threshold) }
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`sparks: ${msg}`)
  process.exit(1)
}

function main(): void {
  const argv = process.argv.slice(2)
  const cmd = argv[0]
  const thresholdIdx = argv.indexOf('--threshold')
  const threshold = thresholdIdx >= 0 && argv[thresholdIdx + 1] ? Number(argv[thresholdIdx + 1]) : CLUSTER_THRESHOLD

  if (cmd === 'gather') {
    process.stdout.write(JSON.stringify(cmdGather(root, threshold), null, 2) + '\n')
  } else {
    fail(`unknown command "${cmd ?? ''}" — expected: gather [--threshold <n>]`)
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
