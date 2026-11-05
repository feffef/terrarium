// Where a glassbox-improve run's cost went, by phase, read from the lead's own transcript and its
// subagents' (issue #2850). Only works where the run happens: past runs' transcripts are gone.
//
// Tokens by class are counted from the transcripts. On one session they matched get_session within
// 2% for cache reads and writes and 14% for output, but not for input (about 0K against 3.8K).
// Shares are estimates: each request gets a relative weight from `weights`, and only the ratios
// matter. Dollars are never computed from prices: list prices came out 1.0x to 1.6x above
// get_session's cost_usd on ten sessions, and a fit of the rates was unstable. `anchor` scales the
// shares to the run's recorded `costUsd` instead.
import { readFileSync } from 'node:fs'
import { parseTranscript, readSubagentJsonls } from '../../../../scripts/session/transcript-trace.ts'

export interface ApiUsage {
  input_tokens?: number
  output_tokens?: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
  cache_creation?: { ephemeral_5m_input_tokens?: number; ephemeral_1h_input_tokens?: number }
}

/** Relative weight per million tokens: the claude-api Skill's list prices (cached 2026-10-06), cache
 *  writes at 1.25x (5 minutes) or 2x (1 hour) input. Not calibrated (see the header). */
const weights: Record<string, { input: number; output: number; read: number }> = {
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

/** Thousand tokens by class, as the transcript records them. `writeK` is cache writes of both lifetimes; the transcript's
 *  subagents hold only a stream-start count of output tokens, so a subagent's `outputK` runs low (`Usage` in transcript-trace.ts). */
export interface Tokens {
  inputK: number
  outputK: number
  readK: number
  writeK: number
}

/** Cache writes by lifetime; a record without the split counts as 5 minutes. */
const writesOf = (u: ApiUsage) => (u.cache_creation ? { m5: u.cache_creation.ephemeral_5m_input_tokens ?? 0, h1: u.cache_creation.ephemeral_1h_input_tokens ?? 0 } : { m5: u.cache_creation_input_tokens ?? 0, h1: 0 })
const writeOf = (u: ApiUsage) => writesOf(u).m5 + writesOf(u).h1
const mapValues = <T, U>(o: Record<string, T>, f: (v: T) => U) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, f(v)]))

export function tokensOf(requests: Request[]): Tokens {
  const sum = (pick: (u: ApiUsage) => number) => Math.round(requests.reduce((n, r) => n + pick(r.usage), 0) / 1000)
  return { inputK: sum((u) => u.input_tokens ?? 0), outputK: sum((u) => u.output_tokens ?? 0), readK: sum((u) => u.cache_read_input_tokens ?? 0), writeK: sum(writeOf) }
}

/** A request's relative weight; a model with no weight is an error, not a guess. */
export function weightOf({ model, usage: u }: Request): number {
  const w = Object.entries(weights).find(([id]) => model.startsWith(id))?.[1]
  if (!w) throw new Error(`no weight for model ${model}`)
  const { m5, h1 } = writesOf(u)
  const write = 1.25 * m5 + 2 * h1
  return ((u.input_tokens ?? 0) * w.input + write * w.input + (u.cache_read_input_tokens ?? 0) * w.read + (u.output_tokens ?? 0) * w.output) / 1e6
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
  /** The lead's weight since the first mark, as % of the whole run's weight, so the session's work before the run doesn't count. */
  cumPct: number
}

export interface CostBreakdown {
  /** Counted from the transcripts. */
  tokens: { lead: Tokens; agents: Record<string, Tokens> }
  /** Estimated % of the run's cost, by weight; lead plus agents sum to about 100. */
  sharePct: { lead: number; agents: Record<string, number> }
  /** The lead alone, at the first start of each phase (the lead's work blurs between phases: agents overlap and its hand-backs mix them). */
  lead: LeadPoint[]
  /** `sharePct` of the recorded `costUsd`, present once the cost is known. */
  usd?: { total: number; lead: number; agents: Record<string, number> }
}

const round1 = (n: number) => Math.round(n * 10) / 10
const round2 = (n: number) => Math.round(n * 100) / 100

export function breakdown(lead: Request[], agents: { label: string; requests: Request[] }[], marks: Mark[]): CostBreakdown {
  const sum = (rs: Request[]) => rs.reduce((n, r) => n + weightOf(r), 0)
  const byPhase: Record<string, Request[]> = {}
  for (const a of agents) (byPhase[phaseOf(a.label)] ??= []).push(...a.requests)
  const leadWeight = sum(lead)
  const agentWeight = mapValues(byPhase, sum)
  const total = leadWeight + Object.values(agentWeight).reduce((a, b) => a + b, 0)
  const pct = (w: number) => (total ? round1((100 * w) / total) : 0)
  const firsts = marks.filter((m, i) => marks.findIndex((x) => x.phase === m.phase) === i)
  const before = (m: Mark) => lead.filter((r) => r.at <= Date.parse(m.at))
  const origin = firsts[0] ? sum(before(firsts[0])) : 0
  const points = firsts.map((m): LeadPoint => {
    const done = before(m)
    return { ...m, contextK: Math.round(contextOf(done.at(-1) ?? { at: 0, model: '', usage: {} }) / 1000), cumPct: pct(sum(done) - origin) }
  })
  return {
    tokens: { lead: tokensOf(lead), agents: mapValues(byPhase, tokensOf) },
    sharePct: { lead: pct(leadWeight), agents: mapValues(agentWeight, pct) },
    lead: points,
  }
}

/** The shares applied to the run's recorded cost (`get_session`), so dollars add up to what was billed. */
export function anchor(b: CostBreakdown, costUsd: number): CostBreakdown {
  const part = (p: number) => round2((costUsd * p) / 100)
  return { ...b, usd: { total: round2(costUsd), lead: part(b.sharePct.lead), agents: mapValues(b.sharePct.agents, part) } }
}

/** The breakdown of the run in `transcriptPath` (the lead's transcript, with its subagents beside it). */
export function readBreakdown(transcriptPath: string, marks: Mark[]): CostBreakdown {
  const lead = requestsOf(parseTranscript(readFileSync(transcriptPath, 'utf8')))
  const agents = readSubagentJsonls(transcriptPath).map((a) => ({ label: a.label, requests: requestsOf(parseTranscript(a.jsonl)) }))
  return breakdown(lead, agents, marks)
}
