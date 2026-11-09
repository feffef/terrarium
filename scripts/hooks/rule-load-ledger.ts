// InstructionsLoaded hook (#3009): appends one row per path-scoped rule load to
// this session's ledger, so the session log can say which file loaded each
// rule. Loads themselves are counted from the transcript; the ledger only adds
// the trigger. Fails open: the event is observability only.
//
// Usage: tsx scripts/hooks/rule-load-ledger.ts --dry-run --input '<InstructionsLoaded payload>'
import { root } from '../lib/cli.ts'
import { appendRuleLoad, ruleKey, type RuleLoadRow } from '../session/rule-use.ts'
import { printDryRunResult, prop, readHookJson, resolveDryRunInput, runGuard } from './hook-io.ts'

const str = (obj: unknown, key: string) => {
  const v = prop(obj, key)
  return typeof v === 'string' && v ? v : undefined
}

/** The ledger row for a path-scoped `.claude/rules/` load, else `null`. */
export function ledgerRowOf(payload: unknown): RuleLoadRow | null {
  const file = str(payload, 'file_path')
  if (str(payload, 'load_reason') !== 'path_glob_match' || !file?.includes('/.claude/rules/')) return null
  const cwd = str(payload, 'cwd')
  const trigger = str(payload, 'trigger_file_path')
  const rel = trigger && cwd && trigger.startsWith(`${cwd}/`) ? trigger.slice(cwd.length + 1) : trigger
  const agentId = str(payload, 'agent_id')?.replace(/^agent-/, '')
  const agentType = str(payload, 'agent_type')
  return {
    rule: ruleKey(file),
    ...(rel && { trigger: rel.replace(/^\.claude\/worktrees\/[^/]+\//, '') }),
    ...(agentId && { agentId }),
    ...(agentType && { agentType }),
  }
}

function main(): void {
  const read = readHookJson()
  if (read.kind !== 'ok') return
  const row = ledgerRowOf(read.json)
  const session = str(read.json, 'session_id')
  if (row && session) appendRuleLoad(root, session, row)
}

runGuard(import.meta.url, {
  main,
  dryRun: (argv) => printDryRunResult({ row: ledgerRowOf(resolveDryRunInput(argv)) }),
  label: 'rule-load ledger',
  ref: 'issue #3009',
  failOpen: true,
})
