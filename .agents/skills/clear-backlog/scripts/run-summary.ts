// Prints a saved clear-backlog Workflow run's `.output` as compact blocks, so
// the orchestrator reads results without paging raw JSON (#2334).
//
// Usage:
//   pnpm exec tsx .agents/skills/clear-backlog/scripts/run-summary.ts
//     <run .output> --triage | --build
import { readFileSync } from 'node:fs'
import { fail, runIfMain } from '../../../../scripts/lib/cli.ts'

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
type Finding = { title: string; detail: string; file?: string }
type Branch = {
  branch: string
  status: string
  worktree?: string
  commits?: string[]
  decisions?: string[]
  judgementCalls?: Finding[]
  question?: string
  reason?: string
  openFindings?: Finding[]
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

const finding = (f: Finding) => `${f.title}${f.file ? ` (${f.file})` : ''}: ${f.detail}`

function build(r: Branch[]): string[] {
  return r.map((b) => [
    `${b.branch} ${b.status}`,
    ...field('worktree', b.worktree),
    ...field('commits', b.commits?.join(', ')),
    ...list('decisions', b.decisions),
    ...list('judgementCalls', b.judgementCalls?.map(finding)),
    ...field('question', b.question),
    ...field('reason', b.reason),
    ...list('openFindings', b.openFindings?.map(finding)),
  ].join('\n'))
}

const MODES = {
  '--triage': (r: unknown) => triage(r as Explore).join('\n\n'),
  '--build': (r: unknown) => build(r as Branch[]).join('\n\n'),
}

// The logs carry harness warnings and workflow notes that no result does, so always show them.
export function runSummary(path: string, mode: keyof typeof MODES): string {
  const { result, logs } = saved(path)
  return [MODES[mode](result), ...(logs.length ? [['logs:', ...logs.map((l) => `  - ${l}`)].join('\n')] : [])].join('\n\n')
}

runIfMain(import.meta.url, () => {
  const [path, mode, ...rest] = process.argv.slice(2)
  if (!path || !mode || rest.length || !Object.hasOwn(MODES, mode)) fail('usage: run-summary.ts <run .output> --triage | --build')
  console.log(runSummary(path, mode as keyof typeof MODES))
})
