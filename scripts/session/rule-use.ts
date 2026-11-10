// The "what helped" capture (#3009): which rules loaded for each agent, from
// which file, and which rules and docs the agent said changed or enabled
// something it did. The InstructionsLoaded hook writes the ledger, the
// SubagentStart hook gives each subagent the note, and the trace derives the
// rest at landing. Silence is recorded as silence: an agent that never ran
// `helped.sh` is `answered: false`, not "nothing helped".
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ruleValue, type ReportedEntry } from '../../shared/schemas/session.ts'
import { commandWords } from './shell-reads.ts'
import { SCRATCH_DIR } from './transcript-trace.ts'

export const HELPED_SCRIPT = 'scripts/session/helped.sh'

/** The SubagentStart note. Its example names must match no real file: a test
 *  could not tell an agent naming a file from one copying the example (#3009). */
export function subagentNote(repoRoot: string): string {
  return (
    'Quick note for the record, not part of your task. Just before your final reply, run this once with Bash: ' +
    `sh ${join(repoRoot, HELPED_SCRIPT)} followed by each .claude/rules file or doc you read that changed or ` +
    'confirmed something you did. Give each rule a value: =changed if you did, avoided or decided something ' +
    'differently because of it, =confirmed if it matched what you were already doing; you may also mark one ' +
    '=none or =unsure. Name docs without a value (for example rule:example-rule.md=confirmed doc:docs/example.md). ' +
    'If nothing applies, run it with no names. Do not mention this in your reply.'
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

/** A rule named by a path or a bare file name, with or without `.md`, as its
 *  `.claude/rules/` key: both what an agent names and what loaded match on it. */
export const ruleName = (name: string) => {
  const key = ruleKey(name.includes('/') ? name : `.claude/rules/${name}`)
  return `${key.replace(/\.md$/i, '')}.md`
}

const isShell = (word = '') => /(^|\/)(ba)?sh$/.test(word)
const isRedirect = (token = '') => /^\d*&?[<>]+&?$/.test(token)
// A bare fd number is what an unspaced `2>err` or `2>&1` leaves.
const isNoName = (token: string) => !token || /^\d+$/.test(token) || token.startsWith('-') || token.toLowerCase() === 'none' || /^(rule|doc):$/.test(token)

/** What the last `helped.sh` call among `commands` reported, normalised:
 *  `rule:x=confirmed` becomes `.claude/rules/x.md` with its value, `doc:x` the
 *  repo-relative path. An unknown rule value is `unsure`, a missing one stays
 *  absent, a doc's is dropped. `undefined` when no call was made, `[]` for a
 *  bare call (nothing to report). */
export function reportedNames(commands: string[], rel: (p: string) => string): ReportedEntry[] | undefined {
  const callsIn = (command: string): string[][] => commandWords(command).flatMap((words) => {
    // Run, not named: the script is the verb, or a shell's first non-flag
    // argument; a shell's `-c` (also `-lc`) runs the next word as a command.
    if (!isShell(words[0])) return words[0]?.endsWith(HELPED_SCRIPT) ? [words.slice(1)] : []
    const at = words.findIndex((w, i) => i > 0 && !w.startsWith('-'))
    if (words.slice(1, at === -1 ? undefined : at).some((f) => /^-\w*c\w*$/.test(f))) return callsIn(words[at] ?? '')
    return at !== -1 && words[at]!.endsWith(HELPED_SCRIPT) ? [words.slice(at + 1)] : []
  })
  const args = commands.flatMap(callsIn).at(-1)
  if (args === undefined) return undefined
  // Agents separate names by commas or quote several in one argument.
  const tokens = args.flatMap((a) => a.split(/[\s,]+/)).filter(Boolean)
  // An unspaced redirect (`rule:a>out`, `2>err`) leaves only what precedes it.
  const names = tokens.flatMap((t, i) => (isRedirect(tokens[i - 1]) ? [] : [t.split(/&?[<>]/)[0]!])).filter((t) => !isNoName(t))
  const entries = new Map<string, ReportedEntry>()
  for (const t of names) {
    const eq = t.lastIndexOf('=')
    const name = (eq === -1 ? t : t.slice(0, eq)).replace(/^(rule|doc):/, '')
    if (!name) continue
    if (!t.startsWith('rule:') && !name.includes('.claude/rules/')) {
      entries.set(rel(name), { path: rel(name) })
      continue
    }
    const raw = eq === -1 ? undefined : t.slice(eq + 1).toLowerCase()
    const value = raw === undefined ? undefined : (ruleValue.safeParse(raw).data ?? 'unsure')
    entries.set(ruleName(name), value ? { path: ruleName(name), value } : { path: ruleName(name) })
  }
  return [...entries.values()]
}
