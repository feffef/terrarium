// Shared `PreToolUse` hook plumbing (issue #1080): the stdin→deny-JSON→
// `--dry-run`→bootstrap wiring around a guard's pure predicate. Only the
// predicate and the deny message are per-guard. `deferred-tool-guard.ts` passes
// `failOpen: true`: it must never deny a call it could not positively identify.
//
// Each guard keeps its OWN header as the single home for its rationale,
// detection contract and residual fail-opens (`docs/agents/guards.md`) — this
// file carries none of that, only the mechanical shape.
import { readFileSync } from 'node:fs'
import { flagValue, isMain } from '../lib/cli.ts'
import { parseTranscript } from '../session/transcript-trace.ts'

/** `obj[key]` for an untyped payload, `undefined` for anything not an object. */
export function prop(obj: unknown, key: string): unknown {
  return obj !== null && typeof obj === 'object' ? (obj as Record<string, unknown>)[key] : undefined
}

/** The subset of the `PreToolUse` stdin payload every guard reads. */
export interface PreToolUsePayload {
  tool_name?: string
  tool_input?: unknown
  transcript_path?: string
}

/** `PreToolUsePayload` once `tool_name` is known to be a string. */
export interface ValidatedPayload extends PreToolUsePayload {
  tool_name: string
}

export interface DenyOutput {
  hookSpecificOutput: {
    hookEventName: string
    permissionDecision: string
    permissionDecisionReason: string
  }
}

/** The `PreToolUse` "deny" control object a hook writes to stdout to block a
 *  call (Claude Code hooks reference). */
export function buildDenyOutput(reason: string): DenyOutput {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }
}

export type HookPayloadResult =
  | { kind: 'none' } // no stdin, or blank stdin: a bare manual run, not a tool call to police
  | { kind: 'invalid' } // stdin present but not valid JSON
  | { kind: 'no-tool' } // valid JSON, but it names no tool_name string
  | { kind: 'ok'; payload: ValidatedPayload }

/** The hook JSON on stdin, whatever event it is — for the hints that also
 *  take a `UserPromptSubmit` payload, which names no tool. `none` covers both
 *  no stdin at all and blank stdin; neither is a guard fault, so it applies
 *  regardless of whether the caller fails open or closed. Never throws. */
export function readHookJson(): { kind: 'none' } | { kind: 'invalid' } | { kind: 'ok'; json: unknown } {
  let raw: string
  try {
    raw = readFileSync(0, 'utf8')
  } catch {
    return { kind: 'none' }
  }
  if (!raw.trim()) return { kind: 'none' }
  try {
    return { kind: 'ok', json: JSON.parse(raw) }
  } catch {
    return { kind: 'invalid' }
  }
}

/** `readHookJson` plus the shape check: the payload must name a `tool_name`
 *  string. Never throws. */
export function readHookPayload(): HookPayloadResult {
  const read = readHookJson()
  if (read.kind !== 'ok') return read
  if (typeof prop(read.json, 'tool_name') !== 'string') return { kind: 'no-tool' }
  return { kind: 'ok', payload: read.json as ValidatedPayload }
}

/** The session transcript at `path`, parsed. `null` for a missing path or an
 *  unreadable file — which a fail-closed guard denies on. */
export function readTranscript(path: string | undefined): Record<string, unknown>[] | null {
  if (!path) return null
  try {
    return parseTranscript(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

/** Denies a call a fail-CLOSED guard could not even inspect. A fail-OPEN guard
 *  (`deferred-tool-guard.ts`) must never call this — it has nothing to fall
 *  back to but silence. */
export function denyUninspectable(label: string, ref: string, detail: string): void {
  process.stdout.write(
    JSON.stringify(
      buildDenyOutput(
        `Blocked by the ${label} (${ref}): ${detail}, so this call could not be checked. The guard fails ` +
          `CLOSED. This is a guard fault, not an authoring mistake — report it rather than working around it.`,
      ),
    ),
  )
}

/** The direct-run bootstrap every guard repeats: dispatch to `--dry-run` or
 *  `main`. A crash or rejection denies (fails closed) unless `failOpen`, which
 *  stays silent (a hook must never wedge tool use with its own fault). A crash
 *  also blocks through `"onFailure": "block"`, but this deny names the guard and
 *  its issue. Call it with the CALLING module's `import.meta.url`. */
export function runGuard(
  moduleUrl: string,
  opts: {
    main: () => void | Promise<void>
    dryRun?: (argv: string[]) => void | Promise<void>
    label: string
    ref: string
    failOpen?: boolean
  },
): void {
  if (!isMain(moduleUrl)) return
  const argv = process.argv.slice(2)
  const onCrash = (err: unknown): void => {
    if (opts.failOpen) return
    denyUninspectable(opts.label, opts.ref, `the guard itself crashed (${err instanceof Error ? err.message : String(err)})`)
  }
  try {
    const done = opts.dryRun && argv.includes('--dry-run') ? opts.dryRun(argv) : opts.main()
    if (done instanceof Promise) done.catch(onCrash)
  } catch (err) {
    onCrash(err)
  }
}

// --- `--dry-run` flag plumbing ----------------------------------------------

/** Every guard's `--dry-run` requires `--tool <name>`; prints `usage` and
 *  exits(1) when it's missing. */
export function requireToolFlag(argv: string[], usage: string): string {
  const tool = flagValue(argv, '--tool')
  if (!tool) {
    console.error(usage)
    process.exit(1)
  }
  return tool
}

/** `--input <json>` or `--input-file <path>` → the parsed `tool_input`, `{}`
 *  when neither is given. `--input-file` exists because a DENYING `--input`
 *  cannot always survive the trip inline — the very Bash call carrying it can
 *  be what the guard being probed denies (`workflow-edit-guard.ts`). Exits(1)
 *  with a message on an unreadable file or invalid JSON, rather than the
 *  bootstrap's fail-closed catch, which would print a deny control object a
 *  dry run must never emit. */
export function resolveDryRunInput(argv: string[]): unknown {
  const inputFile = flagValue(argv, '--input-file')
  let rawInput = flagValue(argv, '--input')
  if (inputFile !== undefined) {
    try {
      rawInput = readFileSync(inputFile, 'utf8')
    } catch (err) {
      console.error(`--input-file could not be read: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  }
  if (rawInput === undefined) return {}
  try {
    return JSON.parse(rawInput)
  } catch {
    console.error(inputFile !== undefined ? `${inputFile} does not contain valid JSON` : '--input must be valid JSON')
    process.exit(1)
  }
}

/** Prints a `--dry-run` result as the pretty-printed JSON every guard emits. */
export function printDryRunResult(fields: Record<string, unknown>): void {
  console.log(JSON.stringify(fields, null, 2))
}
