// A hint, not a guard: when a Skill runs, add the ADR rules that list the
// Skill's directory in their `paths`. Claude Code loads a path-scoped rule only
// when a file is read or edited, and invoking a Skill (the Skill tool, or a
// slash command) reads no file, so without this a rule meant for a Skill never
// reaches its runs. The rules' `paths` stay the single definition of which
// Skill needs which ADR. Fails open: any error adds nothing (ADR-0027: a hook
// warns and exits 0).
//
// Usage:
//   tsx scripts/skill-rules-hint.ts                # hook payload on stdin
//   tsx scripts/skill-rules-hint.ts --dry-run (--input '<payload json>' | --input-file <path>)
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, matchesGlob } from 'node:path'
import { printDryRunResult, resolveDryRunInput, runIfMain } from './guard-io.ts'
import { ruleBody, rulePaths } from './validate-adr-rules.ts'

const RULES_DIR = '.claude/rules'

function field(obj: unknown, key: string): unknown {
  return obj !== null && typeof obj === 'object' ? (obj as Record<string, unknown>)[key] : undefined
}

/** The repo Skill a payload invokes: a Skill tool call, or a prompt that is a
 *  slash command. Namespaced Skills (`plugin:name`) are not ours. */
export function invokedSkill(payload: unknown): string | null {
  const raw =
    field(payload, 'tool_name') === 'Skill'
      ? field(field(payload, 'tool_input'), 'skill')
      : /^\s*\/([\w-]+)/.exec(String(field(payload, 'prompt') ?? ''))?.[1] ??
        /<command-name>\/?([\w-]+)<\/command-name>/.exec(String(field(payload, 'prompt') ?? ''))?.[1]
  return typeof raw === 'string' && /^[\w-]+$/.test(raw.replace(/^\//, '')) ? raw.replace(/^\//, '') : null
}

export interface RuleFile {
  file: string
  text: string
}

/** The rules that name this Skill's own directory in their `paths`. A glob
 *  over every Skill (ADR-0005's `.agents/skills/**`) is about editing Skills,
 *  so it loads on an edit, not on every run. */
export function rulesForSkill(skill: string, rules: RuleFile[]): RuleFile[] {
  const dir = `.agents/skills/${skill}/`
  return rules.filter((r) => rulePaths(r.text).some((g) => g.startsWith(dir) && matchesGlob(`${dir}SKILL.md`, g)))
}

export function skillRulesHint(skill: string, rules: RuleFile[]): string | null {
  const hits = rulesForSkill(skill, rules)
  if (hits.length === 0) return null
  const blocks = hits.map((r) => `Contents of ${RULES_DIR}/${r.file}:\n\n${ruleBody(r.text).trim()}`)
  return [`The ${skill} Skill runs under these ADR rules:`, ...blocks].join('\n\n')
}

function loadRules(): RuleFile[] {
  if (!existsSync(RULES_DIR)) return []
  return readdirSync(RULES_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((file) => ({ file, text: readFileSync(join(RULES_DIR, file), 'utf8') }))
}

function hintFor(payload: unknown): string | null {
  const skill = invokedSkill(payload)
  return skill ? skillRulesHint(skill, loadRules()) : null
}

// Not readHookPayload: that one wants a tool call, and a slash command's
// UserPromptSubmit payload has none.
function main(): void {
  const payload: unknown = JSON.parse(readFileSync(0, 'utf8'))
  const hint = hintFor(payload)
  if (!hint) return
  const event = field(payload, 'hook_event_name') === 'UserPromptSubmit' ? 'UserPromptSubmit' : 'PostToolUse'
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: hint } }))
}

function dryRun(argv: string[]): void {
  const payload = resolveDryRunInput(argv)
  printDryRunResult({ skill: invokedSkill(payload), hint: hintFor(payload) })
}

runIfMain(import.meta.url, { main, dryRun, label: 'skill-rules hint', ref: 'PR #1741', failOpen: true })
