// Mechanical backstop for issue #666: five recorded sessions abandoned the
// branch the harness had already checked out for them and branched off
// `origin/main` under a self-invented name; two prose fixes (#625, #684) did
// not hold. The pin is readable from git state, not prompt text — the
// transcript's first record carries the session's starting `gitBranch` — which
// is what makes it mechanizable at all (`docs/research/rulebook-migration-table.md`
// rows CM-20/CM-21, which called it unreachable). Both halves of the rule fire
// on the same command shape, so they are one guard: wrong name, and branching
// before a `git fetch origin main`.
//
// Fails OPEN, deliberately, against `docs/agents/guards.md`'s fail-closed
// default: a false block on ordinary unpinned git work is worse than a missed
// warning. So an unreadable transcript, an unknown starting branch, or a
// `main`/`master` start all pass — as does `git worktree add … -b`, which
// matches no branch-creating shape here, and a dispatched subagent, whose
// payload carries the PARENT's transcript (`docs/agents/guards.md`) rather than
// its own starting branch and fetches.
//
// Runs unattended, so it is human-only to merge (ADR-0004, 2026-07-30). Pure
// core split from the shared stdin/`--dry-run`/bootstrap plumbing
// (`guard-io.ts`, issue #1080).
//
// Usage:
//   sh scripts/branch-pin-guard.sh                     # the installed hook entry
//   tsx scripts/branch-pin-guard.ts                    # payload on stdin
//   tsx scripts/branch-pin-guard.ts --dry-run --tool Bash [--transcript <p>] [--input '<json>']
import {
  buildDenyOutput,
  flagValue,
  printDryRunResult,
  readHookPayload,
  readTranscript,
  requireToolFlag,
  resolveDryRunInput,
  runIfMain,
} from './guard-io.ts'
import { bashCommandsOf } from './session-trace.ts'

const LABEL = 'branch-pin guard'
const REF = 'issue #666'

/** Branch CREATION only, at the start of a statement. The `(?!-)` lookahead
 *  keeps `git branch -d`, `git branch --show-current` and `git branch -a` out;
 *  `git worktree add … -b` never reaches the keyword at all; and the leading
 *  boundary keeps a branch name merely *quoted* by another command (`echo git
 *  branch x`) from reading as a creation. */
const CREATES_BRANCH = /(?:^|[\n;&|]\s*)git\s+(?:checkout\s+-[bB]|switch\s+-c|branch)\s+(?!-)(\S+)/
const FETCHED_MAIN = /\bgit\s+fetch\b[^\n]*\borigin\b/
const DEFAULT_BRANCH = /^(?:main|master)$/

export type BranchPinFinding =
  | { kind: 'pin'; pinned: string; created: string }
  | { kind: 'no-fetch'; created: string }

/** The branch this session started on: the first transcript record carrying a
 *  `gitBranch`, written before the agent ran anything. */
function startingBranch(records: Record<string, unknown>[]): string | undefined {
  for (const record of records) {
    if (typeof record.gitBranch === 'string' && record.gitBranch) return record.gitBranch
  }
  return undefined
}

/** The pure, unit-testable predicate. `records: null` (unreadable transcript)
 *  yields `null` — this guard fails OPEN, see the header. Never throws. */
export function checkBranchCreation(
  toolName: string,
  toolInput: unknown,
  records: Record<string, unknown>[] | null,
): BranchPinFinding | null {
  if (toolName !== 'Bash') return null
  const command = (toolInput as { command?: unknown } | null | undefined)?.command
  if (typeof command !== 'string' || !records) return null
  const created = CREATES_BRANCH.exec(command)?.[1]
  if (!created) return null

  const pinned = startingBranch(records)
  if (pinned && !DEFAULT_BRANCH.test(pinned) && pinned !== created) return { kind: 'pin', pinned, created }
  const fetched = FETCHED_MAIN.test(command) || bashCommandsOf(records).some((c) => FETCHED_MAIN.test(c))
  return fetched ? null : { kind: 'no-fetch', created }
}

/** Written for a reader who has opened no doc — that is what every recorded
 *  recurrence was. */
export function formatGuardMessage(f: BranchPinFinding): string {
  if (f.kind === 'no-fetch') {
    return (
      `Blocked by the ${LABEL} (${REF}): no \`git fetch origin main\` was seen in this session, so ` +
      `\`${f.created}\` would be cut from a possibly stale \`main\`.\n\n` +
      `Run \`git fetch origin main\` first, then branch off \`origin/main\`.`
    )
  }
  return (
    `Blocked by the ${LABEL} (${REF}): this session started on \`${f.pinned}\` — the branch your caller ` +
    `pinned and the harness checked out for you — and \`${f.created}\` is a different name.\n\n` +
    `Commit your work on \`${f.pinned}\` instead (\`git checkout ${f.pinned}\`). If it needs to be current, ` +
    `rebase or merge \`origin/main\` into it rather than starting a new branch. Five recorded sessions ` +
    `branched under a self-invented name; one pushed a whole PR to the wrong branch before noticing.`
  )
}

function dryRun(argv: string[]): void {
  const tool = requireToolFlag(argv, 'usage: --dry-run --tool Bash [--transcript <path>] [--input <json>]')
  const finding = checkBranchCreation(tool, resolveDryRunInput(argv), readTranscript(flagValue(argv, '--transcript')))
  printDryRunResult({ tool, decision: finding ? 'deny' : 'allow', kind: finding?.kind, reason: finding ? formatGuardMessage(finding) : undefined })
}

export function main(): void {
  const result = readHookPayload()
  if (result.kind !== 'ok') return
  const { payload } = result
  if ('agent_id' in payload || 'agent_type' in payload) return

  const finding = checkBranchCreation(payload.tool_name, payload.tool_input, readTranscript(payload.transcript_path))
  if (finding) process.stdout.write(JSON.stringify(buildDenyOutput(formatGuardMessage(finding))))
}

runIfMain(import.meta.url, { main, dryRun, label: LABEL, ref: REF, failOpen: true })
