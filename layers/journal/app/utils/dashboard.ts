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
// would not find `../types/journal` (see .claude/rules/tenant-layers.md).
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
import type { Friction, Importance, RoutineDoc, RuleUseView, SessionCardView, SessionDoc, Severity, SkillDoc, NoteItem, Subagent } from '../types/journal'
import { formatJournalDuration } from './duration'
import { formatRoutineMetric } from './routineRuns'
import { REPO_URL } from '../../../../app/utils/repo'
import { sessionUrl } from '#shared/session-url'
import { isRulePath, loadedRules, ruleLoad, ruleValue, type RuleLoad, type RuleUseEntry } from '#shared/schemas/session'

/** The dashboard loads only the newest this-many sessions: every loaded one
 *  ships in the HTML, and uncapped, `archived` passed 10 MB. */
export const JOURNAL_SESSIONS_LOADED = 1000

// ── Formatting helpers ───────────────────────────────────
// Module-private: too generically named to put in the global auto-import
// namespace (every layer's utils share it).
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (n: number) => String(n).padStart(2, '0')

export function sessionWhen(iso: string): string {
  const d = new Date(iso)
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} · ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`
}

export function sessionDurationSec(a: string, b: string): number {
  return Math.max(60, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 1000))
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

// Empty ⇒ an older log that stored neither.
export function subagentUsageLabel(a: Pick<Subagent, 'tokenShare' | 'durationSec'>): string {
  const parts: string[] = []
  if (a.tokenShare !== undefined) parts.push(a.tokenShare < 1 ? '<1%' : `${Math.round(a.tokenShare)}%`)
  if (a.durationSec !== undefined) parts.push(formatJournalDuration(a.durationSec))
  return parts.join(' · ')
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
  const counts = { interactive: 0, delegated: 0, autonomous: 0 }
  for (const s of sessions) counts[s.kind]++
  return counts
}

export function prUrl(pr: string): string {
  return `${REPO_URL}/pull/${pr.replace(/^#/, '')}`
}

export const PR_SUB_MAX = 3

// ── Skill Inventory ──────────────────────────────────────
// OWN Skills are the platform-operation ones the Platform authors and evolves;
// installed Skills are used, not evolved here.
export function ownSkills(skills: SkillDoc[]): SkillDoc[] {
  return skills.filter((s) => s.category === 'platform-operation')
}

// Installed Skills worth listing: everything graded above `peripheral`.
export function installedSkills(skills: SkillDoc[]): SkillDoc[] {
  return skills.filter((s) => s.category !== 'platform-operation' && s.importance !== 'peripheral')
}

// Sessions that used each Skill — shown beside the grade, never instead of it
// (ADR-0015: a grade is not a frequency).
export function skillUseCounts(sessions: SessionDoc[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const s of sessions) {
    for (const name of new Set((s.skillsUsed ?? []).map((x) => x.name))) counts[name] = (counts[name] ?? 0) + 1
  }
  return counts
}

export function skillUrl(name: string, repoSkills: readonly string[]): string | undefined {
  return repoSkills.includes(name) ? `${REPO_URL}/blob/main/.agents/skills/${name}/SKILL.md` : undefined
}

export function installedSkillCount(skills: SkillDoc[]): number {
  return skills.length - ownSkills(skills).length
}

// Own Skills grouped by importance (essential → routine → specialist →
// supporting → peripheral), alpha within a group, empty groups dropped.
export function skillGroups(own: SkillDoc[]): { importance: Importance; skills: SkillDoc[] }[] {
  const order: Importance[] = ['essential', 'routine', 'specialist', 'supporting', 'peripheral']
  return order
    .map((importance) => ({
      importance,
      skills: own
        .filter((s) => s.importance === importance)
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((g) => g.skills.length > 0)
}

// Not <MDC>: it drops the space between adjacent inline elements.
export function skillRoleParts(role: string): { kind: 'text' | 'code' | 'em' | 'strong'; text: string }[] {
  return role
    .split(/(`[^`]+`|(?<!\w)\*\*[^*\s](?:[^*]*[^*\s])?\*\*(?!\w)|(?<![\w*])\*[^*\s](?:[^*]*[^*\s])?\*(?![\w*]))/)
    .map((t, i) => {
      if (i % 2 === 0) return { kind: 'text' as const, text: t }
      if (t.startsWith('`')) return { kind: 'code' as const, text: t.slice(1, -1) }
      if (t.startsWith('**')) return { kind: 'strong' as const, text: t.slice(2, -2) }
      return { kind: 'em' as const, text: t.slice(1, -1) }
    })
    .filter((p) => p.text)
}

// ── Session feed ─────────────────────────────────────────
// Maps each SessionDoc to the display view the session card renders (formats
// dates, counts frictions, truncates the session id), so the card stays a dumb
// renderer. `key` is the stable session id for the v-for.
// Rule path → its `# ` heading, so a card shows "ADR-0022: The triage sweep may
// mark Trusted issues ready to build" rather than a bare filename.
export function sessionRuleTitles(sources: Record<string, string>): Record<string, string> {
  const titles: Record<string, string> = {}
  for (const [file, text] of Object.entries(sources)) {
    const title = /^# (.+)$/m.exec(text)?.[1]?.trim()
    if (title) titles[file.slice(file.lastIndexOf('.claude/rules/'))] = title
  }
  return titles
}

// shared/schemas/session.ts orders severities least to most severe (Human-only), so rank here.
const SEVERITY_RANK: Record<Severity, number> = { blocker: 0, major: 1, moderate: 2, minor: 3, nit: 4 }

// ADR-0008: derive, never regenerate logs. An `in-review` log whose PRs all
// appear in a loaded `completed` log has merged. A proxy: a `completed` log may
// list an unmerged PR (false flag), and an unloaded one is missed.
const prNums = (s: SessionDoc) => (s.prs ?? []).map((p) => p.replace(/^#/, ''))

function staleInReviewKeys(sessions: SessionDoc[]): Set<string> {
  const landed = new Set(sessions.filter((s) => s.status === 'completed').flatMap(prNums))
  return new Set(
    sessions
      .filter((s) => {
        const nums = prNums(s)
        return s.status === 'in-review' && nums.length > 0 && nums.every((p) => landed.has(p))
      })
      .map((s) => s.session),
  )
}

export function sessionCardViews(
  sessions: SessionDoc[],
  ruleTitles: Record<string, string> = {},
): (SessionCardView & { key: string })[] {
  const stale = staleInReviewKeys(sessions)
  return sessions.map((s) => {
    const external = s.external === true
    const loaded = loadedRules(s)
    return {
      key: s.session,
      when: sessionWhen(s.endedAt),
      duration: formatJournalDuration(sessionDurationSec(s.startedAt, s.endedAt)),
      goal: s.goal,
      status: s.status,
      outcome: s.outcome,
      staleInReview: stale.has(s.session),
      prs: s.prs ?? [],
      frictionCounts: countFrictions(s.frictions),
      frictionTotal: s.frictions.length,
      sid: sessionShortId(s.session),
      model: sessionModelsLabel(s.models),
      external,
      // A local CLI session's bare-UUID id has no claude.ai page.
      url: external || !s.session.startsWith('session_') ? null : sessionUrl(s.session),
      // Expanded detail — the full log, revealed on click (no route of its own).
      summary: s.summary,
      subagents: (s.subagents ?? []).map((a) => ({ ...a, usage: subagentUsageLabel(a) })),
      docsRead: (s.docsRead ?? []).map((d) => {
        const viaSubagent = !!s.docsReadBySubagents?.includes(d.path)
        if (!s.ruleUse) return { ...d, viaSubagent, unknown: viaSubagent && !d.useful }
        return { ...d, viaSubagent, unknown: false, ...docReport(s.ruleUse, s.subagents ?? [], d.path) }
      }),
      skillsUsed: s.skillsUsed ?? [],
      // Array.sort is stable: equal severities keep their logged order.
      frictions: [...s.frictions].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]),
      learnings: s.learnings ?? [],
      ideas: s.ideas ?? [],
      filesEdited: s.filesEdited ?? [],
      docsReadViaShell: s.docsReadViaShell ?? [],
      ruleUse: s.ruleUse ? sessionRuleUseView(s, ruleTitles) : null,
      rules: s.ruleUse ? [] : [
        ...(s.rulesGlobal ?? []).map((path) => ({ path, alwaysLoaded: true, viaSubagent: false })),
        ...loaded.main.map((path) => ({ path, alwaysLoaded: false, viaSubagent: false })),
        ...loaded.bySubagents.map((path) => ({ path, alwaysLoaded: false, viaSubagent: true })),
      ].map(({ path, alwaysLoaded, viaSubagent }) => {
        const v = s.ruleVerdicts?.find((r) => r.path === path)
        return {
          path,
          title: ruleTitles[path],
          alwaysLoaded,
          followedUp: !!s.rulesFollowedUp?.includes(path),
          viaSubagent,
          unknown: !v,
          reason: v?.reason,
          useful: v?.useful,
        }
      }),
      tools: sessionToolEntries(s.toolCounts),
    }
  })
}

// ── Rule use (#3020) ─────────────────────────────────────
// A loaded rule an agent left out neither steered nor backed what it did.
const taskOf = (e: RuleUseEntry, subagents: Subagent[]) => (e.subagent === undefined ? undefined : subagents[e.subagent]?.task)
const withTask = (why: string, task?: string) => (task ? `${task}: ${why}` : why)
const percent = (n: number, of: number) => (of ? Math.round((100 * n) / of) : 0)

function tally(items: string[]): string {
  const counts = new Map<string, number>()
  for (const i of items) counts.set(i, (counts.get(i) ?? 0) + 1)
  return [...counts].map(([k, n]) => (n > 1 ? `${k} ×${n}` : k)).join(', ')
}

const VIA_LABELS: Record<RuleLoad['via'], string> = { start: 'loaded at start', native: 'loaded natively', hint: 'loaded by a hint hook', read: 'read as a file' }

function mainLoadLine(l: RuleLoad): string {
  return l.trigger ? `${VIA_LABELS[l.via]}, triggered by ${l.trigger}` : VIA_LABELS[l.via]
}

function subagentLoadLines(loads: RuleLoad[]): string[] {
  const n = (via: RuleLoad['via']) => loads.filter((l) => l.via === via).length
  const triggers = loads.flatMap((l) => (l.trigger ? [l.trigger] : []))
  const vias = ruleLoad.shape.via.options.filter((v) => n(v)).map((v) => `${v} ${n(v)}`)
  return [vias.join(' · ') || 'no load recorded', ...(triggers.length ? [`triggered by ${tally(triggers)}`] : [])]
}

const startFirst = <T extends { alwaysLoaded: boolean }>(rows: T[]) => [...rows].sort((x, y) => Number(y.alwaysLoaded) - Number(x.alwaysLoaded))

export function sessionRuleUseView(s: SessionDoc, ruleTitles: Record<string, string>): RuleUseView {
  const entries = s.ruleUse ?? []
  const subagents = s.subagents ?? []
  const main = entries.find((e) => e.by === 'main')
  const subs = entries.filter((e) => e.by !== 'main')
  // Logs before #3020 record no start loads, only the session-wide list.
  const legacyGlobal = entries.some((e) => e.loads.some((l) => l.via === 'start')) ? [] : (s.rulesGlobal ?? [])
  const mainRow = (path: string, alwaysLoaded: boolean, load?: RuleLoad) => {
    const r = main?.reported.find((x) => x.path === path)
    return {
      path,
      title: ruleTitles[path],
      alwaysLoaded,
      followedUp: !!s.rulesFollowedUp?.includes(path),
      hover: load ? `${path}\n${mainLoadLine(load)}` : alwaysLoaded ? path : `${path}\nno load recorded`,
      value: r?.value,
      whys: r?.why ? [r.why] : [],
    }
  }
  // A rule an agent named but never loaded keeps its row; its hover says so.
  const subRules = [...new Set(subs.flatMap((e) => [...e.loads.map((l) => l.rule), ...e.reported.map((r) => r.path).filter(isRulePath)]))]
  return {
    main: {
      answered: main ? main.answered : null,
      rules: startFirst([
        ...legacyGlobal.map((p) => mainRow(p, true)),
        ...(main?.loads ?? []).map((l) => mainRow(l.rule, l.via === 'start', l)),
        ...(main?.reported ?? []).filter((r) => isRulePath(r.path) && !main!.loads.some((l) => l.rule === r.path) && !legacyGlobal.includes(r.path)).map((r) => mainRow(r.path, false)),
      ]),
    },
    subagents: {
      total: subs.length,
      unanswered: subs.filter((e) => !e.answered).length,
      rules: startFirst(subRules.map((path) => {
        const loaders = subs.filter((e) => e.loads.some((l) => l.rule === path))
        const namedUnloaded = subs.filter((e) => !loaders.includes(e) && e.reported.some((r) => r.path === path))
        // Shares count a subagent that named the rule without a recorded load too.
        const answering = [...loaders, ...namedUnloaded].filter((e) => e.answered)
        const loads = loaders.flatMap((e) => e.loads.filter((l) => l.rule === path))
        const valueOf = (e: RuleUseEntry) => e.reported.find((r) => r.path === path)?.value
        const reports = subs.flatMap((e) => e.reported.filter((r) => r.path === path).map((r) => ({ r, task: taskOf(e, subagents) })))
        const unnamed = answering.filter((e) => !valueOf(e)).length
        return {
          path,
          title: ruleTitles[path],
          alwaysLoaded: loads.some((l) => l.via === 'start'),
          hover: [path, ...subagentLoadLines(loads)].join('\n'),
          loadedBy: loaders.length,
          values: ruleValue.options.map((value) => {
            const n = answering.filter((e) => valueOf(e) === value).length
            return {
              value,
              n,
              percent: percent(n, answering.length),
              hover: `${n} of ${answering.length} answering subagents that loaded${namedUnloaded.length ? ' or named' : ''} it named it ${value}; ${unnamed} didn't name it`,
            }
          }).filter((v) => v.n > 0),
          whys: [...new Set(reports.flatMap(({ r, task }) => (r.why ? [withTask(r.why, task)] : [])))],
        }
      })),
    },
  }
}

function docReport(entries: RuleUseEntry[], subagents: Subagent[], path: string): { reportedBy?: string; whys: string[] } {
  const by = entries.filter((e) => e.reported.some((r) => r.path === path))
  const nSubs = by.filter((e) => e.by !== 'main').length
  const parts = [...(by.some((e) => e.by === 'main') ? ['main'] : []), ...(nSubs ? [`${nSubs} subagent${nSubs > 1 ? 's' : ''}`] : [])]
  const whys = by.flatMap((e) => e.reported.filter((r) => r.path === path && r.why).map((r) => withTask(r.why!, e.by === 'main' ? undefined : taskOf(e, subagents))))
  return { reportedBy: parts.length ? `reported by ${parts.join(' and ')}` : undefined, whys: [...new Set(whys)] }
}

// ── Daily digests ────────────────────────────────────────
// Digests share the `pages` collection under a `/digests/` path (ADR-0010), so
// they are surfaced by filtering the pages by path, newest-first, with the
// day's headline falling back `summary → description → ''`.
interface DigestEntry<T> {
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

// The digest dates either side of `date` (any input order), so a permalink can
// step through days instead of dead-ending.
export function digestNeighbours(dates: string[], date: string): { older: string | null; newer: string | null } {
  const sorted = [...dates].sort()
  const i = sorted.indexOf(date)
  if (i < 0) return { older: null, newer: null }
  return { older: sorted[i - 1] ?? null, newer: sorted[i + 1] ?? null }
}

export function countOf(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`
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

// ── Ideas & learnings (issue #440) ───────────────────────
// Every session's authored ideas and learnings, flattened in the caller's
// newest-first session order, each carrying its session's deep-link anchor. An
// external session keeps its ideas but not its learnings (ADR-0009).
export function sessionNotes(sessions: SessionDoc[]): { ideas: NoteItem[]; learnings: NoteItem[] } {
  const ideas: NoteItem[] = []
  const learnings: NoteItem[] = []
  for (const s of sessions) {
    const anchor = sessionAnchor(s.session)
    const date = s.endedAt.slice(0, 10)
    for (const note of s.ideas ?? []) ideas.push({ note, kind: 'idea', session: s.session, date, anchor })
    if (s.external === true) continue
    for (const note of s.learnings ?? []) learnings.push({ note, kind: 'learning', session: s.session, date, anchor })
  }
  return { ideas, learnings }
}

// A ready-to-paste Claude prompt that hands one idea to the `/grill-with-docs`
// Skill to sharpen it, tagged with the session it came from so the grilling can
// pull that session's log for context. The dashboard's per-idea copy button
// writes exactly this to the clipboard.
export function ideaGrillPrompt(item: NoteItem): string {
  return `/grill-with-docs to refine this idea from session ${item.session}:\n\n${item.note}`
}

// A ready-to-paste prompt that hands one learning to an agent to decide where it
// should live for future agents. It asks for a proposal first, since a learning
// is unverified until checked and CLAUDE.md says to cut before adding.
export function learningDocsPrompt(item: NoteItem): string {
  return `Session ${item.session} logged this learning:\n\n${item.note}\n\n`
    + `Read that session's log (layers/journal/content/*/sessions/*-${item.session}.yml) for context, `
    + `and check the learning still holds against the code and docs. If it does, would a future agent `
    + `have been better off knowing it, and where? Find its one home: an existing doc, rule, Skill or `
    + `glossary entry that should carry it, or a lean new one if none fits. Prefer cutting or rewording `
    + `existing text over adding more, and write nothing if it is too narrow to repay the reading. `
    + `Propose the exact edit and its location, and wait for my go-ahead before changing anything.`
}

// ── Session summary paragraphs ───────────────────────────
// A log's `summary` is one string, often over 1,000 characters, and reads as a
// wall when rendered whole. Display only: the stored text is untouched.
const SUMMARY_PARA_CHARS = 380
export function summaryParagraphs(text: string): string[] {
  const out: string[] = []
  for (const block of text.split(/\n+/).map((b) => b.trim()).filter(Boolean)) {
    let cur = ''
    for (const sentence of block.split(/(?<=[.!?])\s+(?=[A-Z"`(])/)) {
      if (cur && cur.length + sentence.length > SUMMARY_PARA_CHARS) {
        out.push(cur)
        cur = sentence
      } else cur = cur ? `${cur} ${sentence}` : sentence
    }
    if (cur) out.push(cur)
  }
  return out
}

// ── Friction per session, by day ─────────────────────────
// The Journal's own answer to "are the agents hitting fewer frictions?". UTC days, like
// the rest of the dashboard.
export function frictionsByDay(
  sessions: SessionDoc[],
  max = 14,
): { date: string; sessions: number; frictions: number; perSession: number }[] {
  const days = new Map<string, { sessions: number; frictions: number }>()
  for (const s of sessions) {
    const date = s.endedAt.slice(0, 10)
    const d = days.get(date) ?? { sessions: 0, frictions: 0 }
    d.sessions++
    d.frictions += s.frictions.length
    days.set(date, d)
  }
  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-max)
    .map(([date, d]) => ({ date, ...d, perSession: Math.round((d.frictions / d.sessions) * 10) / 10 }))
}

// ── KPI tiles ────────────────────────────────────────────
// Only `current` has them: archived detail pages mostly hold nothing. Every
// count but Skills is scoped to the sessions `current` holds.
export interface JournalKpiStat {
  key: string
  label: string
  value: number
  hint: string
  severity?: Severity
}

export interface JournalKpiTile {
  key: 'sessions' | 'frictions' | 'routines' | 'ideas' | 'skills'
  label: string
  gloss: string
  value: number | string
  stats: JournalKpiStat[]
  cta: string
  to: string
}

// Short display copy of the grades `log-session` defines, worst first; change both together.
const KPI_SEVERITY_HINTS: [Severity, string, string][] = [
  ['blocker', 'blk', "Blocker: the goal couldn't proceed without a workaround or human help"],
  ['major', 'maj', 'Major: derailed part of the session or degraded the outcome'],
  ['moderate', 'mod', 'Moderate: cost real time or forced a workaround'],
  ['minor', 'min', 'Minor: a contained papercut'],
  ['nit', 'nit', 'Nit: an annoyance with no real cost'],
]

export function journalKpiTiles({ space, sessions, skills, routines }: {
  space: string
  sessions: SessionDoc[]
  skills: SkillDoc[]
  routines: RoutineDoc[]
}): JournalKpiTile[] {
  if (space !== 'current') return []
  const base = `/t/journal/${space}`
  const kinds = kindCounts(sessions)
  const sev = frictionTotals(sessions)
  const since = sessions.map((s) => s.endedAt.slice(0, 10)).sort()[0]
  const runs = since ? routines.flatMap((r) => r.runs).filter((r) => r.startedAt.slice(0, 10) >= since) : []
  const notes = sessionNotes(sessions)
  const noun = (n: number, word: string) => (n === 1 ? word : `${word}s`)
  return [
    {
      key: 'sessions',
      label: 'Sessions logged',
      gloss: 'Agent sessions, logged',
      value: sessions.length,
      stats: [
        { key: 'interactive', label: 'interactive', value: kinds.interactive, hint: 'A human kept prompting' },
        { key: 'delegated', label: 'delegated', value: kinds.delegated, hint: 'One human prompt, then the agent worked alone' },
        { key: 'autonomous', label: 'autonomous', value: kinds.autonomous, hint: 'No human prompt: a schedule or another agent started it' },
      ],
      cta: 'Session logs ↓',
      to: '#session-log',
    },
    {
      key: 'frictions',
      label: 'Frictions surfaced',
      gloss: 'Problems agents hit and wrote down',
      value: frictionCount(sessions),
      stats: KPI_SEVERITY_HINTS.map(([severity, label, hint]) => ({ key: severity, label, value: sev[severity], hint, severity })),
      cta: 'Worst problems →',
      to: `${base}/frictions`,
    },
    {
      key: 'routines',
      label: 'Routine spend',
      gloss: 'What scheduled runs cost',
      value: formatRoutineMetric('costUsd', runs.reduce((sum, r) => sum + r.costUsd, 0)),
      stats: [{ key: 'runs', label: noun(runs.length, 'run'), value: runs.length, hint: "Routine runs started since this Space's oldest session" }],
      cta: 'Cost breakdown →',
      to: `${base}/routines`,
    },
    {
      key: 'ideas',
      label: 'Suggestions',
      gloss: 'Proposals from agents, to apply by hand',
      value: notes.ideas.length + notes.learnings.length,
      stats: [
        { key: 'ideas', label: noun(notes.ideas.length, 'idea'), value: notes.ideas.length, hint: 'Proposals for future work, noted but not planned' },
        { key: 'learnings', label: noun(notes.learnings.length, 'learning'), value: notes.learnings.length, hint: 'Lessons a session wrote down for future agents' },
      ],
      cta: 'Ideas & learnings →',
      to: `${base}/ideas`,
    },
    {
      key: 'skills',
      label: 'Skills',
      gloss: 'Playbooks the agents follow, as of today',
      value: skills.length,
      stats: [
        { key: 'platform', label: 'platform', value: ownSkills(skills).length, hint: 'Skills the Platform writes and evolves itself' },
        { key: 'installed', label: 'installed', value: installedSkillCount(skills), hint: "Third-party Skills the agents use but don't evolve" },
      ],
      cta: 'Roles & usage →',
      to: `${base}/skills`,
    },
  ]
}
