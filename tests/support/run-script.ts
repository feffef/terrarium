import { execFileSync } from 'node:child_process'
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/** Runs a repo `.ts` script as the hook would and returns its stdout. Loads tsx
 *  into `node` directly: `pnpm exec tsx` adds ~1 s of pnpm and tsx-bin startup
 *  to every call, which dominated the guard specs. `tsx` resolves from `cwd`. */
export function runTsx(
  script: string,
  opts: { input?: string; args?: string[]; env?: NodeJS.ProcessEnv; cwd?: string } = {},
): string {
  return execFileSync(process.execPath, ['--import', 'tsx', script, ...(opts.args ?? [])], {
    cwd: opts.cwd ?? root,
    input: opts.input,
    env: opts.env,
    encoding: 'utf8',
  })
}

function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  process.on('exit', () => rmSync(dir, { recursive: true, force: true }))
  return dir
}

let shimDir: string | undefined

/** An env where `pnpm exec tsx <script>` is `node --import tsx <script>`, for
 *  the `.sh` pre-filters that forward to the guard through pnpm. The real guard
 *  still runs; only pnpm's startup is skipped. Any other pnpm call fails loudly. */
export function envWithTsxShim(): NodeJS.ProcessEnv {
  if (!shimDir) {
    shimDir = tempDir('pnpm-shim-')
    const pnpm = join(shimDir, 'pnpm')
    writeFileSync(
      pnpm,
      `#!/bin/sh\n[ "$1 $2" = "exec tsx" ] || { echo "pnpm shim: unexpected call: $*" >&2; exit 2; }\nshift 2\nexec "${process.execPath}" --import tsx "$@"\n`,
    )
    chmodSync(pnpm, 0o755)
  }
  return { ...process.env, PATH: `${shimDir}${delimiter}${process.env.PATH ?? ''}` }
}

export const FORWARDED = 'tsx-ran'

/** A copy of a `.sh` pre-filter whose `node_modules/.bin/tsx` only prints
 *  `FORWARDED`: shows whether the pre-filter's own grep let a payload through
 *  without paying a tsx start per case. Returns the pre-filter's stdout. */
export function prefilterReaching(script: string): (input: string) => string {
  const dir = tempDir('prefilter-')
  mkdirSync(join(dir, 'scripts'))
  mkdirSync(join(dir, 'node_modules/.bin'), { recursive: true })
  copyFileSync(join(root, 'scripts', script), join(dir, 'scripts', script))
  const tsx = join(dir, 'node_modules/.bin/tsx')
  writeFileSync(tsx, `#!/bin/sh\ncat >/dev/null\nprintf '${FORWARDED}'\n`)
  chmodSync(tsx, 0o755)
  return (input) => execFileSync('sh', [join('scripts', script)], { cwd: dir, input, encoding: 'utf8' })
}
