// Prints a saved clear-backlog Workflow run's `.output` as compact blocks, so
// the orchestrator reads results without paging raw JSON (#2334). --build also
// files each review's findings in its branch's folder for the builder to read,
// and names the agent ids the orchestrator resumes (#3110).
//
// Usage:
//   pnpm exec tsx .agents/skills/clear-backlog/scripts/run-summary.ts
//     <run .output> --triage
//     <run .output> --build [--run <workflow run id>]
//     <findings .json> --findings [--detail <n>]
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { extractFlag, fail, runIfMain } from '../../../../scripts/lib/cli.ts'

type Question = { choice: string; options: string[]; pick: string; why: string; wouldChange?: string }
type OptionCheck = { option: string; holds: string; settledBy?: string }
type Triage = {
  outcome: string
  summary: string
  publicAuthor: boolean
  brief?: string
  canonical?: number
  question?: Question
  followUps?: Question[]
  blocker?: string
  files: string[]
  relatedTo: number[]
  staleClaims?: { claim: string; why: string; source: string }[]
  sideFindings: { finding: string; source: string }[]
  writes: string[]
  background?: string
  optionChecks?: OptionCheck[]
  sourcesRead?: unknown[]
}
type Finding = { kind: string; title: string; detail: string; file?: string }
type Review = { findings: Finding[]; summary: string }
type Branch = {
  branch: string
  status: string
  round?: number
  dir?: string
  worktree?: string
  commits?: string[]
  question?: string
  reason?: string
  reviews?: Record<string, Review>
}
type Explore = { results: Record<string, Triage>; missing: number[]; grouping: { issues: number[]; sharedFiles: string[] }[] }

/** The workflow's return value, which the saved `.output` holds under `result` (sometimes as a JSON string), and its log lines. */
function saved(path: string): { result: unknown; logs: string[] } {
  const { result, logs } = JSON.parse(readFileSync(path, 'utf8')) as { result: unknown; logs?: string[] }
  return { result: typeof result === 'string' ? JSON.parse(result) : result, logs: logs ?? [] }
}

const issues = (ns: number[]) => ns.map((n) => `#${n}`).join(', ')
const field = (key: string, value: string | undefined) => (value ? [`  ${key}: ${value}`] : [])
const list = (key: string, items: string[] | undefined) => (items?.length ? [`  ${key}:`, ...items.map((i) => `    - ${i}`)] : [])

function triage(r: Explore): string[] {
  const blocks = Object.entries(r.results).map(([n, t]) => [
    `#${n} ${t.outcome} publicAuthor=${t.publicAuthor}`,
    ...field('summary', t.summary),
    ...field('canonical', t.canonical ? `#${t.canonical}` : undefined),
    ...field('brief', t.brief),
    ...field('background', t.background),
    ...[t.question, ...(t.followUps ?? [])].flatMap((q, i) =>
      q
        ? [
            `  ${i ? 'followUp' : 'question'}: ${q.choice}`,
            ...q.options.map((o) => `    ${o}`),
            `    pick: ${q.pick} (${q.why})`,
            ...(q.wouldChange ? [`    wouldChange: ${q.wouldChange}`] : []),
          ]
        : [],
    ),
    ...list('optionChecks', t.optionChecks?.map((o) => `${o.holds}: ${o.option}${o.settledBy ? ` (settle by: ${o.settledBy})` : ''}`)),
    ...field('sourcesRead', t.sourcesRead ? String(t.sourcesRead.length) : undefined),
    ...field('blocker', t.blocker),
    ...field('files', t.files.join(', ')),
    ...field('relatedTo', issues(t.relatedTo)),
    ...list('staleClaims', t.staleClaims?.map((s) => `${s.claim}: ${s.why} (source: ${s.source})`)),
    ...list('sideFindings', t.sideFindings.map((s) => `${s.finding} (source: ${s.source})`)),
    ...list('writes', t.writes),
  ].join('\n'))
  return [
    ...blocks,
    [`missing: ${issues(r.missing) || 'none'}`, 'grouping:', ...r.grouping.map((g) => `  ${issues(g.issues)}${g.sharedFiles.length ? ` (shared: ${g.sharedFiles.join(', ')})` : ''}`)].join('\n'),
  ]
}

const finding = (f: Finding, i: number) => `${i + 1} ${f.kind}: ${f.title}${f.file ? ` (${f.file})` : ''}`

/** The run journal's `started` lines map each agent's label to the id `SendMessage` resumes it by (docs/research/subagent-spawn-depth.md, test 6). */
export function agentIds(runId: string, home = homedir()): Map<string, string> {
  const projects = join(home, '.claude/projects')
  const dirs = (path: string) => (existsSync(path) ? readdirSync(path, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => join(path, d.name)) : [])
  const journals = dirs(projects)
    .flatMap(dirs)
    .map((session) => join(session, 'subagents/workflows', runId, 'journal.jsonl'))
    .filter((p) => existsSync(p))
  if (journals.length !== 1) fail(`found ${journals.length} journals for run ${runId} under ${projects}`)
  const ids = new Map<string, string>()
  for (const line of readFileSync(journals[0]!, 'utf8').split('\n')) {
    if (!line.trim()) continue
    const e = JSON.parse(line) as { type?: string; agentId?: string; label?: string }
    if (e.type === 'started' && e.agentId && e.label) ids.set(e.label, e.agentId)
  }
  return ids
}

function build(r: Branch[], ids?: Map<string, string>): string[] {
  return r.map((b) => {
    const labels = [`build ${b.branch}`, ...Object.keys(b.reviews ?? {}).map((axis) => `${axis} ${b.branch} r${b.round}`)]
    const agents = ids && labels.flatMap((l) => (ids.has(l) ? [`${l.split(' ')[0]} ${ids.get(l)}`] : []))
    return [
      `${b.branch} ${b.status}${b.reviews ? ` r${b.round}` : ''}`,
      ...field('worktree', b.worktree),
      ...field('commits', b.commits?.join(', ')),
      ...field('agents', agents?.join(', ')),
      ...field('question', b.question),
      ...field('reason', b.reason),
      ...Object.entries(b.reviews ?? {}).flatMap(([axis, review]) => {
        const file = join(b.dir!, `${axis}-r${b.round}.json`)
        mkdirSync(b.dir!, { recursive: true })
        writeFileSync(file, JSON.stringify(review, null, 2))
        return [`  ${axis}: ${file}`, ...review.findings.map((f, i) => `    ${finding(f, i)}`)]
      }),
    ].join('\n')
  })
}

// The logs carry harness warnings and workflow notes that no result does, so always show them.
function withLogs(path: string, print: (result: unknown) => string): string {
  const { result, logs } = saved(path)
  return [print(result), ...(logs.length ? [['logs:', ...logs.map((l) => `  - ${l}`)].join('\n')] : [])].join('\n\n')
}

export const triageSummary = (path: string) => withLogs(path, (r) => triage(r as Explore).join('\n\n'))
export const buildSummary = (path: string, runId?: string, home?: string) =>
  withLogs(path, (r) => build(r as Branch[], runId ? agentIds(runId, home) : undefined).join('\n\n'))

/** A review's findings file as numbered `kind: title` lines; with `detail`, that one finding's detail, which the orchestrator reads for an owner-call only. */
export function findingsSummary(path: string, detail?: number): string {
  const { findings } = JSON.parse(readFileSync(path, 'utf8')) as Review
  if (detail === undefined) return findings.map(finding).join('\n') || 'no findings'
  const f = findings[detail - 1]
  if (!f) fail(`no finding ${detail} in ${path}`)
  return `${finding(f, detail - 1)}\n${f.detail}`
}

const USAGE = 'usage: run-summary.ts <run .output> --triage | <run .output> --build [--run <run id>] | <findings .json> --findings [--detail <n>]'

runIfMain(import.meta.url, () => {
  const run = extractFlag(process.argv.slice(2), '--run')
  const detail = extractFlag(run.rest, '--detail')
  const [path, mode, ...rest] = detail.rest
  if (!path || rest.length) fail(USAGE)
  if (mode === '--build' && !detail.value) return console.log(buildSummary(path, run.value))
  if (mode === '--findings' && !run.value) {
    if (detail.value !== undefined && !/^[1-9]\d*$/.test(detail.value)) fail(USAGE)
    return console.log(findingsSummary(path, detail.value === undefined ? undefined : Number(detail.value)))
  }
  if (mode === '--triage' && !run.value && !detail.value) return console.log(triageSummary(path))
  fail(USAGE)
})
