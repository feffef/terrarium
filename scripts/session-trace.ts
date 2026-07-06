// The session-trace extractor (ADR-0009 amendment): the deterministic half of a
// session log. It reads a Claude session's transcript jsonl and derives the
// MECHANICAL trace — timings, models, tool counts, files read/edited, subagents,
// and provenance — purely from the recorded tool calls. Nothing here is
// self-reported: it is the reliable ground truth the authored half (summary,
// frictions) cannot provide, and the SessionEnd handler stitches the two.
//
// The extraction is a pure function over parsed records (unit-tested); the file
// IO is a thin shell. Read-tool paths are the only source of `filesRead` — a
// `cat`/`grep` inspection is invisible here by design (see the ADR amendment).
//
// Usage:  tsx scripts/session-trace.ts <transcript.jsonl>
//   Prints the derived trace as JSON.
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/** One entry the extractor folds into `docsRead`/`skillsUsed`; `reason` is absent
 *  for derived entries (the agent supplies reasons, the transcript does not). */
export interface DerivedRef {
  path?: string
  name?: string
  source: 'derived'
}

export interface SubagentRef {
  type?: string
  task?: string
  model?: string
}

/** The mechanical trace — every field derived, none self-reported. Shapes match
 *  the optional `sessions` fields (tenant.config.ts) the stitch will populate. */
export interface MechanicalTrace {
  session?: string
  gitBranch?: string
  entrypoint?: string
  cliVersion?: string
  startedAt?: string
  endedAt?: string
  durationSec?: number
  models: Record<string, number>
  toolCounts: Record<string, number>
  filesRead: string[]
  filesEdited: string[]
  skillsUsed: string[]
  subagents: SubagentRef[]
  prSignals: string[]
}

const EDIT_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit'])

/** Paths that are never "docs read" — harness scratch, build output, deps, git
 *  internals. Filtered so the mechanical half doesn't drown the curated list. */
const NOISE = [/\/node_modules\//, /\/\.nuxt\//, /\/\.output\//, /\/\.git\//, /\/scratchpad\//, /^\/tmp\//]
export function isContentPath(p: string | undefined): p is string {
  return typeof p === 'string' && p.length > 0 && !NOISE.some((re) => re.test(p))
}

function dedup(xs: (string | undefined)[]): string[] {
  return [...new Set(xs.filter((x): x is string => !!x))]
}

/** Parse a transcript jsonl into records, skipping unparseable lines. */
export function parseTranscript(jsonl: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []
  for (const line of jsonl.split('\n')) {
    if (!line.trim()) continue
    try {
      out.push(JSON.parse(line))
    } catch {
      /* tolerate a torn final line */
    }
  }
  return out
}

/** Derive the mechanical trace from parsed transcript records. Pure — the testable core. */
export function extractTrace(records: Record<string, unknown>[]): MechanicalTrace {
  const stamps: number[] = []
  const models: Record<string, number> = {}
  const toolCounts: Record<string, number> = {}
  const reads: (string | undefined)[] = []
  const edits: (string | undefined)[] = []
  const skills: (string | undefined)[] = []
  const subagents: SubagentRef[] = []
  const prSignals: string[] = []

  for (const rec of records) {
    const ts = typeof rec.timestamp === 'string' ? Date.parse(rec.timestamp) : NaN
    if (!Number.isNaN(ts)) stamps.push(ts)

    const msg = rec.message as { content?: unknown; model?: string } | undefined
    if (rec.type === 'assistant' && msg?.model) {
      models[msg.model] = (models[msg.model] ?? 0) + 1
    }

    const content = msg?.content
    if (!Array.isArray(content)) continue
    for (const block of content) {
      if (!block || typeof block !== 'object') continue
      const b = block as { type?: string; name?: string; input?: Record<string, unknown> }
      if (b.type !== 'tool_use') continue
      const name = b.name ?? '?'
      const input = b.input ?? {}
      toolCounts[name] = (toolCounts[name] ?? 0) + 1

      if (name === 'Read') reads.push(input.file_path as string)
      else if (EDIT_TOOLS.has(name)) edits.push(input.file_path as string)
      else if (name === 'Skill') skills.push((input.skill ?? input.command) as string)
      else if (name === 'Agent' || name === 'Task') {
        subagents.push({
          type: input.subagent_type as string,
          task: input.description as string,
          model: input.model as string | undefined,
        })
      } else if (name.includes('create_pull_request')) {
        prSignals.push((input.title as string) ?? '(pr)')
      }

      if (name === 'Bash') {
        const cmd = (input.command as string) ?? ''
        if (cmd.includes('git push') || cmd.includes('pr create')) {
          prSignals.push(`(bash) ${cmd.slice(0, 60)}`)
        }
      }
    }
  }

  const meta = records.find((r) => r.type === 'user' || r.type === 'assistant') ?? {}
  const started = stamps.length ? Math.min(...stamps) : undefined
  const ended = stamps.length ? Math.max(...stamps) : undefined

  return {
    session: meta.sessionId as string | undefined,
    gitBranch: meta.gitBranch as string | undefined,
    entrypoint: meta.entrypoint as string | undefined,
    cliVersion: meta.version as string | undefined,
    startedAt: started !== undefined ? new Date(started).toISOString() : undefined,
    endedAt: ended !== undefined ? new Date(ended).toISOString() : undefined,
    durationSec: started !== undefined && ended !== undefined ? Math.round((ended - started) / 1000) : undefined,
    models,
    toolCounts,
    filesRead: dedup(reads).filter(isContentPath),
    filesEdited: dedup(edits).filter(isContentPath),
    skillsUsed: dedup(skills),
    subagents,
    prSignals,
  }
}

function main(): void {
  const [path] = process.argv.slice(2)
  if (!path) {
    console.error('usage: tsx scripts/session-trace.ts <transcript.jsonl>')
    process.exit(1)
  }
  const trace = extractTrace(parseTranscript(readFileSync(path, 'utf8')))
  console.log(JSON.stringify(trace, null, 2))
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
