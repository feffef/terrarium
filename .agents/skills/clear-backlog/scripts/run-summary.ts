// Prints a saved clear-backlog Workflow run's `.output` as compact blocks, so
// the orchestrator reads results without paging raw JSON (#2334).
//
// Usage:
//   pnpm exec tsx .agents/skills/clear-backlog/scripts/run-summary.ts
//     <run .output> --triage | --build
//     <run .output>... --verdicts
import { readFileSync } from 'node:fs'
import { fail, runIfMain } from '../../../../scripts/lib/cli.ts'

type Question = { choice: string; options: string[]; pick: string; why: string }
type Verdict = { path: string; kind: 'rule' | 'doc'; reason: string; useful: 'yes' | 'partly' | 'no'; agent?: string }
type Triage = {
  outcome: string
  summary: string
  publicAuthor: boolean
  brief?: string
  canonical?: number
  question?: Question
  blocker?: string
  files: string[]
  relatedTo: number[]
  sideFindings: { finding: string; source: string }[]
  writes: string[]
  verdicts?: Verdict[]
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
  verdicts?: Verdict[]
}
type Explore = { results: Record<string, Triage>; missing: number[]; grouping: { issues: number[]; sharedFiles: string[] }[] }

/** The workflow's return value; the saved `.output` holds it under `result`, sometimes as a JSON string. */
function result(path: string): unknown {
  const { result } = JSON.parse(readFileSync(path, 'utf8')) as { result: unknown }
  return typeof result === 'string' ? JSON.parse(result) : result
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
    ...(t.question ? [`  question: ${t.question.choice}`, ...t.question.options.map((o) => `    ${o}`), `    pick: ${t.question.pick} (${t.question.why})`] : []),
    ...field('blocker', t.blocker),
    ...field('files', t.files.join(', ')),
    ...field('relatedTo', issues(t.relatedTo)),
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

const RANK = { no: 0, partly: 1, yes: 2 }

/** One entry per path across all runs, as close-session's `ruleVerdicts` and `docsRead` take them. */
function verdicts(runs: (Explore | Branch[])[]): string[] {
  const all = runs.flatMap((r) => Array.isArray(r)
    ? r.flatMap((b) => b.verdicts ?? [])
    : Object.entries(r.results).flatMap(([n, t]) => (t.verdicts ?? []).map((v) => ({ ...v, agent: `triage #${n}` }))))
  const best = new Map<string, Verdict[]>()
  for (const v of all) {
    const kept = best.get(v.path)
    if (!kept || RANK[v.useful] > RANK[kept[0]!.useful]) best.set(v.path, [v])
    else if (RANK[v.useful] === RANK[kept[0]!.useful]) kept.push(v)
  }
  const entries = [...best.values()].sort((a, b) => a[0]!.path.localeCompare(b[0]!.path))
  const yaml = (vs: Verdict[]) => {
    const reason = [...new Set(vs.map((v) => (v.agent ? `${v.agent}: ${v.reason}` : v.reason)))].join('; ')
    return `  - { path: ${JSON.stringify(vs[0]!.path)}, reason: ${JSON.stringify(reason)}, useful: ${vs[0]!.useful} }`
  }
  return [
    'ruleVerdicts:',
    ...entries.filter((vs) => vs[0]!.kind === 'rule').map(yaml),
    'docsRead:',
    ...entries.filter((vs) => vs[0]!.kind === 'doc').map(yaml),
  ]
}

const MODES = {
  '--triage': ([r]: unknown[]) => triage(r as Explore).join('\n\n'),
  '--build': ([r]: unknown[]) => build(r as Branch[]).join('\n\n'),
  '--verdicts': (rs: unknown[]) => verdicts(rs as (Explore | Branch[])[]).join('\n'),
}

export function runSummary(paths: string | string[], mode: keyof typeof MODES): string {
  return MODES[mode]([paths].flat().map(result))
}

runIfMain(import.meta.url, () => {
  const paths = process.argv.slice(2)
  const mode = paths.pop()
  if (!paths.length || !mode || !Object.hasOwn(MODES, mode) || (mode !== '--verdicts' && paths.length > 1))
    fail('usage: run-summary.ts <run .output> --triage | --build, or <run .output>... --verdicts')
  console.log(runSummary(paths, mode as keyof typeof MODES))
})
