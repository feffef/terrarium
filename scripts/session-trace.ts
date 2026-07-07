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
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

/** The one authored-scratch file per container (one session per container in the
 *  remote model). Gitignored — its home is `main`, written by the `--author` mode
 *  of log-session.ts and consumed by the SessionEnd handler. Single-homed here so
 *  both agree without a circular import. Repo-relative; each caller joins its root. */
export const SCRATCH_DIR = '.session-logs'
export const SCRATCH_FILE = join(SCRATCH_DIR, 'pending.scratch.json')

/** Where the log lands from before it is pushed: a gitignored staging copy, never
 *  the working tree. `absPath` is only a byte source for `git hash-object` (the
 *  commit's tree location is the separate `relPath`), so the tree never holds an
 *  untracked session log — a frozen-network push failure leaves nothing outside
 *  gitignored `.session-logs/` for a stray `git add -A` to sweep into a PR (#148). */
export const STAGING_DIR = join(SCRATCH_DIR, 'staged')

/** The gitignored sentinel recording the last scratch we landed: `{ scratchHash,
 *  relPath }`. The landing gate keys on the *authored scratch* changing, not the
 *  stitched output — the derived trace grows every turn, so an output-keyed gate
 *  would push on every turn after closure. Same home as the scratch, so it is
 *  durable across container reclaim and the resume flush sees it (#148). */
export const LAST_LANDED_FILE = join(SCRATCH_DIR, 'last-landed.json')

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

/** Second-precision UTC (`…:SSZ`) — the canonical form the `sessions` schema's
 *  `utcTimestamp` refine requires; `toISOString()`'s millisecond `.000Z` is rejected. */
function toUtcSeconds(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z')
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

  // Relativize repo paths to match how the agent cites them (`docs/adr/…`, not
  // `/home/user/terrarium/docs/adr/…`) so the stitch dedups a curated entry
  // against its observed twin instead of listing the file twice. Applied AFTER
  // the noise filter, which keys on absolute paths. Reads outside the repo stay
  // absolute — honestly flagging an external file.
  const cwd = typeof meta.cwd === 'string' ? meta.cwd : ''
  const rel = (p: string): string => (cwd && p.startsWith(cwd + '/') ? p.slice(cwd.length + 1) : p)

  return {
    session: meta.sessionId as string | undefined,
    gitBranch: meta.gitBranch as string | undefined,
    entrypoint: meta.entrypoint as string | undefined,
    cliVersion: meta.version as string | undefined,
    startedAt: started !== undefined ? toUtcSeconds(started) : undefined,
    endedAt: ended !== undefined ? toUtcSeconds(ended) : undefined,
    durationSec: started !== undefined && ended !== undefined ? Math.round((ended - started) / 1000) : undefined,
    models,
    toolCounts,
    filesRead: dedup(reads).filter(isContentPath).map(rel),
    filesEdited: dedup(edits).filter(isContentPath).map(rel),
    skillsUsed: dedup(skills),
    subagents,
    prSignals,
  }
}

// ── Stitch ────────────────────────────────────────────────────────────────

/** The reason a transcript-observed read/skill carries when the agent never
 *  annotated it — the lightweight marker of a mechanically-folded-in entry
 *  (ADR-0009). */
export const DERIVED_REASON = '(no reason given)'

/** The reason for a folded-in `docsRead` entry whose path also appears in
 *  `filesEdited`. The Edit tool (and Write-on-an-existing-file) refuses to run
 *  unless the path was `Read` first in the same session — so for these paths
 *  the read wasn't unexplained, it was a harness-enforced precondition of the
 *  edit. Worded as "before", not "required for", because the trace is derived
 *  from tool_use calls, not results: a Read attempted against a not-yet-created
 *  path still lands in `filesRead` even though it errored and read nothing. */
export const DERIVED_REASON_EDITED = '(read before editing)'

/** The interpretive half the live agent writes to the scratch during the session.
 *  Timings/models/etc. are NOT here — those are derived. `session`/`kind` are the
 *  only identity fields the agent must supply; everything mechanical comes from
 *  the trace. */
export interface AuthoredScratch {
  session: string
  kind?: 'interactive' | 'autonomous'
  goal: string
  status: 'completed' | 'in-review' | 'partial' | 'blocked' | 'abandoned'
  outcome: string
  summary: string
  prs?: string[]
  docsRead?: { path: string; reason: string }[]
  skillsUsed?: { name: string; reason: string }[]
  frictions: { description: string; solution: string; severity: string }[]
  learnings?: string[]
  ideas?: string[]
}

function mergeRefs<T extends Record<string, string>>(
  authored: T[],
  derivedKeys: string[],
  keyField: 'path' | 'name',
  reasonFor: (key: string) => string = () => DERIVED_REASON,
): T[] {
  const seen = new Set(authored.map((a) => a[keyField]))
  const folded = derivedKeys
    .filter((k) => !seen.has(k))
    .map((k) => ({ [keyField]: k, reason: reasonFor(k) }) as unknown as T)
  return [...authored, ...folded]
}

/** Combine the authored scratch with the derived trace into a full session-log
 *  entry. Pure — the testable core of the stitch. Mechanical fields come only
 *  from `trace`; `docsRead`/`skillsUsed` union the curated entries with observed
 *  reads (folded in with a placeholder reason). Empty mechanical collections are
 *  dropped so a minimal session stays clean. */
export function stitch(authored: AuthoredScratch, trace: MechanicalTrace): Record<string, unknown> {
  const editedSet = new Set(trace.filesEdited)
  const entry: Record<string, unknown> = {
    schemaVersion: 1,
    session: authored.session,
    startedAt: trace.startedAt,
    endedAt: trace.endedAt,
    kind: authored.kind ?? 'interactive',
    goal: authored.goal,
    status: authored.status,
    outcome: authored.outcome,
    summary: authored.summary,
    prs: authored.prs ?? [],
    docsRead: mergeRefs(authored.docsRead ?? [], trace.filesRead, 'path', (path) =>
      editedSet.has(path) ? DERIVED_REASON_EDITED : DERIVED_REASON,
    ),
    skillsUsed: mergeRefs(authored.skillsUsed ?? [], trace.skillsUsed, 'name'),
    frictions: authored.frictions,
  }
  // Mechanical fields — include only when they carry signal.
  if (trace.durationSec !== undefined) entry.durationSec = trace.durationSec
  if (Object.keys(trace.models).length) entry.models = trace.models
  if (Object.keys(trace.toolCounts).length) entry.toolCounts = trace.toolCounts
  if (trace.filesEdited.length) entry.filesEdited = trace.filesEdited
  if (trace.subagents.length) entry.subagents = trace.subagents
  if (trace.gitBranch) entry.gitBranch = trace.gitBranch
  if (trace.entrypoint) entry.entrypoint = trace.entrypoint
  if (trace.cliVersion) entry.cliVersion = trace.cliVersion
  // Optional authored fields — carried only when the session actually noted one,
  // never emitted empty (matching their `.optional()` schema, so a bare log has
  // no dangling `learnings: []`).
  if (authored.learnings?.length) entry.learnings = authored.learnings
  if (authored.ideas?.length) entry.ideas = authored.ideas
  return entry
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
