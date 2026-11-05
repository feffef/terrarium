// What a glassbox-improve run cost, by phase, read from the lead's own transcript and its
// subagents' (issue #2850). Unit: US dollars at list prices, so it compares with `costUsd`
// (get_session). Only works where the run happens: past runs' transcripts are gone.
import { readFileSync } from 'node:fs'
import { parseTranscript, readSubagentJsonls } from '../../../../scripts/session/transcript-trace.ts'

export interface ApiUsage {
  input_tokens?: number
  output_tokens?: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
  cache_creation?: { ephemeral_5m_input_tokens?: number; ephemeral_1h_input_tokens?: number }
}

/** USD per million tokens. Source: the claude-api Skill's model table (cached 2026-10-06) and
 *  its prompt-caching economics: cache writes cost 1.25x input (5 minutes) or 2x (1 hour).
 *  Not yet checked against a recorded costUSD: the transcript this was built in held none, so
 *  compare `totalUsd` with `costUsd` on the first real run before trusting the split. */
const prices: Record<string, { input: number; output: number; read: number }> = {
  'claude-opus-5-5': { input: 4, output: 20, read: 0.2 },
  'claude-sonnet-5-5': { input: 2, output: 10, read: 0.2 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, read: 0.01 },
  'claude-fable-5-1': { input: 10, output: 50, read: 0.25 },
}

/** One API request: the transcript writes a record per content block, all sharing the message id. */
export interface Request {
  at: number
  model: string
  usage: ApiUsage
}

export function requestsOf(records: Record<string, unknown>[]): Request[] {
  const byId = new Map<string, Request>()
  for (const rec of records) {
    const msg = rec.message as { id?: string; model?: string; usage?: ApiUsage } | undefined
    const at = typeof rec.timestamp === 'string' ? Date.parse(rec.timestamp) : NaN
    if (rec.type !== 'assistant' || !msg?.id || !msg.usage || !msg.model || Number.isNaN(at)) continue
    byId.set(msg.id, { at, model: msg.model, usage: msg.usage })
  }
  return [...byId.values()].sort((a, b) => a.at - b.at)
}

export function costOf({ model, usage: u }: Request): number {
  const price = Object.entries(prices).find(([id]) => model.startsWith(id))?.[1]
  if (!price) throw new Error(`no price for model ${model}`)
  const split = u.cache_creation
  const write = split ? 1.25 * (split.ephemeral_5m_input_tokens ?? 0) + 2 * (split.ephemeral_1h_input_tokens ?? 0) : 1.25 * (u.cache_creation_input_tokens ?? 0)
  const weighted = (u.input_tokens ?? 0) * price.input + write * price.input + (u.cache_read_input_tokens ?? 0) * price.read + (u.output_tokens ?? 0) * price.output
  return weighted / 1e6
}

const contextOf = ({ usage: u }: Request) => (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0)

const phasePrefixes: [string, string][] = [['Rater', 'rate'], ['Research', 'research'], ['Write', 'write'], ['Gate judge', 'gate'], ['A judge', 'elect'], ['Code review', 'review']]
/** An agent's phase, from the prefix of its dispatch description (SKILL.md, Dispatch names). */
export const phaseOf = (description: string) => phasePrefixes.find(([prefix]) => description.startsWith(prefix))?.[1] ?? 'other'

export interface Mark {
  phase: string
  at: string
}

export interface LeadPoint extends Mark {
  /** The lead's context size at the start of the phase, in thousand tokens. */
  contextK: number
  /** What the lead had cost since the first mark, in USD, so the session's work before the run doesn't count. */
  costUsd: number
}

export interface CostBreakdown {
  /** Lead plus all subagents. */
  totalUsd: number
  leadUsd: number
  /** Subagents' cost by phase (`other` for a description with no known prefix). */
  agentsUsd: Record<string, number>
  /** The lead alone, at the first start of each phase (the lead's work blurs between phases: agents overlap and its hand-backs mix them). */
  lead: LeadPoint[]
}

const roundUsd = (n: number) => Math.round(n * 100) / 100

export function breakdown(lead: Request[], agents: { label: string; requests: Request[] }[], marks: Mark[]): CostBreakdown {
  const sum = (rs: Request[]) => rs.reduce((n, r) => n + costOf(r), 0)
  const agentsUsd: Record<string, number> = {}
  for (const a of agents) agentsUsd[phaseOf(a.label)] = (agentsUsd[phaseOf(a.label)] ?? 0) + sum(a.requests)
  const firsts = marks.filter((m, i) => marks.findIndex((x) => x.phase === m.phase) === i)
  const before = (m: Mark) => lead.filter((r) => r.at <= Date.parse(m.at))
  const origin = firsts[0] ? sum(before(firsts[0])) : 0
  const points = firsts.map((m): LeadPoint => {
    const done = before(m)
    return { ...m, contextK: Math.round(contextOf(done.at(-1) ?? { at: 0, model: '', usage: {} }) / 1000), costUsd: roundUsd(sum(done) - origin) }
  })
  const leadUsd = sum(lead)
  const rounded = Object.fromEntries(Object.entries(agentsUsd).map(([k, v]) => [k, roundUsd(v)]))
  return { totalUsd: roundUsd(leadUsd + Object.values(agentsUsd).reduce((a, b) => a + b, 0)), leadUsd: roundUsd(leadUsd), agentsUsd: rounded, lead: points }
}

/** The breakdown of the run in `transcriptPath` (the lead's transcript, with its subagents beside it). */
export function readBreakdown(transcriptPath: string, marks: Mark[]): CostBreakdown {
  const lead = requestsOf(parseTranscript(readFileSync(transcriptPath, 'utf8')))
  const agents = readSubagentJsonls(transcriptPath).map((a) => ({ label: a.label, requests: requestsOf(parseTranscript(a.jsonl)) }))
  return breakdown(lead, agents, marks)
}
