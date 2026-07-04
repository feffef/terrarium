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
import { z } from 'zod'
import journal from '../tenants/journal/tenant.config.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** The one directory session logs may live in — the whole of the ADR-0009 scope. */
export const SESSIONS_DIR = 'tenants/journal/content/current/sessions'

/** The frozen `sessions` schema (ADR-0009). Single source of truth — never restated here. */
const sessionsSchema = journal.collections.sessions.schema!

export interface SessionEntry {
  session: string
  startedAt: Date
  [k: string]: unknown
}

/** Nuxt Content coerces YAML timestamps to Date for `z.date()` fields; mirror that
 *  before validating so our check matches the build's L1 validation exactly. */
function coerceDates(raw: Record<string, unknown>): Record<string, unknown> {
  const out = { ...raw }
  for (const [key, field] of Object.entries(sessionsSchema.shape)) {
    if (field instanceof z.ZodDate && typeof out[key] === 'string') {
      out[key] = new Date(out[key] as string)
    }
  }
  return out
}

/** Validate a parsed entry against the frozen schema. Pure — the testable core. */
export function validateEntry(raw: unknown):
  | { ok: true; data: SessionEntry }
  | { ok: false; errors: string } {
  if (raw === null || typeof raw !== 'object') {
    return { ok: false, errors: 'entry is not a YAML mapping' }
  }
  const res = sessionsSchema.safeParse(coerceDates(raw as Record<string, unknown>))
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
  const date = entry.startedAt.toISOString().slice(0, 10) // YYYY-MM-DD (UTC)
  return `${date}-${entry.session}.yml`
}

function git(args: string[], env?: NodeJS.ProcessEnv): string {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    env: env ?? process.env,
  }).trim()
}

/** git identity for the log commit — configured identity, or a stable fallback so a
 *  cold autonomous session can still author its log. */
function commitEnv(): NodeJS.ProcessEnv {
  let name = ''
  let email = ''
  try {
    name = git(['config', 'user.name'])
    email = git(['config', 'user.email'])
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
function buildLogCommit(relPath: string, absPath: string, remote: string): string {
  const base = `${remote}/main`
  const env = commitEnv()
  const indexDir = mkdtempSync(join(tmpdir(), 'log-session-'))
  const indexFile = join(indexDir, 'index')
  const idxEnv = { ...env, GIT_INDEX_FILE: indexFile }
  try {
    git(['read-tree', base], idxEnv) // start from main's tree
    const blob = git(['hash-object', '-w', absPath])
    git(['update-index', '--add', '--cacheinfo', `100644,${blob},${relPath}`], idxEnv)
    const tree = git(['write-tree'], idxEnv)
    const msg = `journal(sessions): log ${basename(relPath, '.yml')}`
    const commit = git(['commit-tree', tree, '-p', base, '-m', msg], env)

    const changed = git(['diff', '--name-only', base, commit]).split('\n').filter(Boolean)
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
function pushWithRetry(relPath: string, absPath: string, remote: string): string {
  let lastErr: unknown
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      git(['fetch', remote, 'main'])
      const commit = buildLogCommit(relPath, absPath, remote)
      git(['push', remote, `${commit}:refs/heads/main`])
      return commit
    } catch (err) {
      lastErr = err
      if (attempt < RETRY_DELAYS_MS.length) {
        const delay = RETRY_DELAYS_MS[attempt]
        console.error(`push attempt ${attempt + 1} failed; retrying in ${delay / 1000}s…`)
        sleep(delay)
      }
    }
  }
  throw lastErr
}

function fail(msg: string): never {
  console.error(`log-session: ${msg}`)
  process.exit(1)
}

function main(): void {
  const argv = process.argv.slice(2)
  const dryRun = argv.includes('--dry-run')
  const remoteIdx = argv.indexOf('--remote')
  const remote = remoteIdx >= 0 ? argv[remoteIdx + 1] : 'origin'
  const positional = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--remote')
  if (positional.length !== 1) {
    fail('expected exactly one argument: the path to the session-log .yml file')
  }

  const absPath = resolve(positional[0])
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

  if (dryRun) {
    const commit = buildLogCommit(relPath, absPath, remote)
    console.log(`✓ valid; would push ${relPath} as ${commit.slice(0, 12)} to ${remote}/main (dry run)`)
    return
  }

  const commit = pushWithRetry(relPath, absPath, remote)
  console.log(`✓ logged ${relPath} → ${remote}/main (${commit.slice(0, 12)})`)
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
}
