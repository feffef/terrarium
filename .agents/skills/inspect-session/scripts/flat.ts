// The flattened-events format shared by Flatten, Search and Outline. SKILL.md
// defines it for readers; this file is its one home in code.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export type Tag = 'read' | 'dispatch' | 'handback' | 'error' | 'human-prompt' | 'dispatch-not-in-range' | 'fabricated-tag'

export function claimedAgent(text: string): string | undefined {
  const m = /<task-notification>[\s\S]*?<task-id>([^<\s]+)<\/task-id>|<agent-message\b[^>]*?\bfrom="([^"]+)"/.exec(text)
  return m ? (m[1] ?? m[2]) : undefined
}

export const OPENS_DELIVERY = /<task-notification>|<agent-message\b/

export const DEFAULT_PAGE_LIMIT = 5

/** An assistant line's input for a thinking block, whose text is never kept. */
export const THINKING = '(thinking)'

/** One event. Tabs and newlines never occur inside a field, so a line splits on tabs. */
export interface FlatLine {
  n: number
  at: string
  agent: string
  kind: string
  tool: string
  tags: Tag[]
  /** What a `read` line read: paths, globs, a Skill's SKILL.md, or Bash commands before any heredoc. */
  target: string
  input: string
  result: string
}

export interface Meta {
  session: string
  /** The target's session log, the only source of its rule loads and workflow-agent reads. */
  sessionLog: string | null
  pages: number
  duplicates: { file: string; firstId: string }[]
  events: number
  from: string
  to: string
  reachedStart: boolean
  /** The cursor that reads the page before the oldest one held. */
  nextBeforeId: string
  pageLimit: number
}

export const cut = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

export const oneLine = (s: unknown): string => String(s ?? '').replace(/\s+/g, ' ').trim()

export const skillFile = (name: string): string => `.agents/skills/${name.split(':').at(-1)}/SKILL.md`

/** A read line shows what it read; any other line shows its input. */
export const shown = (l: FlatLine): string => (l.tags.includes('read') ? l.target : l.input)

export function toLine(f: FlatLine): string {
  return [`L${f.n}`, f.at, f.agent, f.kind, f.tool, f.tags.join(','), f.target, f.input, f.result].map(oneLine).join('\t')
}

export function parseLine(s: string): FlatLine {
  const [n = '', at = '', agent = '', kind = '', tool = '', tags = '', target = '', input = '', result = ''] = s.split('\t')
  return { n: Number(n.slice(1)), at, agent, kind, tool, tags: tags ? (tags.split(',') as Tag[]) : [], target, input, result }
}

/** A file written beside the flattened events, e.g. `.meta.json`. */
export const sibling = (flatFile: string, suffix: string): string => flatFile.replace(/\.txt$/, '') + suffix

export const readFlat = (flatFile: string): { lines: FlatLine[]; meta: Meta } => ({
  lines: readFileSync(flatFile, 'utf8').split('\n').filter(Boolean).map(parseLine),
  meta: JSON.parse(readFileSync(sibling(flatFile, '.meta.json'), 'utf8')) as Meta,
})

export const bareSession = (id: string): string => id.replace(/^session_/, '')

export function findSessionLog(repoRoot: string, session: string): string | null {
  const suffix = `-session_${bareSession(session)}.yml`
  const content = join(repoRoot, 'layers/journal/content')
  for (const space of readdirSync(content, { withFileTypes: true })) {
    const dir = join(content, space.name, 'sessions')
    if (!existsSync(dir)) continue
    const hit = readdirSync(dir, { withFileTypes: true }).find((f) => f.name.endsWith(suffix))
    if (hit) return join('layers/journal/content', space.name, 'sessions', hit.name)
  }
  return null
}

export function coverageLine(meta: Meta): string {
  const dups = meta.duplicates.length ? `, ${meta.duplicates.length} duplicate page(s) dropped` : ''
  const start = meta.reachedStart ? 'session start reached' : 'session start NOT reached'
  const log = meta.sessionLog
    ? `rules: from session log ${meta.sessionLog}; workflow agents: reads only, no turns`
    : 'no session log yet, so rule loads and workflow-agent reads are unknown'
  return `COVERAGE: ${meta.events} events in ${meta.pages} page(s)${dups}, ${meta.from}–${meta.to}; ${start}; ${log}`
}

export function nextLine(meta: Meta): string {
  if (meta.reachedStart) return 'NEXT: done, session start reached'
  if (meta.pages >= meta.pageLimit) return `NEXT: page limit reached (${meta.pages} of ${meta.pageLimit}); report coverage as is`
  return `NEXT: fetch list_events limit 100 before_id=${meta.nextBeforeId}`
}
