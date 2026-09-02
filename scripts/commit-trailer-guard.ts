// Mechanical backstop for issue #921 (which holds the incident history): agents
// keep hand-typing the ADR-0017 `Co-Authored-By:`/`Claude-Session:` trailer that
// the harness template and `.githooks/commit-msg` already land, so this refuses
// a `git commit` whose message text carries either line. Preventive only — the
// commit-msg hook stays the backstop and keeps failing open (ADR-0017).
//
// Runs unattended, so it is human-only to merge (ADR-0004, 2026-07-30). Pure
// core (below) split from the shared stdin/`--dry-run`/bootstrap plumbing
// (`guard-io.ts`, issue #1080), per that amendment's reviewability bar.
//
// Usage:
//   sh scripts/commit-trailer-guard.sh               # the installed hook entry
//   tsx scripts/commit-trailer-guard.ts              # payload on stdin
//   tsx scripts/commit-trailer-guard.ts --dry-run --tool Bash (--input '<json>' | --input-file <path>)
//
// A denying --input cannot be passed inline: that Bash call is itself denied.
// Write the payload with the Write tool and pass --input-file.
import {
  denyUninspectable,
  buildDenyOutput,
  printDryRunResult,
  readHookPayload,
  requireToolFlag,
  resolveDryRunInput,
  runIfMain,
  type DenyOutput,
} from './guard-io.ts'
import { COAUTHOR_TRAILER } from './provenance-footer.ts'

const LABEL = 'commit-trailer guard'
const REF = 'issue #921'

// Fail-open by construction, in rough order of how often it will matter:
//   - `git commit -F <file>`: the text is in the file, not the command string.
//     The commit-msg hook's #710/#797 correction is the backstop. `-F -` with an
//     inline heredoc IS covered.
//   - MCP-API commits (create_or_update_file/push_files) never touch local git;
//     they belong to github-provenance-guard.ts's registry.
//   - The .sh pre-filter only forwards payloads textually mentioning a trailer
//     key, so a re-encoded one is never seen.
//   - Repo scripts that commit (the session-log lander) bypass the Bash tool.
//
// False-positive shapes, accepted — this reads a command string, not a shell
// AST. All three were hit live, all three have a workaround:
//   - A heredoc writing a file ABOUT this guard (an example commit + an example
//     trailer) is denied. Use the Write tool, which CLAUDE.md prefers anyway.
//   - `git commit -m "fix: Claude-Session: handling"` is denied: SESSION_TRAILER_KEY
//     matches the bare key while COAUTHOR_KEY needs the address. Deliberate — a
//     hand-typed session trailer's failure mode is its *value*. Reword, or -F.
//   - `git commit … && git log | grep Claude-Session` is denied. Split the chain.

const GIT_COMMIT = /\bgit\s+(?:(?:-{1,2}[^\s]+)(?:\s+[^\s-][^\s]*)?\s+)*commit\b/

/** Broader than `SESSION_TRAILER` (git-helpers.ts) on purpose; the spec pins
 *  containment between them. */
const SESSION_TRAILER_KEY = /Claude-Session:/i

/** The single-homed co-author pattern text, re-flagged case-insensitive. */
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
export function denyOutputFor(finding: TrailerFinding | null): DenyOutput | null {
  return finding ? buildDenyOutput(formatGuardMessage(finding)) : null
}

/** Always exits 0 — the deny travels in stdout, not the exit code. */
export function main(): void {
  const result = readHookPayload()
  if (result.kind === 'none') return
  if (result.kind === 'invalid') return denyUninspectable(LABEL, REF, 'the hook payload was not valid JSON')
  if (result.kind === 'no-tool') return denyUninspectable(LABEL, REF, 'the hook payload named no tool')

  const output = denyOutputFor(checkCommitTrailer(result.payload.tool_name, result.payload.tool_input))
  if (output) process.stdout.write(JSON.stringify(output))
}

/** Print the decision the hook would reach, running nothing. */
function dryRun(argv: string[]): void {
  const tool = requireToolFlag(argv, 'usage: --dry-run --tool <name> [--input <json> | --input-file <path>]')
  // `--input-file` exists because a denying `--input` cannot survive the trip:
  // this guard blocks the very Bash call that would pass one inline. See the
  // doc's false-positive shapes.
  const input = resolveDryRunInput(argv)
  const finding = checkCommitTrailer(tool, input)
  printDryRunResult({
    tool,
    decision: finding ? 'deny' : 'allow',
    kinds: finding?.kinds,
    reason: finding ? formatGuardMessage(finding) : undefined,
  })
}

runIfMain(import.meta.url, { main, dryRun, label: LABEL, ref: REF })
