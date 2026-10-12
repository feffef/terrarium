// Decides whether the e2e spec may serve the gate's own `pnpm build` output
// instead of building a second time. Fail closed: a stale reuse once hid a
// regression (issue #907), so any doubt means "build".
import { execFileSync } from 'node:child_process'
import { lstatSync } from 'node:fs'
import { dirname, join } from 'node:path'

export function isFresh(outputMtimeMs: number | undefined, sourceMtimesMs: Iterable<number>): boolean {
  if (outputMtimeMs === undefined) return false
  for (const mtime of sourceMtimesMs) if (mtime > outputMtimeMs) return false
  return true
}

function mtimeOf(path: string): number | undefined {
  try {
    return lstatSync(path).mtimeMs
  } catch {
    return undefined
  }
}

/** Every source file's mtime, plus each ancestor directory's: a deletion moves only the directory's. */
function sourceMtimes(root: string): number[] {
  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'ignore'] }).split('\0').filter(Boolean)
  const files = [...git('ls-files', '-z'), ...git('ls-files', '-z', '--others', '--exclude-standard')]
  const paths = new Set(files)
  for (const file of files) for (let dir = dirname(file); !paths.has(dir); dir = dirname(dir)) paths.add(dir)
  return [...paths].flatMap((path) => mtimeOf(join(root, path)) ?? [])
}

/** The `.output` dir to reuse, or `undefined` when the spec must build. */
export function reusableOutput(
  root: string,
  env: NodeJS.ProcessEnv = process.env,
): { dir: string, builtAt: Date } | undefined {
  if (env.E2E_FRESH_BUILD) return undefined
  const dir = join(root, '.output')
  const outputMtime = mtimeOf(join(dir, 'server', 'index.mjs'))
  try {
    return isFresh(outputMtime, sourceMtimes(root)) ? { dir, builtAt: new Date(outputMtime!) } : undefined
  } catch {
    return undefined
  }
}
