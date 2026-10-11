// A hint, not a guard: after a Bash command, add the rules whose `paths` match
// the files it read. Claude Code loads a path-scoped rule for a Bash read only
// when the command is one simple read of one file; a piped, chained (`cd … &&`)
// or multi-file read loads nothing (ADR-0029, issue #1764). So this stays
// silent for a simple read and fills the gap for the rest. Rules already loaded
// this session are skipped, read from the transcript; a subagent's
// `transcript_path` is its parent's (docs/agents/guards.md), so a subagent may
// get a rule twice. Fails open: any error adds nothing.
// `scripts/bash-rules-hint.sh` is the hot-path pre-filter.
//
// Usage:
//   tsx scripts/bash-rules-hint.ts                # hook payload on stdin
//   tsx scripts/bash-rules-hint.ts --dry-run (--input '<payload json>' | --input-file <path>)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, isAbsolute, join, matchesGlob, relative } from 'node:path'
import { printDryRunResult, prop, readTranscript, resolveDryRunInput, runIfMain } from './guard-io.ts'
import { extractTrace } from './session-trace.ts'
import { bashReadPaths } from './shell-reads.ts'
import { loadRules, type RuleFile } from './skill-rules-hint.ts'
import { RULES_DIR, ruleBlock, rulePaths } from './validate-adr-rules.ts'

/** Whether a repo-relative directory holds a file the glob matches. */
type Holds = (dir: string, glob: string) => boolean

/** A directory reaches a glob once it is as deep as the glob's fixed part, so
 *  `grep -rn x layers/` does not inject every layers rule. */
function reaches(dir: string, glob: string): boolean {
  const parts = dir.slice(0, -1).split('/')
  const globs = glob.split('/')
  for (const [i, part] of parts.entries()) {
    if (globs[i] === '**') return true
    if (globs[i] === undefined || !matchesGlob(part, globs[i])) return false
  }
  const rest = globs.slice(parts.length)
  return rest.length === 1 || rest[0] === '**'
}

/** A file counts where the glob matches it, as when the harness loads a rule.
 *  A directory (trailing `/`) counts when it reaches the glob and holds a
 *  matching file. */
function covers(path: string, glob: string, holds: Holds): boolean {
  if (!path.endsWith('/')) return matchesGlob(path, glob)
  return reaches(path, glob) && holds(path, glob)
}

export function rulesForPaths(paths: string[], rules: RuleFile[], holds: Holds): RuleFile[] {
  return rules.filter((r) => rulePaths(r.text).some((g) => paths.some((p) => covers(p, g, holds))))
}

/** Stops at the first match. Symlinks are not followed, so a loop ends; a
 *  directory it cannot read counts as holding a match. */
function walker(root: string): Holds {
  const holds: Holds = (dir, glob) => {
    let entries
    try {
      entries = readdirSync(join(root, dir), { withFileTypes: true })
    } catch {
      return true
    }
    return entries.some((e) => (e.isDirectory() ? holds(`${dir}${e.name}/`, glob) : e.isFile() && matchesGlob(dir + e.name, glob)))
  }
  return holds
}

/** `loaded` gives the `.claude/rules/<file>` keys already in the session; it
 *  runs only on a match, so a miss never reads the transcript. */
export function bashRulesHint(command: string, cwd: string, root: string, rules: RuleFile[], loaded: () => Set<string>): string | null {
  const { paths, simple } = bashReadPaths(command, cwd)
  const reads = paths
    .map((p) => relative(root, p) + (p.endsWith('/') || statSync(p, { throwIfNoEntry: false })?.isDirectory() ? '/' : ''))
    // The repo root would match every rule: `grep -rn x .` is a search, not a read.
    .filter((p) => p !== '/' && !p.startsWith('..') && !isAbsolute(p))
  // A lone directory is not the one-file read the harness covers.
  if (simple && !reads.some((p) => p.endsWith('/'))) return null
  const hits = rulesForPaths(reads, rules, walker(root))
  if (hits.length === 0) return null
  const skip = loaded()
  const fresh = hits.filter((r) => !skip.has(`${RULES_DIR}/${r.file}`))
  if (fresh.length === 0) return null
  return ['Files this command read are governed by these rules:', ...fresh.map((r) => ruleBlock(r.file, r.text))].join('\n\n')
}

/** Nearest ancestor holding `.claude/rules`, so a worktree matches its own tree. */
function repoRoot(cwd: string): string | null {
  for (let d = cwd; ; d = dirname(d)) {
    if (existsSync(join(d, RULES_DIR))) return d
    if (dirname(d) === d) return null
  }
}

function hintFor(payload: unknown): string | null {
  const command = prop(prop(payload, 'tool_input'), 'command')
  if (prop(payload, 'tool_name') !== 'Bash' || typeof command !== 'string') return null
  const cwd = String(prop(payload, 'cwd') ?? process.cwd())
  const root = repoRoot(cwd)
  if (!root) return null
  const subagent = prop(payload, 'agent_id') !== undefined
  return bashRulesHint(command, cwd, root, loadRules(join(root, RULES_DIR)), () =>
    subagent ? new Set() : new Set(extractTrace(readTranscript(String(prop(payload, 'transcript_path') ?? '')) ?? []).rulesLoaded),
  )
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
