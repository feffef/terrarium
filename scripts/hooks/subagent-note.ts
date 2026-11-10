// SubagentStart hook (#3009): gives every subagent the static rule-use note,
// so no brief has to carry the ask.
//
// Usage: tsx scripts/hooks/subagent-note.ts --dry-run
import { SUBAGENT_NOTE } from '../session/rule-use.ts'
import { printDryRunResult, runGuard } from './hook-io.ts'

export function subagentStartOutput() {
  return { hookSpecificOutput: { hookEventName: 'SubagentStart', additionalContext: SUBAGENT_NOTE } }
}

runGuard(import.meta.url, {
  main: () => void process.stdout.write(JSON.stringify(subagentStartOutput())),
  dryRun: () => printDryRunResult(subagentStartOutput()),
  label: 'subagent note',
  ref: 'issue #3009',
  failOpen: true,
})
