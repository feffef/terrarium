// Mechanical backstop for issue #612: CLAUDE.md's doc-only "before the first
// call to any deferred tool this session, load its schema via ToolSearch" rule
// has now failed to hold THREE times for the same tool, `TaskCreate` — each
// time by calling it with the `Agent` tool's argument shape (`prompt` +
// `subagent_type`) without loading its real schema first (#386, #432, and the
// third recurrence this issue records). Two prose-only strengthenings already
// failed, so this is the mechanical guard the owner chose (option 2).
//
// The failure has a distinctive, low-false-positive fingerprint: a call to a
// tool whose arguments carry the *distinctive signature of a DIFFERENT tool*.
// A `PreToolUse` hook (wired in `.claude/settings.json`) gets the invoked
// `tool_name` and raw `tool_input` on stdin — the only two facts a hook has,
// since it holds no list of which tools are deferred nor their (unloaded)
// schemas. So the one robust, general signal available is exactly the observed
// mistake: "these args match some *other* known tool's signature." When they
// do, block the call with a corrective message that names the real owner tool
// and points at ToolSearch, instead of letting it fail with a terse harness
// `InputValidationError` the agent then has to decode.
//
// VIABILITY / SCOPE (recorded, not papered over — issue #612 asked for this):
// whether this hook fires *before* the harness rejects a schema-invalid
// deferred-tool call is a property of the host, not of this repo — see the PR
// and `docs/agents/guards.md` for the empirical finding. This
// module is written to be the strongest reachable mechanism either way: if the
// hook fires at call time it blocks pre-emptively with a useful message; the
// same pure core (`checkToolCall`) is also exposed so an after-the-fact
// transcript detector can reuse it. It never itself throws or exits non-zero on
// a well-formed call (a guard must never wedge normal tool use).
//
// Pure core (`checkToolCall`, `denyOutputFor`) is kept separate from the
// shared stdin/bootstrap plumbing (`guard-io.ts`, issue #1080) — the one guard
// there wired with `failOpen: true`, since it must never deny a call it could
// not positively identify.
//
// Usage (normally invoked by the PreToolUse hook with the payload on stdin):
//   tsx scripts/deferred-tool-guard.ts        # reads hook JSON on stdin
import { buildDenyOutput, readHookPayload, runIfMain, type DenyOutput } from './guard-io.ts'

/** A distinctive argument fingerprint that uniquely identifies ONE tool. When a
 *  call to a *different* tool carries every one of `requiredKeys`, it is almost
 *  certainly the deferred-tool-schema confusion issue #612 tracks. Data-driven
 *  so a newly-observed confusion is a one-line addition, never a logic change. */
export interface ForeignSignature {
  /** The tool these arguments actually belong to. */
  owner: string
  /** Keys that, present together, distinctively identify `owner`. Keep this the
   *  minimal distinctive set — a single common key like `prompt` alone would
   *  over-match; the COMBINATION is what makes it unambiguous. */
  requiredKeys: string[]
}

/** The seed registry. `Agent` (`prompt` + `subagent_type`) is the exact shape
 *  every recorded recurrence borrowed for `TaskCreate` (#386/#432/#612). Only
 *  the `Agent` tool legitimately takes both keys, so any OTHER tool called with
 *  both is the confusion. Add a row here as new foreign-shape confusions surface
 *  (e.g. another deferred tool repeatedly called with some known tool's shape).
 *  This is NOT `TaskCreate`-specific: it fires for ANY tool wrongly wearing the
 *  Agent shape (the rule is about every deferred tool — CLAUDE.md, issue #612). */
export const FOREIGN_SIGNATURES: readonly ForeignSignature[] = [
  { owner: 'Agent', requiredKeys: ['prompt', 'subagent_type'] },
]

/** Tools that take one item per call. Three post-guard recurrences for
 *  `TaskCreate` batched many into a top-level array instead — a trait the
 *  key-presence model above cannot express (issue #724). Add a name as a new
 *  offender surfaces; the tool's real schema stays host-owned and unknown. */
export const OWN_SHAPE_ANTIPATTERNS: readonly string[] = ['TaskCreate']

/** The top-level key holding an array for a tool that never takes one, or
 *  `null`. Same posture as `checkToolCall`: pure, never throws, fails open. */
export function checkOwnShape(
  toolName: string,
  toolInput: unknown,
  tools: readonly string[] = OWN_SHAPE_ANTIPATTERNS,
): string | null {
  if (toolInput === null || typeof toolInput !== 'object') return null
  if (!tools.includes(toolName)) return null
  return Object.entries(toolInput as Record<string, unknown>).find(([, v]) => Array.isArray(v))?.[0] ?? null
}

/** Names the batching mistake rather than `formatGuardMessage`'s foreign-shape
 *  framing: every recorded case guessed a convenience shape, not another
 *  tool's (issue #724). */
export function formatOwnShapeMessage(toolName: string, arrayKey: string): string {
  return (
    `Blocked (issue #724 deferred-tool guard): you called \`${toolName}\` with an array under ` +
    `\`${arrayKey}\`. It takes one item per call, not a batched array — call it once per item instead.`
  )
}

export interface GuardFinding {
  /** The tool that was actually called (the wrong one). */
  calledTool: string
  /** The tool whose shape the arguments match. */
  looksLikeTool: string
  /** The distinctive keys that triggered the match. */
  matchedKeys: string[]
}

/** The pure, unit-testable core: does this `(toolName, toolInput)` call carry a
 *  DIFFERENT tool's distinctive signature? Returns the first matching finding,
 *  or `null` when the call is fine. Never throws — a non-object `toolInput`
 *  (or `null`) simply matches nothing. A call whose own name equals a
 *  signature's `owner` is always allowed (that IS the legitimate use). */
export function checkToolCall(
  toolName: string,
  toolInput: unknown,
  signatures: readonly ForeignSignature[] = FOREIGN_SIGNATURES,
): GuardFinding | null {
  if (toolInput === null || typeof toolInput !== 'object') return null
  const keys = new Set(Object.keys(toolInput as Record<string, unknown>))
  for (const sig of signatures) {
    if (toolName === sig.owner) continue // the legitimate caller of this shape
    if (sig.requiredKeys.every((k) => keys.has(k))) {
      return { calledTool: toolName, looksLikeTool: sig.owner, matchedKeys: sig.requiredKeys }
    }
  }
  return null
}

/** The corrective message shown to the agent when the guard blocks — it must be
 *  self-contained (the whole point is that it works WITHOUT the agent having
 *  read CLAUDE.md), naming the concrete fix: load the intended tool's schema via
 *  `ToolSearch` before calling it. */
export function formatGuardMessage(f: GuardFinding): string {
  return (
    `Blocked (issue #612 deferred-tool guard): you called \`${f.calledTool}\` with the ` +
    `\`${f.looksLikeTool}\` tool's argument shape (${f.matchedKeys.map((k) => `\`${k}\``).join(' + ')}). ` +
    `That is the recurring mistake of calling a DEFERRED tool with a guessed, wrong-shaped ` +
    `parameter set — it would fail with an InputValidationError. ` +
    `Load \`${f.calledTool}\`'s real schema first with ToolSearch (query "select:${f.calledTool}"), ` +
    `then call it with the parameters that schema actually defines. ` +
    `If you truly meant the \`${f.looksLikeTool}\` tool, call \`${f.looksLikeTool}\` instead.`
  )
}

/** The `PreToolUse` "deny" control object a hook writes to stdout to block a
 *  call and show `permissionDecisionReason` to the model (Claude Code hooks
 *  reference). Returns `null` when nothing should be blocked, so `main` writes
 *  nothing and the call proceeds untouched. */
export function denyOutputFor(finding: GuardFinding | null): DenyOutput | null {
  return finding ? buildDenyOutput(formatGuardMessage(finding)) : null
}

/** Reads the hook JSON on stdin, runs the pure check, and — only on a match —
 *  writes the deny control object to stdout. Always exits 0: an allowed call
 *  (or any parse/read failure) must let normal tool use proceed. This is a
 *  backstop, so it fails OPEN — it never blocks a call it could not positively
 *  identify as the confusion. */
export function main(): void {
  const result = readHookPayload()
  if (result.kind !== 'ok') return // no stdin, blank stdin, bad JSON, or no tool_name — do not interfere

  const { tool_name, tool_input } = result.payload
  const arrayKey = checkOwnShape(tool_name, tool_input)
  const output =
    denyOutputFor(checkToolCall(tool_name, tool_input)) ??
    (arrayKey === null ? null : buildDenyOutput(formatOwnShapeMessage(tool_name, arrayKey)))
  if (output) process.stdout.write(JSON.stringify(output))
}

runIfMain(import.meta.url, { main, label: 'deferred-tool guard', ref: 'issue #612', failOpen: true })
