// PROTOTYPE — throwaway, not production (see .claude/skills/prototype). Answers
// one question: would crediting `docsReadViaShell` from what a Bash command's
// OUTPUT contains (lines of an instruction doc), instead of parsing the command
// string, beat today's parser on the SHELL-READ-DETECTION frictions logged
// between 2026-09-01 and 2026-10-02?
//
// Run: pnpm exec tsx scripts/shell-reads-by-output.prototype.ts
//
// Each corpus case replays a friction's verbatim command against this checkout
// (or a simulated output where the record says the output was empty), then
// scores three methods against what the friction said should have happened:
//   landed   — extractTrace, the scan that lands in the Journal today
//   advisory — shellReadScanOf, the glob/cd-aware scan `--author` prints
//   output   — this prototype, in several (K, minLen, sinks) configurations

import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { canonicalizeInstructionPath, isInstructionDoc } from './shell-reads'
import { extractTrace, shellReadScanOf } from './session-trace'

const ROOT = process.cwd()

// ── The output-content matcher ───────────────────────────────────────────────

interface Config {
  name: string
  minLen: number
  k: number
  /** Also credit a doc whose own path prefixes an output line (`path:12:text`,
   *  the multi-file grep/rg shape) — still output-only evidence, no command parsing. */
  prefixSignal?: boolean
  /** Files whose lines are never credited but still count toward uniqueness:
   *  a line shared with one of these is not distinctive. */
  sinks: string[]
}

interface LineIndex {
  byLine: Map<string, string>
  docs: number
  lines: number
  dropped: number
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === '.nuxt' || name === '.output') continue
    const p = join(dir, name)
    const st = statSync(p, { throwIfNoEntry: false })
    if (!st) continue
    if (st.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

function instructionDocs(): string[] {
  const rel = (p: string) => p.slice(ROOT.length + 1)
  const roots = ['docs', '.agents', 'layers']
  const files = roots.flatMap((r) => walk(join(ROOT, r))).map(rel)
  return [...files, 'CONTEXT.md', 'CONTEXT-MAP.md'].filter((p) => isInstructionDoc(p))
}

function sinkFiles(patterns: string[]): string[] {
  return patterns.flatMap((p) => {
    if (p === 'layers/**') return walk(join(ROOT, 'layers')).map((f) => f.slice(ROOT.length + 1)).filter((f) => /\.(md|yml|yaml)$/.test(f))
    return [p]
  })
}

function buildIndex(cfg: Config): LineIndex {
  const owners = new Map<string, Set<string>>()
  const add = (path: string, creditable: boolean) => {
    let text: string
    try { text = readFileSync(join(ROOT, path), 'utf8') } catch { return }
    for (const raw of text.split('\n')) {
      const line = raw.trim()
      if (line.length < cfg.minLen) continue
      const set = owners.get(line) ?? new Set<string>()
      set.add(creditable ? path : `\u0000sink:${path}`)
      owners.set(line, set)
    }
  }
  const docs = instructionDocs()
  for (const d of docs) add(d, true)
  for (const s of sinkFiles(cfg.sinks)) if (!docs.includes(s)) add(s, false)
  const byLine = new Map<string, string>()
  let dropped = 0
  for (const [line, set] of owners) {
    const creditable = [...set].filter((o) => !o.startsWith('\u0000'))
    if (creditable.length === 1 && set.size === 1) byLine.set(line, creditable[0]!)
    else dropped++
  }
  return { byLine, docs: docs.length, lines: byLine.size, dropped }
}

/** Shapes a reader command wraps a doc line in: diff `+`/`-`, `grep -n`
 *  `12:`, multi-file grep `path:12:`, `cat -n` `  12\t`, and `-A/-B` context `12-`. */
function candidates(raw: string): string[] {
  const t = raw.replace(/\r$/, '')
  const out = new Set<string>()
  const push = (s: string) => { const x = s.trim(); if (x) out.add(x) }
  push(t)
  push(t.replace(/^[+-]/, ''))
  push(t.replace(/^[<>] ?/, ''))
  push(t.replace(/^\d+[:-]/, ''))
  push(t.replace(/^[^:\s]+[:-]\d+[:-]/, ''))
  push(t.replace(/^\s*\d+\t/, ''))
  return [...out]
}

function creditFromOutput(output: string, index: LineIndex, k: number, prefixSignal = false): Map<string, number> {
  const hits = new Map<string, Set<string>>()
  for (const raw of output.split('\n')) {
    if (prefixSignal) {
      const m = /^([^:\s]+\.md):\d+[:-]/.exec(raw)
      const doc = m && canonicalizeInstructionPath(m[1]!)
      if (doc && isInstructionDoc(doc)) {
        const set = hits.get(doc) ?? new Set<string>()
        set.add(raw)
        hits.set(doc, set)
      }
    }
    for (const c of candidates(raw)) {
      const doc = index.byLine.get(c)
      if (!doc) continue
      const set = hits.get(doc) ?? new Set<string>()
      set.add(c)
      hits.set(doc, set)
    }
  }
  const credited = new Map<string, number>()
  for (const [doc, lines] of hits) if (lines.size >= k) credited.set(doc, lines.size)
  return credited
}

// ── The corpus: one case per distinct friction shape (session id = the log) ──

interface Case {
  id: string
  shape: string
  command: string
  /** The record says stdout was empty: replay would differ from what the session saw. */
  simulatedOutput?: string
  credited?: string[]
  notCredited?: string[]
  /** Multi-file grep: the oracle is the output's own `path:` prefixes. */
  oracleFromGrepPrefixes?: boolean
}

const ADR = (n: string) => {
  const m = readdirSync(join(ROOT, 'docs/adr')).find((f) => f.startsWith(n))
  return `docs/adr/${m}`
}
const PERSONA = (n: string) => `.agents/skills/blog-post/personas/${n}.md`

const CASES: Case[] = [
  // ── misses: the friction says the command showed the doc and it went uncredited
  { id: '09-09 01Lk7T', shape: 'git show ref:path | grep', command: 'git show fb34498ea7140b6e5be1b7adf88753ec17e5d3f1~1:.agents/skills/prune-trial/SKILL.md | grep -n "pre-.checkout. checklist"', credited: ['.agents/skills/prune-trial/SKILL.md'] },
  { id: '09-12 019wQ8', shape: 'single-match glob, grep', command: 'grep -n "provenance header\\|^Session:\\|marker" docs/adr/0017*.md | head -30', credited: [ADR('0017')] },
  { id: '09-12 01GqyK', shape: 'single-match glob, sed', command: 'sed -n 30,70p docs/adr/*0017*', credited: [ADR('0017')] },
  { id: '09-13 01QmM7', shape: 'single-match glob, sed', command: 'sed -n 1,200p docs/adr/0022-*.md', credited: [ADR('0022')] },
  { id: '09-13 01QmM7 b', shape: 'single-match glob, grep -i', command: 'grep -n "shell-read" -i docs/adr/0009-*.md', credited: [ADR('0009')] },
  { id: '09-14 017Tdz', shape: 'git show sha -- path | head', command: 'git show 15db88f8 -- docs/adr/0004-objective-safety-gate.md .agents/prune-trials.yml 2>/dev/null | head -150', credited: [ADR('0004')] },
  { id: '09-14 017vEL', shape: 'single-match glob, abs path', command: 'grep -n -A5 "provenance header\\|first line" /home/user/terrarium/docs/adr/0017-*.md | head -60', credited: [ADR('0017')] },
  { id: '09-15 015DSd', shape: 'multi-match glob grep', command: 'grep -rn "recurred\\|recurr\\|narrowed repeatedly\\|self-documents its own recurrence" CLAUDE.md docs/agents/*.md .agents/skills/*/SKILL.md 2>/dev/null', oracleFromGrepPrefixes: true },
  { id: '09-22 01S3vB', shape: 'glob among non-doc args', command: 'grep -rn "provenance header\\|Generated by an autonomous\\|first line" scripts/*.ts docs/adr/0017*.md', credited: [ADR('0017')] },
  { id: '09-23 01YWMT', shape: 'for over literals', command: 'for p in david karen eyra; do echo "=== $p ==="; cat .claude/skills/blog-post/personas/$p.md; echo; done', credited: ['david', 'karen', 'eyra'].map(PERSONA) },
  // Only `a`-hunks exist today, so only the right-hand file's lines are shown.
  { id: '09-25 01QQyg', shape: 'diff a b', command: 'diff .agents/skills/setup-matt-pocock-skills/triage-labels.md docs/agents/triage-labels.md', credited: ['docs/agents/triage-labels.md'] },
  { id: '09-28 01LXTs', shape: 'extensionless glob', command: 'grep -n -A15 "visitor-loop" docs/adr/0003*', credited: [ADR('0003')] },
  { id: '09-29 01SYbi', shape: 'git log -p -- path', command: 'git log --follow -p --since="2026-09-26" -- .agents/skills/visitor-loop/decisions.md | head -200', credited: ['.agents/skills/visitor-loop/decisions.md'] },
  { id: '09-30 01JJjn', shape: 'for over glob (#1542)', command: 'for f in .agents/skills/blog-post/personas/*.md; do echo "==== $f"; cat $f; done', credited: ['david', 'eyra', 'karen', 'kevin'].map(PERSONA) },
  { id: '09-30 01UYR7', shape: 'cd && cat rel rel rel (#1482)', command: 'cd /home/user/terrarium/.claude/skills/blog-post/personas && cat david.md karen.md kevin.md', credited: ['david', 'karen', 'kevin'].map(PERSONA) },
  { id: '10-01 014aYT', shape: 'cat a 2>/dev/null || cat b (#1327 flip side)', command: 'cat /home/user/terrarium/.agents/skills/audit-docs/SKILL.md 2>/dev/null || cat /home/user/terrarium/.claude/skills/audit-docs/SKILL.md', credited: ['.agents/skills/audit-docs/SKILL.md'] },
  { id: '10-01 01BNbm', shape: 'cat glob glob', command: 'cat docs/adr/0003* docs/adr/0009*', credited: [ADR('0003'), ADR('0009')] },
  { id: '10-02 01BXoQ', shape: 'cd && for over glob (#1482+#1542)', command: 'cd /home/user/terrarium/docs/adr && for f in 000*.md; do echo "=== $f"; cat "$f"; done', credited: ['0001', '0002', '0003', '0004', '0005', '0006', '0007', '0008', '0009'].map(ADR) },
  { id: '10-02 01VC6t', shape: 'for over glob list (#1542)', command: 'for f in docs/adr/0001* docs/adr/0006* docs/adr/0021* docs/adr/0028*; do echo "=== $f"; cat "$f"; done', credited: ['0001', '0006', '0021', '0028'].map(ADR) },

  // ── false positives: the friction says nothing of the doc was shown
  { id: '09-01 01EQQR', shape: 'wc -l over globs', command: 'wc -l /home/user/terrarium/docs/agents/guards.md /home/user/terrarium/docs/agents/*.md /home/user/terrarium/.agents/skills/*/SKILL.md', notCredited: ['docs/agents/guards.md', 'docs/agents/tenant-layers.md', '.agents/skills/auto-triage/SKILL.md'] },
  { id: '09-12 01Dykm', shape: 'git merge file list (simulated)', command: 'git merge --ff-only origin/main', simulatedOutput: 'Updating 1234abc..5678def\nFast-forward\n docs/agents/guards.md | 12 ++++++------\n 1 file changed, 6 insertions(+), 6 deletions(-)', notCredited: ['docs/agents/guards.md'] },
  { id: '09-13 01XhrV', shape: 'single-file grep, no match', command: 'grep -n -A15 "^\\*\\*Session\\*\\*\\|### Session\\b" CONTEXT.md | head -40', simulatedOutput: '', notCredited: ['CONTEXT.md'] },
  { id: '09-13 01XhrV b', shape: 'multi-file grep, partial match', command: 'grep -n "recurred\\|regression\\|previously\\|used to\\|earlier version\\|no longer\\|deprecated\\|superseded\\|historical" .agents/skills/blog-post/SKILL.md .agents/skills/audit-skills/SKILL.md .agents/skills/frictions-to-fixes/SKILL.md docs/agents/guards.md', oracleFromGrepPrefixes: true },
  { id: '09-24 0198W2', shape: 'sed missing 2>/dev/null || ls', command: "sed -n '1,60p' docs/adr/0017-github-body-provenance.md 2>/dev/null || ls docs/adr/ | grep 0017", notCredited: ['docs/adr/0017-github-body-provenance.md', ADR('0017')] },
  { id: '09-25 01Aqnk', shape: 'single-file grep, no match (#1355)', command: 'grep -n -i "branch-pin" docs/agents/guards.md | head -3', simulatedOutput: '', notCredited: ['docs/agents/guards.md'] },
  { id: '09-25 01QQyg b', shape: 'single-file grep, no match', command: 'grep -n -A6 "Skill Inventory\\*\\*" CONTEXT.md', simulatedOutput: '', notCredited: ['CONTEXT.md'] },
  { id: '09-26 01YLyu', shape: 'cat missing 2>/dev/null | head (open)', command: 'cat layers/tinkerfund/CONTEXT.md 2>/dev/null | head -80', simulatedOutput: '', notCredited: ['layers/tinkerfund/CONTEXT.md'] },
  { id: '09-27 0158Jc', shape: 'cd; grep rel (#1454)', command: 'cd /home/user/terrarium/layers/tinkerfund; grep -n "^\\*\\*\\|^### \\|^## " CONTEXT.md | head -40', credited: ['layers/tinkerfund/CONTEXT.md'], notCredited: ['CONTEXT.md'] },
  { id: '09-27 019yVY', shape: 'grep | grep, no match (#1355)', command: 'grep -n -A12 "^### Session$\\|^### Session\\b" CONTEXT.md | grep -i -A2 "interactive\\|delegated\\|autonomous" | head -30', simulatedOutput: '', notCredited: ['CONTEXT.md'] },
  { id: '09-28 01C1P9', shape: 'cd && cat rel; cat abs (#1482)', command: 'cd /home/user/terrarium/.claude/skills/triage && cat SKILL.md AGENT-BRIEF.md; cat /home/user/terrarium/docs/agents/triage-labels.md', credited: ['.agents/skills/triage/SKILL.md', 'docs/agents/triage-labels.md'], notCredited: ['.claude/skills/triage/docs/agents/triage-labels.md', '.agents/skills/triage/docs/agents/triage-labels.md'] },

  // ── decoys: commands that print doc-LIKE text without reading any instruction doc
  { id: 'decoy', shape: 'cat CLAUDE.md', command: 'cat CLAUDE.md', notCredited: ['*'] },
  { id: 'decoy', shape: 'cat README.md', command: 'cat README.md', notCredited: ['*'] },
  { id: 'decoy', shape: 'cat the detector spec', command: 'cat tests/unit/shell-reads.spec.ts', notCredited: ['*'] },
  { id: 'decoy', shape: 'cat the detector source', command: 'cat scripts/shell-reads.ts', notCredited: ['*'] },
  { id: 'decoy', shape: 'cat a Skill Inventory entry', command: 'cat layers/journal/content/current/skills/log-session.yml', notCredited: ['*'] },
  { id: 'decoy', shape: 'cat prune-trials ledger', command: 'cat .agents/prune-trials.yml', notCredited: ['*'] },
  { id: 'decoy', shape: 'grep session logs', command: 'grep -rn "SHELL-READ-DETECTION" layers/journal/content/current/sessions/ | head -40', notCredited: ['*'] },
  { id: 'decoy', shape: 'cat journal pages', command: 'cat layers/journal/content/current/pages/*.md | head -400', notCredited: ['*'] },
  { id: 'decoy', shape: 'git show main:CLAUDE.md', command: 'git show origin/main:CLAUDE.md | head -80', notCredited: ['*'] },
  { id: 'decoy', shape: 'git log', command: 'git log --oneline -30', notCredited: ['*'] },
]

// ── Replay + score ───────────────────────────────────────────────────────────

function replay(c: Case): string {
  if (c.simulatedOutput !== undefined) return c.simulatedOutput
  const r = spawnSync('bash', ['-c', c.command], { cwd: ROOT, encoding: 'utf8', timeout: 30_000, maxBuffer: 64 << 20 })
  const stdout = r.stdout ?? ''
  if (r.status !== 0 && r.status !== null) return `Exit code ${r.status}\n${r.stderr ?? ''}${stdout}`
  return stdout
}

function records(command: string, output: string): Record<string, unknown>[] {
  return [
    { type: 'user', cwd: ROOT, sessionId: 'proto', message: { role: 'user', content: 'x' } },
    { type: 'assistant', message: { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: { command } }] } },
    { type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: output || '(Bash completed with no output)' }] } },
  ]
}

function oracle(c: Case, output: string): { credited: string[]; notCredited: string[] } {
  if (!c.oracleFromGrepPrefixes) return { credited: c.credited ?? [], notCredited: c.notCredited ?? [] }
  const named = c.command.split(/\s+/).filter((t) => /\.md$/.test(t) || /\*/.test(t))
  const seen = new Set<string>()
  for (const line of output.split('\n')) {
    const m = /^([^:\s]+\.md):\d+:/.exec(line)
    if (m) seen.add(canonicalizeInstructionPath(m[1]!))
  }
  const credited = [...seen].filter(isInstructionDoc)
  // Every literal doc named but absent from the output must not be credited.
  const notCredited = named.filter((t) => !/[*?$]/.test(t)).map(canonicalizeInstructionPath).filter((p) => isInstructionDoc(p) && !seen.has(p))
  return { credited, notCredited }
}

function score(got: Set<string>, want: { credited: string[]; notCredited: string[] }): { ok: boolean; missed: string[]; extra: string[] } {
  const missed = want.credited.filter((p) => !got.has(p))
  const extra = want.notCredited.includes('*') ? [...got] : want.notCredited.filter((p) => got.has(p))
  return { ok: missed.length === 0 && extra.length === 0, missed, extra }
}

const CONFIGS: Config[] = [
  { name: 'out k1 L30', minLen: 30, k: 1, sinks: ['CLAUDE.md', 'README.md'] },
  { name: 'out k1 L40', minLen: 40, k: 1, sinks: ['CLAUDE.md', 'README.md'] },
  { name: 'out k1 L30 +prefix', minLen: 30, k: 1, sinks: ['CLAUDE.md', 'README.md'], prefixSignal: true },
  { name: 'out k1 L30 +layers', minLen: 30, k: 1, sinks: ['CLAUDE.md', 'README.md', 'layers/**'] },
]

const indexes = CONFIGS.map((cfg) => ({ cfg, index: buildIndex(cfg) }))
for (const { cfg, index } of indexes) {
  console.log(`[index ${cfg.name}] ${index.docs} docs, ${index.lines} distinctive lines, ${index.dropped} dropped as shared/short`)
}
console.log()

const methods = ['landed', 'advisory', ...CONFIGS.map((c) => c.name)]
const totals = new Map(methods.map((m) => [m, 0]))
let n = 0
for (const c of CASES) {
  const output = replay(c)
  const want = oracle(c, output)
  const recs = records(c.command, output)
  const got: Record<string, Set<string>> = {
    landed: new Set(extractTrace(recs).docsReadViaShell),
    advisory: new Set(shellReadScanOf(recs, [], ROOT).paths),
  }
  const detail: Record<string, Map<string, number>> = {}
  for (const { cfg, index } of indexes) {
    const m = creditFromOutput(output, index, cfg.k, cfg.prefixSignal)
    detail[cfg.name] = m
    got[cfg.name] = new Set(m.keys())
  }
  n++
  console.log(`── ${c.id}  ${c.shape}`)
  console.log(`   $ ${c.command.replace(/\s+/g, ' ').slice(0, 110)}`)
  console.log(`   output: ${output.length} chars${c.simulatedOutput !== undefined ? ' (simulated per the record)' : ''}; expect +[${want.credited.join(', ')}] -[${want.notCredited.join(', ')}]`)
  for (const m of methods) {
    const s = score(got[m]!, want)
    if (s.ok) totals.set(m, totals.get(m)! + 1)
    const parts = [...got[m]!].map((p) => (detail[m] ? `${p}(${detail[m]!.get(p)})` : p))
    const verdict = s.ok ? 'PASS' : `FAIL${s.missed.length ? ` missed ${s.missed.join(', ')}` : ''}${s.extra.length ? ` extra ${s.extra.join(', ')}` : ''}`
    console.log(`   ${m.padEnd(20)} ${verdict.padEnd(60)} ${parts.length ? parts.join(' ') : '∅'}`.slice(0, 220))
  }
}
console.log()
console.log(`cases: ${n}`)
for (const m of methods) console.log(`  ${m.padEnd(20)} ${totals.get(m)}/${n} pass`)
