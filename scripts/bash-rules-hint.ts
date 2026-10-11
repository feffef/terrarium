// A hint, not a guard: after a Bash command, add the rules whose `paths` match
// the files it read. Claude Code loads a path-scoped rule for a Bash read only
// when the command is one simple read of one file; a piped, chained (`cd … &&`)
// or multi-file read loads nothing (ADR-0029, issue #1764). So this stays
// silent for a simple read and fills the gap for the rest. Path extraction is
// heuristic (`bashReadPaths` in shell-reads.ts): common reader verbs, not a
// shell parser. Rules already loaded this session are skipped, read from the
// transcript; a subagent's `transcript_path` is its parent's
// (docs/agents/guards.md), so a subagent may get a rule twice. Fails open: any
// error adds nothing. `scripts/bash-rules-hint.sh` is the hot-path pre-filter.
//
// Usage:
//   tsx scripts/bash-rules-hint.ts                # hook payload on stdin
//   tsx scripts/bash-rules-hint.ts --dry-run (--input '<payload json>' | --input-file <path>)
import { existsSync, readFileSync } from 'node:fs'
import { dirname, isAbsolute, join, matchesGlob, relative } from 'node:path'
import { printDryRunResult, readTranscript, resolveDryRunInput, runIfMain } from './guard-io.ts'
import { hintedRules, ruleKey } from './session-trace.ts'
import { bashReadPaths } from './shell-reads.ts'
import { loadRules, prop, type RuleFile } from './skill-rules-hint.ts'
import { ruleBody, rulePaths } from './validate-adr-rules.ts'

const RULES_DIR = '.claude/rules'

/** `path` is a file `glob` matches, or a directory that can hold one
 *  (`grep -rn x layers/` reads what `layers/*\/app/**` names). */
function covers(path: string, glob: string): boolean {
  if (matchesGlob(path, glob)) return true
  const parts = path.split('/')
  const globs = glob.split('/')
  for (const [i, part] of parts.entries()) {
    const g = globs[i]
    if (g === undefined) return false
    if (g === '**') return true
    if (!matchesGlob(part, g)) return false
  }
  return globs.length > parts.length
}

export function rulesForPaths(paths: string[], rules: RuleFile[]): RuleFile[] {
  return rules.filter((r) => rulePaths(r.text).some((g) => paths.some((p) => covers(p, g))))
}

/** `loaded` holds `.claude/rules/<file>` keys already in the session. */
export function bashRulesHint(command: string, cwd: string, root: string, rules: RuleFile[], loaded = new Set<string>()): string | null {
  const { paths, simple } = bashReadPaths(command, cwd)
  if (simple) return null
  // The repo root itself ('') would match every rule: `grep -rn x .` is a search, not a read.
  const inRepo = paths.map((p) => relative(root, p)).filter((p) => p !== '' && !p.startsWith('..') && !isAbsolute(p))
  const hits = rulesForPaths(inRepo, rules).filter((r) => !loaded.has(`${RULES_DIR}/${r.file}`))
  if (hits.length === 0) return null
  const blocks = hits.map((r) => `Contents of ${RULES_DIR}/${r.file}:\n\n${ruleBody(r.text).trim()}`)
  return ['Files this command read are governed by these rules:', ...blocks].join('\n\n')
}

/** Nearest ancestor holding `.claude/rules`, so a worktree matches its own tree. */
function repoRoot(cwd: string): string | null {
  for (let d = cwd; ; d = dirname(d)) {
    if (existsSync(join(d, RULES_DIR))) return d
    if (dirname(d) === d) return null
  }
}

function loadedRules(records: Record<string, unknown>[]): Set<string> {
  const out = new Set<string>()
  for (const rec of records) {
    const att = rec.attachment as { type?: string; path?: string; content?: unknown } | undefined
    if (att?.type === 'nested_memory' && att.path?.includes(`/${RULES_DIR}/`)) out.add(ruleKey(att.path))
    if (att?.type === 'hook_additional_context') for (const r of hintedRules(att.content)) out.add(r)
  }
  return out
}

function hintFor(payload: unknown): string | null {
  const command = prop(prop(payload, 'tool_input'), 'command')
  if (prop(payload, 'tool_name') !== 'Bash' || typeof command !== 'string') return null
  const cwd = String(prop(payload, 'cwd') ?? process.cwd())
  const root = repoRoot(cwd)
  if (!root) return null
  const rules = loadRules(join(root, RULES_DIR))
  const hint = bashRulesHint(command, cwd, root, rules)
  if (!hint || prop(payload, 'agent_id') !== undefined) return hint
  const records = readTranscript(String(prop(payload, 'transcript_path') ?? ''))
  return records ? bashRulesHint(command, cwd, root, rules, loadedRules(records)) : hint
}

function main(): void {
  const hint = hintFor(JSON.parse(readFileSync(0, 'utf8')))
  if (hint) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: hint } }))
}

function dryRun(argv: string[]): void {
  const payload = resolveDryRunInput(argv)
  const command = prop(prop(payload, 'tool_input'), 'command')
  const reads = typeof command === 'string' ? bashReadPaths(command, String(prop(payload, 'cwd') ?? process.cwd())) : null
  printDryRunResult({ reads, hint: hintFor(payload) })
}

runIfMain(import.meta.url, { main, dryRun, label: 'bash-rules hint', ref: 'issue #1764', failOpen: true })
