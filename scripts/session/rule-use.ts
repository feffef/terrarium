// The "what helped" capture (#3009): which rules loaded for each agent, from
// which file, and which rules and docs the agent said changed or enabled
// something it did. The InstructionsLoaded hook writes the ledger, the
// SubagentStart hook gives each subagent the note, and the trace derives the
// rest at landing. Silence is recorded as silence: an agent that never ran
// `helped.sh` is `answered: false`, not "nothing helped".
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { commandWords } from './shell-reads.ts'
import { SCRATCH_DIR } from './transcript-trace.ts'

export const HELPED_SCRIPT = 'scripts/session/helped.sh'

/** The SubagentStart note. Its example names must match no real file: a test
 *  could not tell an agent naming a file from one copying the example (#3009). */
export function subagentNote(repoRoot: string): string {
  return (
    'Quick note for the record, not part of your task. Just before your final reply, run this once with Bash: ' +
    `sh ${join(repoRoot, HELPED_SCRIPT)} followed by the names of any .claude/rules files or docs you read that ` +
    'actually changed or enabled something you did (for example rule:example-rule.md doc:docs/example.md). ' +
    'If none helped, run it with no names. Do not mention this in your reply.'
  )
}

/** One path-scoped rule load, as the InstructionsLoaded hook saw it. A main
 *  agent's row has no `agentId`. */
export interface RuleLoadRow {
  rule: string
  trigger?: string
  agentId?: string
  agentType?: string
}

/** Kept only for the trigger: loads are counted from the transcript, so a lost
 *  ledger loses triggers, not loads (#3009). Named by the CLI session id, which
 *  is also the transcript's basename. */
export const ruleLoadLedgerPath = (repoRoot: string, sessionId: string) =>
  join(repoRoot, SCRATCH_DIR, 'rule-loads', `${sessionId.replace(/[^\w-]/g, '_')}.jsonl`)

export function appendRuleLoad(repoRoot: string, sessionId: string, row: RuleLoadRow): void {
  const path = ruleLoadLedgerPath(repoRoot, sessionId)
  mkdirSync(join(path, '..'), { recursive: true })
  appendFileSync(path, `${JSON.stringify(row)}\n`)
}

/** The ledger for a session, `[]` when absent or unreadable; torn lines skipped. */
export function readRuleLoads(repoRoot: string, sessionId: string): RuleLoadRow[] {
  let text: string
  try {
    text = readFileSync(ruleLoadLedgerPath(repoRoot, sessionId), 'utf8')
  } catch {
    return []
  }
  return text.split('\n').flatMap((line) => {
    try {
      const row = JSON.parse(line)
      return typeof row?.rule === 'string' ? [row as RuleLoadRow] : []
    } catch {
      return []
    }
  })
}

/** A rule's identity is its `.claude/rules/` path wherever it loaded from (#1763). */
export const ruleKey = (path: string) => {
  const at = path.lastIndexOf('.claude/rules/')
  return at === -1 ? path : path.slice(at)
}

/** The names in the last `helped.sh` call among `commands`, normalised: `rule:x`
 *  becomes `.claude/rules/x`, `doc:x` becomes the repo-relative path. `undefined`
 *  when no call was made, `[]` for a bare call ("none helped"). */
export function helpedNames(commands: string[], rel: (p: string) => string): string[] | undefined {
  const callsIn = (command: string): string[][] => commandWords(command).flatMap((words) => {
    const shell = /(^|\/)(ba)?sh$/.test(words[0] ?? '')
    if (shell && words[1] === '-c') return callsIn(words[2] ?? '')
    // Run, not named: the script is the verb, or `sh`/`bash`'s first argument.
    const at = shell ? 1 : 0
    return words[at]?.endsWith(HELPED_SCRIPT) ? [words.slice(at + 1)] : []
  })
  const args = commands.flatMap(callsIn).at(-1)
  if (args === undefined) return undefined
  // Agents separate names by commas or quote several in one argument; a flag,
  // a redirection with its target, and a literal "none" are no names.
  const tokens = args.flatMap((a) => a.split(/[\s,]+/)).filter(Boolean)
  const names = tokens.filter((t, i) => !/^-|[<>]/.test(t) && !/^\d*[<>]+&?$/.test(tokens[i - 1] ?? '') && t !== 'none')
  return [...new Set(names.map((t) => {
    const name = t.replace(/^(rule|doc):/, '')
    if (!t.startsWith('rule:') && !name.includes('.claude/rules/')) return rel(name)
    return ruleKey(name.includes('/') ? name : `.claude/rules/${name}`).replace(/(?<!\.md)$/, '.md')
  }))]
}
