// Mechanical backstop for issue #897: an agent session has no `workflow` OAuth
// scope, so a commit touching `.github/workflows/*` is rejected at push time —
// and the rejection covers the WHOLE ref update, stranding every other commit in
// the push behind history surgery. `docs/agents/environment-caveats.md` records
// the mechanic; nothing stopped the edit before the commit existed. This does.
//
// Reads only the tool call, so it denies the edit itself rather than the commit:
// by the time a commit exists the branch is already the expensive case.
//
// Runs unattended, so it is human-only to merge (ADR-0004, 2026-07-30). Pure
// core split from the stdin I/O and exercised by `--dry-run`, per that
// amendment's reviewability bar and the sibling guards' shape.
//
// Usage:
//   sh scripts/workflow-edit-guard.sh                 # the installed hook entry
//   tsx scripts/workflow-edit-guard.ts                # payload on stdin
//   tsx scripts/workflow-edit-guard.ts --dry-run --tool Edit --input '<json>'
//
// Fail-open by construction, in rough order of how often it will matter:
//   - A command that names no workflow path cannot be matched at all: `git add .`
//     and `git add -A`, and `git commit -a` after an out-of-band modification.
//     The push rejection stays the backstop for those.
//   - The `.sh` pre-filter only forwards payloads textually mentioning the
//     directory, so a re-encoded path is never seen.
//   - `mcp__github__create_or_update_file`/`push_files` write through the
//     contents API, which refuses with a 404 of its own (environment-caveats)
//     and never touches a local branch — nothing to strand, so not policed here.
//   - Bash detection is write-shape matching on a command string, not a shell
//     AST: a path reached only through a variable, `xargs`, or an editor this
//     registry does not name passes. Reads deliberately pass too.
//
// False-positive shape, accepted — this reads a command string, not a shell AST:
// a command that merely QUOTES a write against the directory is denied, whether
// that is an in-place doc edit whose replacement text names it
// (`sed -i 's|x|.github/workflows/|' docs/…`) or a probe passing an example
// write as an argument (both hit while building this guard). Use the Edit tool,
// which CLAUDE.md prefers anyway, or `--dry-run --input-file`.
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

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
  const cannot = `and an agent session cannot land that by any path here`
  // The command goes on its own line: inlined mid-sentence it ran into the
  // clause after it and the message read as garbled (probed live, #897).
  const what =
    f.via === 'file_path'
      ? `writes \`${f.target}\`, ${cannot}.`
      : `is write-shaped against \`.github/workflows/\`, ${cannot}:\n\n    ${f.target.split('\n')[0]}`
  return (
    `Blocked by the workflow-edit guard (issue #897): this \`${f.tool}\` call ${what}\n\n` +
    `The sharp edge is the COMMIT, not the push. Agent credentials lack the \`workflow\` OAuth scope, ` +
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
export function denyOutputFor(
  finding: WorkflowEditFinding | null,
): { hookSpecificOutput: Record<string, string> } | null {
  if (!finding) return null
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: formatGuardMessage(finding),
    },
  }
}

interface PreToolUsePayload {
  tool_name?: string
  tool_input?: unknown
}

/** Fail-closed's edge, bounded: the pre-filter only forwards payloads that
 *  textually mention the directory, so this can never wedge ordinary editing. */
function denyUninspectable(detail: string): void {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          `Blocked by the workflow-edit guard (issue #897): ${detail}, so this call could not be ` +
          `checked. The guard fails CLOSED. This is a guard fault, not an authoring mistake — report ` +
          `it rather than working around it.`,
      },
    }),
  )
}

/** Always exits 0 — the deny travels in stdout, not the exit code. */
export function main(): void {
  let raw: string
  try {
    raw = readFileSync(0, 'utf8')
  } catch {
    return // not invoked as a hook (no stdin at all) — nothing was requested
  }
  if (!raw.trim()) return // a bare manual run, not a tool call to police

  let payload: PreToolUsePayload
  try {
    payload = JSON.parse(raw)
  } catch {
    return denyUninspectable('the hook payload was not valid JSON')
  }
  if (typeof payload.tool_name !== 'string') {
    return denyUninspectable('the hook payload named no tool')
  }

  const output = denyOutputFor(checkWorkflowEdit(payload.tool_name, payload.tool_input))
  if (output) process.stdout.write(JSON.stringify(output))
}

/** Print the decision the hook would reach, running nothing. */
function dryRun(argv: string[]): void {
  const flag = (name: string): string | undefined => {
    const i = argv.indexOf(name)
    return i >= 0 ? argv[i + 1] : undefined
  }
  const tool = flag('--tool')
  if (!tool) {
    console.error('usage: --dry-run --tool <name> [--input <json> | --input-file <path>]')
    process.exit(1)
  }
  // `--input-file` mirrors commit-trailer-guard's: a denying `--input` cannot
  // always survive the trip, since this guard blocks write-shaped Bash calls.
  const inputFile = flag('--input-file')
  let rawInput = flag('--input')
  if (inputFile !== undefined) {
    try {
      rawInput = readFileSync(inputFile, 'utf8')
    } catch (err) {
      // Explicit, not left to the bootstrap's catch: that one fails CLOSED and
      // would print a deny control object, which a dry run must never emit.
      console.error(`--input-file could not be read: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  }
  let input: unknown = {}
  if (rawInput !== undefined) {
    try {
      input = JSON.parse(rawInput)
    } catch {
      console.error(inputFile !== undefined ? `${inputFile} does not contain valid JSON` : '--input must be valid JSON')
      process.exit(1)
    }
  }
  const finding = checkWorkflowEdit(tool, input)
  console.log(
    JSON.stringify(
      {
        tool,
        decision: finding ? 'deny' : 'allow',
        via: finding?.via,
        reason: finding ? formatGuardMessage(finding) : undefined,
      },
      null,
      2,
    ),
  )
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv.slice(2)
  try {
    if (argv.includes('--dry-run')) dryRun(argv)
    else main()
  } catch (err) {
    // Fail closed: a crash in the guard is a reason to stop, not to wave the
    // call through — matching the sibling guards.
    denyUninspectable(`the guard itself crashed (${err instanceof Error ? err.message : String(err)})`)
  }
}
