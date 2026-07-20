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
// `skillsUsed` has two derived sources: `Skill` tool_use blocks, and slash-command
// expansions in user turns (`<command-name>`). The second exists because a Skill
// invoked as `/name` — the shape every Routine-fired session starts with, e.g. the
// nightly `/digest` — is expanded by the harness *before* the model runs, so no
// Skill tool call ever appears in the transcript and tool_use-only derivation
// left every scheduled run's own entry Skill untagged.
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
  /** A human-legible identifier for what fired a Routine-triggered session — the
   *  slash-command name if the first user turn expanded one, else that turn's
   *  first line (issue #449 Gap 1). Populated ONLY for `entrypoint:
   *  'remote_trigger'`; every other session omits it, including one that merely
   *  lacks `remote_trigger`. See `deriveTrigger` for why this is prompt-derived
   *  rather than a dedicated trigger-name/id field. */
  trigger?: string
  startedAt?: string
  endedAt?: string
  durationSec?: number
  models: Record<string, number>
  toolCounts: Record<string, number>
  filesRead: string[]
  filesEdited: string[]
  skillsUsed: string[]
  /** The subset of `skillsUsed` seen only as a slash-command expansion — kept
   *  alongside (not instead of) the union so the stitch can annotate provenance
   *  without consumers having to re-union two lists. */
  commandSkills: string[]
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

/** The marker the harness leaves in a user turn when a slash command ran: the
 *  Skill's instructions are injected at expansion time, so the model is told NOT
 *  to also call the Skill tool — this tag is the only transcript evidence. */
const COMMAND_NAME_RE = /<command-name>([^<]*)<\/command-name>/g

/** A user turn's own text — a plain string, or the `text` blocks of an array.
 *  tool_result blocks are deliberately excluded: a session that Reads another
 *  transcript (log tooling does) would otherwise "invoke" every command in it. */
function userText(content: unknown): string[] {
  if (typeof content === 'string') return [content]
  if (!Array.isArray(content)) return []
  return content
    .filter((b): b is { type: string; text: string } =>
      !!b && typeof b === 'object' && (b as { type?: string }).type === 'text'
      && typeof (b as { text?: unknown }).text === 'string')
    .map((b) => b.text)
}

/** Skill names invoked as slash commands in a user turn (`/digest` → `digest`). */
export function commandSkillNames(content: unknown): string[] {
  const names: string[] = []
  for (const text of userText(content)) {
    for (const m of text.matchAll(COMMAND_NAME_RE)) {
      const name = (m[1] ?? '').trim().replace(/^\//, '')
      if (name) names.push(name)
    }
  }
  return names
}

/** A human-legible identifier for what fired a Routine-triggered session (issue
 *  #449 Gap 1). Data-availability check performed against a live transcript: the
 *  `user` record's own metadata carries only `sessionId`/`cwd`/`gitBranch`/
 *  `entrypoint`/`version`/`timestamp` — no separate trigger name/id field exists
 *  anywhere in the transcript. "The Routine's own prompt lands as the session's
 *  first user turn" (the same source `commandSkillNames` reads) is the only
 *  available signal, so this derives the slash-command name when the first turn
 *  expanded one (the common shape for every chartered Routine), else that turn's
 *  own first line, capped so a long freeform prompt doesn't balloon the log.
 *  Populated ONLY for `entrypoint: 'remote_trigger'` — every other session omits
 *  the field, degrading cleanly rather than surfacing unrelated first-turn text. */
export function deriveTrigger(
  records: Record<string, unknown>[],
  entrypoint: string | undefined,
): string | undefined {
  if (entrypoint !== 'remote_trigger') return undefined
  const first = records.find((r) => r.type === 'user')
  if (!first) return undefined
  const msg = first.message as { content?: unknown } | undefined
  const [name] = commandSkillNames(msg?.content) // reuse the one slash-command extractor
  if (name) return name
  const text = userText(msg?.content).join('\n').trim()
  if (!text) return undefined
  const firstLine = (text.split('\n')[0] ?? '').trim()
  return firstLine ? firstLine.slice(0, 200) : undefined
}

/** Second-precision UTC (`…:SSZ`) — the canonical form the `sessions` schema's
 *  `utcTimestamp` refine requires; `toISOString()`'s millisecond `.000Z` is rejected. */
function toUtcSeconds(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z')
}

/** Index signature so a real `process.env` satisfies this structurally. */
export interface SessionIdEnv {
  CLAUDE_CODE_REMOTE_SESSION_ID?: string
  [key: string]: string | undefined
}

/** `cse_01…` → `session_01…` (issue #387). */
export function normalizeRemoteSessionId(raw: string | undefined): string | undefined {
  const m = raw ? /^cse_(.+)$/.exec(raw) : null
  return m ? `session_${m[1]}` : undefined
}

/** Ground-truth session id: prefer `CLAUDE_CODE_REMOTE_SESSION_ID` (normalized),
 *  else the transcript's own `sessionId` (canonical on a plain local CLI
 *  session). Never the hand-typed authored value — issue #387/#449. */
export function resolveGroundTruthSessionId(
  transcriptSessionId: string | undefined,
  env: SessionIdEnv = process.env,
): string | undefined {
  return normalizeRemoteSessionId(env.CLAUDE_CODE_REMOTE_SESSION_ID) ?? transcriptSessionId
}

/** `claude-opus-4-8` → `Claude Opus 4.8` — the display wording the harness's own
 *  commit template uses for the `Co-Authored-By:` line (ADR-0017). Moved here from
 *  `log-session.ts` (issue #346) so the direct-to-`main` log-commit footer and the
 *  commit-msg footer guard (`provenance-footer.ts`) share one formatter, never fork it. */
export function formatModelId(id: string): string {
  const m = /^claude-([a-z]+)-(.+)$/.exec(id)
  if (!m) return id
  const family = m[1]!
  const versionParts = m[2]!
  return `Claude ${family[0]!.toUpperCase()}${family.slice(1)} ${versionParts.split('-').join('.')}`
}

/** The busiest model id in a `models` map (model id → assistant-turn count), or
 *  `undefined` for an empty map. Same tiebreak the log-commit footer already used:
 *  highest turn count, then lexical id. Single-homed for the footer guard's reuse. */
export function busiestModelId(models: Record<string, number>): string | undefined {
  const entries = Object.entries(models)
  if (entries.length === 0) return undefined
  return entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]![0]
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

/** Derive the mechanical trace from parsed transcript records. Pure — the
 *  testable core. `env` is injectable (defaults to `process.env`). */
export function extractTrace(
  records: Record<string, unknown>[],
  env: SessionIdEnv = process.env,
): MechanicalTrace {
  const stamps: number[] = []
  const models: Record<string, number> = {}
  const toolCounts: Record<string, number> = {}
  const reads: (string | undefined)[] = []
  const edits: (string | undefined)[] = []
  const skills: (string | undefined)[] = []
  const commandSkills: string[] = []
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
    if (rec.type === 'user') commandSkills.push(...commandSkillNames(content))
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
    session: resolveGroundTruthSessionId(meta.sessionId as string | undefined, env),
    gitBranch: meta.gitBranch as string | undefined,
    entrypoint: meta.entrypoint as string | undefined,
    cliVersion: meta.version as string | undefined,
    trigger: deriveTrigger(records, meta.entrypoint as string | undefined),
    startedAt: started !== undefined ? toUtcSeconds(started) : undefined,
    endedAt: ended !== undefined ? toUtcSeconds(ended) : undefined,
    durationSec: started !== undefined && ended !== undefined ? Math.round((ended - started) / 1000) : undefined,
    models,
    toolCounts,
    filesRead: dedup(reads).filter(isContentPath).map(rel),
    filesEdited: dedup(edits).filter(isContentPath).map(rel),
    skillsUsed: dedup([...skills, ...commandSkills]),
    commandSkills: dedup(commandSkills),
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

/** The reason for a folded-in `skillsUsed` entry observed only as a slash-command
 *  expansion (see `commandSkillNames`) — the shape of every Routine-fired run. It
 *  doubles as the explanation for why `toolCounts` shows no `Skill` call for it. */
export const DERIVED_REASON_COMMAND = '(invoked as a slash command)'

/** The interpretive half the live agent writes to the scratch during the session.
 *  Timings/models/etc. are NOT here — those are derived. `session`/`kind` are the
 *  only identity fields the agent must supply; everything mechanical comes from
 *  the trace. */
export interface AuthoredScratch {
  session: string
  kind?: 'interactive' | 'delegated' | 'autonomous'
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
    // trace.session is already ground-truth-resolved; wins over authored.
    session: trace.session || authored.session,
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
    skillsUsed: mergeRefs(authored.skillsUsed ?? [], trace.skillsUsed, 'name', (name) =>
      trace.commandSkills.includes(name) ? DERIVED_REASON_COMMAND : DERIVED_REASON,
    ),
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
  if (trace.trigger) entry.trigger = trace.trigger
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
