// Flatten: saved list_events pages → one flattened-events file, plus a meta
// file the other scripts read for coverage and the next cursor. Every bit of
// event parsing lives here, so Search and Outline only select lines (#2300).
//
// Usage: pnpm exec tsx .agents/skills/inspect-session/scripts/flatten.ts \
//   --session <id> --out <dir> [--page-limit 5] <saved page files…>
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { extractFlag, fail, root, runIfMain } from '../../../../scripts/lib/cli.ts'
import {
  bareSession,
  coverageLine,
  findSessionLog,
  metaPath,
  nextLine,
  oneLine,
  toLine,
  type FlatLine,
  type Meta,
  type Tag,
} from './flat.ts'

/* eslint-disable @typescript-eslint/no-explicit-any -- list_events events are untyped, undocumented JSON */
type Raw = Record<string, any>

export interface Page {
  file: string
  firstId: string
  hasMore: boolean
  data: Raw[]
}

/** A saved page is the raw tool result: `{"ccr": …}`, maybe inside an `<other-session>` wrapper. */
export function parsePage(text: string, file: string): Page {
  const start = text.indexOf('{"ccr"')
  if (start < 0) throw new Error(`${file}: no list_events result in it`)
  const { ccr } = JSON.parse(text.slice(start, text.lastIndexOf('}') + 1)) as { ccr: Raw }
  // has_more is left out, not false, when the page reaches the session start.
  return { file, firstId: ccr.first_id, hasMore: ccr.has_more === true, data: ccr.data ?? [] }
}

interface Ev {
  kind: string
  at: string
  uuid: string
  ca: Raw
}

function normalize(raw: Raw): Ev {
  const key = Object.keys(raw).find((k) => k !== 'created_at') ?? 'other'
  const body: Raw = raw[key] ?? {}
  const ca: Raw = key === 'internal_anthropic_catchall' ? body : (body.internal_anthropic_catchall ?? {})
  const kind = key === 'internal_anthropic_catchall' ? 'other' : key
  // control_* events carry no uuid; their time and request id still tell two apart.
  const uuid = body.uuid ?? ca.uuid ?? `${kind}@${raw.created_at}#${ca.request_id ?? ca.response?.request_id ?? ''}`
  return { kind, at: String(raw.created_at ?? ''), uuid, ca }
}

const blocks = (ca: Raw): Raw[] => (Array.isArray(ca.message?.content) ? ca.message.content : [])

/** Text of a message or tool result; images and other binary blocks become a marker. */
function textOf(c: unknown): string {
  if (typeof c === 'string') return c
  if (!Array.isArray(c)) return ''
  return c.map((b: Raw) => (b.type === 'text' ? b.text : b.type === 'tool_result' ? '' : `[${b.type} dropped]`)).join(' ')
}

const BASH_READ = /\b(cat(?!\s*>)|sed(?!\s+-i)|head|tail|grep|rg|git show)\b/
const HAS_PATH = /[\w.*-]*\/[\w./*-]+|\b[\w*-]+\.[a-z]{1,5}\b/i

function readTarget(name: string, input: Raw): string | null {
  if (name === 'Read') return input.file_path ?? null
  if (name === 'Grep') return input.path ?? '.'
  if (name === 'Glob') return [input.path, input.pattern].filter(Boolean).join('/')
  // A Skill call counts as reading that Skill's SKILL.md.
  if (name === 'Skill') return `.agents/skills/${String(input.skill).split(':').at(-1)}/SKILL.md`
  if (name === 'Bash') {
    // Text after a heredoc marker is data written somewhere, not a path read.
    const head = String(input.command ?? '').split('<<')[0]!
    return BASH_READ.test(head) && HAS_PATH.test(head) ? head : null
  }
  return null
}

const isDispatch = (b: Raw): boolean => b.type === 'tool_use' && (b.name === 'Agent' || b.name === 'Task')

function isHumanPrompt(e: Ev): boolean {
  if (e.kind !== 'user' || e.ca.agent_id || e.ca.isSynthetic || e.ca.isMeta || e.ca.origin) return false
  const c = e.ca.message?.content
  return typeof c === 'string' ? c.trim() !== '' : blocks(e.ca).some((b) => b.type === 'text') && !blocks(e.ca).some((b) => b.type === 'tool_result')
}

/** The hand-back report's text: the harness stores it on `origin`, else after its frame line. */
const handbackText = (e: Ev): string =>
  e.ca.origin?.handbackReportText ?? textOf(e.ca.message?.content).split('The report follows:')[1] ?? textOf(e.ca.message?.content)

const agentLabel = (ca: Raw): string => (ca.agent_id ? `sub:${ca.agent_id}` : 'parent')

/** Merge pages from any number of fetchers into one oldest-first event list. */
export function merge(pages: Page[]): { events: Ev[]; kept: Page[]; duplicates: Meta['duplicates'] } {
  const firstAt = (p: Page): string => String(p.data[0]?.created_at ?? '')
  const seenFirst = new Set<string>()
  const kept: Page[] = []
  const duplicates: Meta['duplicates'] = []
  for (const p of [...pages].sort((a, b) => firstAt(a).localeCompare(firstAt(b)))) {
    // The server can return an already-fetched page for a correct cursor.
    if (seenFirst.has(p.firstId)) duplicates.push({ file: p.file, firstId: p.firstId })
    else {
      seenFirst.add(p.firstId)
      kept.push(p)
    }
  }
  const byUuid = new Map<string, Ev>()
  for (const p of kept) for (const raw of p.data) {
    const e = normalize(raw)
    if (!byUuid.has(e.uuid)) byUuid.set(e.uuid, e)
  }
  // A stable sort keeps same-time events in page order.
  const events = [...byUuid.values()].sort((a, b) => a.at.localeCompare(b.at))
  return { events, kept, duplicates }
}

export function flatten(pages: Page[], session: string, pageLimit = 5): { lines: FlatLine[]; meta: Meta } {
  const { events, kept, duplicates } = merge(pages)
  const lineOf = (i: number): number => i + 1

  // Joins: a call to its result, a dispatch to its agent, an agent to its hand-back.
  const results = new Map<string, { b: Raw; ca: Raw; i: number }>()
  const callLine = new Map<string, number>()
  const callName = new Map<string, string>()
  const agentOfCall = new Map<string, string>()
  const handbacks = new Map<string, { text: string; i: number }>()
  events.forEach((e, i) => {
    for (const b of blocks(e.ca)) {
      if (b.type === 'tool_use') {
        callLine.set(b.id, lineOf(i))
        callName.set(b.id, b.name)
      }
      if (b.type === 'tool_result') {
        results.set(b.tool_use_id, { b, ca: e.ca, i })
        const id = e.ca.tool_use_result?.agentId ?? textOf(b.content).match(/agentId: (\w+)/)?.[1]
        if (id) agentOfCall.set(b.tool_use_id, id)
      }
    }
    if (e.ca.agent_id && e.ca.parent_tool_use_id) agentOfCall.set(e.ca.parent_tool_use_id, e.ca.agent_id)
    if (e.kind === 'user' && e.ca.origin?.handback) handbacks.set(e.ca.origin.from, { text: handbackText(e), i })
  })
  const dispatchedAgents = new Map<string, string>()
  for (const [call, agent] of agentOfCall) if (callName.get(call) === 'Agent' || callName.get(call) === 'Task') dispatchedAgents.set(agent, call)

  const lines = events.map((e, i): FlatLine => {
    const subtype = e.ca.subtype ?? (e.kind === 'other' ? e.ca.type : undefined)
    const line: FlatLine = { n: lineOf(i), at: e.at.slice(0, 19), agent: agentLabel(e.ca), kind: subtype ? `${e.kind}/${subtype}` : e.kind, tool: '', tags: [], target: '', input: '', result: '' }
    const tag = (t: Tag): void => void (line.tags.includes(t) || line.tags.push(t))
    if (e.ca.agent_id && !dispatchedAgents.has(e.ca.agent_id)) tag('dispatch-not-in-range')

    if (e.kind === 'assistant') {
      const tools: string[] = []
      const inputs: string[] = []
      const outs: string[] = []
      for (const b of blocks(e.ca)) {
        if (b.type === 'text') inputs.push(b.text)
        else if (b.type === 'thinking') inputs.push('(thinking)')
        else if (b.type === 'tool_use') {
          tools.push(b.name)
          const r = results.get(b.id)
          if (r?.b.is_error) tag('error')
          const target = readTarget(b.name, b.input ?? {})
          if (target !== null) {
            tag('read')
            line.target = target
          }
          if (isDispatch(b)) {
            tag('dispatch')
            const agent = agentOfCall.get(b.id)
            const hb = agent ? handbacks.get(agent) : undefined
            const receipt = r && (r.ca.tool_use_result?.status === 'async_launched' || /Async agent launched|delivered to you as a message/.test(textOf(r.b.content)))
            const reply = hb?.text ?? r?.ca.tool_use_result?.handbackReport?.text ?? (receipt ? '(hand-back not in range)' : r ? textOf(r.b.content) : '(no result in range)')
            inputs.push(`${b.input?.subagent_type ?? 'general-purpose'} "${b.input?.description ?? ''}"${b.input?.run_in_background ? ' (background)' : ''} brief: ${b.input?.prompt ?? ''}`)
            outs.push(`agent=${agent ?? '?'}${hb ? ` handback=L${lineOf(hb.i)}` : ''} reply: ${reply}`)
          } else {
            inputs.push(JSON.stringify(b.input ?? {}))
            outs.push(r ? textOf(r.b.content) : '(no result in range)')
          }
        }
      }
      line.tool = tools.join(',')
      line.input = inputs.join(' | ')
      line.result = outs.join(' | ')
    } else if (e.kind === 'user') {
      const tr = blocks(e.ca).filter((b) => b.type === 'tool_result')
      if (tr.length) {
        // The call's own line holds the result; this line only points there.
        line.tool = tr.map((b) => callName.get(b.tool_use_id) ?? '?').join(',')
        line.input = tr.map((b) => `result of ${callLine.has(b.tool_use_id) ? `L${callLine.get(b.tool_use_id)}` : 'a call not in range'}`).join(' | ')
        if (tr.some((b) => b.is_error)) tag('error')
      } else if (e.ca.origin?.handback) {
        tag('handback')
        const call = dispatchedAgents.get(e.ca.origin.from)
        line.kind = 'user/handback'
        line.input = `from ${e.ca.origin.from}${call ? `, dispatch L${callLine.get(call)}` : ', dispatch not in range'}`
        line.result = handbackText(e)
      } else {
        if (isHumanPrompt(e)) tag('human-prompt')
        else line.kind = `user/${e.ca.origin?.kind ?? (e.ca.agent_id ? 'brief' : 'synthetic')}`
        line.input = textOf(e.ca.message?.content)
      }
    } else if (e.kind === 'result') {
      if (e.ca.is_error) tag('error')
      line.input = String(e.ca.result ?? '')
      line.result = `cost=$${e.ca.total_cost_usd ?? '?'} turns=${e.ca.num_turns ?? '?'}`
    } else if (subtype === 'hook_response') {
      line.tool = String(e.ca.hook_name ?? '')
      if (e.ca.exit_code) tag('error')
      line.result = oneLine([e.ca.output, e.ca.stdout, e.ca.stderr].filter(Boolean).join(' ')).slice(0, 500)
    } else {
      // Init and control events run to 40k characters of Skill lists: keep a glimpse.
      line.input = oneLine(JSON.stringify(e.ca)).slice(0, 300)
    }
    return line
  })

  const oldest = kept[0]
  const meta: Meta = {
    session: `session_${bareSession(session)}`,
    file: '',
    pages: kept.length,
    duplicates,
    events: events.length,
    from: events[0]?.at.slice(0, 19) ?? 'none',
    to: events.at(-1)?.at.slice(0, 19) ?? 'none',
    reachedStart: oldest ? !oldest.hasMore : false,
    nextBeforeId: oldest?.firstId ?? '',
    pageLimit,
  }
  return { lines, meta }
}

export function report(meta: Meta, lineCount: number, sessionLog: string | null): string {
  return [
    `FLATTENED: ${meta.file} (${lineCount} lines, one per event, oldest first; grep -oE '.{0,150}PATTERN.{0,150}' ${meta.file})`,
    coverageLine(meta, sessionLog),
    ...meta.duplicates.map((d) => `DUPLICATE: ${d.file} repeats page first_id=${d.firstId}; dropped. Fetch its cursor once more.`),
    nextLine(meta),
  ].join('\n')
}

runIfMain(import.meta.url, () => {
  let args = process.argv.slice(2)
  const flags: Record<string, string | undefined> = {}
  for (const f of ['--session', '--out', '--page-limit']) ({ value: flags[f], rest: args } = extractFlag(args, f))
  const session = flags['--session']
  const out = flags['--out']
  if (!session || !out || !args.length) fail('usage: flatten.ts --session <id> --out <dir> [--page-limit 5] <saved page files…>')
  const { lines, meta } = flatten(
    args.map((f) => parsePage(readFileSync(f, 'utf8'), f)),
    session,
    Number(flags['--page-limit'] ?? 5),
  )
  mkdirSync(out, { recursive: true })
  meta.file = join(out, `events-${meta.session}.txt`)
  writeFileSync(meta.file, lines.map(toLine).join('\n') + '\n')
  writeFileSync(metaPath(meta.file), JSON.stringify(meta, null, 2))
  console.log(report(meta, lines.length, findSessionLog(root, session)))
})
