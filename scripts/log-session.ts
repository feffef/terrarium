// The session-log helper (ADR-0009): the single enforcement point of the
// "session logs commit directly to `main`" boundary. It takes ONE authored
// session-log YAML file, proves it is a safe, inert Journal Document, and lands
// it on `main` without a PR — committing *only* that file and never touching the
// session's other, possibly uncommitted, working-copy changes.
//
// This is gated code: changing it is a normal PR (the exception's boundary is
// itself protected by the gate it steps around). Only the session-log *content*
// it produces travels the direct-to-`main` path.
//
// Usage:
//   tsx scripts/log-session.ts --author <authored.yml>
//       validate the interpretive fields and write the SessionEnd scratch (the
//       model-invocable path; does NOT commit — the SessionEnd hook does).
//   tsx scripts/log-session.ts <path-to-entry.yml> [--dry-run] [--remote <name>]
//       land a fully-formed entry directly (the original manual path).
//   --dry-run  do everything except the final push (builds + validates the commit)
//   --remote   push target remote (default: origin)
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isPair, isScalar, parse as parseYaml, parseDocument, visit } from 'yaml'
import { z } from 'zod'
import journal from '../layers/journal/tenant.config.ts'
import { provenanceFooter } from './provenance-footer.ts'
import { busiestModelId, formatModelId, SCRATCH_FILE, type AuthoredScratch } from './session-trace.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** The one directory session logs may live in — the whole of the ADR-0009 scope. */
export const SESSIONS_DIR = 'layers/journal/content/current/sessions'

/** The frozen `sessions` schema (ADR-0009). Single source of truth — never restated here. */
const sessionsCollection = journal.collections.sessions
if (!sessionsCollection?.schema) {
  throw new Error('journal manifest is missing the sessions collection schema')
}
const sessionsSchema = sessionsCollection.schema

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
// The interpretive half the live agent writes DURING the session (SessionEnd
// cannot prompt). Mechanical fields — timings, models, files, subagents — are
// NOT authored; the handler derives them from the transcript and stitches. This
// light schema gives the agent early feedback; the authoritative check is the
// full-schema validation the handler runs on the stitched entry before landing.
// Enum values mirror the sessions schema (single home: the manifest).
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

export function validateAuthored(
  raw: unknown,
): { ok: true; data: AuthoredScratch } | { ok: false; errors: string } {
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

/** Write the authored scratch to its canonical, gitignored home. Its existence is
 *  the wrap-up signal the SessionEnd handler gates on; re-authoring overwrites it. */
export function writeScratch(authored: AuthoredScratch, scratchAbs: string): void {
  mkdirSync(dirname(scratchAbs), { recursive: true })
  writeFileSync(scratchAbs, JSON.stringify(authored, null, 2))
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
  const FALLBACK = 'Claude'
  let parsed: unknown
  try {
    parsed = parseYaml(readFileSync(absPath, 'utf8'))
  } catch {
    return FALLBACK
  }
  const models = (parsed as { models?: Record<string, number> } | null)?.models
  if (!models || typeof models !== 'object') return FALLBACK
  const busiest = busiestModelId(models)
  return busiest ? formatModelId(busiest) : FALLBACK
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
 *  `absPath` is pure scratch — the log's canonical home is `main`, and the SessionEnd
 *  handler now writes it to a gitignored staging path (`STAGING_DIR`), never the tree.
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

function fail(msg: string): never {
  console.error(`log-session: ${msg}`)
  process.exit(1)
}

/** `--author <authored.yml>`: validate the interpretive fields and write the
 *  scratch. This is what the model-invocable `log-session` Skill calls at
 *  closure; it does NOT commit — the session-end handler does, live on the
 *  next `Stop` (with `SessionEnd`/resume only as fallbacks for whatever `Stop`
 *  misses, PR #148). Exported so tests can drive the actual CLI wiring (the
 *  `isLinkedWorktree` refusal + `--allow-worktree` escape hatch), not just the
 *  underlying primitive. */
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
}

function main(): void {
  const argv = process.argv.slice(2)
  if (argv.includes('--author')) {
    authorMain(argv)
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
