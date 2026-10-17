import { execFileSync } from 'node:child_process'
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/** Runs a repo `.ts` script as the hook would and returns its stdout. Loads tsx
 *  into `node` directly, skipping the tsx bin's startup, which dominated the
 *  guard specs. `tsx` resolves from `cwd`. */
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

export const FORWARDED = 'tsx-ran'

/** A copy of a `.sh` pre-filter whose `node_modules/.bin/tsx` only prints
 *  `FORWARDED`: shows whether the pre-filter's own grep let a payload through
 *  without paying a tsx start per case. Returns the pre-filter's stdout. */
export function prefilterReaching(script: string): (input: string) => string {
  const dir = tempDir('prefilter-')
  mkdirSync(join(dir, 'scripts/hooks'), { recursive: true })
  mkdirSync(join(dir, 'node_modules/.bin'), { recursive: true })
  copyFileSync(join(root, 'scripts/hooks', script), join(dir, 'scripts/hooks', script))
  const tsx = join(dir, 'node_modules/.bin/tsx')
  writeFileSync(tsx, `#!/bin/sh\ncat >/dev/null\nprintf '${FORWARDED}'\n`)
  chmodSync(tsx, 0o755)
  return (input) => execFileSync('sh', [join('scripts/hooks', script)], { cwd: dir, input, encoding: 'utf8' })
}
