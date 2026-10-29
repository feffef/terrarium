// The mechanical half of the glassbox-improve Skill: which pages each rater
// reads, the tally of their reports, the A election, and `grades.yml`.
// Usage:
//   pnpm exec tsx .agents/skills/glassbox-improve/scripts/grades.ts plan --base <sha>
//   pnpm exec tsx .agents/skills/glassbox-improve/scripts/grades.ts tally --base <sha> <sonnet> <fable> <opus>
//     [--write --selected a,b --gap-edit a,b --read-by-all a,b]
// A page is named by its path under `layers/glassbox/content/guide/pages`, without `.md`.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseYaml, stringify } from 'yaml'
import { fail, flagValue, root, runIfMain } from '../../../../scripts/lib/cli.ts'
import { splitFrontmatter } from '../../../../scripts/lib/frontmatter.ts'
import { git, tryGit } from '../../../../scripts/lib/git.ts'

export const models = ['sonnet', 'fable', 'opus'] as const
export type Model = (typeof models)[number]
export type Grade = 'A' | 'B' | 'C' | 'D'

// QUALITY.md, Grades.
const lessonSeats = 10
const outsideTop = lessonSeats + 1
const recordPath = '.agents/skills/glassbox-improve/grades.yml'
const pagesDir = (space: string) => `layers/glassbox/content/${space}/pages`

export interface PageRecord {
  hash: string
  grade?: Grade
  grades: Partial<Record<Model, { grade: Grade; run: string }>>
  readByAll?: boolean
  gapEdit?: string
}

export interface Candidate {
  kind: string
  pages: string[]
  gist: string
  since: string
}

export interface GradeRecord {
  run?: string
  pages: Record<string, PageRecord>
  candidates: Candidate[]
}

export interface Report {
  rater: Model
  pages: {
    page: string
    grade: Grade
    deficits?: { criterion: string; quote: string; fix: string; titleClause?: string; title?: string }[]
    gaps?: { section: string; exemplar: string; take: string }[]
    falseClaims?: { quote: string; source: string }[]
    optional?: string[]
    aWorthy?: boolean
  }[]
  top10: string[]
  bestWalkthrough?: string
  missingLessons?: { concept: string; subject: string; draft?: string; rank: number }[]
  recuts?: { pages: string[]; move: string }[]
}

export interface Plan {
  base: string
  allThree: string[]
  lone: Record<Model, string[]>
  stale: string[]
}

const isWalkthrough = (page: string) => page.startsWith('walkthroughs/')

/** What a page teaches: the file without the lines `glassbox-update` moves daily
 *  (the pin and the Excerpt ranges), so a re-pin doesn't count as a change. */
export function pageHash(text: string): string {
  const stable = text
    .split('\n')
    .filter((l) => !/^(revision|revisionDate|publishedAt):/.test(l))
    .join('\n')
    .replace(/\s*lines="[^"]*"/g, '')
  return createHash('sha1').update(stable).digest('hex')
}

export function planPages(record: GradeRecord, hashes: Record<string, string>): Omit<Plan, 'base'> {
  const pages = Object.keys(hashes).sort()
  const noA = !Object.values(record.pages).some((p) => p.grade === 'A')
  const allThree = pages.filter((page) => {
    const r = record.pages[page]
    return noA || isWalkthrough(page) || !r || r.hash !== hashes[page] || r.grade === 'A' || r.readByAll
  })
  const lone = Object.fromEntries(models.map((m) => [m, [] as string[]])) as Record<Model, string[]>
  for (const page of pages.filter((p) => !allThree.includes(p))) {
    const runOf = (m: Model) => record.pages[page]!.grades[m]?.run ?? ''
    const oldest = runOf([...models].sort((a, b) => runOf(a).localeCompare(runOf(b)))[0]!)
    const tied = models.filter((m) => runOf(m) === oldest)
    // Ties go to the model with the fewest lone pages so far, so the shares stay even.
    const pick = tied.reduce((best, m) => (lone[m].length < lone[best].length ? m : best))
    lone[pick].push(page)
  }
  const stale = Object.keys(record.pages).filter((p) => !(p in hashes)).sort()
  return { allThree, lone, stale }
}

/** The middle of three grades, or the only one. */
export function middle(grades: Grade[]): Grade {
  return [...grades].sort()[Math.floor((grades.length - 1) / 2)]!
}

export interface Election {
  lessons: string[]
  walkthrough?: string
  sums: Record<string, number>
}

/** QUALITY.md's election, among the Lessons and Walkthroughs all three read. */
export function elect(reports: Report[], incumbents: string[], selected: string[], pool: string[]): Election {
  const rankOf = (r: Report, page: string) => (r.top10.includes(page) ? r.top10.indexOf(page) + 1 : outsideTop)
  const lessons = pool.filter((p) => !isWalkthrough(p) && !selected.includes(p))
  const sums = Object.fromEntries(lessons.map((p) => [p, reports.reduce((s, r) => s + rankOf(r, p), 0)]))
  const backed = (p: string) => reports.filter((r) => r.top10.includes(p)).length >= 2
  const seated = incumbents.filter((p) => lessons.includes(p) && backed(p))
  const challengers = lessons
    .filter((p) => !seated.includes(p) && backed(p))
    .sort((a, b) => sums[a]! - sums[b]! || a.localeCompare(b))
  for (const c of challengers) {
    if (seated.length < lessonSeats) {
      seated.push(c)
      continue
    }
    const worst = [...seated].sort((a, b) => sums[b]! - sums[a]! || b.localeCompare(a))[0]!
    if (sums[c]! < sums[worst]!) seated.splice(seated.indexOf(worst), 1, c)
  }
  const named = reports.map((r) => r.bestWalkthrough).filter((w): w is string => !!w && !selected.includes(w))
  const agreed = named.find((w) => named.filter((x) => x === w).length >= 2)
  const held = incumbents.find((p) => isWalkthrough(p) && pool.includes(p) && !selected.includes(p))
  return { lessons: seated.sort(), walkthrough: agreed ?? held, sums }
}

/** Checks a report against the plan; returns its problems. */
export function reportProblems(report: Report, plan: Plan): string[] {
  const problems: string[] = []
  const expected = [...plan.allThree, ...plan.lone[report.rater]]
  const graded = new Map(report.pages.map((p) => [p.page, p]))
  for (const page of expected) if (!graded.has(page)) problems.push(`${report.rater}: no grade for ${page}`)
  for (const p of report.pages) {
    if (!expected.includes(p.page)) problems.push(`${report.rater}: graded ${p.page}, which is not in its plan`)
    if (!['B', 'C', 'D'].includes(p.grade)) problems.push(`${report.rater}: ${p.page} has grade ${p.grade}; raters grade B, C or D`)
    if (p.aWorthy && plan.allThree.includes(p.page)) problems.push(`${report.rater}: ${p.page} is flagged A-worthy but all three read it`)
  }
  if (report.top10.length > lessonSeats) problems.push(`${report.rater}: top10 lists ${report.top10.length} pages`)
  for (const page of report.top10) {
    if (!plan.allThree.includes(page) || isWalkthrough(page)) problems.push(`${report.rater}: top10 lists ${page}, not a Lesson all three read`)
    else if (graded.get(page)?.grade !== 'B') problems.push(`${report.rater}: top10 lists ${page}, which it did not grade B`)
  }
  const w = report.bestWalkthrough
  if (w && (!plan.allThree.includes(w) || graded.get(w)?.grade !== 'B')) problems.push(`${report.rater}: bestWalkthrough ${w} is not a Walkthrough it graded B`)
  return problems
}

/** The rater's YAML block: the last fenced `yaml` block in its hand-back. */
export function parseReport(handback: string): Report {
  const blocks = [...handback.matchAll(/```ya?ml\n([\s\S]*?)\n```/g)]
  const block = blocks.at(-1)?.[1]
  if (!block) throw new Error('no ```yaml block in the hand-back')
  const report = parseYaml(block) as Report
  if (!models.includes(report.rater)) throw new Error(`rater is ${report.rater}, not one of ${models.join(', ')}`)
  report.pages ??= []
  report.top10 ??= []
  return report
}

export interface Tally {
  grades: Record<string, Partial<Record<Model, Grade>>>
  election: Election
  /** Lone pages whose reader raised something, so all three read them next run. */
  triggered: string[]
  markdown: string
}

export function tally(record: GradeRecord, plan: Plan, reports: Report[], selected: string[] = []): Tally {
  const grades: Tally['grades'] = {}
  for (const r of reports) for (const p of r.pages) (grades[p.page] ??= {})[r.rater] = p.grade
  const incumbents = Object.entries(record.pages).filter(([, p]) => p.grade === 'A').map(([page]) => page)
  const election = elect(reports, incumbents, selected, plan.allThree)
  const loneReader = new Map(models.flatMap((m) => plan.lone[m].map((p) => [p, m] as const)))
  const triggered = reports.flatMap((r) =>
    r.pages
      .filter((p) => loneReader.get(p.page) === r.rater)
      .filter((p) => p.grade !== 'B' || p.aWorthy || p.deficits?.length || p.gaps?.length)
      .map((p) => p.page),
  )
  return { grades, election, triggered, markdown: markdown(record, plan, reports, grades, election, triggered) }
}

const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ')

function markdown(record: GradeRecord, plan: Plan, reports: Report[], grades: Tally['grades'], election: Election, triggered: string[]): string {
  const out: string[] = []
  const before = (page: string) => models.map((m) => record.pages[page]?.grades[m]?.grade ?? '–').join('/')
  const now = (page: string) => models.map((m) => grades[page]?.[m] ?? '–').join('/')
  const aBefore = Object.entries(record.pages).filter(([, p]) => p.grade === 'A').map(([page]) => page).sort()
  const aAfter = [...election.lessons, ...(election.walkthrough ? [election.walkthrough] : [])]
  out.push('## A set', '', `Before: ${aBefore.join(', ') || 'none'}`, '', `After: ${aAfter.join(', ') || 'none'}`, '')
  for (const r of reports) out.push(`- ${r.rater} top 10: ${r.top10.join(', ') || 'none'}; best Walkthrough: ${r.bestWalkthrough ?? 'none'}`)
  out.push('', '<details><summary>Grades (sonnet/fable/opus)</summary>', '', 'page | read by | before | this run', '--- | --- | --- | ---')
  for (const page of Object.keys(grades).sort()) {
    const by = plan.allThree.includes(page) ? 'all three' : models.find((m) => plan.lone[m].includes(page))
    out.push(`${page} | ${by} | ${before(page)} | ${now(page)}`)
  }
  out.push('', '</details>', '', '<details><summary>Every item each rater raised</summary>', '')
  out.push('page | rater | kind | item', '--- | --- | --- | ---')
  for (const page of Object.keys(grades).sort()) {
    for (const r of reports) {
      const p = r.pages.find((x) => x.page === page)
      if (!p) continue
      for (const d of p.deficits ?? []) out.push(`${page} | ${r.rater} | deficit: ${d.criterion} | ${cell(`"${d.quote}" → ${d.fix}`)}`)
      for (const g of p.gaps ?? []) out.push(`${page} | ${r.rater} | gap: ${g.section} | ${cell(`${g.exemplar}: ${g.take}`)}`)
      for (const f of p.falseClaims ?? []) out.push(`${page} | ${r.rater} | false claim | ${cell(`"${f.quote}" (${f.source})`)}`)
      for (const o of p.optional ?? []) out.push(`${page} | ${r.rater} | optional | ${cell(o)}`)
      if (p.aWorthy) out.push(`${page} | ${r.rater} | A-worthy | `)
    }
  }
  out.push('', '</details>', '', `Read by all three next run (lone reader raised something): ${triggered.join(', ') || 'none'}`, '')
  out.push('<details><summary>Missing Lessons and re-cuts</summary>', '', 'rater | kind | item', '--- | --- | ---')
  for (const r of reports) {
    for (const m of r.missingLessons ?? []) out.push(`${r.rater} | missing Lesson #${m.rank} | ${cell(`${m.concept} (${m.subject}; draft: ${m.draft ?? 'none'})`)}`)
    for (const c of r.recuts ?? []) out.push(`${r.rater} | re-cut | ${cell(`${c.pages.join(' + ')}: ${c.move}`)}`)
  }
  for (const c of record.candidates) out.push(`waiting since ${c.since} | ${c.kind} | ${cell(`${c.pages.join(' + ')}: ${c.gist}`)}`)
  out.push('', '</details>')
  return out.join('\n')
}

export interface WriteOptions {
  run: string
  hashes: Record<string, string>
  selected: string[]
  gapEdit: string[]
  readByAll: string[]
}

export function nextRecord(record: GradeRecord, t: Tally, plan: Plan, o: WriteOptions): GradeRecord {
  const pages: GradeRecord['pages'] = {}
  const a = new Set([...t.election.lessons, ...(t.election.walkthrough ? [t.election.walkthrough] : [])])
  for (const page of Object.keys(o.hashes).sort()) {
    const old = record.pages[page]
    const read = t.grades[page] ?? {}
    const grades = { ...old?.grades }
    for (const m of models) if (read[m]) grades[m] = { grade: read[m]!, run: o.run }
    const thisRun = models.map((m) => read[m]).filter((g): g is Grade => !!g)
    const entry: PageRecord = { hash: o.hashes[page]!, grades }
    const grade = a.has(page) ? 'A' : thisRun.length ? middle(thisRun) : old?.grade
    if (grade) entry.grade = grade
    if (t.triggered.includes(page) || o.readByAll.includes(page)) entry.readByAll = true
    else if (!plan.allThree.includes(page) && old?.readByAll) entry.readByAll = true
    const gapEdit = o.gapEdit.includes(page) ? o.run : old?.gapEdit
    if (gapEdit) entry.gapEdit = gapEdit
    pages[page] = entry
  }
  return { run: o.run, pages, candidates: record.candidates }
}

// The shell: git at the base, the record in the working tree.

function guidePages(base: string): Record<string, string> {
  const dir = pagesDir('guide')
  const files = git(['ls-tree', '-r', '--name-only', base, dir], root).split('\n')
  return Object.fromEntries(
    files
      .filter((f) => f.endsWith('.md') && !f.endsWith('/index.md'))
      .map((f) => [f.slice(dir.length + 1, -3), git(['show', `${base}:${f}`], root)]),
  )
}

function catalog(base: string): string[] {
  const lines: string[] = []
  for (const space of ['guide', 'drafts']) {
    const dir = pagesDir(space)
    const listed = tryGit(['ls-tree', '-r', '--name-only', base, dir], root).out.split('\n')
    for (const f of listed.filter((x) => x.endsWith('.md') && !x.endsWith('/index.md'))) {
      const { frontmatter } = splitFrontmatter(git(['show', `${base}:${f}`], root))
      lines.push(`- ${space}/${f.slice(dir.length + 1, -3)}: ${frontmatter.title} — ${frontmatter.description}`)
    }
  }
  return lines
}

export function readRecord(text: string | undefined): GradeRecord {
  const parsed = (text ? parseYaml(text) : null) as Partial<GradeRecord> | null
  return { run: parsed?.run, pages: parsed?.pages ?? {}, candidates: parsed?.candidates ?? [] }
}

const list = (argv: string[], flag: string) => (flagValue(argv, flag) ?? '').split(',').filter(Boolean)

runIfMain(import.meta.url, () => {
  const [command, ...argv] = process.argv.slice(2)
  const base = flagValue(argv, '--base')
  if (!base) fail('--base <sha> is required')
  const sha = git(['rev-parse', `${base}^{commit}`], root).trim()
  const record = readRecord(tryGit(['show', `${sha}:${recordPath}`], root).out || undefined)
  const texts = guidePages(sha)
  const hashes = Object.fromEntries(Object.entries(texts).map(([p, t]) => [p, pageHash(t)]))
  const plan: Plan = { base: sha, ...planPages(record, hashes) }
  if (command === 'plan') {
    const pageList = (ps: string[]) => ps.map((p) => `- ${pagesDir('guide')}/${p}.md`)
    console.log([
      `# Plan at ${sha}`, '',
      '## Read by all three', '', ...pageList(plan.allThree), '',
      ...models.flatMap((m) => [`## Read by ${m} alone`, '', ...pageList(plan.lone[m]), '']),
      `## Entries for pages gone at the base: ${plan.stale.join(', ') || 'none'}`, '',
      '## Every page and draft (path: title — description)', '', ...catalog(sha),
    ].join('\n'))
    return
  }
  if (command !== 'tally') fail(`unknown command ${command}; use plan or tally`)
  const files = argv.filter((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--'))
  if (files.length !== models.length) fail(`give the ${models.length} raters' saved hand-backs`)
  const reports = files.map((f) => {
    try {
      return parseReport(readFileSync(f, 'utf8'))
    } catch (err) {
      return fail(`${f}: ${(err as Error).message}`)
    }
  })
  const problems = reports.flatMap((r) => reportProblems(r, plan))
  if (problems.length) fail(`the reports don't match the plan:\n${problems.join('\n')}`)
  const selected = list(argv, '--selected')
  const t = tally(record, plan, reports, selected)
  console.log(t.markdown)
  if (!argv.includes('--write')) return
  const run = new Date().toISOString().slice(0, 10)
  const next = nextRecord(record, t, plan, { run, hashes, selected, gapEdit: list(argv, '--gap-edit'), readByAll: list(argv, '--read-by-all') })
  writeFileSync(join(root, recordPath), stringify(next, { lineWidth: 0 }))
  console.error(`wrote ${recordPath}`)
})
