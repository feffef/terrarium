// What every script CLI shares (#2185). `guard-io.ts` is Human-only and keeps
// its own `runIfMain`; this is the one for everything else.
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// Not re-exported from shared/expand.ts: that pulls in jiti and zod, ~45ms on
// every hint run that reaches this module through validate-adr-rules.ts.
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/** Print `<script>: msg` and exit 1. The prefix is the entry script's name,
 *  which is what every copy hard-coded. */
export function fail(msg: string): never {
  console.error(`${basename(process.argv[1] ?? '', '.ts')}: ${msg}`)
  process.exit(1)
}

/** True when the module at `importMetaUrl` is the script being run, not imported. */
export function isMain(importMetaUrl: string): boolean {
  return importMetaUrl === pathToFileURL(process.argv[1] ?? '').href
}

/** Run `main` when executed directly; an error it throws or rejects with fails the script. */
export function runIfMain(importMetaUrl: string, main: () => void | Promise<void>): void {
  if (!isMain(importMetaUrl)) return
  const onError = (err: unknown): never => fail(err instanceof Error ? err.message : String(err))
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
