// A hint, not a guard: after a Bash command, add the rules whose `paths` match
// the files it read. Claude Code loads a path-scoped rule for a Bash read only
// when the command is one simple read of one file; a piped, chained (`cd … &&`)
// or multi-file read loads nothing (ADR-0029, issue #1764). So this stays
// silent for a simple read and fills the gap for the rest. Rules already loaded
// are skipped; a subagent's payload carries its parent's `transcript_path`
// (docs/agents/guards.md), so it is checked against its own. Fails open: any
// error adds nothing.
// `scripts/bash-rules-hint.sh` is the hot-path pre-filter.
//
// Usage:
//   tsx scripts/bash-rules-hint.ts                # hook payload on stdin
//   tsx scripts/bash-rules-hint.ts --dry-run (--input '<payload json>' | --input-file <path>)
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, isAbsolute, join, matchesGlob, relative } from 'node:path'
import { printDryRunResult, prop, readTranscript, resolveDryRunInput, runIfMain } from './guard-io.ts'
import { extractTrace, subagentTranscript } from './session-trace.ts'
import { bashReadPaths } from './shell-reads.ts'
import { loadRules, type RuleFile } from './skill-rules-hint.ts'
import { RULES_DIR, ruleBlock, rulePaths } from './validate-adr-rules.ts'

/** `loaded` gives the `.claude/rules/<file>` keys already in the session; it
 *  runs only on a match, so a miss never reads the transcript. A directory is a
 *  search, not a read: the harness loads the rule once a file in it is touched. */
export function bashRulesHint(command: string, cwd: string, root: string, rules: RuleFile[], loaded: () => Set<string>): string | null {
  const { paths, simple } = bashReadPaths(command, cwd)
  if (simple) return null
  const reads = paths
    .filter((p) => !p.endsWith('/'))
    .map((p) => relative(root, p))
    .filter((p) => !p.startsWith('..') && !isAbsolute(p) && !statSync(join(root, p), { throwIfNoEntry: false })?.isDirectory())
  const hits = rules.filter((r) => rulePaths(r.text).some((g) => reads.some((p) => matchesGlob(p, g))))
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

const cwdOf = (payload: unknown) => String(prop(payload, 'cwd') ?? process.cwd())

function hintFor(payload: unknown): string | null {
  const command = prop(prop(payload, 'tool_input'), 'command')
  if (prop(payload, 'tool_name') !== 'Bash' || typeof command !== 'string') return null
  const cwd = cwdOf(payload)
  const root = repoRoot(cwd)
  if (!root) return null
  const parent = String(prop(payload, 'transcript_path') ?? '')
  const agent = prop(payload, 'agent_id')
  const transcript = agent === undefined ? parent : subagentTranscript(parent, String(agent))
  return bashRulesHint(command, cwd, root, loadRules(join(root, RULES_DIR)), () => new Set(extractTrace(readTranscript(transcript) ?? []).rulesLoaded))
}

function main(): void {
  const payload = JSON.parse(readFileSync(0, 'utf8'))
  const hint = hintFor(payload)
  const hookEventName = prop(payload, 'hook_event_name') === 'PostToolUseFailure' ? 'PostToolUseFailure' : 'PostToolUse'
  if (hint) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName, additionalContext: hint } }))
}

function dryRun(argv: string[]): void {
  const payload = resolveDryRunInput(argv)
  const command = prop(prop(payload, 'tool_input'), 'command')
  const reads = typeof command === 'string' ? bashReadPaths(command, cwdOf(payload)) : null
  printDryRunResult({ reads, hint: hintFor(payload) })
}

runIfMain(import.meta.url, { main, dryRun, label: 'bash-rules hint', ref: 'issue #1764', failOpen: true })
