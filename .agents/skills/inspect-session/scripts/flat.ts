// The flattened-events format shared by Flatten, Search and Outline. SKILL.md
// defines it for readers; this file is its one home in code.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export type Tag = 'read' | 'dispatch' | 'handback' | 'error' | 'human-prompt' | 'dispatch-not-in-range'

/** One event. Tabs and newlines never occur inside a field, so a line splits on tabs. */
export interface FlatLine {
  n: number
  at: string
  agent: string
  kind: string
  tool: string
  tags: Tag[]
  /** What a `read` line read: a path, a glob, a Skill's SKILL.md, or a Bash command before any heredoc. */
  target: string
  input: string
  result: string
}

export interface Meta {
  session: string
  file: string
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

export const oneLine = (s: unknown): string => String(s ?? '').replace(/\s+/g, ' ').trim()

export function toLine(f: FlatLine): string {
  return [`L${f.n}`, f.at, f.agent, f.kind, f.tool, f.tags.join(','), f.target, f.input, f.result].map(oneLine).join('\t')
}

export function parseLine(s: string): FlatLine {
  const [n = '', at = '', agent = '', kind = '', tool = '', tags = '', target = '', input = '', result = ''] = s.split('\t')
  return { n: Number(n.slice(1)), at, agent, kind, tool, tags: tags ? (tags.split(',') as Tag[]) : [], target, input, result }
}

export const metaPath = (flatFile: string): string => flatFile.replace(/\.txt$/, '') + '.meta.json'

export const readFlat = (flatFile: string): { lines: FlatLine[]; meta: Meta } => ({
  lines: readFileSync(flatFile, 'utf8').split('\n').filter(Boolean).map(parseLine),
  meta: JSON.parse(readFileSync(metaPath(flatFile), 'utf8')) as Meta,
})

export const bareSession = (id: string): string => id.replace(/^session_/, '')

/** The target's session log, the only source of its rule loads and workflow-agent reads. */
export function findSessionLog(repoRoot: string, session: string): string | null {
  const suffix = `-session_${bareSession(session)}.yml`
  const content = join(repoRoot, 'layers/journal/content')
  for (const space of readdirSync(content)) {
    const dir = join(content, space, 'sessions')
    try {
      const hit = readdirSync(dir).find((f) => f.endsWith(suffix))
      if (hit) return join('layers/journal/content', space, 'sessions', hit)
    } catch {
      // A Space without sessions.
    }
  }
  return null
}

export function coverageLine(meta: Meta, sessionLog: string | null): string {
  const dups = meta.duplicates.length ? `, ${meta.duplicates.length} duplicate page(s) dropped` : ''
  const start = meta.reachedStart ? 'session start reached' : 'session start NOT reached'
  const log = sessionLog
    ? `rules: from session log ${sessionLog}; workflow agents: reads only, no turns`
    : 'no session log yet, so rule loads and workflow-agent reads are unknown'
  return `COVERAGE: ${meta.events} events in ${meta.pages} page(s)${dups}, ${meta.from}–${meta.to}; ${start}; ${log}`
}

export function nextLine(meta: Meta): string {
  if (meta.reachedStart) return 'NEXT: done, session start reached'
  if (meta.pages >= meta.pageLimit) return `NEXT: page limit reached (${meta.pages} of ${meta.pageLimit}); report coverage as is`
  return `NEXT: fetch list_events limit 100 before_id=${meta.nextBeforeId}`
}
