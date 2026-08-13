// Mechanical backstop for issue #921: agents keep hand-typing the ADR-0017
// `Co-Authored-By:`/`Claude-Session:` commit trailer that the harness template
// and `.githooks/commit-msg` already land, so the guard refuses a `git commit`
// whose message text carries either line. Rationale, detection contract, and
// residual fail-opens are single-homed in docs/agents/commit-trailer-guard.md —
// this header does not restate them. Pure core is kept separate from the stdin
// I/O and exercised by --dry-run, mirroring the sibling guards (ADR-0004's
// unattended-hook reviewability bar).
//
// Usage:
//   sh scripts/commit-trailer-guard.sh               # the installed hook entry
//   tsx scripts/commit-trailer-guard.ts              # payload on stdin
//   tsx scripts/commit-trailer-guard.ts --dry-run --tool Bash --input '<json>'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { COAUTHOR_TRAILER } from './provenance-footer.ts'

/** A `git commit`, allowing the global options that may sit between the two
 *  words (`-C <path>`, `-c <cfg>`, `--no-pager`). Deliberately permissive about
 *  what precedes it — a chain (`git add -A && git commit …`) is the common
 *  shape, and matching a `git commit` quoted inside some other command is a
 *  harmless false positive that still needs a trailer present to deny. */
const GIT_COMMIT = /\bgit\s+(?:(?:-{1,2}[^\s]+)(?:\s+[^\s-][^\s]*)?\s+)*commit\b/

/** The `Claude-Session:` trailer KEY. Deliberately broader than
 *  `SESSION_TRAILER` (git-helpers.ts), which requires the well-formed URL shape:
 *  the mistake this guard prevents is typing the line at all, and a value
 *  recalled from memory is exactly the malformed case. The spec pins containment
 *  — anything `SESSION_TRAILER` matches also trips this — so the two cannot
 *  drift into disagreement. */
const SESSION_TRAILER_KEY = /Claude-Session:/i

/** The co-author half, case-insensitive over the single-homed pattern text:
 *  git trailers conventionally render as `Co-authored-by`, and a hand-typed one
 *  is as likely to use that case as the harness's own. */
const COAUTHOR_KEY = new RegExp(COAUTHOR_TRAILER.source, 'i')

/** Which half of the ADR-0017 footer was hand-typed. */
export type TrailerKind = 'coauthor' | 'session'

export interface TrailerFinding {
  /** Non-empty, in `TrailerKind` declaration order — the order the footer
   *  itself is written in, so the message reads the way the commit would. */
  kinds: TrailerKind[]
}

/** The offset at which a `git commit` invocation starts in `command`, or `-1`
 *  when it carries none. Exported so the spec can pin the invocation detection
 *  independently of the trailer matching. */
export function commitInvocationIndex(command: string): number {
  return command.search(GIT_COMMIT)
}

/** Denies exactly a `Bash` call that commits a message carrying either footer
 *  line. Only the text from the `git commit` onward is inspected, so a command
 *  that merely reads or greps a trailer before committing is untouched. Never
 *  throws; a non-object `toolInput` simply carries no command. */
export function checkCommitTrailer(toolName: string, toolInput: unknown): TrailerFinding | null {
  if (toolName !== 'Bash') return null
  const input = toolInput !== null && typeof toolInput === 'object' ? (toolInput as Record<string, unknown>) : {}
  const command = input.command
  if (typeof command !== 'string') return null
  const at = commitInvocationIndex(command)
  if (at < 0) return null
  const messageText = command.slice(at)
  const kinds: TrailerKind[] = []
  if (COAUTHOR_KEY.test(messageText)) kinds.push('coauthor')
  if (SESSION_TRAILER_KEY.test(messageText)) kinds.push('session')
  return kinds.length > 0 ? { kinds } : null
}

const TRAILER_LABEL: Record<TrailerKind, string> = {
  coauthor: 'Co-Authored-By:',
  session: 'Claude-Session:',
}

/** Self-contained by design: every recorded recurrence had CLAUDE.md's
 *  "commits need nothing from you" prose available and typed the line anyway —
 *  the deny message is the rule's teaching surface. */
export function formatGuardMessage(f: TrailerFinding): string {
  const lines = f.kinds.map((k) => TRAILER_LABEL[k])
  const which = lines.length === 1 ? `a \`${lines[0]}\` line` : `\`${lines.join('` and `')}\` lines`
  return (
    `Blocked by the commit-trailer guard (issue #921): this \`git commit\` message hand-writes ${which}, ` +
    `which you must never author yourself.\n\n` +
    `The ADR-0017 trailer is landed FOR you, twice over: the harness's own commit-message template emits ` +
    `it, and \`.githooks/commit-msg\` appends or corrects it repo-side when the template doesn't fire. ` +
    `A hand-typed value is recalled from memory, so it is routinely the WRONG session id — the hook then ` +
    `silently overwrites it with the right one and you never learn you got it wrong. That near-miss has ` +
    `recurred four times; a wrong id that ships is the same failure class as #387/#605/#628/#723.\n\n` +
    `Do instead:\n` +
    `  • Write the commit message with NO trailer at all — subject and body only. Both lines appear in ` +
    `the landed commit regardless.\n` +
    `  • Verify afterwards if you want to see it: \`git log -1 --format=%B\`.\n\n` +
    `Never resolve the session id from memory, from a \`git log\` trailer, or from any id-shaped string ` +
    `already in your context — that is the capture failure the repo's identifier rule exists to stop. ` +
    `If you believe a commit genuinely needs a hand-authored trailer, that is a gap in this guard — ` +
    `report it on issue #921 rather than routing around it.`
  )
}

/** `null` when nothing should be blocked, so an ordinary commit writes nothing
 *  and the call proceeds untouched. */
export function denyOutputFor(finding: TrailerFinding | null): { hookSpecificOutput: Record<string, string> } | null {
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
 *  textually mention a trailer, so this can never wedge ordinary Bash use. */
function denyUninspectable(detail: string): void {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          `Blocked by the commit-trailer guard (issue #921): ${detail}, so this call could not be ` +
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

  const output = denyOutputFor(checkCommitTrailer(payload.tool_name, payload.tool_input))
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
    console.error('usage: --dry-run --tool <name> [--input <json>]')
    process.exit(1)
  }
  const rawInput = flag('--input')
  let input: unknown = {}
  if (rawInput !== undefined) {
    try {
      input = JSON.parse(rawInput)
    } catch {
      console.error('--input must be valid JSON')
      process.exit(1)
    }
  }
  const finding = checkCommitTrailer(tool, input)
  console.log(
    JSON.stringify(
      {
        tool,
        decision: finding ? 'deny' : 'allow',
        kinds: finding?.kinds,
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
