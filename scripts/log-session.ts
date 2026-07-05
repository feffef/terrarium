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
// Usage:  tsx scripts/log-session.ts <path-to-entry.yml> [--dry-run] [--remote <name>]
//   --dry-run  do everything except the final push (builds + validates the commit)
//   --remote   push target remote (default: origin)
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parse as parseYaml } from 'yaml'
import journal from '../tenants/journal/tenant.config.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** The one directory session logs may live in — the whole of the ADR-0009 scope. */
export const SESSIONS_DIR = 'tenants/journal/content/current/sessions'

/** The frozen `sessions` schema (ADR-0009). Single source of truth — never restated here. */
const sessionsCollection = journal.collections.sessions
if (!sessionsCollection?.schema) {
  throw new Error('journal manifest is missing the sessions collection schema')
}
const sessionsSchema = sessionsCollection.schema

export interface SessionEntry {
  session: string
  startedAt: string
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
    const msg = `journal(sessions): log ${basename(relPath, '.yml')}`
    const commit = git(['commit-tree', tree, '-p', base, '-m', msg], { env, cwd })

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
  execFileSync('sleep', [String(ms / 1000)])
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
 *  push nor delete; otherwise push it and then remove the working-copy file.
 *
 *  That removal is the point of ADR-0009's boundary made tidy: the log's canonical
 *  home is `main`, so the working-copy copy is pure scratch. Leaving it behind as an
 *  untracked file trips "you have uncommitted changes" checks, and the obvious
 *  reaction — committing it to the current feature branch — would route a session log
 *  through a PR, exactly what ADR-0009 forbids. So the helper cleans up after itself.
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
  const commit = push(relPath, absPath, remote)
  rmSync(absPath, { force: true })
  console.log(`✓ logged ${relPath} → ${remote}/main (${commit.slice(0, 12)})`)
  console.log(`  removed working-copy scratch ${relPath} — its home is now ${remote}/main`)
  return commit
}

function fail(msg: string): never {
  console.error(`log-session: ${msg}`)
  process.exit(1)
}

function main(): void {
  const argv = process.argv.slice(2)
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

  let parsed: unknown
  try {
    parsed = parseYaml(readFileSync(absPath, 'utf8'))
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
