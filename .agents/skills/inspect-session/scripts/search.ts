// Search: predefined selectors over a flattened-events file. It selects lines by
// their fields and tags only; Flatten does all the parsing (#2300).
//
// Usage: pnpm exec tsx .agents/skills/inspect-session/scripts/search.ts <flattened file> <selector> [--agent parent|<agent id>]
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { extractFlag, fail, root, runIfMain } from '../../../../scripts/lib/cli.ts'
import { coverageLine, nextLine, readFlat, shown, sibling, skillFile, toLine, type FlatLine, type Meta } from './flat.ts'

export type Selector =
  | { name: 'tool'; tool: string; input?: string }
  | { name: 'reads'; paths: string[] }
  | { name: 'dispatches' | 'errors' | 'prompts' }
  | { name: 'last'; n: number }

const USAGE = 'selectors: tool <name regex> [<input regex>] | reads <path or glob>… | dispatches | errors | prompts | last <N>'

export function parseSelector(args: string[]): Selector {
  const [name, ...rest] = args
  if (name === 'tool' && rest[0]) return { name, tool: rest[0], input: rest[1] }
  if (name === 'reads' && rest.length) return { name, paths: rest }
  if (name === 'dispatches' || name === 'errors' || name === 'prompts') return { name }
  if (name === 'last' && Number(rest[0]) > 0) return { name, n: Number(rest[0]) }
  throw new Error(USAGE)
}

const selectorLabel = (sel: Selector): string =>
  sel.name === 'reads' ? `reads ${sel.paths.join(' ')}` : sel.name === 'tool' ? `tool ${sel.tool}${sel.input ? ` /${sel.input}/` : ''}` : sel.name === 'last' ? `last ${sel.n}` : sel.name

/** Glob to an unanchored regex, so a repo-relative path matches an absolute one: `**` any depth, `*` one segment. */
export const globRegex = (glob: string): RegExp =>
  new RegExp(glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\0').replace(/\*/g, '[^/\\s]*').replace(/\0/g, '.*'))

const onAgent = (agent: string | undefined) => (l: FlatLine) => !agent || l.agent === agent || l.agent === `sub:${agent.replace(/^sub:/, '')}`

export function search(lines: FlatLine[], sel: Selector, agent?: string): { hits: FlatLine[]; missing: string[] } {
  const scoped = lines.filter(onAgent(agent))
  if (sel.name === 'reads') {
    const res = sel.paths.map(globRegex)
    const reads = scoped.filter((l) => l.tags.includes('read'))
    return {
      hits: reads.filter((l) => res.some((re) => re.test(l.target))),
      missing: sel.paths.filter((_, i) => !reads.some((l) => res[i]!.test(l.target))),
    }
  }
  if (sel.name === 'last') {
    const hits = scoped.slice(-sel.n)
    return { hits, missing: hits.length < sel.n ? [`${sel.n - hits.length} more line(s)`] : [] }
  }
  let hits: FlatLine[]
  if (sel.name === 'tool') {
    const name = new RegExp(`^(?:${sel.tool})$`)
    const input = sel.input ? new RegExp(sel.input, 'i') : null
    hits = scoped.filter((l) => l.kind === 'assistant' && l.tool.split(',').some((t) => name.test(t)) && (!input || input.test(l.input)))
  } else if (sel.name === 'dispatches') {
    const seen = new Set<string>()
    hits = scoped.filter((l) => l.tags.includes('dispatch') || (l.tags.includes('dispatch-not-in-range') && !seen.has(l.agent) && seen.add(l.agent)))
  } else {
    const tag = sel.name === 'errors' ? 'error' : 'human-prompt'
    // The call line already holds a failed result, so its result line would repeat it.
    hits = scoped.filter((l) => l.tags.includes(tag) && !(tag === 'error' && l.input.startsWith('result of L')))
  }
  return { hits, missing: hits.length ? [] : [selectorLabel(sel)] }
}

const LOG_READ_FIELDS = ['docsRead', 'docsReadBySubagents', 'rulesGlobal', 'rulesLoaded', 'rulesLoadedBySubagents', 'skillsUsed'] as const

/** Session-log reads matching each asked-for path: events never show rule loads or workflow-agent reads. */
export function logReads(logYaml: string, paths: string[]): { path: string; hit: string }[] {
  const log = (parseYaml(logYaml) ?? {}) as Record<string, unknown>
  const out: { path: string; hit: string }[] = []
  for (const field of LOG_READ_FIELDS) {
    const items = (Array.isArray(log[field]) ? log[field] : []) as (string | { path?: string; name?: string })[]
    const names = items.map((i) => (typeof i === 'string' ? i : (i.path ?? (i.name ? skillFile(i.name) : ''))))
    for (const path of paths) for (const n of names) if (globRegex(path).test(n)) out.push({ path, hit: `${n} in ${field}` })
  }
  return out
}

const CAP = 2000
const summary = (l: FlatLine): string => {
  // A dispatch's brief stays in the full list, so its reply fits the cap.
  const body = l.tags.includes('dispatch') ? l.input.split(' brief: ')[0] : shown(l)
  const s = `L${l.n} ${l.at.slice(11)} ${l.agent} ${l.kind}${l.tool ? ` ${l.tool}` : ''}${l.tags.length ? ` [${l.tags.join(',')}]` : ''} ${body}${l.result ? ` → ${l.result}` : ''}`
  return s.length > 300 ? `${s.slice(0, 299)}…` : s
}

export function render(sel: Selector, agent: string | undefined, found: { hits: FlatLine[]; missing: string[] }, meta: Meta, logHits: { path: string; hit: string }[], fullList: string): string {
  const lines: string[] = []
  let size = 0
  for (const l of found.hits) {
    const s = summary(l)
    if (size + s.length > CAP) break
    lines.push(s)
    size += s.length + 1
  }
  const missing = found.missing.filter((m) => !logHits.some((h) => h.path === m))
  return [
    `SEARCH ${selectorLabel(sel)} (agent: ${agent ?? 'all'}; ${found.hits.length} line(s))`,
    ...lines,
    ...(found.hits.length > lines.length ? [`… ${found.hits.length - lines.length} more; full list: ${fullList}`] : []),
    ...logHits.map((h) => `SESSION LOG: ${h.hit}`),
    coverageLine(meta),
    missing.length ? `NOT FOUND: ${missing.join(', ')}` : 'FOUND',
    missing.length ? nextLine(meta) : 'NEXT: done, found',
  ].join('\n')
}

runIfMain(import.meta.url, () => {
  const { value: agent, rest } = extractFlag(process.argv.slice(2), '--agent')
  const [flatFile, ...selArgs] = rest
  if (!flatFile) fail(`usage: search.ts <flattened file> <selector> [--agent parent|<id>]; ${USAGE}`)
  let sel: Selector
  try {
    sel = parseSelector(selArgs)
  } catch (e) {
    fail((e as Error).message)
  }
  const { lines, meta } = readFlat(flatFile)
  const found = search(lines, sel, agent)
  const logHits = sel.name === 'reads' && meta.sessionLog ? logReads(readFileSync(join(root, meta.sessionLog), 'utf8'), sel.paths) : []
  const fullList = sibling(flatFile, `.search-${sel.name}.txt`)
  writeFileSync(fullList, found.hits.map(toLine).join('\n') + '\n')
  console.log(render(sel, agent, found, meta, logHits, fullList))
})
