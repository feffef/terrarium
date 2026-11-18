// Issue #3234: `.claude/rules/tenant-glossary.md` loads on the first touch of a
// layer file, so it cannot order a read before that touch (ADR-0029) and the
// Friction Ledger entry `governing-doc-read-after-draft` kept growing. So this
// denies an `Edit` or `Write` under `layers/<tenant>/` until the transcript
// shows `layers/<tenant>/GLOSSARY.md` read in full: a `Read` without offset or
// limit, or a shell read the session trace recognises. A grep or a partial
// read does not count, since the Friction was a glossary only grepped.
// Decisions: the glossary itself is exempt (the harness already makes an Edit
// follow a Read, and a new Tenant has none to read); `tenant.config.ts` and
// code are not, since the rule says the terms apply to them; read-only tools
// are not matched. A subagent is checked against its own transcript, not its
// parent's. Fails open on a missing or unreadable transcript or glossary, and
// on any crash: a wrong block costs more than a missed nit.
//
// Usage:
//   tsx scripts/hooks/tenant-glossary-guard.ts                # hook payload on stdin
//   tsx scripts/hooks/tenant-glossary-guard.ts --dry-run (--input '<payload json>' | --input-file <path>)
//     (the dry run reads the transcript named in the payload; none means allow)
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildDenyOutput, printDryRunResult, prop, readHookPayload, readTranscript, resolveDryRunInput, runGuard } from './hook-io.ts'
import { agentTranscript, extractTrace } from '../session/transcript-trace.ts'
import { buildDocLineIndex } from '../session/shell-reads.ts'
import { root } from '../lib/cli.ts'

const LABEL = 'tenant-glossary guard'
const REF = 'issue #3234'

/** The Tenant glossary governing a write to `path`, or null when none does. */
export function glossaryFor(path: unknown): string | null {
  if (typeof path !== 'string') return null
  const m = /(?:^|\/)layers\/([^/]+)\/(.+)$/.exec(path)
  if (!m || m[2] === 'GLOSSARY.md') return null
  return `layers/${m[1]}/GLOSSARY.md`
}

const isReadOf = (doc: string, p: unknown) => typeof p === 'string' && (p === doc || p.endsWith(`/${doc}`))

export function readInFull(records: Record<string, unknown>[], doc: string, text: string): boolean {
  const whole = records.some((r) => [prop(prop(r, 'message'), 'content')].flat().some((b) => prop(b, 'type') === 'tool_use'
    && prop(b, 'name') === 'Read' && prop(prop(b, 'input'), 'offset') === undefined && prop(prop(b, 'input'), 'limit') === undefined
    && isReadOf(doc, prop(prop(b, 'input'), 'file_path'))))
  return whole || extractTrace(records, process.env, buildDocLineIndex([{ path: doc, text }])).docsReadViaShell.some((p) => isReadOf(doc, p))
}

export const formatGuardMessage = (doc: string) =>
  `Blocked by the ${LABEL} (${REF}): read \`${doc}\` in full (.claude/rules/tenant-glossary.md), then retry this call unchanged.`

function decide(payload: unknown): string | null {
  const doc = glossaryFor(prop(prop(payload, 'tool_input'), 'file_path'))
  const parent = prop(payload, 'transcript_path')
  if (!doc || typeof parent !== 'string' || !existsSync(join(root, doc))) return null
  const agent = prop(payload, 'agent_id')
  const records = readTranscript(agent === undefined ? parent : agentTranscript(parent, String(agent)))
  if (!records) return null
  return readInFull(records, doc, readFileSync(join(root, doc), 'utf8')) ? null : formatGuardMessage(doc)
}

function main(): void {
  const read = readHookPayload()
  if (read.kind !== 'ok') return
  const message = decide(read.payload)
  if (message) process.stdout.write(JSON.stringify(buildDenyOutput(message)))
}

const dryRun = (argv: string[]) => printDryRunResult({ decision: decide(resolveDryRunInput(argv)) ? 'deny' : 'allow' })

runGuard(import.meta.url, { main, dryRun, label: LABEL, ref: REF, failOpen: true })
