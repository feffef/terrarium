// Proof that a review ran in this session, for `merge-pr.ts`'s `Reviewed:`
// check (#3483); which events count: `docs/agents/pr-workflow.md`, recipe step 5.
import { existsSync, readdirSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { readOrNull } from './commit-trailer.ts'
import { parseTranscript } from './transcript-trace.ts'

const SHA_RE = /\b[0-9a-f]{7,40}\b/gi
const shasIn = (text: unknown): string[] =>
  typeof text === 'string' ? (text.match(SHA_RE) ?? []).map((s) => s.toLowerCase()) : []
/** The shas a `code-review` Skill call's args name, or null for any other
 *  Skill; `review-call-sha-guard.ts` shares it so the two cannot disagree. */
export const reviewCallShas = (input: Record<string, unknown>): string[] | null =>
  /^(?:[\w-]+:)?code-review$/.test(String(input.skill)) ? shasIn(input.args) : null

const COMMAND_RE = /<command-name>\/?(?:[\w-]+:)?code-review<\/command-name>\s*(?:<command-args>([^<]*)<\/command-args>)?/g
const NOTIFICATION_RE =
  /<tool-use-id>([^<]+)<\/tool-use-id>\s*(?:<output-file>([^<]+)<\/output-file>)?[\s\S]*?<result>([\s\S]*?)<\/result>/g
const REVIEWED_HEAD_RE = /"reviewedHead":\s*"([0-9a-f]{7,40})"/g
/** The label `clear-backlog-build` gives a reviewer agent; its test pins the two together. */
export const REVIEWER_LABEL_RE = /^(?:Standards|Spec|Both) .* r\d+$/

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
    const journal = readOrNull(join(runs, run, 'journal.jsonl'))
    for (const rec of parseTranscript(journal ?? '')) {
      if (rec.type === 'started' && typeof rec.agentId === 'string' && REVIEWER_LABEL_RE.test(String(rec.label))) {
        ids.add(rec.agentId)
      }
    }
  }
  return ids
}

/** The shas (lowercase, 7 to 40 hex) a transcript shows a review of. A
 *  workflow's notification cuts its result at about 8000 chars, so a
 *  `clear-backlog-build` round's `reviewedHead` is also read from the full
 *  result in the notification's `<output-file>`. */
export function reviewedShasFromTranscript(
  jsonl: string,
  reviewers: Set<string>,
  readOutput: (path: string) => string | null = readOrNull,
): string[] {
  const found = new Set<string>()
  const buildCalls = new Set<string>()
  const records = parseTranscript(jsonl)
  for (const rec of records) {
    const content = (rec.message as { content?: unknown } | undefined)?.content
    if (rec.type === 'assistant' && Array.isArray(content)) {
      for (const b of content as { type?: string; id?: string; name?: string; input?: Record<string, unknown> }[]) {
        if (b?.type !== 'tool_use') continue
        const input = b.input ?? {}
        if (b.name === 'Skill') reviewCallShas(input)?.forEach((s) => found.add(s))
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
      for (const [, id, outputFile, result] of text.matchAll(NOTIFICATION_RE)) {
        if (!buildCalls.has(id!.trim())) continue
        const full = outputFile ? readOutput(outputFile.trim()) ?? '' : ''
        for (const m of `${result}\n${full}`.matchAll(REVIEWED_HEAD_RE)) found.add(m[1]!.toLowerCase())
      }
    }
  }
  return [...found]
}
