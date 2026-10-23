// Denies a cloud session's write into `.github/workflows/` (issue #897): its token
// has no `workflow` OAuth scope, so the push is rejected whole, stranding every
// other commit in it. Reads only the tool call, so it bites before a commit exists.
// Rule and recovery: `docs/agents/environment-caveats.md`. Human-only to merge
// (ADR-0004); core split from the shared plumbing (`hook-io.ts`), per
// docs/agents/guards.md.
//
// Usage:
//   sh scripts/hooks/workflow-edit-guard.sh                 # the installed hook entry
//   tsx scripts/hooks/workflow-edit-guard.ts                # payload on stdin
//   tsx scripts/hooks/workflow-edit-guard.ts --dry-run --tool Edit --input '<json>'
//
// Fails open, so the push rejection stays the backstop for: a local session
// (pushes with the owner's key, issue #2174); a command naming no workflow path
// (`git add -A`, `git commit -a`); a re-encoded path (the `.sh` pre-filter only
// forwards payloads naming the directory); the contents-API tools (they refuse
// themselves and touch no local branch); a path reached via a variable, `xargs`
// or an unlisted editor (Bash is write-shape matching, not a shell AST).
// Accepted false positive: a command that merely QUOTES a write against the
// directory is denied; use the Edit tool or `--dry-run --input-file`.
import {
  denyUninspectable,
  buildDenyOutput,
  printDryRunResult,
  readHookPayload,
  requireToolFlag,
  resolveDryRunInput,
  runGuard,
  type DenyOutput,
} from './hook-io.ts'

const LABEL = 'workflow-edit guard'
const REF = 'issue #897'

/** The one protected directory. Matched anywhere in a path, so an absolute
 *  worktree path and a repo-relative one both hit. */
const WORKFLOW_DIR = /\.github\/workflows\//

/** What separates one command from the next. A newline counts: without it a
 *  negated class spans lines, and an unrelated `rm` above a `grep` of a
 *  workflow reads as one write — a false positive on multi-line Bash, which is
 *  routine here (caught in review of this file). */
const SEG = '[^;&|\\n]*'

/** Commands whose *argument* is a file they write, delete, or stage. Staging is
 *  included because `git add <path>` is the last step before the commit that
 *  strands the branch — the point of this guard is to bite earlier than that.
 *  `git add .`/`-A` name no path and so pass; see `guards.md`'s known gaps. */
const WRITE_COMMANDS = new RegExp(
  `\\b(?:tee|cp|mv|rm|ln|touch|truncate|patch|install|git\\s+(?:mv|rm|add|apply|checkout|restore))\\b${SEG}\\.github/workflows/`,
)

/** A redirection whose target sits in the directory — `>`, `>>`, and the
 *  `cat > path <<EOF` heredoc form, which is how a shell-first session writes
 *  a file. Anchored on the redirect operator, so a heredoc body is matched only
 *  if it too contains a redirect at the directory — plain prose naming the
 *  directory is not (the header's "quotes a write" caveat covers the rest). */
const WRITE_REDIRECT = /(?:^|[^0-9<>])>>?[ \t]*['"]?[^\s'"|;&]*\.github\/workflows\//

/** In-place editors, which name their target as an argument rather than a
 *  redirect, so `WRITE_REDIRECT` cannot see them. */
const WRITE_IN_PLACE = new RegExp(
  `\\b(?:sed|perl|ruby|python3?)\\b${SEG}[ \\t]-i[^\\s;&|]*[ \\t]${SEG}\\.github/workflows/`,
)

/** The write shapes, in the order they are tried. Exported as this guard's
 *  registry, per `guards.md`'s "Extending one": a newly-observed write shape is
 *  a row here, never a change to `checkWorkflowEdit`. */
export const BASH_WRITE_SHAPES: readonly RegExp[] = [WRITE_COMMANDS, WRITE_REDIRECT, WRITE_IN_PLACE]

/** The variable the provenance guards also read; only a cloud session sets it. */
export function isCloudSession(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID)
}

export interface WorkflowEditFinding {
  tool: string
  /** How the write was spotted — the argument the agent should look at. */
  via: 'file_path' | 'command'
  /** The offending `file_path`, or the command text that matched. */
  target: string
}

/** Denies a write into `.github/workflows/`: any `Edit`/`Write` whose
 *  `file_path` lands there, and any `Bash` command whose *write-shaped* text
 *  targets it. Reading a workflow (`cat`, `grep`, `git log`) is untouched —
 *  only writing is what strands a branch. Never throws; a non-object
 *  `toolInput` simply carries no path. */
export function checkWorkflowEdit(
  toolName: string,
  toolInput: unknown,
  writeShapes: readonly RegExp[] = BASH_WRITE_SHAPES,
): WorkflowEditFinding | null {
  const input = toolInput !== null && typeof toolInput === 'object' ? (toolInput as Record<string, unknown>) : {}
  if (toolName === 'Edit' || toolName === 'Write') {
    const path = input.file_path
    if (typeof path !== 'string' || !WORKFLOW_DIR.test(path)) return null
    return { tool: toolName, via: 'file_path', target: path }
  }
  if (toolName === 'Bash') {
    const command = input.command
    if (typeof command !== 'string') return null
    if (!writeShapes.some((shape) => shape.test(command))) return null
    return { tool: toolName, via: 'command', target: command }
  }
  return null
}

/** Self-contained by design: CLAUDE.md and `environment-caveats.md` both carry
 *  the rule already, and the recorded failure was a session that had opened
 *  neither — the deny message is this rule's teaching surface. */
export function formatGuardMessage(f: WorkflowEditFinding): string {
  const cannot = `and a cloud session cannot land that by any path here`
  // The command goes on its own line: inlined mid-sentence it ran into the
  // clause after it and the message read as garbled (probed live, #897).
  const what =
    f.via === 'file_path'
      ? `writes \`${f.target}\`, ${cannot}.`
      : `is write-shaped against \`.github/workflows/\`, ${cannot}:\n\n    ${f.target.split('\n')[0]}`
  return (
    `Blocked by the workflow-edit guard (issue #897): this \`${f.tool}\` call ${what}\n\n` +
    `The sharp edge is the COMMIT, not the push. Cloud-session credentials lack the \`workflow\` OAuth scope, ` +
    `and the rejection is evaluated over every commit in the ref update — so one workflow edit committed ` +
    `alongside real work means you can push NONE of it, and the only escape is history surgery on a ` +
    `branch that by then holds that work.\n\n` +
    `Do instead: drop the change in \`docs/proposals/\` for a human to apply — read ` +
    `\`docs/proposals/README.md\` for the file format and the companion-change discipline. Keep the ` +
    `workflow edit out of the branch entirely rather than committing it and discovering this at push ` +
    `time.\n\n` +
    `\`.github/actions/gate/action.yml\` is NOT covered by this: agents can push it, and only merging it ` +
    `is human-only (ADR-0026). If this call is something other than a write into \`.github/workflows/\`, ` +
    `that is a gap in this guard — report it on issue #897 rather than routing around it.`
  )
}

/** `null` when nothing should be blocked, so an ordinary edit writes nothing
 *  and the call proceeds untouched. */
export function denyOutputFor(finding: WorkflowEditFinding | null): DenyOutput | null {
  return finding ? buildDenyOutput(formatGuardMessage(finding)) : null
}

/** Always exits 0 — the deny travels in stdout, not the exit code. */
export function main(): void {
  if (!isCloudSession()) return
  const result = readHookPayload()
  if (result.kind === 'none') return
  if (result.kind === 'invalid') return denyUninspectable(LABEL, REF, 'the hook payload was not valid JSON')
  if (result.kind === 'no-tool') return denyUninspectable(LABEL, REF, 'the hook payload named no tool')

  const output = denyOutputFor(checkWorkflowEdit(result.payload.tool_name, result.payload.tool_input))
  if (output) process.stdout.write(JSON.stringify(output))
}

/** Print the decision the hook would reach, running nothing. */
function dryRun(argv: string[]): void {
  const tool = requireToolFlag(argv, 'usage: --dry-run --tool <name> [--input <json> | --input-file <path>]')
  // `--input-file`: a denying `--input` cannot always survive the trip, since
  // this guard blocks write-shaped Bash calls.
  const input = resolveDryRunInput(argv)
  const finding = isCloudSession() ? checkWorkflowEdit(tool, input) : null
  printDryRunResult({
    tool,
    decision: finding ? 'deny' : 'allow',
    via: finding?.via,
    reason: finding ? formatGuardMessage(finding) : undefined,
  })
}

runGuard(import.meta.url, { main, dryRun, label: LABEL, ref: REF })
