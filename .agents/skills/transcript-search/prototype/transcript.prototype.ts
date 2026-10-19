// PROTOTYPE for #2296 — throwaway. Filters list_events pages the harness saved to tool-results/*.txt.
// Usage: tsx transcript.prototype.ts <read-check|dispatches> [--paths a,b] [--agent all|parent|<id>] [--all-hits] [--budget 5] [--out dir] <page files…>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const argv = process.argv.slice(2)
const question = argv.shift()
const opt = (name: string, dflt?: string) => {
  const i = argv.indexOf(`--${name}`)
  if (i < 0) return dflt
  const v = argv[i + 1]
  argv.splice(i, 2)
  return v
}
const flag = (name: string) => {
  const i = argv.indexOf(`--${name}`)
  if (i >= 0) argv.splice(i, 1)
  return i >= 0
}
const paths = (opt('paths') ?? '').split(',').filter(Boolean)
const agentFilter = opt('agent', 'all')!
const allHits = flag('all-hits')
const budget = Number(opt('budget', question === 'dispatches' ? '15' : '5'))
const session = opt('session', 'unknown')!
const outDir = opt('out', '.throwaway/ts/out')!
const files = argv

type Page = { first_id: string; last_id: string; has_more?: boolean; data: any[] }
const pages: Page[] = files.map((f) => {
  const s = readFileSync(f, 'utf8')
  return JSON.parse(s.slice(s.indexOf('{"ccr"'), s.lastIndexOf('}') + 1)).ccr
})

const seen = new Map<string, any>()
for (const p of pages) for (const e of p.data) {
  const kind = Object.keys(e).find((k) => k !== 'created_at')!
  const ca = e[kind]?.internal_anthropic_catchall ?? {}
  const uuid = e[kind]?.uuid ?? ca.uuid ?? JSON.stringify(e).slice(0, 80)
  seen.set(uuid, { kind, at: e.created_at, ca })
}
const events = [...seen.values()].sort((a, b) => a.at.localeCompare(b.at))

// Oldest page decides the cursor: its first_id walks further back.
const oldest = pages.reduce((a, b) => (a.data[0]?.created_at ?? '') < (b.data[0]?.created_at ?? '') ? a : b)
const reachedStart = !oldest.has_more

const agents = new Map<string, string>()
for (const e of events) if (e.ca.agent_id && e.ca.task_description) agents.set(e.ca.agent_id, e.ca.task_description)
const label = (ca: any) => (ca.agent_id ? `sub:${(agents.get(ca.agent_id) ?? ca.agent_id).slice(0, 28)}` : 'parent')
const keep = (ca: any) =>
  agentFilter === 'all' || (agentFilter === 'parent' ? !ca.agent_id : ca.agent_id === agentFilter)
const hhmm = (at: string) => at.slice(11, 19)
const blocks = (ca: any) => (Array.isArray(ca.message?.content) ? ca.message.content : [])
const text = (c: any): string =>
  typeof c === 'string' ? c : Array.isArray(c) ? c.filter((b) => b.type === 'text').map((b) => b.text).join('\n') : ''

const toolUses = events.flatMap((e) =>
  e.kind === 'assistant' && keep(e.ca)
    ? blocks(e.ca).filter((b: any) => b.type === 'tool_use').map((b: any) => ({ at: e.at, ca: e.ca, b }))
    : [],
)
const results = new Map<string, any>()
for (const e of events) if (e.kind === 'user') for (const b of blocks(e.ca))
  if (b.type === 'tool_result') results.set(b.tool_use_id, { b, meta: e.ca.tool_use_result, at: e.at })

const flat = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ')
const flatLines = events.flatMap((e) => {
  const pre = `${e.at.slice(0, 19)}  ${label(e.ca)}  ${e.kind}${e.ca.subtype ? '/' + e.ca.subtype : e.ca.type ? '/' + e.ca.type : ''}`
  const bs = blocks(e.ca)
  if (e.kind === 'assistant' || e.kind === 'user') {
    if (typeof e.ca.message?.content === 'string') return [`${pre}  ${e.ca.isSynthetic ? 'synthetic' : 'prompt'}: ${flat(e.ca.message.content)}`]
    return bs.flatMap((b: any) =>
      b.type === 'text' ? [`${pre}  ${e.kind === 'user' ? (e.ca.isSynthetic ? 'synthetic' : 'prompt') : 'say'}: ${flat(b.text)}`]
      : b.type === 'tool_use' ? [`${pre}  call ${b.name} [${b.id.slice(-8)}] ${flat(JSON.stringify(b.input))}`]
      : b.type === 'tool_result' ? [`${pre}  result [${b.tool_use_id.slice(-8)}]${b.is_error ? ' ERROR' : ''} ${flat(text(b.content) || b.content)}`]
      : [])
  }
  if (e.kind === 'result') return [`${pre}  turn-end cost=${e.ca.total_cost_usd ?? '?'} reply: ${flat(e.ca.result)}`]
  return [`${pre}  ${flat(e.ca.hook_name ?? '')}`]
})
mkdirSync(outDir, { recursive: true })
const flatFile = join(outDir, `transcript-${session}.txt`)
writeFileSync(flatFile, flatLines.join('\n') + '\n')

const lines: string[] = []
let answered = false

// Glob to regex: ** any depth, * one segment. Plain paths match as a suffix.
const toRe = (g: string) =>
  new RegExp((g.includes('*') ? '' : '(^|/)') + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*') + '$')

if (question === 'read-check') {
  const res = paths.map(toRe)
  const fileTools = new Set(['Read', 'Edit', 'Write', 'Grep', 'Glob', 'NotebookEdit'])
  const hits: string[] = []
  const mentions: string[] = []
  const found = new Set<number>()
  for (const { at, ca, b } of [...toolUses].reverse()) {
    const target = b.name === 'Skill'
      ? `.agents/skills/${String(b.input?.skill).split(':').at(-1)}/SKILL.md`
      : b.input?.file_path ?? b.input?.notebook_path ?? b.input?.path ?? b.input?.pattern ?? ''
    if (fileTools.has(b.name) || b.name === 'Skill') {
      res.forEach((re, i) => {
        if (re.test(target) && (allHits || !found.has(i))) {
          found.add(i)
          hits.push(`${hhmm(at)}  ${label(ca)}  ${b.name}  ${target}`)
        }
      })
    } else if (b.name === 'Bash') {
      const cmd = String(b.input?.command ?? '')
      // Text after a heredoc marker is data written somewhere, not a command reading the path.
      const head = cmd.split('<<')[0]
      paths.forEach((p, i) => {
        const bare = p.replace(/\*.*$/, '')
        if (!bare || !cmd.includes(bare)) return
        const short = cmd.slice(0, 120).replace(/\n/g, ' ')
        if (head.includes(bare) && /\b(cat|sed|head|tail|grep|rg|git show)\b/.test(head)) {
          if (allHits || !found.has(i)) hits.push(`${hhmm(at)}  ${label(ca)}  Bash-read  ${p}: ${short}`)
          found.add(i)
        } else mentions.push(`${hhmm(at)}  ${label(ca)}  Bash mentions ${p}: ${short}`)
      })
    }
  }
  answered = !allHits && found.size === paths.length
  lines.push(`READ CHECK ${paths.join(', ')}  (newest first; agent filter: ${agentFilter})`)
  lines.push(...hits.slice(0, 50))
  if (hits.length > 50) lines.push(`… ${hits.length - 50} more hits in the file`)
  if (!hits.length) lines.push('no Read/Edit/Write/Grep/Glob hit in the scanned events')
  if (mentions.length) lines.push('Bash commands that mention a path (not proof of a read):', ...mentions.slice(0, 10))
  paths.forEach((p, i) => !found.has(i) && lines.push(`not found yet: ${p}`))
}

if (question === 'dispatches') {
  const ds = toolUses.filter(({ b }) => b.name === 'Agent' || b.name === 'Task')
  const full: string[] = []
  // A background dispatch's result is only a launch receipt; its real reply arrives later as a hand-back message.
  const handbacks = new Map<string, string>()
  for (const e of events) if (e.kind === 'user') {
    const t = typeof e.ca.message?.content === 'string' ? e.ca.message.content : text(e.ca.message?.content)
    const m = t.match(/agent-message from="([^"]+)"/)
    if (m) handbacks.set(m[1], t.split('The report follows:')[1] ?? t)
  }
  const agentIds = new Set<string>()
  for (const { at, ca, b } of ds) {
    const r = results.get(b.id)
    const m = r?.meta ?? {}
    let reply = text(r?.b?.content) || (typeof m === 'object' ? text(m.content) : '')
    const launched = reply.match(/agentId: (\w+)/)?.[1]
    if (launched) {
      agentIds.add(launched)
      reply = handbacks.get(launched) ?? '(background; hand-back not in the scanned events)'
    }
    const stats = [m.totalDurationMs && `${Math.round(m.totalDurationMs / 1000)}s`, m.totalTokens && `${m.totalTokens} tok`].filter(Boolean).join(', ')
    lines.push(
      `${hhmm(at)}  ${label(ca)}  ${b.input?.subagent_type ?? 'general-purpose'}  "${b.input?.description ?? ''}"${b.input?.run_in_background ? '  (background)' : ''}${stats ? `  [${stats}]` : ''}`,
      `  brief: ${String(b.input?.prompt ?? '').slice(0, 1000).replace(/\n+/g, ' ')}`,
      `  reply: ${r ? reply.slice(0, 500).replace(/\n+/g, ' ') : '(no result in the scanned events)'}`,
    )
    full.push(`## ${at} ${b.input?.description}\n\n### Brief\n\n${b.input?.prompt}\n\n### Reply\n\n${reply}\n`)
  }
  if (!ds.length) lines.push('no Agent dispatch in the scanned events')
  const dispatched = new Set(ds.map(({ b }) => b.id))
  const orphans = new Map<string, { desc: string; first: string; last: string; n: number }>()
  for (const e of events) {
    const id = e.ca.agent_id
    if (!id || agentIds.has(id) || dispatched.has(e.ca.parent_tool_use_id)) continue
    const o = orphans.get(id) ?? { desc: e.ca.task_description ?? id, first: e.at, last: e.at, n: 0 }
    o.last = e.at
    o.n++
    orphans.set(id, o)
  }
  for (const o of orphans.values())
    lines.push(`${hhmm(o.first)}–${hhmm(o.last)}  sub:"${o.desc}"  ${o.n} events  (dispatch not in range)`)
  if (full.length) {
    mkdirSync(outDir, { recursive: true })
    const f = join(outDir, 'dispatches.md')
    writeFileSync(f, full.join('\n'))
    lines.unshift(`DISPATCHES (${ds.length}; full briefs and replies: ${f})`)
  }
  answered = reachedStart
}

const span = events.length ? `${events[0].at.slice(0, 16)}–${hhmm(events.at(-1).at)}` : 'none'
lines.push(
  `FLAT TRANSCRIPT: ${flatFile} (${flatLines.length} lines, one per event, oldest first; grep -oE '.{0,150}PATTERN.{0,150}')`,
  `COVERAGE: ${events.length} events in ${pages.length}/${budget} pages, ${span}; session start ${reachedStart ? 'reached' : 'NOT reached'}. Never visible: rule loads, workflow-agent calls.`,
  answered || reachedStart
    ? 'NEXT: done'
    : pages.length >= budget
      ? 'NEXT: page budget spent; report coverage as is'
      : `NEXT: fetch list_events limit 100 before_id=${oldest.first_id}`,
)

const out = lines.join('\n')
if (out.length > 4000) {
  mkdirSync(outDir, { recursive: true })
  const f = join(outDir, `${question}.txt`)
  writeFileSync(f, out)
  console.log(out.slice(0, 3500) + `\n… cut at the cap; full answer: ${f}`)
} else console.log(out)
