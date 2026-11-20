// The rule-use capture (#3009): which rules loaded for each agent, from which
// file, and which rules and docs the agent reported as having changed or
// confirmed something it did. The InstructionsLoaded hook writes the ledger,
// the SubagentStart hook gives each subagent the note, and the trace derives
// the rest at landing. Silence is recorded as silence: an agent that never
// ran `echo rule-use:` is `answered: false`, not "nothing to report". An echo,
// not a script, so a permission classifier sees a call that does nothing (#3020).
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isRulePath, ruleValue, wordsFor, type ReportedEntry, type RuleLoad } from '../../shared/schemas/session.ts'
import { root } from '../lib/cli.ts'
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

/** What a rule governs, shown beside it where an agent rates, for the rules
 *  whose `paths` don't say: those with none, and those whose text both
 *  describes and instructs. Any other rule shows its `paths` (`governsLine`). */
export const GOVERNS: Record<string, string> = {
  'adr-0002': 'editing a Tenant manifest; never writing expanded collections by hand',
  'adr-0003': 'opening, pushing and landing a change as a PR; proposing or building new work',
  'adr-0004': 'running gate:scoped and code-review before a PR opens, and merging it',
  'adr-0005': 'creating or changing a Skill, workflow script or Routine',
  'adr-0009': 'writing and landing your own session log',
  'adr-0015': 'editing installed Skills, Skill Inventory entries and importance grades',
  'adr-0017': 'GitHub bodies, commits and other outside writes naming your session; checking the commit trailer landed',
  'adr-0021': 'adding or editing glossary terms and the glossary map',
  'adr-0030': 'writing or rewriting an ADR',
  'mdc-when-to-use': 'putting a Vue component in a Document or adding a data Collection',
  'tenant-layers': 'writing Tenant layer code: sharing code, naming exports, imports and aliases',
}

// Read from the rule file, not copied, so the line cannot drift from its `paths`.
function rulePaths(rule: string): string[] {
  try {
    const text = readFileSync(join(root, rule), 'utf8')
    return text.startsWith('---') ? [...(text.split(/^---$/m)[1] ?? '').matchAll(/^\s+- "?([^"\n]+)"?$/gm)].map((m) => m[1]!) : []
  } catch {
    return []
  }
}

/** The line shown beside a loaded rule: what it governs, else where it loads. */
export function governsLine(rule: string): string | undefined {
  const known = GOVERNS[rule.replace(/^\.claude\/rules\//, '').replace(/\.md$/, '')]
  if (known) return `governs ${known}`
  const paths = rulePaths(rule)
  return paths.length ? `loads on ${paths.slice(0, 3).join(', ')}${paths.length > 3 ? `, +${paths.length - 3} more` : ''}` : undefined
}

/** The one home of what each value means, shown where an agent picks one: the
 *  bare `echo rule-use:` call (subagents) and `log-session --pending` (main). Its
 *  example names must match no real file: a test could not tell an agent
 *  naming a file from one copying the example (#3009). `describe` adds what a
 *  rule governs beside its name. */
export function ruleUseAsk(loads: RuleLoad[], how: string, example: string, describe: (rule: string) => string | undefined = () => undefined): string[] {
  return [
    RULE_USE_ASK_HEAD,
    ...(loads.length ? loads.map((l) => { const what = describe(l.rule); return `  ${l.rule}${VIA_NOTES[l.via]}${what ? `  [${what}]` : ''}` }) : ['  (none)']),
    '',
    `${how} and give each of these rules that loaded during your task ONE value, the first that fits.`,
    'A rule governs what its own text tells you to do and the thing it describes; its paths only explain why it loaded. A mention in a brief, note or summary does not count.',
    '  steered    it changed what you did, avoided or decided.',
    '  confirmed  you checked a specific choice against the rule itself. Word: agreed (it matched your choice) or n/a (it does not apply to what you are doing).',
    '  unrelated  nothing you did, read or reviewed is something it governs, however it loaded. This includes rules about actions you did not take (PRs, merges, logs, GitHub or git writes).',
    '  missed     it governs something you changed, reviewed or ran and you did not follow it, or you skipped a step its own text requires. Word: late (it first reached you after that action, never the one that triggered its load) or skipped. Not missed if you were compliant anyway, or your brief waived it.',
    '  duplicate  you did what it says, but another source or habit said the same, so you did not need it. Word: brief, claude-md, skill, hook, habit or other. Doing the activity your brief assigned counts; reading a file the brief named does not.',
    '  in-scope   something it governs was in your work (done, read or reviewed), but none of the above applies.',
    'A value with a word needs it: after a colon in the call, or at the start of `why` followed by a colon in `reported`. A rule you leave out has no value, which lowers its share.',
    'So name only what was true, not to be polite. Also name each doc you read that helped, without a value.',
    `Example: ${example}`,
  ]
}

const VIA_NOTES: Record<RuleLoad['via'], string> = { start: ' (loaded at start)', read: ' (you read it)', native: '', hint: '' }

export function subagentAsk(loads: RuleLoad[]): string {
  return [
    ...ruleUseAsk(loads, `Now run ${RULE_USE_CALL} once more`, `${RULE_USE_CALL} rule:example-rule.md=missed:late rule:other-rule.md=steered doc:docs/example.md`, governsLine),
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

/** Loaded rules `--author` still has no rating for (#3508). An empty `reported`
 *  is the explicit none-applies, so it leaves none; absent, it leaves all. */
export function unratedRules(loads: RuleLoad[], reported: { path: string }[] | undefined): string[] {
  if (reported?.length === 0) return []
  const rated = new Set((reported ?? []).map((r) => ruleKey(r.path)))
  return [...new Set(loads.map((l) => ruleKey(l.rule)))].filter((r) => !rated.has(r))
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

/** The values an agent may still report: `backed` only reads in old logs. */
const OFFERED = ruleValue.options.filter((v) => v !== 'backed')
const DOC_VALUE = new RegExp(`=(${ruleValue.options.join('|')})(:\\S*)?$`, 'i')

/** What the last `echo rule-use:` call among `commands` reported, normalised:
 *  `rule:x=missed:late` becomes `.claude/rules/x.md` with its value and a `why`
 *  that starts with its word, `doc:x` the repo-relative path. A rule with no
 *  offered value, or a value that needs a word and has none, is left out, since
 *  a rule entry always has them (`unvalued` lists it); a doc's value is dropped.
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
      const path = rel(t.replace(/^doc:/, '').replace(DOC_VALUE, ''))
      if (path) entries.set(path, { path })
      continue
    }
    const eq = t.lastIndexOf('=')
    const name = (eq === -1 ? t : t.slice(0, eq)).replace(/^rule:/, '').replace(/=+$/, '')
    if (!name) continue
    const key = ruleName(name)
    named.add(key)
    const [raw = '', rawWord = '', ...detail] = (eq === -1 ? '' : t.slice(eq + 1)).toLowerCase().split(':')
    const value = OFFERED.find((v) => v === raw)
    if (!value) continue
    const words = wordsFor(value)
    if (!words) entries.set(key, { path: key, value })
    else if (words.includes(rawWord)) entries.set(key, { path: key, value, why: `${rawWord}:${detail.length ? ` ${detail.join(':')}` : ''}` })
  }
  return { entries: [...entries.values()], unvalued: [...named].filter((r) => !entries.has(r)) }
}

export const reportedNames = (commands: string[], rel: (p: string) => string): ReportedEntry[] | undefined =>
  ruleUseCall(commands, rel)?.entries
