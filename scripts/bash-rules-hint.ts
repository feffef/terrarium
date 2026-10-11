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
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, isAbsolute, join, matchesGlob, relative } from 'node:path'
import { printDryRunResult, prop, readTranscript, resolveDryRunInput, runIfMain } from './guard-io.ts'
import { hintedRules, ruleKey } from './session-trace.ts'
import { bashReadPaths } from './shell-reads.ts'
import { loadRules, type RuleFile } from './skill-rules-hint.ts'
import { RULES_DIR, ruleBlock, rulePaths } from './validate-adr-rules.ts'

/** A file counts where the glob matches it, as when the harness loads a rule.
 *  A directory (trailing `/`) counts only once it is as deep as the glob's
 *  fixed part, so `grep -rn x layers/` does not inject every layers rule. */
function covers(path: string, glob: string): boolean {
  if (!path.endsWith('/')) return matchesGlob(path, glob)
  const parts = path.slice(0, -1).split('/')
  const globs = glob.split('/')
  for (const [i, part] of parts.entries()) {
    if (globs[i] === '**') return true
    if (globs[i] === undefined || !matchesGlob(part, globs[i])) return false
  }
  const rest = globs.slice(parts.length)
  return rest.length === 1 || rest[0] === '**'
}

export function rulesForPaths(paths: string[], rules: RuleFile[]): RuleFile[] {
  return rules.filter((r) => rulePaths(r.text).some((g) => paths.some((p) => covers(p, g))))
}

const isDirectory = (p: string) => existsSync(p) && statSync(p).isDirectory()

/** The rules governing what `command` read, repo-relative. */
export function matchedRules(command: string, cwd: string, root: string, rules: RuleFile[]): RuleFile[] {
  const { paths, simple } = bashReadPaths(command, cwd)
  const reads = paths
    .map((p) => relative(root, p) + (p.endsWith('/') || isDirectory(p) ? '/' : ''))
    // The repo root would match every rule: `grep -rn x .` is a search, not a read.
    .filter((p) => p !== '/' && p !== '' && !p.startsWith('..') && !isAbsolute(p))
  // A lone directory is not the one-file read the harness covers.
  if (simple && !reads.some((p) => p.endsWith('/'))) return []
  return rulesForPaths(reads, rules)
}

function formatHint(rules: RuleFile[]): string | null {
  if (rules.length === 0) return null
  return ['Files this command read are governed by these rules:', ...rules.map((r) => ruleBlock(r.file, r.text))].join('\n\n')
}

/** `loaded` holds `.claude/rules/<file>` keys already in the session. */
export function bashRulesHint(command: string, cwd: string, root: string, rules: RuleFile[], loaded = new Set<string>()): string | null {
  return formatHint(matchedRules(command, cwd, root, rules).filter((r) => !loaded.has(`${RULES_DIR}/${r.file}`)))
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
  const hits = matchedRules(command, cwd, root, loadRules(join(root, RULES_DIR)))
  if (hits.length === 0) return null
  const subagent = prop(payload, 'agent_id') !== undefined
  const loaded = subagent ? new Set<string>() : loadedRules(readTranscript(String(prop(payload, 'transcript_path') ?? '')) ?? [])
  return formatHint(hits.filter((r) => !loaded.has(`${RULES_DIR}/${r.file}`)))
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
