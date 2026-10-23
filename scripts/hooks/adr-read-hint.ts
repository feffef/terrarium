// A hint, not a guard (ADR-0029, issue #2286): a summary rule says when to read
// its ADR in full, but sessions edited what an ADR governs without reading it.
// After an Edit or Write this points to each ADR whose rule `paths` match the
// file, or that the old or new text names, unless this agent's own transcript
// shows it read in full (the session log's test, `adrReadInFull`) or already
// holds its pointer. The text match skips Tenant content and session logs,
// where ADR numbers are quoted, not acted on. It arrives after the write, so a
// closing line says a late read that clears the edit is not a Friction. A
// subagent or workflow agent is checked against its own transcript; with no
// transcript it adds nothing, since every edit would repeat the pointer.
// Bash writes are not seen. Fails open: any error adds nothing.
// `scripts/hooks/adr-read-hint.sh` is the hot-path pre-filter.
//
// Usage:
//   tsx scripts/hooks/adr-read-hint.ts                # hook payload on stdin
//   tsx scripts/hooks/adr-read-hint.ts --dry-run (--input '<payload json>' | --input-file <path>)
//     (with no transcript_path, the dry run assumes an empty transcript)
import { readdirSync } from 'node:fs'
import { isAbsolute, join, matchesGlob, relative } from 'node:path'
import { printDryRunResult, prop, readHookPayload, readTranscript, resolveDryRunInput, runGuard } from './hook-io.ts'
import { repoRoot } from './bash-rules-hint.ts'
import { adrReadInFull, agentTranscript, hintText, loadDocLineIndex } from '../session/transcript-trace.ts'
import type { DocLineIndex } from '../session/shell-reads.ts'
import { ADR_DIR, adrDocNumber, adrHintLine, adrHintsIn, loadRules, RULES_DIR, ruleAdr, rulePaths, type AdrHintVia, type RuleFile } from '../lib/adr-rules.ts'

export interface AdrHit {
  adr: string
  via: AdrHintVia
}

const NO_TEXT_MATCH = ['layers/*/content/**', '.session-logs/**', '.throwaway/**']

/** The ADRs a write to repo-relative `file` touches, path matches first.
 *  `adrs` maps each ADR number to its file; any other number is dropped. */
export function adrsForWrite(file: string, texts: string[], rules: RuleFile[], adrs: Map<string, string>): AdrHit[] {
  const hits = new Map<string, AdrHintVia>()
  const add = (n: string | undefined, via: AdrHintVia) => {
    if (n && adrs.has(n) && !hits.has(n)) hits.set(n, via)
  }
  for (const r of rules) {
    if (rulePaths(r.text).some((g) => matchesGlob(file, g))) add(ruleAdr(r.file), 'path')
  }
  if (!NO_TEXT_MATCH.some((g) => matchesGlob(file, g))) {
    add(adrDocNumber(file), 'text')
    for (const m of texts.join('\n').matchAll(/\bADR-(\d{4})\b/g)) add(m[1], 'text')
  }
  return [...hits].map(([adr, via]) => ({ adr, via }))
}

export const LATE_READ_NOTE = 'If the ADR shows the edit was already right, the late read is not a Friction.'

/** ADRs this transcript already pointed to. */
const pointedTo = (records: Record<string, unknown>[]) => new Set(records
  .map((r) => r.attachment as { type?: string; content?: unknown } | undefined)
  .filter((a) => a?.type === 'hook_additional_context')
  .flatMap((a) => adrHintsIn(hintText(a!.content)).map((h) => h.adr)))

function hintFor(payload: unknown, dryRun = false): string | null {
  const input = prop(payload, 'tool_input')
  const filePath = prop(input, 'file_path')
  const root = repoRoot(String(prop(payload, 'cwd') ?? process.cwd()))
  if (typeof filePath !== 'string' || !root) return null
  const file = relative(root, filePath).replace(/^\.claude\/worktrees\/[^/]+\//, '')
  if (file.startsWith('..') || isAbsolute(file)) return null
  const adrs = new Map(readdirSync(join(root, ADR_DIR)).map((f) => `${ADR_DIR}/${f}`).flatMap((p) => adrDocNumber(p) ? [[adrDocNumber(p)!, p] as const] : []))
  const texts = ['old_string', 'new_string', 'content'].map((k) => prop(input, k)).filter((t): t is string => typeof t === 'string')
  const hits = adrsForWrite(file, texts, loadRules(join(root, RULES_DIR)), adrs)
  if (hits.length === 0) return null
  const parent = prop(payload, 'transcript_path')
  const agent = prop(payload, 'agent_id')
  let records: Record<string, unknown>[] | null
  if (typeof parent !== 'string') records = dryRun && parent === undefined ? [] : null
  else records = readTranscript(agent === undefined ? parent : agentTranscript(parent, String(agent)))
  if (!records) return null
  const pointed = pointedTo(records)
  // The session log's index, so a shell read counts the same in both; built
  // only when a Read hasn't settled it, since it reads the whole checkout.
  let index: DocLineIndex | undefined
  const due = hits.filter((h) => !pointed.has(h.adr) && !adrReadInFull(records, h.adr) && !adrReadInFull(records, h.adr, (index ??= loadDocLineIndex(root))))
  if (due.length === 0) return null
  return `${adrHintLine(due.map((h) => ({ ...h, doc: adrs.get(h.adr)!, file })))}\n${LATE_READ_NOTE}`
}

function main(): void {
  const read = readHookPayload()
  if (read.kind !== 'ok') return
  const hint = hintFor(read.payload)
  if (hint) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: hint } }))
}

function dryRun(argv: string[]): void {
  printDryRunResult({ hint: hintFor(resolveDryRunInput(argv), true) })
}

runGuard(import.meta.url, { main, dryRun, label: 'ADR read hint', ref: 'issue #2286', failOpen: true })
