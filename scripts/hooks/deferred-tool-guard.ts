// Backstop for issues #612 and #724: agents kept calling a deferred tool
// (`TaskCreate`) with a guessed schema, and two prose rules failed to stop it.
// Denies a call that wears another tool's argument shape, or hands `TaskCreate`
// an array, and points at ToolSearch. A hook sees only `tool_name` and
// `tool_input`, so the foreign shape is the one signal it has. It fails open.
// Whether it fires before the harness's own schema check: `docs/agents/guards.md`.
//
// Usage: tsx scripts/hooks/deferred-tool-guard.ts   # hook JSON on stdin
import { buildDenyOutput, readHookPayload, runGuard, type DenyOutput } from './hook-io.ts'

/** Argument keys that together identify ONE tool; another tool's call carrying
 *  all of them is the #612 confusion. */
export interface ForeignSignature {
  /** The tool these arguments actually belong to. */
  owner: string
  /** Keep the set minimal but combined: a lone common key like `prompt` over-matches. */
  requiredKeys: string[]
}

/** `Agent`'s shape is the one every recorded recurrence borrowed. Add a row per
 *  newly seen confusion. */
export const FOREIGN_SIGNATURES: readonly ForeignSignature[] = [
  { owner: 'Agent', requiredKeys: ['prompt', 'subagent_type'] },
]

/** Tools that take one item per call; `TaskCreate` was batched into an array
 *  three times (#724), which key presence can't express. */
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

/** Pure core: the first signature of a different tool that this call carries, or
 *  `null`. Never throws; the owner's own calls always pass. */
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

/** Self-contained: it must work without the agent having read CLAUDE.md. */
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

export function denyOutputFor(finding: GuardFinding | null): DenyOutput | null {
  return finding ? buildDenyOutput(formatGuardMessage(finding)) : null
}

/** Always exits 0: a call it can't positively identify as the confusion passes. */
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

runGuard(import.meta.url, { main, label: 'deferred-tool guard', ref: 'issue #612', failOpen: true })
