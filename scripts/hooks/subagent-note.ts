// SubagentStart hook (#3009): gives every subagent the static "what helped"
// note, so no brief has to carry the ask. The note's command path is absolute
// because a worktree agent's cwd is not the main checkout.
//
// Usage: tsx scripts/hooks/subagent-note.ts --dry-run
import { root } from '../lib/cli.ts'
import { subagentNote } from '../session/rule-use.ts'
import { printDryRunResult, runGuard } from './hook-io.ts'

export function subagentStartOutput(repoRoot: string) {
  return { hookSpecificOutput: { hookEventName: 'SubagentStart', additionalContext: subagentNote(repoRoot) } }
}

runGuard(import.meta.url, {
  main: () => void process.stdout.write(JSON.stringify(subagentStartOutput(root))),
  dryRun: () => printDryRunResult(subagentStartOutput(root)),
  label: 'subagent note',
  ref: 'issue #3009',
  failOpen: true,
})
