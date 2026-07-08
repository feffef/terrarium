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
import { existsSync, openSync, closeSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { captureScreenshot } from './screenshot'

const HOST = '127.0.0.1'
const READY_TIMEOUT_MS = 45_000
const POLL_INTERVAL_MS = 300
const KILL_GRACE_MS = 5_000
const SERVER_ENTRY = '.output/server/index.mjs'

const USAGE =
  'Usage:\n' +
  '  pnpm exec tsx scripts/preview.ts shot <route> <out.png> [WxH] [--dev]\n' +
  '  pnpm exec tsx scripts/preview.ts start [--dev]\n' +
  '  pnpm exec tsx scripts/preview.ts stop <pid>\n' +
  '  <route>  a path on the site, e.g. /t/journal/current\n' +
  '  [WxH]    optional window size (e.g. 1280x1600); defaults to 1280x800\n' +
  '  --dev    use `nuxt dev` instead of a built `preview` server (fast, but the\n' +
  '           DevTools overlay makes it unfit for a trusted screenshot)'

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

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

function ensureBuiltOrExit(dev: boolean): void {
  if (dev) return
  if (!existsSync(SERVER_ENTRY)) {
    console.error(
      `No built server at \`${SERVER_ENTRY}\`. Run \`pnpm build\` first, ` +
        'or pass --dev to use the dev server.',
    )
    process.exit(1)
  }
}

async function doShot(args: string[], dev: boolean): Promise<number> {
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
  ensureBuiltOrExit(dev)

  const port = await pickFreePort()
  const logPath = logPathFor(port)
  const child = spawnServer(port, dev, logPath)
  const path = route.startsWith('/') ? route : `/${route}`
  const url = `http://${HOST}:${port}${path}`
  try {
    if (!(await waitReady(port, child))) {
      diagnose(port, child, dev, logPath)
      return 1
    }
    captureScreenshot(url, out, windowSize)
    console.log(`Wrote ${out} (${url})`)
    return 0
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    return 1
  } finally {
    if (child.pid !== undefined) await killGroup(child.pid)
    try {
      rmSync(logPath)
    } catch {
      // best-effort cleanup
    }
  }
}

async function doStart(dev: boolean): Promise<number> {
  ensureBuiltOrExit(dev)
  const port = await pickFreePort()
  const logPath = logPathFor(port)
  const child = spawnServer(port, dev, logPath)
  if (!(await waitReady(port, child))) {
    diagnose(port, child, dev, logPath)
    if (child.pid !== undefined) await killGroup(child.pid)
    return 1
  }
  console.log(`PID=${child.pid}`)
  console.log(`URL=http://${HOST}:${port}`)
  console.log(`Log=${logPath}`)
  console.log(`Stop it with: pnpm exec tsx scripts/preview.ts stop ${child.pid}`)
  child.unref() // let this process exit while the server keeps running
  return 0
}

async function doStop(args: string[]): Promise<number> {
  const pid = Number(args[0])
  if (!Number.isInteger(pid) || pid <= 0) {
    console.error('Usage: pnpm exec tsx scripts/preview.ts stop <pid>')
    // A malformed pid is a usage error; teardown of a real pid always succeeds.
    return 1
  }
  await killGroup(pid)
  console.log(`Stopped preview server ${pid} (or it was already gone).`)
  return 0 // teardown is always a success — never a dropped-step footgun
}

async function main(): Promise<number> {
  const [verb, ...rest] = process.argv.slice(2)
  const dev = rest.includes('--dev')
  const args = rest.filter((arg) => arg !== '--dev')
  switch (verb) {
    case 'shot':
      return doShot(args, dev)
    case 'start':
      return doStart(dev)
    case 'stop':
      return doStop(args)
    default:
      console.error(USAGE)
      return 1
  }
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err instanceof Error ? err.stack ?? err.message : String(err))
    process.exit(1)
  },
)
