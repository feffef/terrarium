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
import { extractFlag, extractSwitch, fail, root, runIfMain } from '../../../../scripts/lib/cli.ts'
import { frontmatterBlock, splitFrontmatter } from '../../../../scripts/lib/frontmatter.ts'
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
const aPages = (record: GradeRecord) => Object.entries(record.pages).filter(([, p]) => p.grade === 'A').map(([page]) => page).sort()
const electedPages = (e: Election) => [...e.lessons, ...(e.walkthrough ? [e.walkthrough] : [])]

/** What a page teaches: the file without the lines `glassbox-update` moves daily
 *  (the pin and the Excerpt ranges), so a re-pin doesn't count as a change. */
export function pageHash(text: string): string {
  const block = frontmatterBlock(text)
  const frontmatter = (block?.yaml ?? '').split('\n').filter((l) => !/^(revision|revisionDate|publishedAt):/.test(l))
  const body = text.slice(block?.length ?? 0).replace(/\s*lines="[^"]*"/g, '')
  return createHash('sha1').update([...frontmatter, body].join('\n')).digest('hex')
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

/** The A election, among the pages all three read; this is its one home (QUALITY.md, Grades, points here). */
export function elect(reports: Report[], incumbents: string[], selected: string[], pool: string[]): Election {
  const rankOf = (r: Report, page: string) => (r.top10.includes(page) ? r.top10.indexOf(page) + 1 : outsideTop)
  const lessons = pool.filter((p) => !isWalkthrough(p) && !selected.includes(p))
  const sums = Object.fromEntries(lessons.map((p) => [p, reports.reduce((s, r) => s + rankOf(r, p), 0)]))
  const backed = (p: string) => reports.filter((r) => r.top10.includes(p)).length >= 2
  const seats = incumbents.filter((p) => lessons.includes(p) && backed(p))
  const challengers = lessons
    .filter((p) => !seats.includes(p) && backed(p))
    .sort((a, b) => sums[a]! - sums[b]! || a.localeCompare(b))
  for (const c of challengers) {
    if (seats.length < lessonSeats) {
      seats.push(c)
      continue
    }
    const worst = [...seats].sort((a, b) => sums[b]! - sums[a]! || b.localeCompare(a))[0]!
    if (sums[c]! < sums[worst]!) seats.splice(seats.indexOf(worst), 1, c)
  }
  const named = reports.map((r) => r.bestWalkthrough).filter((w): w is string => !!w && !selected.includes(w))
  const agreed = named.find((w) => named.filter((x) => x === w).length >= 2)
  const held = incumbents.find((p) => isWalkthrough(p) && pool.includes(p) && !selected.includes(p))
  return { lessons: seats.sort(), walkthrough: agreed ?? held, sums }
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
  if (w && (!isWalkthrough(w) || !plan.allThree.includes(w) || graded.get(w)?.grade !== 'B')) problems.push(`${report.rater}: bestWalkthrough ${w} is not a Walkthrough it graded B`)
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
  const election = elect(reports, aPages(record), selected, plan.allThree)
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

export interface Raise {
  key: string
  raters: Model[]
  rankSum?: number
  items: string[]
}

/** Missing Lessons grouped by the draft that fills them (else by concept) and
 *  re-cuts by their pages; most raters first, then the lowest summed rank. */
export function structural(reports: Report[]): Raise[] {
  const raises = new Map<string, Raise>()
  const add = (key: string, rater: Model, item: string, rank?: number) => {
    const raise = raises.get(key) ?? { key, raters: [], items: [] }
    if (!raise.raters.includes(rater)) raise.raters.push(rater)
    if (rank !== undefined) raise.rankSum = (raise.rankSum ?? 0) + rank
    raise.items.push(`${rater}: ${item}`)
    raises.set(key, raise)
  }
  for (const r of reports) {
    for (const m of r.missingLessons ?? []) add(m.draft ? `promote ${m.draft}` : `new Lesson: ${m.concept}`, r.rater, `${m.concept} (${m.subject})`, m.rank)
    for (const c of r.recuts ?? []) add(`re-cut ${[...c.pages].sort().join(' + ')}`, r.rater, c.move)
  }
  return [...raises.values()].sort((a, b) => b.raters.length - a.raters.length || (a.rankSum ?? Infinity) - (b.rankSum ?? Infinity) || a.key.localeCompare(b.key))
}

function markdown(record: GradeRecord, plan: Plan, reports: Report[], grades: Tally['grades'], election: Election, triggered: string[]): string {
  const out: string[] = []
  const before = (page: string) => models.map((m) => record.pages[page]?.grades[m]?.grade ?? '–').join('/')
  const now = (page: string) => models.map((m) => grades[page]?.[m] ?? '–').join('/')
  out.push('## A set', '', `Before: ${aPages(record).join(', ') || 'none'}`, '', `After: ${electedPages(election).join(', ') || 'none'}`, '')
  for (const r of reports) out.push(`- ${r.rater} top 10: ${r.top10.join(', ') || 'none'}; best Walkthrough: ${r.bestWalkthrough ?? 'none'}`)
  out.push('', '<details><summary>Grades (sonnet/fable/opus)</summary>', '', 'page | read by | before | this run', '--- | --- | --- | ---')
  for (const page of Object.keys(grades).sort()) {
    const by = plan.allThree.includes(page) ? 'all three' : models.find((m) => plan.lone[m].includes(page))
    out.push(`${page} | ${by} | ${before(page)} | ${now(page)}`)
  }
  out.push('', '</details>', '', '<details><summary>Every item each rater raised</summary>', '')
  // Rows sort by page, then kind (criterion or section), so a cluster's reports sit together.
  const rows: [string, string, string, string][] = []
  for (const r of reports) {
    for (const p of r.pages) {
      for (const d of p.deficits ?? []) rows.push([p.page, `deficit: ${d.criterion}`, r.rater, `"${d.quote}" → ${d.fix}`])
      for (const g of p.gaps ?? []) rows.push([p.page, `gap: ${g.section}`, r.rater, `${g.exemplar}: ${g.take}`])
      for (const f of p.falseClaims ?? []) rows.push([p.page, 'false claim', r.rater, `"${f.quote}" (${f.source})`])
      for (const o of p.optional ?? []) rows.push([p.page, 'optional', r.rater, o])
      if (p.aWorthy) rows.push([p.page, 'A-worthy', r.rater, ''])
    }
  }
  rows.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]))
  out.push('page | kind | rater | item', '--- | --- | --- | ---', ...rows.map((row) => row.map(cell).join(' | ')))
  out.push('', '</details>', '', `Read by all three next run (lone reader raised something): ${triggered.join(', ') || 'none'}`, '')
  out.push('<details><summary>Structural raises, most raters first</summary>', '', 'step | raters | rank sum | items', '--- | --- | --- | ---')
  for (const s of structural(reports)) out.push([s.key, s.raters.join(', '), String(s.rankSum ?? '–'), s.items.join('; ')].map(cell).join(' | '))
  for (const c of record.candidates) out.push(`${cell(`waiting since ${c.since}: ${c.kind}`)} | | | ${cell(`${c.pages.join(' + ')}: ${c.gist}`)}`)
  out.push('', '</details>')
  return out.join('\n')
}

export interface WriteOptions {
  run: string
  hashes: Record<string, string>
  gapEdit: string[]
  readByAll: string[]
}

/** The next `grades.yml`: this run's grades over the old ones. `readByAll` holds
 *  only this run's flags, since every flagged page was read by all three. */
export function nextRecord(record: GradeRecord, result: Tally, opts: WriteOptions): GradeRecord {
  const pages: GradeRecord['pages'] = {}
  const elected = new Set(electedPages(result.election))
  for (const page of Object.keys(opts.hashes).sort()) {
    const old = record.pages[page]
    const read = result.grades[page] ?? {}
    const grades = { ...old?.grades }
    for (const m of models) if (read[m]) grades[m] = { grade: read[m]!, run: opts.run }
    const thisRun = models.map((m) => read[m]).filter((g): g is Grade => !!g)
    const entry: PageRecord = { hash: opts.hashes[page]!, grades }
    const grade = elected.has(page) ? 'A' : thisRun.length ? middle(thisRun) : old?.grade
    if (grade) entry.grade = grade
    if (result.triggered.includes(page) || opts.readByAll.includes(page)) entry.readByAll = true
    const gapEdit = opts.gapEdit.includes(page) ? opts.run : old?.gapEdit
    if (gapEdit) entry.gapEdit = gapEdit
    pages[page] = entry
  }
  return { run: opts.run, pages, candidates: record.candidates }
}

// The shell: git at the base, the record in the working tree.

/** Each page of a Space at the base, by name, with its text. */
function spacePages(base: string, space: string): [string, string][] {
  const dir = pagesDir(space)
  return tryGit(['ls-tree', '-r', '--name-only', base, dir], root)
    .out.split('\n')
    .filter((f) => f.endsWith('.md') && !f.endsWith('/index.md'))
    .map((f) => [f.slice(dir.length + 1, -3), git(['show', `${base}:${f}`], root)])
}

function catalog(base: string): string[] {
  return ['guide', 'drafts'].flatMap((space) =>
    spacePages(base, space).map(([page, text]) => {
      const { frontmatter } = splitFrontmatter(text)
      return `- ${space}/${page}: ${frontmatter.title} — ${frontmatter.description}`
    }),
  )
}

export function readRecord(text: string | undefined): GradeRecord {
  const parsed = (text ? parseYaml(text) : null) as Partial<GradeRecord> | null
  return { run: parsed?.run, pages: parsed?.pages ?? {}, candidates: parsed?.candidates ?? [] }
}

const pageList = (value: string | undefined) => (value ?? '').split(',').filter(Boolean)

runIfMain(import.meta.url, () => {
  const [command, ...args] = process.argv.slice(2)
  const { value: base, rest: a1 } = extractFlag(args, '--base')
  const { value: selectedFlag, rest: a2 } = extractFlag(a1, '--selected')
  const { value: gapEditFlag, rest: a3 } = extractFlag(a2, '--gap-edit')
  const { value: readByAllFlag, rest: a4 } = extractFlag(a3, '--read-by-all')
  const { on: write, rest: files } = extractSwitch(a4, '--write')
  if (!base) fail('--base <sha> is required')
  const sha = git(['rev-parse', `${base}^{commit}`], root).trim()
  const record = readRecord(tryGit(['show', `${sha}:${recordPath}`], root).out || undefined)
  const hashes = Object.fromEntries(spacePages(sha, 'guide').map(([page, text]) => [page, pageHash(text)]))
  const plan: Plan = { base: sha, ...planPages(record, hashes) }
  if (command === 'plan') {
    const held = new Set(aPages(record))
    const paths = (ps: string[]) => ps.map((p) => `- ${pagesDir('guide')}/${p}.md${held.has(p) ? ' (A)' : ''}`)
    console.log([
      `# Plan at ${sha}`, '',
      '## Read by all three', '', ...paths(plan.allThree), '',
      ...models.flatMap((m) => [`## Read by ${m} alone`, '', ...paths(plan.lone[m]), '']),
      `## Entries for pages gone at the base: ${plan.stale.join(', ') || 'none'}`, '',
      '## Every page and draft (path: title — description)', '', ...catalog(sha),
    ].join('\n'))
    return
  }
  if (command !== 'tally') fail(`unknown command ${command}; use plan or tally`)
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
  const selected = pageList(selectedFlag)
  const result = tally(record, plan, reports, selected)
  console.log(result.markdown)
  if (!write) return
  const run = new Date().toISOString().slice(0, 10)
  const next = nextRecord(record, result, { run, hashes, gapEdit: pageList(gapEditFlag), readByAll: pageList(readByAllFlag) })
  writeFileSync(join(root, recordPath), stringify(next, { lineWidth: 0 }))
  console.error(`wrote ${recordPath}`)
})
