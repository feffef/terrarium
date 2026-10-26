// A hint, not a guard (ADR-0029, issue #2286): a summary rule says when to read
// its ADR in full, but sessions edited what an ADR governs without reading it.
// After an Edit or Write this points to each ADR whose rule `paths` match the
// file, or that the old or new text names, unless this agent's own transcript
// shows it read in full (the session log's test, `adrReadInFull`) or already
// holds its pointer. The text match skips Tenant content and session logs,
// where ADR numbers are quoted, not acted on. It arrives after the write, so a
// closing line says a late read that clears the edit is not a Friction. A
// subagent or workflow agent is checked against its own transcript; with no
// transcript it adds nothing, since every edit would repeat the pointer.
// A Bash write is seen when a Bash call runs `git commit` (issue #2433): each
// commit its output names is diffed, and the files and changed lines are matched
// the same way, so a heredoc's, `sed -i`'s or a workflow agent's write is caught
// before review and push. Not seen: a write never committed, a commit made
// inside a script, a `git commit -q`, a merge commit, a commit in a command that
// fails afterwards (PostToolUseFailure carries no stdout), and a path git still
// quotes (a quote, backslash or control character in it).
// Fails open: any error adds nothing.
// `scripts/hooks/adr-read-hint.sh` is the hot-path pre-filter.
//
// Usage:
//   tsx scripts/hooks/adr-read-hint.ts                # hook payload on stdin
//   tsx scripts/hooks/adr-read-hint.ts --dry-run (--input '<payload json>' | --input-file <path>)
//     (with no transcript_path, the dry run assumes an empty transcript; a Bash
//     payload needs a `git commit` command and its stdout in tool_response)
import { readdirSync } from 'node:fs'
import { isAbsolute, join, matchesGlob, relative } from 'node:path'
import { printDryRunResult, prop, readHookPayload, readTranscript, resolveDryRunInput, runGuard } from './hook-io.ts'
import { repoRoot } from './bash-rules-hint.ts'
import { adrReadInFull, agentTranscript, hintText, loadDocLineIndex } from '../session/transcript-trace.ts'
import type { DocLineIndex } from '../session/shell-reads.ts'
import { tryGit } from '../lib/git.ts'
import { ADR_DIR, adrDocNumber, adrHintLine, adrHintsIn, loadRules, RULES_DIR, ruleAdr, rulePaths, type AdrHintVia, type RuleFile } from '../lib/adr-rules.ts'

export interface AdrHit {
  adr: string
  via: AdrHintVia
}

const NO_TEXT_MATCH = ['layers/*/content/**', '.session-logs/**', '.throwaway/**']

/** The ADRs a write to repo-relative `file` touches, path matches first.
 *  `adrs` maps each ADR number to its file; any other number is dropped. */
export function adrsForWrite(file: string, texts: string[], rules: RuleFile[], adrs: Map<string, string>): AdrHit[] {
  const hits = new Map<string, AdrHintVia>()
  const add = (n: string | undefined, via: AdrHintVia) => {
    if (n && adrs.has(n) && !hits.has(n)) hits.set(n, via)
  }
  for (const r of rules) {
    if (rulePaths(r.text).some((g) => matchesGlob(file, g))) add(ruleAdr(r.file), 'path')
  }
  if (!NO_TEXT_MATCH.some((g) => matchesGlob(file, g))) {
    add(adrDocNumber(file), 'text')
    for (const m of texts.join('\n').matchAll(/\bADR-(\d{4})\b/g)) add(m[1], 'text')
  }
  return [...hits].map(([adr, via]) => ({ adr, via }))
}

export const LATE_READ_NOTE = 'If the ADR shows the edit was already right, the late read is not a Friction.'

export interface FileWrite {
  file: string
  texts: string[]
}

/** `git`, its global options, then the `commit` subcommand. */
/** git's global options that take the next word as their value. */
const GIT_VALUE_OPTIONS = new Set(['-c', '-C', '--git-dir', '--work-tree', '--namespace'])

/** Whether a command runs `git [options] commit`. Tokenized rather than one
 *  regex, which backtracked exponentially on runs of options; each token
 *  alternative starts with a different character, so this stays linear. */
export function runsGitCommit(command: string): boolean {
  const tokens = command.replace(/\\\n/g, ' ').match(/(?:[^\s;&|()<>`'"]|'[^']*'|"(?:[^"\\]|\\.)*")+|[\n;&|()<>`]/g) ?? []
  return tokens.some((t, i) => {
    if (t !== 'git' && !t.endsWith('/git')) return false
    let j = i + 1
    while (tokens[j]?.startsWith('-')) j += GIT_VALUE_OPTIONS.has(tokens[j]!) ? 2 : 1
    return tokens[j] === 'commit'
  })
}

/** The commits a Bash `git commit` reports, from git's `[branch sha] subject`
 *  summary lines; none unless the command runs `git commit`. A summary line
 *  from another command only adds a pointer, never hides one. */
export function committedShas(command: string, stdout: string): string[] {
  if (!runsGitCommit(command)) return []
  return [...stdout.matchAll(/^\[(?:[^\]\n]* )?([0-9a-f]{7,40})\] /gm)].map((m) => m[1]!)
}

/** Each file a `git diff-tree -p -U0` patch shows a text change for, with its
 *  added and removed lines as the text to match, like an Edit's old and new
 *  text. An empty, binary or mode-only change has no hunk: see `commitWrites`. */
export function patchWrites(patch: string): FileWrite[] {
  const out: FileWrite[] = []
  let cur: FileWrite | undefined
  let inHunk = false
  for (const line of patch.split('\n')) {
    if (line.startsWith('diff --git ')) [cur, inHunk] = [undefined, false]
    else if (line.startsWith('@@')) inHunk = true
    else if (inHunk) {
      if (cur && /^[+-]/.test(line)) cur.texts.push(line.slice(1))
    } else if (!cur && /^(---|\+\+\+) [ab]\//.test(line)) out.push((cur = { file: line.slice(6).replace(/\t$/, ''), texts: [] }))
  }
  return out
}

/** Every file a commit changes, from `--name-only` so a file with no hunk
 *  still counts, with the text its patch changed. */
function commitWrites(sha: string, root: string): FileWrite[] {
  const tree = (...args: string[]) => tryGit(['-c', 'core.quotePath=false', 'diff-tree', '-r', '--no-commit-id', '--no-renames', '--root', ...args, sha], root).out
  const texts = new Map(patchWrites(tree('-p', '-U0', '--no-color')).map((w) => [w.file, w.texts]))
  return tree('--name-only', '-z').split('\0').filter(Boolean).map((file) => ({ file, texts: texts.get(file) ?? [] }))
}

/** The files an Edit or Write touches, or a Bash `git commit` committed, as
 *  repo-relative paths. */
function writesOf(payload: unknown, root: string): FileWrite[] {
  const input = prop(payload, 'tool_input')
  if (prop(payload, 'tool_name') === 'Bash') {
    const command = prop(input, 'command')
    const stdout = prop(prop(payload, 'tool_response'), 'stdout')
    if (typeof command !== 'string' || typeof stdout !== 'string') return []
    return committedShas(command, stdout).flatMap((sha) => commitWrites(sha, root))
  }
  const filePath = prop(input, 'file_path')
  if (typeof filePath !== 'string') return []
  const file = relative(root, filePath).replace(/^\.claude\/worktrees\/[^/]+\//, '')
  if (file.startsWith('..') || isAbsolute(file)) return []
  const texts = ['old_string', 'new_string', 'content'].map((k) => prop(input, k)).filter((t): t is string => typeof t === 'string')
  return [{ file, texts }]
}

/** ADRs this transcript already pointed to. */
const pointedTo = (records: Record<string, unknown>[]) => new Set(records
  .map((r) => r.attachment as { type?: string; content?: unknown } | undefined)
  .filter((a) => a?.type === 'hook_additional_context')
  .flatMap((a) => adrHintsIn(hintText(a!.content)).map((h) => h.adr)))

function hintFor(payload: unknown, dryRun = false): string | null {
  const root = repoRoot(String(prop(payload, 'cwd') ?? process.cwd()))
  if (!root) return null
  const writes = writesOf(payload, root)
  if (writes.length === 0) return null
  const adrs = new Map(readdirSync(join(root, ADR_DIR)).map((f) => `${ADR_DIR}/${f}`).flatMap((p) => adrDocNumber(p) ? [[adrDocNumber(p)!, p] as const] : []))
  const rules = loadRules(join(root, RULES_DIR))
  const hits = new Map<string, AdrHit & { file: string }>()
  for (const w of writes) {
    for (const h of adrsForWrite(w.file, w.texts, rules, adrs)) if (!hits.has(h.adr)) hits.set(h.adr, { ...h, file: w.file })
  }
  if (hits.size === 0) return null
  const parent = prop(payload, 'transcript_path')
  const agent = prop(payload, 'agent_id')
  let records: Record<string, unknown>[] | null
  if (typeof parent !== 'string') records = dryRun && parent === undefined ? [] : null
  else records = readTranscript(agent === undefined ? parent : agentTranscript(parent, String(agent)))
  if (!records) return null
  const pointed = pointedTo(records)
  // The session log's index, so a shell read counts the same in both; built
  // only when a Read hasn't settled it, since it reads the whole checkout.
  let index: DocLineIndex | undefined
  const due = [...hits.values()].filter((h) => !pointed.has(h.adr) && !adrReadInFull(records, h.adr) && !adrReadInFull(records, h.adr, (index ??= loadDocLineIndex(root))))
  if (due.length === 0) return null
  return `${adrHintLine(due.map((h) => ({ ...h, doc: adrs.get(h.adr)! })))}\n${LATE_READ_NOTE}`
}

function main(): void {
  const read = readHookPayload()
  if (read.kind !== 'ok') return
  const hint = hintFor(read.payload)
  if (hint) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: hint } }))
}

function dryRun(argv: string[]): void {
  printDryRunResult({ hint: hintFor(resolveDryRunInput(argv), true) })
}

runGuard(import.meta.url, { main, dryRun, label: 'ADR read hint', ref: 'issue #2286', failOpen: true })
