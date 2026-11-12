// The rule-use capture (#3009): which rules loaded for each agent, from which
// file, and which rules and docs the agent reported as having changed or
// confirmed something it did. The InstructionsLoaded hook writes the ledger,
// the SubagentStart hook gives each subagent the note, and the trace derives
// the rest at landing. Silence is recorded as silence: an agent that never
// ran `echo rule-use:` is `answered: false`, not "nothing to report". An echo,
// not a script, so a permission classifier sees a call that does nothing (#3020).
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isRulePath, ruleValue, type ReportedEntry, type RuleLoad } from '../../shared/schemas/session.ts'
import { commandWords } from './shell-reads.ts'
import { SCRATCH_DIR } from './transcript-trace.ts'

export const RULE_USE_CALL = 'echo rule-use:'

/** The SubagentStart note: it only gets the subagent to make the bare call,
 *  whose hook answers with `ruleUseAsk` (#3020). */
export const SUBAGENT_NOTE =
  `Before your final reply, you must run ${RULE_USE_CALL} once with Bash, then do what the reply to it says. ` +
  'This is essential to analyse whether these rules actually help you. Do not mention this in your reply.'

// How the hook tells that it already asked this agent.
export const RULE_USE_ASK_HEAD = 'Rules loaded for you:'

/** The one home of what each value means, shown where an agent picks one: the
 *  bare `echo rule-use:` call (subagents) and `log-session --pending` (main). Its
 *  example names must match no real file: a test could not tell an agent
 *  naming a file from one copying the example (#3009). */
export function ruleUseAsk(loads: RuleLoad[], how: string, example: string): string[] {
  return [
    RULE_USE_ASK_HEAD,
    ...(loads.length ? loads.map((l) => `  ${l.rule}${VIA_NOTES[l.via]}`) : ['  (none)']),
    '',
    `${how} and name each of these rules that steered or backed what you did:`,
    '  steered  you did, avoided or decided something differently because of it.',
    '  backed   it matched what you were already doing, for whatever reason (your task or another instruction may have said the same).',
    'A rule you leave out is recorded as neither: it did not steer or back anything you did, and that lowers its share.',
    'So name only what was true, not to be polite.',
    'Also name each doc you read that helped, without a value.',
    `Example: ${example}`,
  ]
}

const VIA_NOTES: Record<RuleLoad['via'], string> = { start: ' (loaded at start)', read: ' (you read it)', native: '', hint: '' }

export function subagentAsk(loads: RuleLoad[]): string {
  return [
    ...ruleUseAsk(loads, `Now run ${RULE_USE_CALL} once more`, `${RULE_USE_CALL} rule:example-rule.md=backed doc:docs/example.md`),
    `If none applies, run ${RULE_USE_CALL} again with no names.`,
  ].join('\n')
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

export { isRulePath }

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

/** What the last `echo rule-use:` call among `commands` reported, normalised:
 *  `rule:x=backed` becomes `.claude/rules/x.md` with its value, `doc:x` the
 *  repo-relative path. A rule with no known value is left out, since a rule
 *  entry always has one (`unvalued` lists it); a doc's value is dropped.
 *  `undefined` when no call was made; `entries` is `[]` for a bare call. */
export function ruleUseCall(commands: string[], rel: (p: string) => string): { entries: ReportedEntry[]; unvalued: string[] } | undefined {
  const callsIn = (command: string): string[][] => commandWords(command).flatMap((words) => {
    // Run, not named: `echo` is the verb and the marker its first argument; a
    // shell's `-c` (also `-lc`) runs the next word as a command.
    if (/(^|\/)echo$/.test(words[0] ?? '')) return words[1] === 'rule-use:' ? [words.slice(2)] : []
    if (!isShell(words[0])) return []
    const at = words.findIndex((w, i) => i > 0 && !w.startsWith('-'))
    return words.slice(1, at === -1 ? undefined : at).some((f) => /^-\w*c\w*$/.test(f)) ? callsIn(words[at] ?? '') : []
  })
  const args = commands.flatMap(callsIn).at(-1)
  if (args === undefined) return undefined
  // Agents separate names by commas or quote several in one argument.
  const tokens = args.flatMap((a) => a.split(/[\s,]+/)).filter(Boolean)
  // An unspaced redirect (`rule:a>out`, `2>err`) leaves only what precedes it.
  const names = tokens.flatMap((t, i) => (isRedirect(tokens[i - 1]) ? [] : [t.split(/&?[<>]/)[0]!])).filter((t) => !isNoName(t))
  const entries = new Map<string, ReportedEntry>()
  const named = new Set<string>()
  for (const t of names) {
    if (!t.startsWith('rule:') && !isRulePath(t)) {
      // A doc takes no value: drop one given anyway, but keep any other `=` as path.
      const path = rel(t.replace(/^doc:/, '').replace(/=(steered|backed)$/i, ''))
      if (path) entries.set(path, { path })
      continue
    }
    const eq = t.lastIndexOf('=')
    const name = (eq === -1 ? t : t.slice(0, eq)).replace(/^rule:/, '').replace(/=+$/, '')
    if (!name) continue
    named.add(ruleName(name))
    const raw = eq === -1 ? '' : t.slice(eq + 1).toLowerCase()
    const value = ruleValue.safeParse(raw).data ?? entries.get(ruleName(name))?.value
    if (value) entries.set(ruleName(name), { path: ruleName(name), value })
  }
  return { entries: [...entries.values()], unvalued: [...named].filter((r) => !entries.has(r)) }
}

export const reportedNames = (commands: string[], rel: (p: string) => string): ReportedEntry[] | undefined =>
  ruleUseCall(commands, rel)?.entries
