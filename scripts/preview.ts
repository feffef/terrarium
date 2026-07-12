// Local preview/dev server lifecycle (issue #240). One tool, three verbs —
// `shot`, `start`, `stop` — so agents stop hand-rolling the start-server /
// screenshot / `pkill -f` teardown dance that has now silently corrupted work
// three times running.
//
// Why this script exists at all (the `pkill` history, so nobody re-simplifies
// it back into a one-liner):
//   - #102: added a CLAUDE.md bullet "never `&&`-chain pkill teardown".
//   - #183 → #189: expanded that bullet to explain exit code 144.
//   - #240: it happened a THIRD time anyway — this time a `;`-chain.
// Three rounds of prose did not hold, because the failure isn't ignorance of
// the rule, it's that `pkill -f <pattern>` is structurally fragile every time:
//   1. Self-match — `pkill -f` matches the invoking shell's OWN command line,
//      so a chained teardown SIGTERMs its own shell (exit 144) and silently
//      drops every step after the `;`/`&&`.
//   2. Container-wide match — `pkill -f 'nuxt preview'` also kills a SIBLING
//      agent's server: multiple agents share one container's port space.
//   3. Exit-code confusion — a successful kill returns 144, read as failure
//      and re-derived as "harmless" every session.
//
// How this tool removes all three, by construction:
//   - Teardown keys ONLY on a specific child PID (its process group), never a
//     pattern or a shared port — so it can't self-match and can't touch a
//     sibling's server.
//   - Each instance binds its OWN ephemeral port (chosen at start), so two
//     agents in one container never collide — the concurrency case that makes
//     any fixed key (port 3000, or a name pattern) wrong.
//   - `stop` ALWAYS exits 0 (teardown is never a "failure"); `shot`/`start`
//     exit non-zero WITH diagnostics only on a genuine failure to come up.
//   - `shot` folds the whole lifecycle into one process, so the common
//     screenshot path has no teardown step for a shell to drop at all.
//
// Usage:
//   pnpm exec tsx scripts/preview.ts shot <route> <out.png> [WxH] [--dev]
//   pnpm exec tsx scripts/preview.ts start [--dev]     # prints PID= and URL=
//   pnpm exec tsx scripts/preview.ts stop <pid>        # always exits 0
//
// `shot` is the frictionless default (one-shot screenshot, no teardown to get
// wrong). `start`/`stop` keep a server up for multi-navigation tools that need
// a live URL — `scripts/plate-gallery.ts`, ad-hoc `playwright-core` probes.
// Default is a production-accurate `preview` server (requires a prior
// `pnpm build`); `--dev` uses `nuxt dev` for fast iteration (its DevTools
// overlay makes it wrong for a trusted screenshot — see CLAUDE.md).
import { spawn, type ChildProcess } from 'node:child_process'
import { createServer } from 'node:net'
import { existsSync, openSync, closeSync, readFileSync, realpathSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { captureScreenshot, captureScreenshotWaitingFor } from './screenshot'

const HOST = '127.0.0.1'
const READY_TIMEOUT_MS = 45_000
const POLL_INTERVAL_MS = 300
const KILL_GRACE_MS = 5_000
const SERVER_ENTRY = '.output/server/index.mjs'

const USAGE =
  'Usage:\n' +
  '  pnpm exec tsx scripts/preview.ts shot <route> <out.png> [WxH] [--wait <ms>] [--wait-for <selector>] [--dev]\n' +
  '  pnpm exec tsx scripts/preview.ts start [--dev]\n' +
  '  pnpm exec tsx scripts/preview.ts stop <pid>\n' +
  '  <route>            a path on the site, e.g. /t/journal/current\n' +
  '  [WxH]              optional window size (e.g. 1280x1600); defaults to 1280x800\n' +
  '  --wait <ms>        pre-capture wait so async content renders; defaults to 2000.\n' +
  '                     Ignored when --wait-for is given\n' +
  '  --wait-for <sel>   wait until <sel> attaches to the DOM instead of a fixed\n' +
  "                     wait (e.g. '.mermaid-diagram svg' for an async diagram)\n" +
  '  --dev              use `nuxt dev` instead of a built `preview` server (fast, but\n' +
  '                     the DevTools overlay makes it unfit for a trusted screenshot)'

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/** Pull a `--flag value` pair out of `args`, returning the value (last wins if
 *  repeated) and the args with every occurrence removed. Keeps the positional
 *  `<route> <out> [WxH]` parsing downstream unaware of the value-taking flags.
 *  Exported for unit testing (tests/unit/preview-flags.spec.ts). */
export function extractFlag(args: string[], flag: string): { value: string | undefined; rest: string[] } {
  const rest: string[] = []
  let value: string | undefined
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === flag) {
      value = args[i + 1] // may be undefined if the flag is trailing; validated by the caller
      i++ // consume the value too
    }
    else if (arg !== undefined) {
      rest.push(arg)
    }
  }
  return { value, rest }
}

/** Parse an optional `WxH` size argument into `W,H`, or `undefined` if invalid. */
function parseSize(size: string): string | undefined {
  const match = /^(\d+)x(\d+)$/.exec(size)
  if (!match) return undefined
  return `${Number(match[1])},${Number(match[2])}`
}

/** Ask the OS for a free port by binding `0`, then release it. Each instance
 *  gets its own port so concurrent agents in one container never collide. */
function pickFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(0, HOST, () => {
      const address = probe.address()
      if (address === null || typeof address === 'string') {
        probe.close()
        reject(new Error('could not determine a free port'))
        return
      }
      const { port } = address
      probe.close(() => resolve(port))
    })
  })
}

function logPathFor(port: number): string {
  return join(tmpdir(), `terrarium-preview-${port}.log`)
}

/** Spawn the server as a DETACHED child (its own process group, so `stop` can
 *  kill the whole tree by group) with stdout/stderr redirected to a log file
 *  (so it survives the parent exiting in `start`, and so `shot` can read it for
 *  diagnostics on a failed startup). */
function spawnServer(port: number, dev: boolean, logPath: string): ChildProcess {
  const fd = openSync(logPath, 'w')
  const env = { ...process.env, HOST, PORT: String(port), NITRO_PORT: String(port) }
  const child = dev
    ? spawn('pnpm', ['exec', 'nuxt', 'dev', '--host', HOST, '--port', String(port)], {
        detached: true,
        stdio: ['ignore', fd, fd],
        env,
      })
    : spawn(process.execPath, [SERVER_ENTRY], {
        detached: true,
        stdio: ['ignore', fd, fd],
        env,
      })
  closeSync(fd)
  child.unref() // don't keep our own event loop alive on the child's account
  return child
}

/** Poll the server until it answers HTTP (any status = "up"), the child exits,
 *  or the timeout elapses. Returns whether it came up. */
async function waitReady(port: number, child: ChildProcess): Promise<boolean> {
  const url = `http://${HOST}:${port}/`
  const deadline = Date.now() + READY_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (child.exitCode !== null) return false // server died during startup
    try {
      await fetch(url, { method: 'HEAD' })
      return true
    } catch {
      // connection refused / reset — not up yet, keep polling
    }
    await sleep(POLL_INTERVAL_MS)
  }
  return false
}

/** Explain a failed startup with the concrete likely causes (issue #240 asked
 *  for this): the bind race, a missing build, or a crash — with the server's
 *  own captured output shown so the real error isn't swallowed. */
function diagnose(port: number, child: ChildProcess, dev: boolean, logPath: string): void {
  console.error(`\nPreview server on port ${port} did not become ready.`)
  if (child.exitCode !== null) {
    console.error(`The server process exited early (code ${child.exitCode}).`)
  }
  console.error('Most likely causes:')
  console.error(
    `  1. The ephemeral port ${port} was claimed by another process between ` +
      'selection and bind (a rare race under concurrent agents) — just retry.',
  )
  if (!dev) {
    console.error(
      `  2. No build present — \`${SERVER_ENTRY}\` ` +
        `${existsSync(SERVER_ENTRY) ? 'exists' : 'is MISSING'}. ` +
        'Preview needs a prior `pnpm build` (or use --dev).',
    )
  }
  console.error('  3. The server crashed on startup — its output follows:')
  let tail = ''
  try {
    tail = readFileSync(logPath, 'utf8').slice(-2000)
  } catch {
    // no log to show
  }
  console.error(tail.trim() ? tail.trim() : '  (no server output was captured)')
}

/** Terminate a process group (leader `pid`), escalating SIGTERM → SIGKILL.
 *  Never throws — a process that's already gone is success, not an error. This
 *  is why teardown can always exit 0. */
async function killGroup(pid: number): Promise<void> {
  const signal = (sig: NodeJS.Signals): boolean => {
    // Try the whole group first (negative pid), then fall back to the lone pid.
    for (const target of [-pid, pid]) {
      try {
        process.kill(target, sig)
        return true
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ESRCH') continue // already gone
      }
    }
    return false
  }
  if (!signal('SIGTERM')) return
  const deadline = Date.now() + KILL_GRACE_MS
  while (Date.now() < deadline) {
    // `kill(pid, 0)` throws ESRCH once the process is truly gone.
    try {
      process.kill(-pid, 0)
    } catch {
      try {
        process.kill(pid, 0)
      } catch {
        return // group is gone
      }
    }
    await sleep(150)
  }
  signal('SIGKILL')
}

function ensureBuilt(dev: boolean): void {
  if (dev) return
  if (!existsSync(SERVER_ENTRY)) {
    throw new Error(
      `No built server at \`${SERVER_ENTRY}\`. Run \`pnpm build\` first, ` +
        'or pass --dev to use the dev server.',
    )
  }
}

/** A running server owned by the caller. `pid` is the process-group leader —
 *  hand it to `stopPreview` (or `preview.ts stop`) to tear the server down. */
export interface PreviewServer {
  port: number
  url: string
  pid: number
  logPath: string
}

/**
 * Start a `preview` (or, with `dev`, a `nuxt dev`) server on its OWN ephemeral
 * port and resolve once it answers HTTP. The returned handle's `pid` must be
 * passed to `stopPreview` when done. Exported so other scripts
 * (`scripts/plate-gallery.ts`, ad-hoc probes) can manage a server without
 * re-hand-rolling the `pkill` dance this whole file exists to kill (#240).
 *
 * Throws — with a "likely causes" diagnostic already printed to stderr — if the
 * server can't be built or fails to come up; the failed child is cleaned up
 * first, so a throw never leaks a process.
 */
export async function startPreview(opts: { dev?: boolean } = {}): Promise<PreviewServer> {
  const dev = opts.dev ?? false
  ensureBuilt(dev)
  const port = await pickFreePort()
  const logPath = logPathFor(port)
  const child = spawnServer(port, dev, logPath)
  const pid = child.pid
  if (!(await waitReady(port, child)) || pid === undefined) {
    diagnose(port, child, dev, logPath)
    if (pid !== undefined) await killGroup(pid)
    try {
      rmSync(logPath)
    } catch {
      // best-effort cleanup
    }
    throw new Error(`preview server did not become ready on port ${port}`)
  }
  return { port, url: `http://${HOST}:${port}`, pid, logPath }
}

/** Tear down a server started by `startPreview`. Always resolves — a process
 *  that's already gone is success, not an error — so teardown is never a
 *  dropped-step footgun. */
export async function stopPreview(pid: number): Promise<void> {
  await killGroup(pid)
}

interface ShotWait {
  /** Raw `--wait` value (ms), still a string; validated here. */
  waitMs?: string
  /** Raw `--wait-for` value: a CSS selector to await before capturing. */
  waitForSelector?: string
}

async function doShot(args: string[], dev: boolean, wait: ShotWait): Promise<number> {
  const [route, out, sizeArg] = args
  if (!route || !out) {
    console.error(USAGE)
    return 1
  }
  const windowSize = sizeArg === undefined ? '1280,800' : parseSize(sizeArg)
  if (!windowSize) {
    console.error(`Invalid size "${sizeArg}" — expected <width>x<height>, e.g. 1280x1600.`)
    return 1
  }
  let waitMs = 2000
  if (wait.waitMs !== undefined) {
    const parsed = Number(wait.waitMs)
    if (!Number.isInteger(parsed) || parsed < 0) {
      console.error(`Invalid --wait "${wait.waitMs}" — expected a non-negative integer (ms).`)
      return 1
    }
    waitMs = parsed
  }

  let server: PreviewServer
  try {
    server = await startPreview({ dev })
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    return 1
  }
  const path = route.startsWith('/') ? route : `/${route}`
  const url = `${server.url}${path}`
  try {
    if (wait.waitForSelector) {
      await captureScreenshotWaitingFor(url, out, wait.waitForSelector, windowSize)
    }
    else {
      captureScreenshot(url, out, windowSize, waitMs)
    }
    console.log(`Wrote ${out} (${url})`)
    return 0
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    return 1
  } finally {
    await stopPreview(server.pid)
    try {
      rmSync(server.logPath)
    } catch {
      // best-effort cleanup
    }
  }
}

async function doStart(dev: boolean): Promise<number> {
  let server: PreviewServer
  try {
    server = await startPreview({ dev })
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    return 1
  }
  console.log(`PID=${server.pid}`)
  console.log(`URL=${server.url}`)
  console.log(`Log=${server.logPath}`)
  console.log(`Stop it with: pnpm exec tsx scripts/preview.ts stop ${server.pid}`)
  return 0 // the server keeps running; this process exits (child is unref'd)
}

async function doStop(args: string[]): Promise<number> {
  const pid = Number(args[0])
  if (!Number.isInteger(pid) || pid <= 0) {
    console.error('Usage: pnpm exec tsx scripts/preview.ts stop <pid>')
    // A malformed pid is a usage error; teardown of a real pid always succeeds.
    return 1
  }
  await stopPreview(pid)
  console.log(`Stopped preview server ${pid} (or it was already gone).`)
  return 0 // teardown is always a success — never a dropped-step footgun
}

async function main(): Promise<number> {
  const [verb, ...rest] = process.argv.slice(2)
  const dev = rest.includes('--dev')
  const withoutDev = rest.filter((arg) => arg !== '--dev')
  const waitFor = extractFlag(withoutDev, '--wait-for')
  const waitMs = extractFlag(waitFor.rest, '--wait')
  const args = waitMs.rest
  switch (verb) {
    case 'shot':
      return doShot(args, dev, { waitMs: waitMs.value, waitForSelector: waitFor.value })
    case 'start':
      return doStart(dev)
    case 'stop':
      return doStop(args)
    default:
      console.error(USAGE)
      return 1
  }
}

// Run the CLI only when invoked directly — not when another script imports
// `startPreview`/`stopPreview` (importing must not run `main()` and consume the
// importer's argv, the same trap guarded in `scripts/screenshot.ts`).
function invokedDirectly(): boolean {
  const entry = process.argv[1]
  if (!entry) return false
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
}

if (invokedDirectly()) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      console.error(err instanceof Error ? err.stack ?? err.message : String(err))
      process.exit(1)
    },
  )
}
