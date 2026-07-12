// Pure aggregation/formatting for the Journal Space-landing dashboard.
//
// Extracted from `app/pages/t/journal/[space]/index.vue` so the logic that
// computes what the public dashboard *displays* (friction counts, durations,
// orderings, the Skill Inventory grouping) is unit-testable and typechecked
// independently of the SFC. These are plain functions: they take
// arrays in and return plain data — NO Vue imports, no reactivity. The SFC
// keeps the thin `computed()` wrappers that feed these.
//
// Types are imported from the sibling layer-local file by RELATIVE path: inside
// a Nuxt layer the `~/` alias resolves to the MAIN app, not this layer, so it
// would not find `../types/journal` (see docs/agents/tenant-layers.md §1).
//
// Nuxt auto-imports these named exports into the layer's app — the SFCs use
// them directly, with no import block. The auto-import namespace is global
// across every layer, which cuts two ways: a same-named local `const`/
// `computed` in a consuming SFC merges with the export and vue-tsc rejects the
// ambiguity, and a generic export name can collide with another
// Tenant's utils. So: export names stay distinctive (session/skill/friction/pr
// vocabulary), consuming SFCs keep local binding names distinct from every
// export below, and truly generic helpers stay module-private. This module,
// for its part, never relies on auto-import itself: it stays dependency-free
// and explicit.
import type { Friction, Importance, SessionCardView, SessionDoc, Severity, SkillDoc } from '../types/journal'

// ── Formatting helpers ───────────────────────────────────
// Module-private: too generically named to put in the global auto-import
// namespace (every layer's utils share it).
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (n: number) => String(n).padStart(2, '0')

export function sessionWhen(iso: string): string {
  const d = new Date(iso)
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} · ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`
}

export function sessionDurationMin(a: string, b: string): number {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000))
}

export function sessionShortId(s: string): string {
  return s.length > 18 ? `${s.slice(0, 13)}…${s.slice(-4)}` : s
}

// ── Mechanical-trace formatting ──────────────────────────
// Model ids are verbose (`claude-opus-4-8`); the summary chip shows the short,
// human tail. A session may span more than one model (a subagent on a cheaper
// tier), so join them busiest-first. Empty ⇒ an older, authored-only log.
export function sessionModelsLabel(models?: Record<string, number>): string {
  return Object.entries(models ?? {})
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id]) => id.replace(/^claude-/, ''))
    .join(' · ')
}

// tool name → call count as a display list, busiest-first then alpha.
export function sessionToolEntries(counts?: Record<string, number>): { name: string; count: number }[] {
  return Object.entries(counts ?? {})
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

// ── Aggregations (scoped to one Space) ───────────────────
const emptySev = (): Record<Severity, number> => ({ nit: 0, minor: 0, moderate: 0, major: 0, blocker: 0 })

export function countFrictions(list: Friction[]): Record<Severity, number> {
  const c = emptySev()
  for (const f of list) if (f.severity in c) c[f.severity]++
  return c
}

export function frictionTotals(sessions: SessionDoc[]): Record<Severity, number> {
  const c = emptySev()
  for (const s of sessions) for (const f of s.frictions) if (f.severity in c) c[f.severity]++
  return c
}

export function frictionCount(sessions: SessionDoc[]): number {
  return sessions.reduce((n, s) => n + s.frictions.length, 0)
}

export function kindCounts(sessions: SessionDoc[]): { interactive: number; delegated: number; autonomous: number } {
  return {
    interactive: sessions.filter((s) => s.kind === 'interactive').length,
    delegated: sessions.filter((s) => s.kind === 'delegated').length,
    autonomous: sessions.filter((s) => s.kind === 'autonomous').length,
  }
}

// De-duplicated, numerically sorted PR references (strips a leading `#`).
// `prs` carries a manifest `.default([])` (tenant.config.ts), so the generated
// collection type marks it optional even though it is always populated by the
// time content is queried — guard it structurally rather than assume that.
export function prRefs(sessions: SessionDoc[]): string[] {
  const seen = new Set<string>()
  for (const s of sessions) for (const pr of s.prs ?? []) seen.add(pr.replace(/^#/, ''))
  return [...seen].sort((a, b) => Number(a) - Number(b))
}

// Single home for the repo the Journal's PR references point at — every PR
// number the dashboard renders links through prUrl().
export const REPO_URL = 'https://github.com/feffef/terrarium'

export function prUrl(pr: string): string {
  return `${REPO_URL}/pull/${pr.replace(/^#/, '')}`
}

// Compact sub-line for the "PRs referenced" stat tile. Enumerating every PR
// stopped fitting once the list grew past a handful, so show only the newest
// few (highest-numbered first) and fold the rest into a "+N earlier" tail.
// Returns structure, not a string, so the tile can link each shown PR.
export const PR_SUB_MAX = 3

export function prRefsParts(refs: string[]): { shown: string[]; rest: number } {
  const newestFirst = refs.slice().reverse()
  return {
    shown: newestFirst.slice(0, PR_SUB_MAX),
    rest: Math.max(0, newestFirst.length - PR_SUB_MAX),
  }
}

// ── Skill Inventory ──────────────────────────────────────
// The dashboard advertises only the Platform's OWN Skills — the platform-operation
// ones it authors and evolves. The general-engineering pack is used, not evolved
// here, so it is acknowledged as a count, not showcased.
export function ownSkills(skills: SkillDoc[]): SkillDoc[] {
  return skills.filter((s) => s.category === 'platform-operation')
}

export function externalSkillCount(skills: SkillDoc[]): number {
  return skills.length - ownSkills(skills).length
}

// Headline label carries the external-pack count as a parenthetical so it never
// reads as contradicting the headline number (the platform's OWN authored count).
export function skillsLabel(externalCount: number): string {
  return externalCount
    ? `Platform Skills (+${externalCount} from an external pack)`
    : 'Platform Skills'
}

export function skillsSub(own: SkillDoc[]): string {
  const by = (i: Importance) => own.filter((s) => s.importance === i).length
  const parts = ([
    ['essential', by('essential')],
    ['specialist', by('specialist')],
    ['supporting', by('supporting')],
    ['peripheral', by('peripheral')],
  ] as const)
    .filter(([, n]) => n > 0)
    .map(([label, n]) => `${n} ${label}`)
  return parts.join(' · ') || 'none yet'
}

// Own Skills grouped by importance (essential → specialist → supporting →
// peripheral), alpha within a group, empty groups dropped.
export function skillGroups(own: SkillDoc[]): { importance: Importance; skills: SkillDoc[] }[] {
  const order: Importance[] = ['essential', 'specialist', 'supporting', 'peripheral']
  return order
    .map((importance) => ({
      importance,
      skills: own
        .filter((s) => s.importance === importance)
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((g) => g.skills.length > 0)
}

// ── Session feed ─────────────────────────────────────────
// Maps each SessionDoc to the display view the session card renders (formats
// dates, counts frictions, truncates the session id), so the card stays a dumb
// renderer. `key` is the stable session id for the v-for.
export function sessionCardViews(sessions: SessionDoc[]): (SessionCardView & { key: string })[] {
  return sessions.map((s) => ({
    key: s.session,
    when: sessionWhen(s.endedAt),
    duration: sessionDurationMin(s.startedAt, s.endedAt),
    goal: s.goal,
    status: s.status,
    outcome: s.outcome,
    prs: s.prs ?? [],
    frictionCounts: countFrictions(s.frictions),
    frictionTotal: s.frictions.length,
    skills: (s.skillsUsed ?? []).map((x) => x.name),
    sid: sessionShortId(s.session),
    model: sessionModelsLabel(s.models),
    // Expanded detail — the full log, revealed on click (no route of its own).
    summary: s.summary,
    subagents: s.subagents ?? [],
    docsRead: s.docsRead ?? [],
    skillsUsed: s.skillsUsed ?? [],
    frictions: s.frictions,
    learnings: s.learnings ?? [],
    ideas: s.ideas ?? [],
    filesEdited: s.filesEdited ?? [],
    tools: sessionToolEntries(s.toolCounts),
  }))
}

// ── Daily digests ────────────────────────────────────────
// Digests share the `pages` collection under a `/digests/` path (ADR-0010), so
// they are surfaced by filtering the pages by path, newest-first, with the
// day's headline falling back `summary → description → ''`.
export interface DigestEntry<T> {
  date: string
  summary: string
  doc: T
}

export function digestList<T extends { path: string; summary?: string; description?: string }>(
  pages: T[],
): DigestEntry<T>[] {
  return pages
    .filter((p) => p.path.startsWith('/digests/'))
    .sort((a, b) => b.path.localeCompare(a.path))
    .map((p) => ({
      date: p.path.slice('/digests/'.length),
      summary: p.summary ?? p.description ?? '',
      doc: p,
    }))
}

// ── Deep-link anchors ────────────────────────────────────
// Stable, URL-safe fragment ids for the two inline-expandable feeds on the Space
// landing (session cards + daily digests). One item is open at a time across the
// whole page and its anchor is mirrored to the URL hash, so the two feeds must
// share NO id — hence the distinct `session-`/`digest-` namespaces. Both inputs
// (a session id, a `YYYY-MM-DD` date) are already fragment-safe, so no escaping.
export function sessionAnchor(key: string): string {
  return `session-${key}`
}

export function digestAnchor(date: string): string {
  return `digest-${date}`
}
