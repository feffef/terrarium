// The session-log lander (ADR-0009): the single enforcement point of the
// "session logs commit directly to `main`" boundary, and the only module that
// lands one. It validates the authored half, stitches it with the mechanical
// trace (derived by session-trace.ts), and commits *that one file* to `main`
// without a PR — never the session's other, possibly uncommitted, working-copy
// changes. `session-end.ts` merged in here (issue #865): authoring and landing
// were one flow split across two files.
//
// Three hook registrations in `.claude/settings.json` call `--land`, each with
// the hook payload on stdin: `Stop` (primary), `SessionEnd` and `SessionStart`
// matcher `resume` (fallbacks). ADR-0009's "Landing mechanism as shipped"
// section owns why there are three; its 2026-09-05 amendment owns why every
// landing records which one performed it (`landedBy`).
//
// This is gated code: changing it is a normal PR (the exception's boundary is
// itself protected by the gate it steps around). Only the session-log *content*
// it produces travels the direct-to-`main` path.
//
// Usage:
//   tsx scripts/log-session.ts --author <authored.yml>
//       validate the interpretive fields and write the scratch (the
//       model-invocable path; does NOT commit — the hooks do).
//   tsx scripts/log-session.ts --land [--dry-run] [--transcript <p>] [--scratch <p>]
//       the hook path: stitch the scratch with the trace and land it.
//   tsx scripts/log-session.ts <path-to-entry.yml> [--dry-run] [--remote <name>]
//       land a fully-formed entry directly (the original manual path).
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isPair, isScalar, parse as parseYaml, parseDocument, stringify as stringifyYaml, visit } from 'yaml'
import { z } from 'zod'
import { sessionSchema } from '../shared/schemas/session.ts'
import { fetchOriginMain } from './git-helpers.ts'
import { FALLBACK_MODEL, provenanceFooter } from './provenance-footer.ts'
import {
  findSessionIdMismatches,
  formatMismatchError,
  readOwnCommits,
  resolveGroundTruthFromTranscript,
  type SessionIdMismatch,
} from './session-id-guard.ts'
import {
  busiestModelId,
  extractTrace,
  findLatestTranscript,
  foldSubagentTrace,
  formatModelId,
  parseTranscript,
  readSubagentJsonls,
  stitch,
  shellReadScanOf,
  LAST_LANDED_FILE,
  SCRATCH_FILE,
  STAGING_DIR,
  type AuthoredScratch,
  type MechanicalTrace,
  type SessionIdEnv,
} from './session-trace.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** The one directory session logs may live in — the whole of the ADR-0009 scope. */
export const SESSIONS_DIR = 'layers/journal/content/current/sessions'

/** The frozen `sessions` schema (ADR-0009) — the shared `session` collection kind,
 *  single-homed in shared/schemas/session.ts (ADR-0025). The Journal manifest now
 *  references it by `kind`; this validates authored logs against the very same object. */
const sessionsSchema = sessionSchema

/** The `schemaVersion` newly authored logs should carry; evolution policy: ADR-0009. */
export const CURRENT_SESSIONS_SCHEMA_VERSION = 1

export interface SessionEntry {
  session: string
  startedAt: string
  schemaVersion?: number
  [k: string]: unknown
}

/** Validate a parsed entry against the frozen schema. Pure — the testable core.
 *  Timestamps are plain ISO-8601 strings (see the `utcTimestamp` note in the
 *  manifest): the YAML parser hands them over as strings and the schema keeps
 *  them that way, so no Date coercion is needed to match the build's L1 pass. */
export function validateEntry(raw: unknown):
  | { ok: true; data: SessionEntry }
  | { ok: false; errors: string } {
  if (raw === null || typeof raw !== 'object') {
    return { ok: false, errors: 'entry is not a YAML mapping' }
  }
  const res = sessionsSchema.safeParse(raw as Record<string, unknown>)
  if (!res.success) {
    const errors = res.error.issues
      .map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n')
    return { ok: false, errors }
  }
  return { ok: true, data: res.data as SessionEntry }
}

/** The canonical filename an entry must be stored under: `<startedAt-date>-<session>.yml`.
 *  Date prefix gives chronological `stem` order; the full session id is collision-free. */
export function expectedFilename(entry: SessionEntry): string {
  const date = new Date(entry.startedAt).toISOString().slice(0, 10) // YYYY-MM-DD (UTC)
  return `${date}-${entry.session}.yml`
}

// ── Authoring the scratch (ADR-0009 amendment) ──────────────────────────────
// The interpretive half the live agent writes DURING the session (a hook
// cannot prompt). Mechanical fields — timings, models, files, subagents — are
// NOT authored; the landing path derives them from the transcript and stitches.
// This light schema gives the agent early feedback; the authoritative check is
// the full-schema validation run on the stitched entry before landing.
// Enum values mirror the sessions schema (single home: shared/schemas/session.ts).
const authoredScratchSchema = z
  .object({
    session: z.string(),
    kind: z.enum(['interactive', 'delegated', 'autonomous']).optional(),
    goal: z.string(),
    status: z.enum(['completed', 'in-review', 'partial', 'blocked', 'abandoned']),
    outcome: z.string(),
    summary: z.string(),
    prs: z.array(z.string()).optional(),
    docsRead: z.array(z.object({ path: z.string(), reason: z.string() })).optional(),
    skillsUsed: z.array(z.object({ name: z.string(), reason: z.string() })).optional(),
    frictions: z.array(
      z.object({
        description: z.string(),
        solution: z.string(),
        severity: z.enum(['nit', 'minor', 'moderate', 'major', 'blocker']),
      }),
    ),
    // Optional authored fields (single home: the manifest) — omit when empty.
    learnings: z.array(z.string()).optional(),
    ideas: z.array(z.string()).optional(),
  })
  .strict()

/** Derived-only fields an agent might reach for, with the reason each is refused.
 *  `.strict()` would reject them anyway, as an anonymous "Unrecognized key" — this
 *  names the rule instead, because the correct next action is not obvious from the
 *  generic error (issue #1074). */
const DERIVED_ONLY_FIELDS: Record<string, string> = {
  docsReadViaShell:
    'it is derived from the transcript and an agent may not correct it. If the detected list is wrong, ' +
    "log a Friction instead — severity at least 'moderate', with the marker SHELL-READ-DETECTION, the " +
    'command verbatim, the path expected, and whether it was a miss or a false positive.',
}

export function validateAuthored(
  raw: unknown,
): { ok: true; data: AuthoredScratch } | { ok: false; errors: string } {
  if (raw !== null && typeof raw === 'object') {
    for (const [field, why] of Object.entries(DERIVED_ONLY_FIELDS)) {
      if (field in (raw as Record<string, unknown>)) {
        return { ok: false, errors: `  ${field}: cannot be authored — ${why}` }
      }
    }
  }
  const res = authoredScratchSchema.safeParse(raw)
  if (!res.success) {
    const errors = res.error.issues
      .map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n')
    return { ok: false, errors }
  }
  return { ok: true, data: res.data as AuthoredScratch }
}

/** A scalar value the YAML parser silently truncated at an unquoted `#`. The lost
 *  text survives on the parsed node's `.comment`, so the *full* value the agent
 *  meant is recoverable — `keyPath` locates it, `value` is what landed, `full` is
 *  what to quote instead. */
export interface TruncatedScalar {
  keyPath: string
  value: string
  full: string
}

/** Catch the recurring silent-truncation footgun the `log-session` Skill warns about
 *  ("Quote any scalar value containing `#`"): an unquoted scalar containing ` #`
 *  parses as the text before it, with everything after dropped as a YAML comment —
 *  `outcome: PR #354 merged` becomes just `PR`. Documentation alone hasn't held
 *  (issue: this branch), so the parse step fails loudly instead. The `yaml` parser
 *  keeps the dropped span on the node's `.comment`, letting us both detect it and
 *  report the intended value. Block scalars (`>-`/`|`) are unaffected — a `#` inside
 *  them is literal and carries no `.comment` — so summaries never false-positive. */
export function findTruncatedScalars(yamlText: string): TruncatedScalar[] {
  let doc: ReturnType<typeof parseDocument>
  try {
    doc = parseDocument(yamlText)
  } catch {
    return [] // a genuine parse error is surfaced by the caller's parseYaml step
  }
  const found: TruncatedScalar[] = []
  visit(doc, {
    Scalar(_key, node, path) {
      const dropped = typeof node.comment === 'string' ? node.comment.trim() : ''
      if (!dropped) return
      const keys: string[] = []
      for (const ancestor of path) {
        if (isPair(ancestor) && isScalar(ancestor.key)) keys.push(String(ancestor.key.value))
      }
      found.push({ keyPath: keys.join('.') || '(root)', value: String(node.value), full: `${node.value} #${dropped}` })
    },
  })
  return found
}

/** Human-readable rejection for a set of truncated scalars, quoting the recovered
 *  full value so the agent can paste it straight back in quoted. */
function truncationError(hits: TruncatedScalar[]): string {
  const lines = hits.map((h) => `  ${h.keyPath}: parsed as "${h.value}" — an unquoted \`#\` dropped the rest. Quote it: ${JSON.stringify(h.full)}`)
  return `authored YAML has value(s) truncated at an unquoted '#':\n${lines.join('\n')}`
}

/** Dedup identity for a friction: the authored shape carries no explicit id
 *  (issue #688's design allows adding one, in shared/schemas/session.ts). */
function frictionKey(f: AuthoredScratch['frictions'][number]): string {
  return `${f.description}::${f.severity}`
}

const union = (a: string[] = [], b: string[] = []): string[] => [...new Set([...a, ...b])]

/** Merge a second authoring pass with the first's scratch instead of erasing it
 *  (issue #688). Lists union; prose takes `incoming`, the more current account.
 *  A scratch left by a DIFFERENT session is replaced, not merged: the scratch is
 *  one fixed path per checkout and nothing deletes it. */
export function mergeAuthored(existing: AuthoredScratch | undefined, incoming: AuthoredScratch): AuthoredScratch {
  if (!existing || existing.session !== incoming.session) return incoming
  const seen = new Set(existing.frictions.map(frictionKey))
  return {
    ...incoming,
    frictions: [...existing.frictions, ...incoming.frictions.filter((f) => !seen.has(frictionKey(f)))],
    prs: union(existing.prs, incoming.prs),
    learnings: union(existing.learnings, incoming.learnings),
    ideas: union(existing.ideas, incoming.ideas),
  }
}

/** Write the authored scratch to its canonical, gitignored home. Its existence is
 *  the wrap-up signal the landing path gates on; re-authoring merges with
 *  whatever pass came before it in this same session (issue #688). */
export function writeScratch(authored: AuthoredScratch, scratchAbs: string): void {
  mkdirSync(dirname(scratchAbs), { recursive: true })
  let existing: AuthoredScratch | undefined
  if (existsSync(scratchAbs)) {
    try {
      existing = JSON.parse(readFileSync(scratchAbs, 'utf8')) as AuthoredScratch
    } catch {
      existing = undefined // a corrupt or partial scratch is treated as absent, never blocking re-authoring
    }
  }
  writeFileSync(scratchAbs, JSON.stringify(mergeAuthored(existing, authored), null, 2))
}

/** True when `cwd` sits inside a LINKED git worktree — a checkout created by
 *  `git worktree add`, distinct from the repo's main/primary working tree — used
 *  to mechanically reinforce the "orchestrator is the sole log author" rule
 *  (issue #449 Gap 4): a dispatched worktree-isolated subagent shares the
 *  orchestrator's session id and this script's shared scratch path, so its own
 *  `--author` invocation would silently clobber the orchestrator's log (the
 *  incident that motivated this: two parallel impl agents in session
 *  session_01DN8mXooaRUA3NGWkyHKWwT, 2026-07-08). `git rev-parse --git-dir`
 *  resolves to `<main-repo>/.git/worktrees/<name>` inside a linked worktree,
 *  while `--git-common-dir` still resolves to the one shared `<main-repo>/.git`
 *  — the two diverge only there, giving a purely mechanical signal that needs
 *  no cooperation from the calling agent. Fails open (false) on any git error
 *  (not a repo, git unavailable) — never blocks authoring over an unrelated
 *  problem.
 *
 *  Two known limits, both acknowledged rather than hidden (CLAUDE.md: "pick
 *  whichever is mechanically sound given how a dispatched subagent can (or
 *  cannot) reliably detect it is not the orchestrator" — this is a partial,
 *  not complete, reinforcement):
 *  - Can't tell a dispatched subagent's worktree apart from the orchestrator's
 *    own EnterWorktree-based single-session worktree (mechanism 1, CLAUDE.md)
 *    — that legitimate, non-concurrent case must pass `--allow-worktree`.
 *  - Only catches a subagent that actually invokes this script FROM WITHIN its
 *    own worktree directory. A dispatched subagent's Bash tool does not
 *    preserve cwd across separate tool calls (CLAUDE.md), so one that forgets
 *    the `cd <worktree-root> &&` prefix on its own `log-session --author` call
 *    runs from the orchestrator's shared root instead — `cwd` there is
 *    genuinely not a linked worktree, so this check can't distinguish that
 *    invocation from the orchestrator's own. Mitigating that residual case
 *    needs a signal this script has no visibility into (e.g. a harness-level
 *    subagent marker), not a git-worktree check. */
export function isLinkedWorktree(cwd: string): boolean {
  try {
    const gitDir = execFileSync('git', ['rev-parse', '--git-dir'], { cwd, encoding: 'utf8' }).trim()
    const commonDir = execFileSync('git', ['rev-parse', '--git-common-dir'], { cwd, encoding: 'utf8' }).trim()
    return resolve(cwd, gitDir) !== resolve(cwd, commonDir)
  } catch {
    return false
  }
}

// ── Building and pushing the one log commit ─────────────────────────────────

/** Run git. `cwd` defaults to the project root; it is injectable so the push loop can
 *  be exercised end-to-end against a throwaway repo + bare remote in tests. */
function git(args: string[], opts?: { env?: NodeJS.ProcessEnv; cwd?: string }): string {
  return execFileSync('git', args, {
    cwd: opts?.cwd ?? root,
    encoding: 'utf8',
    env: opts?.env ?? process.env,
  }).trim()
}

/** git identity for the log commit — configured identity, or a stable fallback so a
 *  cold autonomous session can still author its log. */
function commitEnv(cwd: string = root): NodeJS.ProcessEnv {
  let name = ''
  let email = ''
  try {
    name = git(['config', 'user.name'], { cwd })
    email = git(['config', 'user.email'], { cwd })
  } catch {
    /* unset — fall through to defaults */
  }
  const env = { ...process.env }
  env.GIT_AUTHOR_NAME = env.GIT_COMMITTER_NAME = name || 'terrarium-agent'
  env.GIT_AUTHOR_EMAIL = env.GIT_COMMITTER_EMAIL = email || 'agent@terrarium.local'
  return env
}

/** `journal(sessions): log <filename>`'s session id, recovered from the canonical
 *  `<date>-<session>.yml` filename (`expectedFilename` above) rather than re-derived
 *  from anywhere else — ADR-0017's footer needs the id from the same file already
 *  being committed here. */
function sessionIdFromRelPath(relPath: string): string {
  return basename(relPath, '.yml').replace(/^\d{4}-\d{2}-\d{2}-/, '')
}

/** The busiest model recorded on the stitched entry at `absPath` (session-trace.ts's
 *  `models`: model id → assistant-turn count), or a generic fallback for an
 *  authored-only entry from before the trace existed. ADR-0017 has no exemption for
 *  "the trace didn't say" — the footer still needs a value. The busiest-model pick
 *  and the id→display formatting are single-homed in session-trace.ts (issue #346),
 *  reused here and by the commit-msg footer guard. */
function deriveModelName(absPath: string): string {
  let parsed: unknown
  try {
    parsed = parseYaml(readFileSync(absPath, 'utf8'))
  } catch {
    return FALLBACK_MODEL
  }
  const models = (parsed as { models?: Record<string, number> } | null)?.models
  if (!models || typeof models !== 'object') return FALLBACK_MODEL
  const busiest = busiestModelId(models)
  return busiest ? formatModelId(busiest) : FALLBACK_MODEL
}

/** Build a commit off `origin/main`'s tree containing EXACTLY the one log file, using a
 *  throwaway index so the working tree and current branch are never touched. Returns the
 *  new commit sha. Asserts the commit changes exactly `relPath` — the "only one file" guard. */
export function buildLogCommit(
  relPath: string,
  absPath: string,
  remote: string,
  cwd: string = root,
): string {
  const base = `${remote}/main`
  const env = commitEnv(cwd)
  const indexDir = mkdtempSync(join(tmpdir(), 'log-session-'))
  const indexFile = join(indexDir, 'index')
  const idxEnv = { ...env, GIT_INDEX_FILE: indexFile }
  try {
    git(['read-tree', base], { env: idxEnv, cwd }) // start from main's tree
    const blob = git(['hash-object', '-w', absPath], { cwd })
    git(['update-index', '--add', '--cacheinfo', `100644,${blob},${relPath}`], { env: idxEnv, cwd })
    const tree = git(['write-tree'], { env: idxEnv, cwd })
    const subject = `journal(sessions): log ${basename(relPath, '.yml')}`
    // Separate `-m` paragraph, per ADR-0017 (no exemptions: every agent-authored
    // commit carries this footer) — a trailer needs its own paragraph or git
    // won't recognize it as one. The footer format is single-homed in
    // `provenance-footer.ts` (issue #346), shared with the commit-msg guard.
    const trailer = provenanceFooter(
      deriveModelName(absPath),
      `https://claude.ai/code/${sessionIdFromRelPath(relPath)}`,
    )
    const commit = git(['commit-tree', tree, '-p', base, '-m', subject, '-m', trailer], { env, cwd })

    const changed = git(['diff', '--name-only', base, commit], { cwd }).split('\n').filter(Boolean)
    if (changed.length !== 1 || changed[0] !== relPath) {
      throw new Error(
        `refusing to push: commit would change ${JSON.stringify(changed)}, expected only [${relPath}]`,
      )
    }
    return commit
  } finally {
    rmSync(indexDir, { recursive: true, force: true })
  }
}

const RETRY_DELAYS_MS = [2000, 4000, 8000, 16000]

function sleep(ms: number): void {
  // Portable, dependency-free synchronous block — no child process, works on any
  // platform Node runs on (unlike spawning a POSIX `sleep` binary off PATH).
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

/** fetch → (rebuild off fresh main) → push, with retry. Rebuilding on every attempt is the
 *  "rebase": a parallel session that advanced `main` only moves the parent, never conflicts,
 *  because filenames are globally unique. */
export function pushWithRetry(
  relPath: string,
  absPath: string,
  remote: string,
  cwd: string = root,
): string {
  // One immediate attempt, then one retry before each growing backoff.
  const backoffs = [0, ...RETRY_DELAYS_MS]
  let lastErr: unknown
  for (const [attempt, delay] of backoffs.entries()) {
    if (delay > 0) {
      console.error(`push attempt ${attempt} failed; retrying in ${delay / 1000}s…`)
      sleep(delay)
    }
    try {
      git(['fetch', remote, 'main'], { cwd })
      const commit = buildLogCommit(relPath, absPath, remote, cwd)
      git(['push', remote, `${commit}:refs/heads/main`], { cwd })
      return commit
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr
}

/** Land a validated entry: on `--dry-run`, build + validate the commit but neither
 *  push nor delete; otherwise push it and remove the scratch byte-source `absPath`.
 *
 *  `absPath` is pure scratch — the log's canonical home is `main`, and the landing
 *  path writes it to a gitignored staging copy (`STAGING_DIR`), never the tree.
 *  The removal runs in a `finally` so a *failed* push cleans up too: an interrupted
 *  freeze must not leave the file behind. That mattered even when the copy lived in
 *  the tree — an untracked session log trips "uncommitted changes" checks, and the
 *  obvious reaction (committing it to the feature branch) would route a log through a
 *  PR, exactly what ADR-0009 forbids (#148). Staging + finally closes both holes.
 *
 *  `push`/`build` are injected so tests can drive the cleanup branch without git. */
export function land(
  relPath: string,
  absPath: string,
  remote: string,
  opts: {
    dryRun: boolean
    push?: (relPath: string, absPath: string, remote: string) => string
    build?: (relPath: string, absPath: string, remote: string) => string
  },
): string {
  const push = opts.push ?? pushWithRetry
  const build = opts.build ?? buildLogCommit
  if (opts.dryRun) {
    const commit = build(relPath, absPath, remote)
    console.log(`✓ valid; would push ${relPath} as ${commit.slice(0, 12)} to ${remote}/main (dry run)`)
    return commit
  }
  try {
    const commit = push(relPath, absPath, remote)
    console.log(`✓ logged ${relPath} → ${remote}/main (${commit.slice(0, 12)})`)
    return commit
  } finally {
    rmSync(absPath, { force: true })
  }
}

// ── The landing path the hooks call (ADR-0009 amendment, PR #148) ───────────

/** origin/main's current bytes for a path, or null if it does not exist there.
 *  Used by the diff-guard so an unchanged re-derive never commits. */
function mainVersion(relPath: string, remote: string): string | null {
  try {
    fetchOriginMain(root, remote)
  } catch {
    /* offline / no remote / timed out — fall through; the push loop will surface it */
  }
  try {
    return execFileSync('git', ['show', `${remote}/main:${relPath}`], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'], // quiet: a missing path is expected, not an error
    })
  } catch {
    return null // not yet on main
  }
}

export interface HandlerResult {
  action: 'skipped-no-scratch' | 'skipped-unchanged' | 'invalid' | 'landed' | 'dry-run'
  relPath?: string
  detail?: string
}

/** What `handle`/`recoverDroppedScratch` need beyond their inputs. `landFn` and
 *  `mainVersionFn` are injected so tests drive the paths without git; `landedBy`
 *  is the hook registration this landing came from (issue #865). */
export interface LandOpts {
  dryRun: boolean
  remote: string
  landedBy?: string
  landFn?: typeof land
  mainVersionFn?: (relPath: string, remote: string) => string | null
  env?: SessionIdEnv
  subagentJsonls?: string[]
}

/** The landing gate (#148). The derived trace grows every turn (durationSec,
 *  toolCounts), so keying on the stitched output would push to `main` on every
 *  turn once a scratch exists. Instead we key on the *authored scratch*: land when
 *  its bytes differ from the last-landed sentinel, no-op otherwise. Re-invoking
 *  `log-session` (a new friction / updated outcome) changes the scratch, so the
 *  next live event re-lands the superset — exactly the "log when done, log again
 *  on a new event" semantics. Pure over the raw bytes: the testable core. */
export function scratchHashOf(scratchRaw: string): string {
  return createHash('sha256').update(scratchRaw).digest('hex')
}

/** True when `scratchRaw` is already on `main` per the sentinel — skip the land.
 *  A missing/garbage sentinel (`null`) always means "not landed": land it. */
export function isAlreadyLanded(scratchRaw: string, sentinelRaw: string | null): boolean {
  if (sentinelRaw === null) return false
  try {
    const sentinel = JSON.parse(sentinelRaw) as { scratchHash?: string }
    return sentinel.scratchHash === scratchHashOf(scratchRaw)
  } catch {
    return false // unreadable sentinel — treat as not landed
  }
}

/** True when the transcript shows the session invoked `log-session` — i.e.
 *  declared its own closure — regardless of whether the authored scratch
 *  survived long enough to be read (issue #449 Gap 3). This is the durable
 *  evidence a dropped scratch leaves behind: the interpretive scratch lives in
 *  gitignored, container-local `.session-logs/` and a container reclaim on
 *  resume can erase it before any hook lands the log, but the transcript
 *  recording the Skill invocation is the more resilient artifact — it is what
 *  let session_01HCnkeyqxf46SjouSPxrazN (2026-07-06) recover its own dropped
 *  log by hand, run against the still-present transcript. */
export function declaredClosure(trace: MechanicalTrace): boolean {
  return trace.skillsUsed.includes('log-session')
}

/** The marker a session-id-mismatch friction carries (issue #387) — greppable,
 *  mirroring `DROPPED_SCRATCH_FRICTION`'s pattern, and distinguishes this
 *  mechanically-detected finding from a friction the agent wrote by hand. */
export const SESSION_ID_MISMATCH_FRICTION = "issue #387: Claude-Session trailer mismatch on this session's own commit(s)"

/** Append a synthetic 'blocker' friction recording a detected `Claude-Session`
 *  trailer mismatch (issue #387) onto the authored scratch — the "recorded
 *  signal" half of the guard's contract (stderr, printed by `landMain()`, is the
 *  other half). This is how the mismatch survives past the ephemeral hook stderr
 *  and into the landed session log itself, where a human or `audit-skills` can
 *  find it later — all WITHOUT failing the hook itself (landing is deliberately
 *  non-fatal to teardown, see the file header).
 *  A no-op (returns `scratch` unchanged) when there is nothing to report. */
export function withSessionIdMismatchFriction(
  scratch: AuthoredScratch,
  mismatches: SessionIdMismatch[],
): AuthoredScratch {
  if (mismatches.length === 0) return scratch
  return {
    ...scratch,
    frictions: [
      ...scratch.frictions,
      {
        description: `${SESSION_ID_MISMATCH_FRICTION}: ${formatMismatchError(mismatches)}`,
        solution:
          "Investigate the offending commit(s): CLAUDE.md forbids predicting/reconstructing a session id " +
          "(never copy one seen elsewhere in context) — resolve the real id from $CLAUDE_CODE_REMOTE_SESSION_ID " +
          "or the transcript at the moment of writing, and escalate per issue #387 if the divergence is unexplained.",
        severity: 'blocker',
      },
    ],
  }
}

/** The marker every dropped-scratch placeholder log's sole friction carries —
 *  greppable, and distinguishes this synthetic entry from a real one. */
export const DROPPED_SCRATCH_FRICTION = 'issue #449 Gap 3: authored scratch dropped before landing'

/** A minimal, clearly-flagged stand-in for the scratch that was lost. `kind` is
 *  a best-effort guess from `entrypoint` (never authoritative — the real intent
 *  went with the scratch); every interpretive field says plainly that it is a
 *  placeholder, not the agent's own words. */
export function buildDroppedScratchScratch(trace: MechanicalTrace): AuthoredScratch {
  return {
    session: trace.session ?? '',
    kind: trace.entrypoint === 'remote_trigger' ? 'autonomous' : 'interactive',
    goal: '(unknown — authored scratch lost before landing)',
    status: 'abandoned',
    outcome: 'authored scratch lost before landing',
    summary:
      'This session invoked log-session (closure was declared) but its authored interpretive scratch — ' +
      'goal, outcome, summary, frictions — was lost before the landing hook could commit it, most likely ' +
      `a container reclaim on resume erasing the gitignored .session-logs/ scratch before teardown committed ` +
      `(${DROPPED_SCRATCH_FRICTION}). Only the mechanical trace could be recovered; nothing in this entry ` +
      "reflects the agent's own words.",
    frictions: [
      {
        description: DROPPED_SCRATCH_FRICTION,
        solution:
          'If the raw transcript is still available, a human or a follow-up session can re-author a faithful ' +
          'scratch from it and re-land a corrected log over this placeholder.',
        severity: 'major',
      },
    ],
  }
}

/** The common tail `handle()` and `recoverDroppedScratch()` share once their
 *  own distinct landing gate (content-diff vs existence-check) has already
 *  decided to proceed: stage the byte source, then hand it to `land()`. The
 *  log lands from a gitignored staging copy, never the working tree — `land`
 *  only needs `absPath` as a byte source for `git hash-object`, and `relPath`
 *  is the commit's tree location, so the tree never holds an untracked log
 *  (#148). */
function stageAndLand(relPath: string, yaml: string, opts: LandOpts): HandlerResult {
  const stagingPath = join(root, STAGING_DIR, basename(relPath))
  mkdirSync(dirname(stagingPath), { recursive: true })
  writeFileSync(stagingPath, yaml)
  const landFn = opts.landFn ?? land
  landFn(relPath, stagingPath, opts.remote, { dryRun: opts.dryRun })
  return { action: opts.dryRun ? 'dry-run' : 'landed', relPath }
}

/** Serialize a stitched entry, recording which hook registration landed it
 *  (issue #865 — ADR-0009's 2026-09-05 amendment owns why). */
function entryYaml(entry: Record<string, unknown>, opts: LandOpts): string {
  if (opts.landedBy) entry.landedBy = opts.landedBy
  // Generous width so long summaries/paths don't hard-wrap into shapes the
  // parser round-trips differently.
  return stringifyYaml(entry, { lineWidth: 0 })
}

/** `landedBy` is provenance about HOW a log landed, not part of its content, so
 *  the diff-guard must ignore it — otherwise a re-derive by a second registration
 *  would re-push an otherwise-identical log (issue #865). Top-level key, so an
 *  unindented match is unambiguous. */
function withoutLandedBy(yaml: string): string {
  return yaml.replace(/^landedBy: .*\n/m, '')
}

/** The parent transcript's trace with every dispatched subagent's reads, edits,
 *  and Skill invocations folded in — `subagentJsonls` is passed by `landMain`
 *  from disk and by tests inline, so neither entry point can drift from the other. */
function traceOf(transcriptJsonl: string, opts: LandOpts): MechanicalTrace {
  const trace = extractTrace(parseTranscript(transcriptJsonl), opts.env)
  return foldSubagentTrace(trace, (opts.subagentJsonls ?? []).map(parseTranscript), opts.env)
}

/** Recovery path for the "authored-then-dropped" case (issue #449 Gap 3),
 *  distinct from a session that never declared closure at all (#397,
 *  unrescuable by any hook). The scratch itself can be lost to a container
 *  reclaim, but `declaredClosure` reads durable evidence straight out of the
 *  transcript. Lands a minimal placeholder log ONLY when nothing exists yet at
 *  the session's expected path — existence-checked, not content-diffed like
 *  `handle`'s normal gate, so this never overwrites a real, richer log (or an
 *  earlier placeholder) that already landed there. Every field the placeholder
 *  carries is explicit placeholder prose (see `buildDroppedScratchScratch`),
 *  and `droppedScratchRecovery: true` additionally marks it structurally, so a
 *  consumer never has to grep friction text to tell it apart from a real log. */
export function recoverDroppedScratch(transcriptJsonl: string, opts: LandOpts): HandlerResult {
  const trace = traceOf(transcriptJsonl, opts)
  if (!trace.session || !declaredClosure(trace)) {
    return { action: 'skipped-no-scratch' }
  }

  const entry = stitch(buildDroppedScratchScratch(trace), trace)
  entry.droppedScratchRecovery = true
  const valid = validateEntry(entry)
  if (!valid.ok) return { action: 'invalid', detail: valid.errors }

  const relPath = join(SESSIONS_DIR, expectedFilename(valid.data))
  const getMain = opts.mainVersionFn ?? mainVersion
  if (getMain(relPath, opts.remote) !== null) {
    // Something already lives at this path — the real log landed (or a prior
    // placeholder already recorded the drop). Never overwrite either.
    return { action: 'skipped-unchanged', relPath }
  }

  return stageAndLand(relPath, entryYaml(entry, opts), opts)
}

/** The testable core: given a scratch and a transcript, produce + (maybe) land
 *  the log. `push`/`build` flow through `land`, injectable for tests via opts. */
export function handle(
  scratch: AuthoredScratch,
  transcriptJsonl: string,
  opts: LandOpts,
): HandlerResult {
  const trace = traceOf(transcriptJsonl, opts)
  const entry = stitch(scratch, trace)

  const valid = validateEntry(entry)
  if (!valid.ok) return { action: 'invalid', detail: valid.errors }

  const relPath = join(SESSIONS_DIR, expectedFilename(valid.data))
  const yaml = entryYaml(entry, opts)

  const getMain = opts.mainVersionFn ?? mainVersion
  const current = getMain(relPath, opts.remote)
  if (current !== null && withoutLandedBy(current) === withoutLandedBy(yaml)) {
    return { action: 'skipped-unchanged', relPath }
  }

  return stageAndLand(relPath, yaml, opts)
}

// ── CLI entry points ────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`log-session: ${msg}`)
  process.exit(1)
}

/** How many near-misses to show. Capped: the list exists to make a MISS
 *  recognisable at a glance, and an uncapped dump of every rejected candidate
 *  would bury the detected paths it sits beside. */
const NEAR_MISS_LIMIT = 5

/** Print what the shell-read detector saw, so the authoring agent can check it
 *  against the session it just lived through (#1074's loop). Prints nothing when
 *  there is nothing to check — including when the transcript can't be found,
 *  which is a degraded report, never a failure to author. */
export function reportShellReads(cwd: string, log: (line: string) => void = console.log): void {
  let scan
  try {
    const transcriptPath = findLatestTranscript(cwd, process.env.HOME)
    if (!transcriptPath || !existsSync(transcriptPath)) return
    scan = shellReadScanOf(
      parseTranscript(readFileSync(transcriptPath, 'utf8')),
      readSubagentJsonls(transcriptPath).map(parseTranscript),
    )
  } catch {
    // Locating and reading the transcript is best-effort: a report that can't be
    // built degrades to silence, never to a failed authoring (the scratch is
    // already written by the time this runs).
    return
  }
  if (scan.paths.length === 0 && scan.nearMisses.length === 0) return

  log('')
  log(`  docsReadViaShell — ${scan.paths.length} instruction doc(s) detected as read via shell:`)
  for (const p of scan.paths) log(`    ${p}`)
  if (scan.nearMisses.length) {
    log(`  Not counted (${scan.nearMisses.length}), and why:`)
    for (const m of scan.nearMisses.slice(0, NEAR_MISS_LIMIT)) {
      log(`    ${m.token} — ${m.rule}`)
      log(`      ${m.command.replace(/\s+/g, ' ').slice(0, 100)}`)
    }
    if (scan.nearMisses.length > NEAR_MISS_LIMIT) {
      log(`    …and ${scan.nearMisses.length - NEAR_MISS_LIMIT} more`)
    }
  }
  log('  Check both lists against what you actually ran. You cannot edit this field —')
  log("  if it missed a doc or listed one you never read, log a Friction: severity at least 'moderate',")
  log('  marker SHELL-READ-DETECTION, the command verbatim, the path expected, and the direction.')
}

/** `--author <authored.yml>`: validate the interpretive fields and write the
 *  scratch. This is what the model-invocable `log-session` Skill calls at
 *  closure; it does NOT commit — `--land` does, live on the next `Stop` (with
 *  `SessionEnd`/resume only as fallbacks for whatever `Stop` misses, PR #148).
 *  Exported so tests can drive the actual CLI wiring (the `isLinkedWorktree`
 *  refusal + `--allow-worktree` escape hatch), not just the underlying primitive. */
export function authorMain(
  argv: string[],
  opts: { cwd?: string; scratchAbs?: string } = {},
): void {
  const cwd = opts.cwd ?? process.cwd()
  const scratchAbs = opts.scratchAbs ?? join(root, SCRATCH_FILE)
  const allowWorktree = argv.includes('--allow-worktree')
  const positional = argv.filter((a) => !a.startsWith('--'))
  const [inputPath] = positional
  if (positional.length !== 1 || inputPath === undefined) {
    fail('--author expects exactly one argument: the path to the authored .yml')
  }
  // Guarded refusal, not a silent overwrite (issue #449 Gap 4) — see
  // `isLinkedWorktree`'s doc comment for the mechanism and its one known blind spot.
  if (!allowWorktree && isLinkedWorktree(cwd)) {
    fail(
      'refusing to author the session-log scratch from a linked git worktree: a dispatched worktree-isolated ' +
        "subagent must not self-invoke close-session/log-session — it shares the orchestrator's session id and " +
        "scratch path, and this invocation would silently clobber the orchestrator's own log (issue #449 Gap 4). " +
        'The orchestrator is the sole log author; a dispatched impl agent just implements, pushes, and hands ' +
        'back the PR. If this is instead a deliberate EnterWorktree-based single-session run, re-run with ' +
        '--allow-worktree.',
    )
  }
  const text = readFileSync(resolve(inputPath), 'utf8')
  const truncated = findTruncatedScalars(text)
  if (truncated.length > 0) fail(truncationError(truncated))
  let parsed: unknown
  try {
    parsed = parseYaml(text)
  } catch (err) {
    fail(`could not parse authored YAML: ${err instanceof Error ? err.message : err}`)
  }
  const result = validateAuthored(parsed)
  if (!result.ok) fail(`authored scratch is invalid:\n${result.errors}`)
  writeScratch(result.data, scratchAbs)
  console.log(`✓ authored scratch written → ${SCRATCH_FILE}`)
  console.log('  the Stop hook will stitch it with the derived trace and commit, live, at the end of this turn.')
  reportShellReads(cwd)
}

function readStdin(): string {
  try {
    return readFileSync(0, 'utf8')
  } catch {
    return ''
  }
}

/** `--land`: the hook path. Never throws and never exits non-zero — a handler
 *  bug must not wedge teardown (PR #148); errors go to stderr only. */
function landMain(argv: string[]): void {
  const dryRun = argv.includes('--dry-run')
  const arg = (flag: string): string | undefined => {
    const i = argv.indexOf(flag)
    return i >= 0 ? argv[i + 1] : undefined
  }

  // Payload on stdin (hook); argv overrides help testing. `hook_event_name` is
  // the registration that fired us — recorded on the entry (issue #865).
  let payload: { transcript_path?: string; hook_event_name?: string } = {}
  const stdin = readStdin()
  if (stdin.trim()) {
    try {
      payload = JSON.parse(stdin)
    } catch {
      /* not JSON — rely on argv */
    }
  }
  const transcriptPath = arg('--transcript') ?? payload.transcript_path
  const scratchPath = arg('--scratch') ?? join(root, SCRATCH_FILE)
  const landedBy = payload.hook_event_name

  // The wrap-up signal: no scratch ⇒ either the session never declared closure
  // (#397, unrescuable — do nothing), or its scratch was authored and then lost
  // (issue #449 Gap 3) — the transcript itself carries the durable evidence to
  // tell the two apart, so check it before giving up silently.
  if (!existsSync(scratchPath)) {
    if (transcriptPath && existsSync(transcriptPath)) {
      const result = recoverDroppedScratch(readFileSync(transcriptPath, 'utf8'), {
        dryRun,
        remote: 'origin',
        landedBy,
        subagentJsonls: readSubagentJsonls(transcriptPath),
      })
      if (result.action === 'landed' || result.action === 'dry-run') {
        console.error(
          `log-session: authored scratch was lost before landing — recorded a placeholder log at ${result.relPath} (${DROPPED_SCRATCH_FRICTION})`,
        )
        return
      }
      if (result.action === 'invalid') {
        console.error(`log-session: dropped-scratch recovery produced an invalid entry, skipping:\n${result.detail}`)
      }
    }
    console.error('log-session: no authored scratch — session did not declare closure; skipping')
    return
  }
  if (!transcriptPath || !existsSync(transcriptPath)) {
    console.error(`log-session: transcript not found (${transcriptPath ?? 'unset'}); skipping`)
    return
  }

  const scratchRaw = readFileSync(scratchPath, 'utf8')
  let scratch: AuthoredScratch
  try {
    scratch = JSON.parse(scratchRaw)
  } catch (err) {
    console.error(`log-session: could not read scratch: ${err instanceof Error ? err.message : err}`)
    return
  }

  const transcriptJsonl = readFileSync(transcriptPath, 'utf8')

  // The session-id-fabrication backstop (issue #387): CLAUDE.md's doc-only
  // "never predict/reconstruct a session id" rule has repeatedly failed to
  // hold. Compare this session's own commits (origin/main..HEAD only — never
  // inherited history) against the resolved ground-truth session id and
  // surface any mismatch loudly. Deliberately non-fatal here (this hook must
  // never wedge the log land) — the finding is recorded as a blocker friction
  // on the entry that lands, not by exiting non-zero (see session-id-guard.ts
  // for the standalone CLI that does exit non-zero on this same check).
  const groundTruthId = resolveGroundTruthFromTranscript(transcriptJsonl)
  const mismatches = findSessionIdMismatches(readOwnCommits(root), groundTruthId)
  if (mismatches.length > 0) {
    console.error(formatMismatchError(mismatches))
    scratch = withSessionIdMismatchFriction(scratch, mismatches)
  }

  // The landing gate (#148): if this exact scratch already landed, do nothing —
  // no fetch, no push. This is what lets the same script run on every live `Stop`
  // (and on resume) cheaply; it only does real work when the agent (re)declares
  // closure. `--dry-run` bypasses the gate so a dry run always exercises the path.
  // Note: a session-id mismatch alone (with the scratch otherwise unchanged) does
  // NOT reopen this gate — the mismatch was already reported above via stderr;
  // re-landing needs the scratch itself to change, same as any other new finding.
  const sentinelPath = join(root, LAST_LANDED_FILE)
  const sentinelRaw = existsSync(sentinelPath) ? readFileSync(sentinelPath, 'utf8') : null
  if (!dryRun && isAlreadyLanded(scratchRaw, sentinelRaw)) {
    console.error('log-session: log already landed for this scratch; nothing to do')
    return
  }

  const result = handle(scratch, transcriptJsonl, {
    dryRun,
    remote: 'origin',
    landedBy,
    subagentJsonls: readSubagentJsonls(transcriptPath),
  })
  switch (result.action) {
    case 'invalid':
      console.error(`log-session: stitched entry is invalid, not logging:\n${result.detail}`)
      break
    case 'skipped-unchanged':
      console.error(`log-session: ${result.relPath} unchanged on main; nothing to do`)
      break
    default:
      console.error(`log-session: ${result.action} ${result.relPath ?? ''}`)
  }

  // Record what we landed so the next event's gate no-ops until the scratch changes.
  // Both 'landed' and 'skipped-unchanged' mean this scratch's content is on `main`.
  if (!dryRun && (result.action === 'landed' || result.action === 'skipped-unchanged') && result.relPath) {
    mkdirSync(dirname(sentinelPath), { recursive: true })
    writeFileSync(sentinelPath, JSON.stringify({ scratchHash: scratchHashOf(scratchRaw), relPath: result.relPath }, null, 2))
  }
}

function main(): void {
  const argv = process.argv.slice(2)
  if (argv.includes('--author')) {
    authorMain(argv)
    return
  }
  if (argv.includes('--land')) {
    try {
      landMain(argv)
    } catch (err) {
      console.error(`log-session: ${err instanceof Error ? err.message : String(err)}`)
    }
    return
  }
  const dryRun = argv.includes('--dry-run')
  const remoteIdx = argv.indexOf('--remote')
  let remote = 'origin'
  if (remoteIdx >= 0) {
    const value = argv[remoteIdx + 1]
    if (value === undefined) fail('--remote requires a value')
    remote = value
  }
  const positional = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--remote')
  const [inputPath] = positional
  if (positional.length !== 1 || inputPath === undefined) {
    fail('expected exactly one argument: the path to the session-log .yml file')
  }

  const absPath = resolve(inputPath)
  const relPath = absPath.startsWith(root + '/') ? absPath.slice(root.length + 1) : absPath

  // Scope guard — the entire ADR-0009 loophole is this one directory.
  if (dirname(relPath) !== SESSIONS_DIR) {
    fail(`file must live in ${SESSIONS_DIR}/, got ${relPath}`)
  }

  const text = readFileSync(absPath, 'utf8')
  const truncated = findTruncatedScalars(text)
  if (truncated.length > 0) fail(truncationError(truncated))
  let parsed: unknown
  try {
    parsed = parseYaml(text)
  } catch (err) {
    fail(`could not parse YAML: ${err instanceof Error ? err.message : err}`)
  }

  const result = validateEntry(parsed)
  if (!result.ok) {
    fail(`entry does not satisfy the sessions schema:\n${result.errors}`)
  }

  // Filename guard — enforce the `<startedAt-date>-<session>.yml` convention so `stem`
  // order and collision-freedom hold. Derived from the validated entry, not trusted input.
  const expected = expectedFilename(result.data)
  if (basename(relPath) !== expected) {
    fail(`filename must be ${expected} (from startedAt + session id), got ${basename(relPath)}`)
  }

  land(relPath, absPath, remote, { dryRun })
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
}
