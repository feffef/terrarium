// What a session's own transcript proves about review (#3483): `merge-pr.ts`
// accepts a `Reviewed: <sha>` line only when a review that named <sha> ran in
// the merging session. Counted events: a `code-review` Skill call (tool call or
// slash command) whose args name the sha, a `clear-backlog-build` review
// round's `reviewedHead`, and a `SendMessage` naming the sha to one of that
// run's reviewer agents. A plain `Agent` reviewer does not count.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { parseTranscript } from './transcript-trace.ts'

const SHA_RE = /\b[0-9a-f]{7,40}\b/gi
const shasIn = (text: unknown): string[] =>
  typeof text === 'string' ? (text.match(SHA_RE) ?? []).map((s) => s.toLowerCase()) : []

/** Slash-command expansion: `<command-name>/code-review</command-name>` then its args. */
const COMMAND_RE = /<command-name>\/?(?:[\w-]+:)?code-review<\/command-name>\s*(?:<command-args>([^<]*)<\/command-args>)?/g
const NOTIFICATION_RE = /<tool-use-id>([^<]+)<\/tool-use-id>[\s\S]*?<result>([\s\S]*?)<\/result>/g
const REVIEWED_HEAD_RE = /"reviewedHead":"([0-9a-f]{7,40})"/g
/** The journal label `clear-backlog-build` gives a reviewer: `<axis> <branch> r<n>`. */
const REVIEWER_LABEL_RE = /^(?:Standards|Spec|Both) .* r\d+$/

function* strings(v: unknown): Generator<string> {
  if (typeof v === 'string') yield v
  else if (Array.isArray(v)) for (const x of v) yield* strings(x)
  else if (v && typeof v === 'object') for (const x of Object.values(v)) yield* strings(x)
}

/** Agent ids of the reviewers every workflow run of this session started. */
export function reviewerAgentIds(transcriptPath: string): Set<string> {
  const runs = join(dirname(transcriptPath), basename(transcriptPath, '.jsonl'), 'subagents', 'workflows')
  const ids = new Set<string>()
  if (!existsSync(runs)) return ids
  for (const run of readdirSync(runs)) {
    let journal: string
    try {
      journal = readFileSync(join(runs, run, 'journal.jsonl'), 'utf8')
    } catch {
      continue
    }
    for (const rec of parseTranscript(journal)) {
      if (rec.type === 'started' && typeof rec.agentId === 'string' && REVIEWER_LABEL_RE.test(String(rec.label))) {
        ids.add(rec.agentId)
      }
    }
  }
  return ids
}

/** The shas (lowercase, 7 to 40 hex) a transcript shows a review of. */
export function reviewedShasFromTranscript(jsonl: string, reviewers: Set<string>): string[] {
  const found = new Set<string>()
  const buildCalls = new Set<string>()
  const records = parseTranscript(jsonl)
  for (const rec of records) {
    const content = (rec.message as { content?: unknown } | undefined)?.content
    if (rec.type === 'assistant' && Array.isArray(content)) {
      for (const b of content as { type?: string; id?: string; name?: string; input?: Record<string, unknown> }[]) {
        if (b?.type !== 'tool_use') continue
        const input = b.input ?? {}
        if (b.name === 'Skill' && /^(?:[\w-]+:)?code-review$/.test(String(input.skill))) shasIn(input.args).forEach((s) => found.add(s))
        else if (b.name === 'Workflow' && input.name === 'clear-backlog-build' && b.id) buildCalls.add(b.id)
        else if (b.name === 'SendMessage' && reviewers.has(String(input.to))) shasIn(input.message).forEach((s) => found.add(s))
      }
    }
    // A tool_result is excluded: a session that reads another transcript would "run" its commands.
    if (rec.type === 'user') {
      const blocks = typeof content === 'string' ? [content] : Array.isArray(content) ? content : []
      for (const b of blocks) {
        const text = typeof b === 'string' ? b : (b as { type?: string; text?: string })?.type === 'text' ? (b as { text: string }).text : ''
        for (const m of text.matchAll(COMMAND_RE)) shasIn(m[1]).forEach((s) => found.add(s))
      }
    }
  }
  if (buildCalls.size === 0) return [...found]
  for (const rec of records) {
    for (const text of strings(rec)) {
      for (const n of text.matchAll(NOTIFICATION_RE)) {
        if (!buildCalls.has(n[1]!.trim())) continue
        for (const m of n[2]!.matchAll(REVIEWED_HEAD_RE)) found.add(m[1]!.toLowerCase())
      }
    }
  }
  return [...found]
}

/** Reviewed shas of the transcript at `path`; null when it cannot be read. */
export function reviewedShasFromFile(path: string | null): string[] | null {
  if (path === null) return null
  try {
    return reviewedShasFromTranscript(readFileSync(path, 'utf8'), reviewerAgentIds(path))
  } catch {
    return null
  }
}
