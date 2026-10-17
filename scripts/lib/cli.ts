// Guards use `hooks/hook-io.ts` instead: they must deny on a crash, where
// `runIfMain` here exits 1.
import { realpathSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Not re-exported from shared/expand.ts: that pulls in jiti and zod, ~45ms on
// every hook run, and every guard and hint imports this module.
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/** Print `<script>: msg` and exit 1. The prefix is the entry script's name. */
export function fail(msg: string): never {
  console.error(`${basename(process.argv[1] ?? '', '.ts')}: ${msg}`)
  process.exit(1)
}

/** True when the module at `importMetaUrl` is the script being run, not imported.
 *  Compares real paths so a symlinked entry (`.claude/skills/…`) still matches. */
export function isMain(importMetaUrl: string): boolean {
  const entry = process.argv[1]
  if (!entry) return false
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(importMetaUrl))
  } catch {
    return false
  }
}

/** Run `main` when executed directly. Expected failures call `fail`, which
 *  exits, so an error reaching here is unexpected: print its stack. */
export function runIfMain(importMetaUrl: string, main: () => void | Promise<void>): void {
  if (!isMain(importMetaUrl)) return
  const onError = (err: unknown): never => fail(err instanceof Error ? (err.stack ?? err.message) : String(err))
  try {
    const done = main()
    if (done instanceof Promise) done.catch(onError)
  } catch (err) {
    onError(err)
  }
}

/** The value after `name` in `argv`; `undefined` if the flag is absent or last. */
export function flagValue(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : undefined
}

/** Pull a `--flag value` pair out of `argv`, returning the value (last wins if
 *  repeated) and the args with every occurrence removed. Keeps positional
 *  parsing downstream unaware of the value-taking flags. */
export function extractFlag(argv: string[], flag: string): { value: string | undefined; rest: string[] } {
  const rest: string[] = []
  let value: string | undefined
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === flag) {
      value = argv[i + 1] // undefined if the flag is trailing; validated by the caller
      i++ // consume the value too
    } else if (arg !== undefined) {
      rest.push(arg)
    }
  }
  return { value, rest }
}

/** Pull a boolean `--flag` out of `argv`, reporting whether it was present. */
export function extractSwitch(argv: string[], flag: string): { on: boolean; rest: string[] } {
  return { on: argv.includes(flag), rest: argv.filter((arg) => arg !== flag) }
}

// Below common inline-capture caps (issue #976 cites ~30KB overflows), with
// margin for the cap varying by caller.
export const OUTPUT_FILE_THRESHOLD = 20_000

/** Where to send JSON output: `--out PATH` always writes there; otherwise
 *  `defaultPath` once `jsonLength` exceeds the inline-capture threshold.
 *  `null` means stdout. */
export function resolveOutputTarget(argv: string[], jsonLength: number, defaultPath: string): string | null {
  const out = flagValue(argv, '--out')
  if (out) return out
  return jsonLength > OUTPUT_FILE_THRESHOLD ? defaultPath : null
}
