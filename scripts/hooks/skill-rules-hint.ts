// A hint, not a guard: when a Skill runs, add the rules that list the
// Skill's directory in their `paths`. Claude Code loads a path-scoped rule only
// when a file is read or edited, and invoking a Skill (the Skill tool, or a
// slash command) reads no file, so without this a rule meant for a Skill never
// reaches its runs. The rules' `paths` stay the single definition of which
// Skill needs which rule. Fails open: any error adds nothing, since a hint must
// never block a session (docs/agents/guards.md).
//
// Usage:
//   tsx scripts/hooks/skill-rules-hint.ts                # hook payload on stdin
//   tsx scripts/hooks/skill-rules-hint.ts --dry-run (--input '<payload json>' | --input-file <path>)
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, matchesGlob } from 'node:path'
import { printDryRunResult, prop, readHookJson, resolveDryRunInput, runIfMain } from './hook-io.ts'
import { RULES_DIR, ruleBlock, rulePaths } from '../lib/adr-rules.ts'

/** The repo Skill a payload invokes: a Skill tool call, or a prompt that is a
 *  slash command. Namespaced Skills (`plugin:name`) are not ours. */
export function invokedSkill(payload: unknown): string | null {
  const prompt = String(prop(payload, 'prompt') ?? '')
  const raw =
    prop(payload, 'tool_name') === 'Skill'
      ? prop(prop(payload, 'tool_input'), 'skill')
      : (/^\s*\/([\w-]+)/.exec(prompt) ?? /<command-name>\/?([\w-]+)<\/command-name>/.exec(prompt))?.[1]
  if (typeof raw !== 'string') return null
  const name = raw.replace(/^\//, '')
  return /^[\w-]+$/.test(name) ? name : null
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
  return [`The ${skill} Skill runs under these rules:`, ...hits.map((r) => ruleBlock(r.file, r.text))].join('\n\n')
}

export function loadRules(dir = RULES_DIR): RuleFile[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((file) => ({ file, text: readFileSync(join(dir, file), 'utf8') }))
}

function hintFor(payload: unknown): string | null {
  const skill = invokedSkill(payload)
  return skill ? skillRulesHint(skill, loadRules()) : null
}

// Not readHookPayload: that one wants a tool call, and a slash command's
// UserPromptSubmit payload has none.
function main(): void {
  const read = readHookJson()
  if (read.kind !== 'ok') return
  const payload = read.json
  const hint = hintFor(payload)
  if (!hint) return
  const event = prop(payload, 'hook_event_name') === 'UserPromptSubmit' ? 'UserPromptSubmit' : 'PostToolUse'
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: hint } }))
}

function dryRun(argv: string[]): void {
  const payload = resolveDryRunInput(argv)
  printDryRunResult({ skill: invokedSkill(payload), hint: hintFor(payload) })
}

runIfMain(import.meta.url, { main, dryRun, label: 'skill-rules hint', ref: 'PR #1741', failOpen: true })
