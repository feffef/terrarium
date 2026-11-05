// The mechanical half of the glassbox-improve Skill: the reading plan, the
// tally of the lens raters' reports, the blind comparisons, `grades.yml`,
// `runs.yml`, and each draft's promotion blockers. Usage (`pnpm exec tsx` this file):
//   plan --base <sha> --briefs <dir>        the plan; writes the rater briefs and rater B's trimmed pages
//   tally --base <sha> --out <dir> <hand-back> ...  the work list (rater A, B and every C shard); writes <dir>/run.yml and the first A judges' briefs
//   gate --base <sha> --out <dir> [--pages a,b]  writes the gate judge's brief for each page edited since the base
//   briefs --kind researcher|writer --base <sha> --out <dir>  writes the researcher or writer briefs from <dir>/run.yml; fails on an unfilled placeholder
//   votes --out <dir> <hand-back> ...        reads judges' verdicts into run.yml; writes the next A judges' briefs
//   record --base <sha> --out <dir> [--session s] [--pr n] [--cost usd]  writes grades.yml and runs.yml
//   drafts --base <sha>                      each draft's promotion blockers
// A page is named by its path under `layers/glassbox/content/guide/pages`, without `.md`.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Document, isMap, isPair, isScalar, parse as parseYaml, stringify, visit } from 'yaml'
import { extractFlag, fail, root, runIfMain } from '../../../../scripts/lib/cli.ts'
import { frontmatterBlock, splitFrontmatter } from '../../../../scripts/lib/frontmatter.ts'
import { git, tryGit } from '../../../../scripts/lib/git.ts'
import { glassboxCites, glassboxJournalRoutes, glassboxOrphanText, glassboxOrphans, glassboxPageProblems, glassboxPageWarnings, glassboxSitePath, repoGit, type GlassboxGit, type GlassboxSite } from '../../../../layers/glassbox/page-checks.ts'
import { glassboxPageRefs } from '../../../../layers/glassbox/page-refs.ts'

export const lenses = ['clarity', 'reasoning', 'placement', 'evidence', 'transfer', 'relevance'] as const
export type Lens = (typeof lenses)[number]
export type Grade = 'A' | 'B' | 'C' | 'D' | 'n/a'
export const stepKinds = ['merge', 'split', 'move', 'cut', 'promote', 'lesson', 'section'] as const
export type StepKind = (typeof stepKinds)[number]

// The owner's values (issue #2792): N for Relevance and the churn guard, K for the rotation.
export const relevanceEvery = 5
export const churnRuns = 5
export const rotationRuns = 3
export const runsKept = 10

export interface LensRecord {
  grade: Grade
  run: string
  wins?: string[]
}

export interface PageRecord {
  hash: string
  sources: string
  read?: string
  checked?: string
  lenses: Partial<Record<Lens, LensRecord>>
  /** Each lens's last edit, for the churn pause on gap edits. */
  edited?: Partial<Record<Lens, string>>
}

export interface Step {
  id: string
  kind: StepKind
  pages: string[]
  into?: string
  raised: string[]
  status: 'pending' | 'taken' | 'dropped' | 'refused'
  decided?: string
  gist: string
}

export interface GradeRecord {
  version: 3
  run?: string
  pages: Record<string, PageRecord>
  steps: Step[]
}

export interface RunEntry {
  run: string
  session?: string
  base: string
  pr?: number
  costUsd?: number
  relevance?: boolean
  pagesRead: number
  pagesChecked: number
  falseClaimsFixed: number
  edits: number
  gatePassed: number
  gateStopped: number
  aComparisons: number
  stepsTaken: number
  stepsRefused: number
  findings?: { page: string; lens?: Lens; grade?: Grade; quote?: string; fix: string; confirmed: boolean; edited: boolean }[]
  falseClaims?: { page: string; claim: string; evidence: string; fixed: boolean }[]
  gate?: GateEntry[]
  comparisons?: { lens: Lens; candidate: string; against: string; votes: Vote[]; result: 'win' | 'loss' }[]
}

export type Vote = 'win' | 'loss' | 'equal'

const sha1 = (text: string) => createHash('sha1').update(text).digest('hex')
const subjectOf = (page: string) => page.split('/')[0]!
const slug = (page: string) => page.split('/').at(-1)!.replace(/^\d+\./, '')

/** What a page teaches: the file without the lines `glassbox-update` moves daily
 *  (the pin and the Excerpt ranges), so a re-pin doesn't count as a change. */
export function pageHash(text: string): string {
  const block = frontmatterBlock(text)
  const frontmatter = (block?.yaml ?? '').split('\n').filter((l) => !/^(revision|revisionDate|publishedAt):/.test(l))
  const body = text.slice(block?.length ?? 0).replace(/\s*lines="[^"]*"/g, '')
  return sha1([...frontmatter, body].join('\n'))
}

/** One hash over the files a page cites, so a change to any of them sends the page to the raters. */
export function sourcesHash(paths: string[], read: (path: string) => string | undefined): string {
  return sha1([...new Set(paths)].sort().map((p) => `${p}\n${read(p) ?? ''}`).join('\n'))
}

export function stepId(kind: StepKind, pages: string[], into?: string): string {
  return [kind, ...pages.map(slug), ...(into ? ['into', slug(into)] : [])].join('-')
}

/** `grades.yml`; a v2 file starts fresh (issue #2792, Migration), its waiting candidates kept as steps. */
export function readRecord(text: string | undefined): GradeRecord {
  const parsed = (text ? parseYaml(text) : null) as Record<string, unknown> | null
  if (parsed?.version === 3) return parsed as unknown as GradeRecord
  const candidates = (parsed?.candidates ?? []) as { kind: string; pages: string[]; gist: string; since: string }[]
  const steps = candidates.map((c): Step => {
    // v2 named a re-cut without its direction; the gist's verb gives it.
    const kind = (c.kind.startsWith('promote') ? 'promote' : stepKinds.find((k) => c.gist.toLowerCase().startsWith(k)) ?? 'move') as StepKind
    const [first, into] = c.pages
    const pages = kind === 'move' && into ? [first!] : c.pages
    const step: Step = { id: stepId(kind, pages, kind === 'move' ? into : undefined), kind, pages, raised: [c.since], status: 'pending', gist: c.gist }
    if (kind === 'move' && into) step.into = into
    return step
  })
  return { version: 3, pages: {}, steps }
}

/** The lenses on which a page won every comparison last run and doesn't hold A yet. */
const pendingWins = (record: GradeRecord, page: string): Lens[] =>
  lenses.filter((l) => record.run && record.pages[page]?.lenses[l]?.grade !== 'A' && record.pages[page]?.lenses[l]?.wins?.at(-1) === record.run)

export interface Plan {
  base: string
  /** Every guide page; rater B reads them all. */
  pages: string[]
  /** The pages raters A and C read: the changed ones and the rotation. */
  read: string[]
  changed: string[]
  rotation: string[]
  /** Pages that won their A comparisons last run, read again so they can win twice in a row. */
  rematch: string[]
  /** Why Relevance is rated this run, or undefined when it isn't. */
  relevance?: string
  stale: string[]
}

export function planPages(record: GradeRecord, current: Record<string, { hash: string; sources: string }>, runs: RunEntry[]): Omit<Plan, 'base'> {
  const pages = Object.keys(current).sort()
  const changed = pages.filter((p) => {
    const r = record.pages[p]
    return !r || !r.read || r.hash !== current[p]!.hash || r.sources !== current[p]!.sources
  })
  const rematch = pages.filter((p) => !changed.includes(p) && pendingWins(record, p).length)
  const readOn = (p: string) => record.pages[p]?.read ?? ''
  const rotation = pages
    .filter((p) => !changed.includes(p) && !rematch.includes(p))
    .sort((a, b) => readOn(a).localeCompare(readOn(b)) || a.localeCompare(b))
    .slice(0, Math.ceil(pages.length / rotationRuns))
  const stale = Object.keys(record.pages).filter((p) => !(p in current)).sort()
  const added = pages.filter((p) => !record.pages[p])
  const recent = runs.slice(0, relevanceEvery - 1)
  const relevance = !Object.keys(record.pages).length
    ? 'first v3 run'
    : added.length || stale.length
      ? `pages added or gone: ${[...added, ...stale].join(', ')}`
      : recent.some((r) => r.relevance) ? undefined : `none of the last ${relevanceEvery - 1} runs rated it`
  return { pages, read: [...changed, ...rematch, ...rotation].sort(), changed, rotation, rematch, ...(relevance ? { relevance } : {}), stale }
}

export type RaterId = 'A' | 'B' | 'C'
export const raterLenses: Record<RaterId, Lens[]> = { A: ['clarity', 'reasoning'], B: ['placement'], C: ['evidence', 'transfer'] }
const raterIds = Object.keys(raterLenses) as RaterId[]
// GLOSSARY.md: a Walkthrough has no Why and teaches no concept of its own.
const walkthroughNa: Lens[] = ['reasoning', 'transfer']
const isWalkthrough = (page: string) => page.startsWith('walkthroughs/')
// Relevance leads to steps, never to a page to learn from.
const electedLenses = lenses.filter((l) => l !== 'relevance')
// Cost: a comparison can take three judges (issue #2805).
export const comparisonsPerRun = 4
const holdersCompared = 3
const freshOpponents = 2

export interface LensReport {
  grade: Grade
  findings?: { quote: string; fix: string }[]
  gaps?: { section: string; exemplar: string; take: string }[]
}

export interface Report {
  rater: RaterId
  pages: {
    page: string
    lenses: Partial<Record<Lens, LensReport>>
    falseClaims?: { quote: string; source: string }[]
    claims?: string[]
    docs?: string
  }[]
  top3?: Partial<Record<Lens, string[]>>
  steps?: { kind: StepKind; pages: string[]; into?: string; gist: string }[]
}

/** The rater's YAML block: the last fenced `yaml` block in its hand-back. */
export function parseReport(handback: string): Report {
  const block = [...handback.matchAll(/```ya?ml\n([\s\S]*?)\n```/g)].at(-1)?.[1]
  if (!block) throw new Error('no ```yaml block in the hand-back')
  const report = parseYaml(block) as Report
  if (!raterIds.includes(report.rater)) throw new Error(`rater is ${report.rater}, not one of ${raterIds.join(', ')}`)
  report.pages ??= []
  // Fail here, naming the mistake, not later in summary() at cell().
  const need = (where: string, what: string, entry: object, keys: string[]) => {
    for (const k of keys) if (!(entry as Record<string, unknown>)[k]) throw new Error(`rater ${report.rater}, ${where}: ${what} is missing "${k}"`)
  }
  for (const p of report.pages) {
    for (const [lens, l] of Object.entries(p.lenses ?? {}) as [Lens, LensReport][]) {
      for (const g of l.gaps ?? []) need(`page ${p.page}, lens ${lens}`, 'gap', g, ['section', 'exemplar', 'take'])
      for (const f of l.findings ?? []) need(`page ${p.page}, lens ${lens}`, 'finding', f, ['quote', 'fix'])
    }
    for (const f of p.falseClaims ?? []) need(`page ${p.page}`, 'false claim', f, ['quote', 'source'])
  }
  return report
}

export const lensesOf = (rater: RaterId, plan: Pick<Plan, 'relevance'>): Lens[] => [...raterLenses[rater], ...(rater === 'B' && plan.relevance ? ['relevance' as const] : [])]

// Experiment d (issue #2792): a rater claim-checked 8 pages in about 160-180k tokens.
export const claimCheckPages = 8

/** Rater C's pages in shards, one claim-check agent each. */
export const claimShards = (plan: Pick<Plan, 'read'>) => Array.from({ length: Math.ceil(plan.read.length / claimCheckPages) }, (_, i) => plan.read.slice(i * claimCheckPages, (i + 1) * claimCheckPages))

const expectedPages = (rater: RaterId, plan: Plan) => (rater === 'B' ? plan.pages : plan.read)

/** Every page each rater must grade, once, across its reports (rater C's shards together). */
export function coverageProblems(reports: Report[], plan: Plan): string[] {
  const problems: string[] = []
  for (const r of raterIds) {
    const graded = reports.filter((x) => x.rater === r).flatMap((x) => x.pages.map((p) => p.page))
    for (const page of expectedPages(r, plan)) if (!graded.includes(page)) problems.push(`${r}: no grades for ${page}`)
    for (const page of new Set(graded.filter((p, i) => graded.indexOf(p) !== i))) problems.push(`${r}: graded ${page} twice`)
  }
  return problems
}

/** Checks one report against the plan; returns its problems. */
export function reportProblems(report: Report, plan: Plan): string[] {
  const r = report.rater
  const mine = lensesOf(r, plan)
  const expected = expectedPages(r, plan)
  const problems: string[] = []
  for (const p of report.pages) {
    if (!expected.includes(p.page)) {
      problems.push(`${r}: graded ${p.page}, which is not in its plan`)
      continue
    }
    for (const [lens, l] of Object.entries(p.lenses ?? {}) as [Lens, LensReport][]) {
      if (!lenses.includes(lens)) problems.push(`${r}: ${p.page} grades ${lens}, an unknown lens`)
      else if (!mine.includes(lens)) problems.push(`${r}: ${p.page} grades ${lens}, not one of its lenses (${mine.join(', ')})`)
      else if (!['B', 'C', 'D', 'n/a'].includes(l.grade)) problems.push(`${r}: ${p.page} ${lens} is ${l.grade}; raters grade B, C, D or n/a`)
      else if (l.grade === 'n/a' && !(isWalkthrough(p.page) && walkthroughNa.includes(lens))) problems.push(`${r}: ${p.page} ${lens} is n/a, which only a Walkthrough takes`)
      else if (l.grade !== 'n/a' && isWalkthrough(p.page) && walkthroughNa.includes(lens)) problems.push(`${r}: ${p.page} ${lens} must be n/a on a Walkthrough`)
      else if ((l.grade === 'C' || l.grade === 'D') && !l.findings?.length) problems.push(`${r}: ${p.page} ${lens} is ${l.grade} without a finding`)
    }
    for (const lens of mine) if (!p.lenses?.[lens]) problems.push(`${r}: ${p.page} has no ${lens} grade`)
    if (r === 'C' && (!p.claims?.length || !p.docs)) problems.push(`${r}: ${p.page} has no claim check (claims and docs)`)
  }
  for (const s of report.steps ?? []) {
    if (!stepKinds.includes(s.kind)) problems.push(`${r}: step ${s.kind} is not one of ${stepKinds.join(', ')}`)
    // The churn guard finds a step's inverse by its direction (`inverse`).
    else if (s.kind !== 'cut' && !s.into) problems.push(`${r}: step ${s.kind} of ${s.pages.join(', ')} has no into`)
    if (!s.gist) problems.push(`${r}: step ${s.kind} of ${s.pages.join(', ')} has no gist`)
  }
  return problems
}

export interface Item {
  id: string
  page: string
  kind: 'falseClaim' | 'check' | 'deficit' | 'gap'
  lens?: Lens
  grade?: Grade
  quote?: string
  fix: string
  source?: string
  exemplar?: string
  /** Why the run leaves it, when it does. */
  skipped?: string
  /** Set by the lead: the researcher confirmed it, and a writer's edit fixed it. */
  confirmed?: boolean | null
  edited?: boolean
}

export interface Comparison {
  id: string
  lens: Lens
  candidate: string
  against: string
  votes: Vote[]
  result?: 'win' | 'loss'
}

export interface Tally {
  grades: Record<string, Partial<Record<Lens, Grade>>>
  items: Item[]
  steps: Step[]
  comparisons: Comparison[]
  /** Top-3 pages not compared this run, each with why. */
  waiting: string[]
  /** Steps a restated gist put back to pending, with the decision it cleared. */
  restated?: string[]
}

/** The run key from which a decision still counts for the churn guard: the last `churnRuns` runs. */
const churnCutoff = (runs: RunEntry[]) => runs[churnRuns - 1]?.run ?? ''

/** Whether `t` moves content back where `s` took it from. */
export function inverse(s: Pick<Step, 'kind' | 'pages' | 'into'>, t: Pick<Step, 'kind' | 'pages' | 'into'>): boolean {
  const back = s.into !== undefined && t.into !== undefined && t.pages.includes(s.into) && s.pages.includes(t.into)
  // A split of the page a step filled undoes it, whatever the split names its new page.
  const refill = (a: typeof s, b: typeof s) => b.kind === 'split' && a.kind !== 'split' && a.into !== undefined && b.pages.includes(a.into)
  return back || refill(s, t) || refill(t, s) || (s.kind === 'cut' && t.into !== undefined && s.pages.includes(t.into)) || (t.kind === 'cut' && s.into !== undefined && t.pages.includes(s.into))
}

const gradeRank: Record<Grade, number> = { D: 0, C: 1, B: 2, A: 3, 'n/a': 4 }

export function tally(record: GradeRecord, plan: Plan, reports: Report[], runs: RunEntry[], checks: Record<string, string[]>, run: string): Tally {
  const grades: Tally['grades'] = {}
  for (const r of reports) for (const p of r.pages) for (const [lens, l] of Object.entries(p.lenses ?? {}) as [Lens, LensReport][]) (grades[p.page] ??= {})[lens] = l.grade
  const cutoff = churnCutoff(runs)
  const raw: Omit<Item, 'id'>[] = []
  for (const r of reports) for (const p of r.pages) for (const f of p.falseClaims ?? []) raw.push({ page: p.page, kind: 'falseClaim', quote: f.quote, source: f.source, fix: `correct it to match ${f.source}` })
  for (const [page, list] of Object.entries(checks).sort()) for (const fix of list) raw.push({ page, kind: 'check', fix })
  const deficits: Omit<Item, 'id'>[] = []
  const gaps: Omit<Item, 'id'>[] = []
  for (const r of reports) {
    for (const p of r.pages) {
      for (const lens of lenses) {
        const l = p.lenses?.[lens]
        if (!l) continue
        for (const f of l.findings ?? []) deficits.push({ page: p.page, kind: 'deficit', lens, grade: l.grade, quote: f.quote, fix: f.fix })
        for (const g of l.gaps ?? []) {
          const edited = record.pages[p.page]?.edited
          const skipped = record.pages[g.exemplar]?.lenses[lens]?.grade !== 'A'
            ? `${g.exemplar} holds no A on ${lens}`
            : edited?.[lens] && edited[lens]! >= cutoff ? `edited on ${lens} within the last ${churnRuns} runs` : undefined
          gaps.push({ page: p.page, kind: 'gap', lens, quote: g.section, exemplar: g.exemplar, fix: g.take, ...(skipped ? { skipped } : {}) })
        }
      }
    }
  }
  // The owner's order (issue #2792): weakest lens first.
  const weakest = (page: string) => Math.min(...Object.values(grades[page] ?? {}).map((g) => gradeRank[g]))
  deficits.sort((a, b) => weakest(a.page) - weakest(b.page) || a.page.localeCompare(b.page) || lenses.indexOf(a.lens!) - lenses.indexOf(b.lens!))
  gaps.sort((a, b) => a.page.localeCompare(b.page) || lenses.indexOf(a.lens!) - lenses.indexOf(b.lens!))
  const items = [...raw, ...deficits, ...gaps].map((item, i) => ({ id: `f${i + 1}`, ...item }))

  const steps = record.steps.map((s) => ({ ...s, raised: [...s.raised] }))
  const restated: string[] = []
  for (const r of reports) {
    for (const raise of r.steps ?? []) {
      const id = stepId(raise.kind, raise.pages, raise.into)
      const old = steps.find((s) => s.id === id)
      if (!old) steps.push({ id, kind: raise.kind, pages: raise.pages, ...(raise.into ? { into: raise.into } : {}), raised: [run], status: 'pending', gist: raise.gist })
      else if (old.status !== 'taken') {
        if (!old.raised.includes(run)) old.raised.push(run)
        // A researcher dropped it; only a new reason earns another (nextRecord forgets it after the churn window).
        if (old.status === 'dropped' && raise.gist === old.gist) continue
        if (old.decided) restated.push(`${id}: ${old.status} ${old.decided} as "${old.gist}", raised again as "${raise.gist}"`)
        old.gist = raise.gist
        old.status = 'pending'
        delete old.decided
      }
    }
  }
  for (const s of steps.filter((s) => s.status === 'pending')) {
    if (steps.some((t) => t.status === 'taken' && (t.decided ?? '') >= cutoff && inverse(s, t))) Object.assign(s, { status: 'refused', decided: run })
  }

  const { comparisons, waiting } = plannedComparisons(record, plan, reports, grades, items)
  return { grades, items, steps, comparisons, waiting, restated }
}

/** QUALITY.md, Grades: each top-3 page meets the Subject's A holders on that lens, or 2 of its B pages while it has none. */
function plannedComparisons(record: GradeRecord, plan: Plan, reports: Report[], grades: Tally['grades'], items: Item[]) {
  const comparisons: Comparison[] = []
  const waiting: string[] = []
  const busy = new Set(items.filter((i) => !i.skipped).map((i) => i.page))
  // Raters never give A, so a holder keeps it here; only a confirmed deficit takes it (nextRecord).
  const gradeOf = (page: string, lens: Lens) => (record.pages[page]?.lenses[lens]?.grade === 'A' ? 'A' : grades[page]?.[lens] ?? record.pages[page]?.lenses[lens]?.grade)
  const lastWin = (page: string, lens: Lens) => record.pages[page]?.lenses[lens]?.wins?.at(-1) ?? ''
  const queues = electedLenses.map((lens) => {
    // Rater C's shards each name a top 3 among their own pages: take them by rank, at most 3.
    const lists = reports.map((r) => r.top3?.[lens]?.slice(0, 3) ?? [])
    const top3 = [...new Set([0, 1, 2].flatMap((rank) => lists.flatMap((l) => (l[rank] ? [l[rank]] : []))))].slice(0, 3)
    const rematch = plan.read.filter((p) => pendingWins(record, p).includes(lens) && !top3.includes(p))
    return { lens, top3, candidates: [...rematch, ...top3] }
  })
  // Round-robin across lenses, so the cap never starves a late lens.
  const order = Array.from({ length: Math.max(0, ...queues.map((q) => q.candidates.length)) }, (_, rank) => queues.flatMap((q) => (q.candidates[rank] ? [{ ...q, candidate: q.candidates[rank] }] : []))).flat()
  for (const { lens, top3, candidate } of order) {
    const reported = reports.flatMap((r) => r.pages).find((p) => p.page === candidate && p.lenses[lens])?.lenses[lens]
    if (record.pages[candidate]?.lenses[lens]?.grade === 'A') continue
    if (reported?.grade !== 'B') {
      waiting.push(`${candidate} on ${lens}: graded ${reported?.grade ?? 'nothing'} this run, not B`)
      continue
    }
    if (reported.findings?.length || reported.gaps?.length) {
      waiting.push(`${candidate} on ${lens}: it has a finding or gap on that lens`)
      continue
    }
    if (busy.has(candidate)) {
      waiting.push(`${candidate} on ${lens}: it has work this run`)
      continue
    }
    const subject = subjectOf(candidate)
    const peers = plan.pages.filter((p) => p !== candidate && subjectOf(p) === subject)
    const holders = peers.filter((p) => gradeOf(p, lens) === 'A').sort((a, b) => lastWin(b, lens).localeCompare(lastWin(a, lens)) || a.localeCompare(b)).slice(0, holdersCompared)
    const fresh = peers.filter((p) => gradeOf(p, lens) === 'B').sort((a, b) => Number(top3.includes(b)) - Number(top3.includes(a)) || top3.indexOf(a) - top3.indexOf(b) || a.localeCompare(b)).slice(0, freshOpponents)
    const against = holders.length ? holders : fresh
    if (!holders.length && fresh.length < freshOpponents) waiting.push(`${candidate} on ${lens}: ${subject} has fewer than ${freshOpponents} other B pages`)
    else if (comparisons.length + against.length > comparisonsPerRun) waiting.push(`${candidate} on ${lens}: no comparisons left this run`)
    else for (const a of against) comparisons.push({ id: `a${comparisons.length + 1}`, lens, candidate, against: a, votes: [] })
  }
  return { comparisons, waiting }
}

export interface Pair<T> {
  X: T
  Y: T
  /** Which side shows the new version, or the A candidate. */
  challenger: 'X' | 'Y'
}

/** Two versions in an order the judge can't infer. */
export function blindPair<T>(challenger: T, other: T, coin: () => boolean = () => Math.random() < 0.5): Pair<T> {
  return coin() ? { X: challenger, Y: other, challenger: 'X' } : { X: other, Y: challenger, challenger: 'Y' }
}

export function decodeVerdict(verdict: string, challenger: 'X' | 'Y'): Vote {
  if (!['X', 'Y', 'equal'].includes(verdict)) throw new Error(`verdict ${verdict} is not X, Y or equal`)
  return verdict === 'equal' ? 'equal' : verdict === challenger ? 'win' : 'loss'
}

const wins = (votes: Vote[]) => votes.filter((v) => v === 'win').length
// A verdict read out of order leaves a hole in the array; count only the votes cast.
const cast = (votes: Vote[]) => votes.filter(Boolean).length

/** The blind gate: one judge; a win merges, "equal" fails, which guards against churn. Undefined until it voted. */
export function gateMerged(votes: Vote[]): boolean | undefined {
  return votes[0] === undefined ? undefined : votes[0] === 'win'
}

/** What the gate judge is told a taken step targeted on `page`. A move or section fills its `into`: say the facts arrive there (issue #2816). */
export function stepCriterion(s: Pick<Step, 'kind' | 'pages' | 'into' | 'gist'>, page: string): string {
  const receives = (s.kind === 'move' || s.kind === 'section') && s.into === page && !s.pages.includes(page)
  return `${s.kind} step: ${receives ? `this page RECEIVES the facts, moved here from ${s.pages.join(', ')}: ` : ''}${s.gist}`
}

/** One judge first; the other two only if the candidate wins (issue #2792). Undefined while judges are owed. */
export function comparisonResult(votes: Vote[]): 'win' | 'loss' | undefined {
  if (votes[0] && votes[0] !== 'win') return 'loss'
  return cast(votes) < 3 ? undefined : wins(votes) >= 2 ? 'win' : 'loss'
}

/** The next `grades.yml`. A grade below B whose findings the researcher all dropped counts as B;
 *  A is lost only through a confirmed deficit, and taken by winning every comparison in two runs in a row. */
export function nextRecord(record: GradeRecord, plan: Plan, current: Record<string, { hash: string; sources: string }>, result: Tally, runs: RunEntry[], run: string): GradeRecord {
  const confirmed = (page: string, lens: Lens) => result.items.some((i) => i.page === page && i.lens === lens && i.kind === 'deficit' && i.confirmed)
  const compared = new Map<string, Comparison[]>()
  for (const c of result.comparisons.filter((c) => c.result)) compared.set(`${c.candidate} ${c.lens}`, [...(compared.get(`${c.candidate} ${c.lens}`) ?? []), c])
  const pages: GradeRecord['pages'] = {}
  for (const page of Object.keys(current).sort()) {
    const old = record.pages[page]
    const read = plan.read.includes(page)
    const entry: PageRecord = { hash: current[page]!.hash, sources: current[page]!.sources, ...(old?.read || read ? { read: read ? run : old!.read } : {}), ...(old?.checked || read ? { checked: read ? run : old!.checked } : {}), lenses: { ...old?.lenses } }
    for (const [lens, rated] of Object.entries(result.grades[page] ?? {}) as [Lens, Grade][]) {
      const grade = (rated === 'C' || rated === 'D') && !confirmed(page, lens) ? 'B' : rated
      const was = old?.lenses[lens]
      if (was?.grade === 'A' && !confirmed(page, lens)) continue
      entry.lenses[lens] = { grade, run, ...(was?.wins && grade === 'B' ? { wins: was.wins } : {}) }
    }
    for (const lens of electedLenses) {
      const results = compared.get(`${page} ${lens}`)
      if (!results) continue
      const now = entry.lenses[lens]!
      if (results.some((c) => c.result === 'loss')) {
        delete now.wins
        continue
      }
      const won = [...(record.run && now.wins?.at(-1) === record.run ? [record.run] : []), run]
      entry.lenses[lens] = { grade: won.length >= 2 ? 'A' : now.grade, run, wins: won }
    }
    entry.lenses = Object.fromEntries(lenses.filter((l) => entry.lenses[l]).map((l) => [l, entry.lenses[l]]))
    const edited = result.items.filter((i) => i.page === page && i.edited)
    const editedLenses = { ...old?.edited, ...Object.fromEntries(edited.flatMap((i) => (i.lens ? [[i.lens, run]] : []))) }
    if (Object.keys(editedLenses).length) entry.edited = editedLenses
    pages[page] = entry
  }
  const cutoff = churnCutoff([{ run } as RunEntry, ...runs])
  const steps = result.steps
    .map((s) => (s.status !== 'pending' && !s.decided ? { ...s, decided: run } : s))
    .filter((s) => s.status === 'pending' || s.decided! >= cutoff)
  return { version: 3, run, pages, steps }
}

export interface GateEntry {
  page: string
  criterion: string
  votes: Vote[]
  merged: boolean
}

/** This run's `runs.yml` entry. */
export function runEntry(meta: Pick<RunEntry, 'run' | 'base' | 'session' | 'pr' | 'costUsd'>, plan: Plan, result: Tally, gate: GateEntry[]): RunEntry {
  const decidedNow = (status: Step['status']) => result.steps.filter((s) => s.status === status && (s.decided ?? meta.run) === meta.run).length
  const done = result.comparisons.filter((c) => c.result)
  return {
    ...meta,
    relevance: !!plan.relevance,
    pagesRead: plan.read.length,
    pagesChecked: plan.read.length,
    falseClaimsFixed: result.items.filter((i) => i.kind === 'falseClaim' && i.edited).length,
    edits: gate.length,
    gatePassed: gate.filter((g) => g.merged).length,
    gateStopped: gate.filter((g) => !g.merged).length,
    aComparisons: done.length,
    stepsTaken: decidedNow('taken'),
    stepsRefused: decidedNow('refused'),
    findings: result.items.filter((i) => i.kind !== 'falseClaim').map((i) => ({
      page: i.page, ...(i.lens ? { lens: i.lens } : {}), ...(i.grade ? { grade: i.grade } : {}), ...(i.quote ? { quote: i.quote } : {}), fix: i.fix, confirmed: !!i.confirmed, edited: !!i.edited,
    })),
    falseClaims: result.items.filter((i) => i.kind === 'falseClaim').map((i) => ({ page: i.page, claim: i.quote!, evidence: i.source!, fixed: !!i.edited })),
    gate,
    comparisons: done.map((c) => ({ lens: c.lens, candidate: c.candidate, against: c.against, votes: c.votes, result: c.result! })),
  }
}

const trimmedLine = 200

/** A page for rater B, who judges placement across the guide: title, description and
 *  prose, each code block cut to its line count and each line to `trimmedLine` chars. */
export function trimPage(text: string): string {
  const { frontmatter, body } = splitFrontmatter(text)
  const lines = (n: number) => `${n} line${n === 1 ? '' : 's'}`
  const cut = body
    .replace(/^::excerpt\{[^}]*path="([^"]*)"[^}]*\}\n(`{3,})[^\n]*\n([\s\S]*?)\n\2\n::$/gm, (_, path: string, _f, code: string) => `[Excerpt of ${path}: ${lines(code.split('\n').length)}]`)
    .replace(/^(`{3,})[^\n]*\n([\s\S]*?)\n\1$/gm, (_, _f, code: string) => `[code: ${lines(code.split('\n').length)}]`)
    .split('\n')
    .map((l) => (l.length > trimmedLine ? `${l.slice(0, trimmedLine)}…` : l))
    .join('\n')
  return `title: ${frontmatter.title}\ndescription: ${frontmatter.description}\n\n${cut.replace(/^\n+/, '')}`
}

export interface DraftsInput {
  base: string
  /** Each Space's sources by file under its `pages/`, `index.md` included. */
  guide: Record<string, string>
  drafts: Record<string, string>
  terms: string[]
  journal: string[]
}
export function draftsReport({ base, guide, drafts, terms, journal }: DraftsInput, repo: GlassboxGit): string {
  const baseDate = repo.commit(base)?.date ?? ''
  const titles = (sources: Record<string, string>, space: string) =>
    Object.fromEntries(Object.entries(sources).map(([file, text]) => [glassboxSitePath(space, file), String(splitFrontmatter(text).frontmatter.title)]))
  const out = [`# Drafts at ${base}, each checked as a guide page pinned to the base`]
  for (const [file, source] of Object.entries(drafts).filter(([f]) => f !== 'index.md')) {
    const { frontmatter } = splitFrontmatter(source)
    const block = frontmatterBlock(source)?.length ?? 0
    const pinned = source.slice(0, block).replace(/^revision:.*$/m, `revision: '${base}'`).replace(/^revisionDate:.*$/m, `revisionDate: '${baseDate.slice(0, 10)}'`) + source.slice(block)
    const asGuide = { ...guide, [file]: pinned }
    const site: GlassboxSite = {
      pages: [...Object.keys(asGuide).map((f) => glassboxSitePath('guide', f)), ...Object.keys(drafts).map((f) => glassboxSitePath('drafts', f))],
      journal,
      terms,
      cites: { ...glassboxCites(drafts, 'drafts'), ...glassboxCites(asGuide, 'guide') },
      titles: { ...titles(drafts, 'drafts'), ...titles(asGuide, 'guide') },
    }
    const revision = String(frontmatter.revision)
    const pinDate = repo.commit(revision)?.date ?? ''
    const problems = [
      ...(!pinDate || Date.parse(pinDate) < Date.parse(baseDate) ? [`revision ${revision.slice(0, 7)} (${pinDate.slice(0, 10) || 'unknown'}) is older than the base`] : []),
      ...glassboxPageProblems(file, pinned, site, repo, 'guide'),
      ...(frontmatter.publishedAt ? [] : ['no publishedAt']),
    ]
    out.push('', `## ${file} (${source.replace(/\n$/, '').split('\n').length} lines)`, '', ...(problems.length ? problems : ['no problems']).map((p) => `- ${p.replace(/\s*\n\s*/g, ' ').trim()}`))
  }
  return `${out.join('\n')}\n`
}

export interface BriefFill {
  commit: string
  scratch: string
  pages: string[]
  trimmed: string
  catalog: string[]
  held: Partial<Record<Lens, string[]>>
  relevance?: string
}

const exampleLens: Record<Lens, string> = {
  clarity: '{ grade: C, findings: [{ quote: "…", fix: "…" }] }',
  reasoning: '{ grade: B, gaps: [{ section: "Why it\'s built this way", exemplar: claude-code/03.skills, take: "…" }] }',
  placement: '{ grade: B }',
  evidence: '{ grade: C, findings: [{ quote: "…", fix: "a better Excerpt: scripts/hooks/guards.ts:12-20" }] }',
  transfer: '{ grade: B }',
  relevance: '{ grade: B }',
}

/** rater-brief.md filled in for one rater, keeping only the sections marked for it. */
export function raterBrief(template: string, rater: RaterId, plan: Pick<Plan, 'relevance'>, fill: BriefFill): string {
  const mine = lensesOf(rater, plan)
  const kept = template.replace(/<!-- rater ([A-C ]+) -->\n([\s\S]*?)<!-- \/rater -->\n/g, (_, who: string, body: string) => (who.split(' ').includes(rater) ? body : ''))
  const held = mine.flatMap((l) => (fill.held[l]?.length ? [`${l}: ${fill.held[l]!.join(', ')}`] : []))
  const example = [
    ...mine.map((l) => `      ${l}: ${exampleLens[l]}`),
    ...(rater === 'C' ? ['    claims: ["hooks that match run in parallel", "…"]', '    docs: https://code.claude.com/docs/en/hooks', '    falseClaims:', '      - { quote: "…", source: "scripts/hooks/guards.ts:12" }'] : []),
  ]
  const top3 = [
    ...mine.filter((l) => l !== 'relevance').map((l) => `  ${l}: [claude-code/03.skills, claude-code/01.claude-md]`),
    ...(rater === 'B' ? ['steps:', '  - { kind: merge, pages: [verification/07.timestamps-stored-as-strings], into: verification/06.schema-validation, gist: "…" }'] : []),
  ]
  const values: Record<string, string> = {
    RATER: rater,
    LENSES: mine.join(', '),
    COMMIT: fill.commit,
    SCRATCH: fill.scratch,
    PAGES: fill.pages.map((p) => `- ${pagesDir('guide')}/${p}.md`).join('\n') || 'none',
    TRIMMED: fill.trimmed,
    CATALOG: fill.catalog.join('\n'),
    RELEVANCE: plan.relevance ? `This run you also grade **Relevance** (${plan.relevance}): does the concept deserve its own page? A low grade leads to a step, never a rewrite. How much Terrarium relies on a concept is evidence, never the rule.` : '',
    HELD: held.join('; ') || 'none yet',
    EXAMPLE: example.join('\n'),
    TOP3: top3.join('\n'),
  }
  return kept.replace(/\{(RATER|LENSES|COMMIT|SCRATCH|PAGES|TRIMMED|CATALOG|RELEVANCE|HELD|EXAMPLE|TOP3)\}/g, (_, key: string) => values[key]!)
}

/** A researcher or writer brief filled in; a placeholder with no value is an error, so none ships unfilled. */
export function fillBrief(template: string, values: Record<string, string>): string {
  return template.replace(/\{([A-Z][A-Z ]+)\}/g, (_, key: string) => {
    if (!values[key]) throw new Error(`no value for {${key}}`)
    return values[key]!
  })
}

const itemLine = (i: Item) => `- ${i.id}, ${i.page}${i.lens ? `, ${i.lens}` : ''}${i.quote ? `, "${i.quote}"` : ''}: ${i.fix}${i.exemplar ? ` (A page: ${i.exemplar})` : ''}`

/** The briefs of one kind from the run's items and steps: it fills what run.yml holds and decides nothing. */
export function agentBriefs(kind: 'researcher' | 'writer', state: Pick<RunState, 'base' | 'run' | 'items' | 'steps'>, template: string, out: string, draftSection: (pages: string[]) => string): { name: string; text: string }[] {
  const stepPages = (s: Step) => [...s.pages, ...(s.into ? [s.into] : [])]
  const describe = (s: Step) => `${s.kind} ${s.pages.join(', ')}${s.into ? ` into ${s.into}` : ''} (${s.id}): ${s.gist}`
  const falseClaims = state.items.filter((i) => i.kind === 'falseClaim' && !i.skipped && i.confirmed !== false).map((i) => `- ${i.page}: "${i.quote}" (${i.source})`)
  const bySubject = (items: Item[]) => [...new Set(items.map((i) => subjectOf(i.page)))].map((subject): [string, Item[]] => [subject, items.filter((i) => subjectOf(i.page) === subject)])
  const units: { name: string; task: string; items: Item[]; draft: string }[] = []
  if (kind === 'researcher') {
    const kept = state.items.filter((i) => !i.skipped && i.confirmed !== false)
    for (const [subject, items] of bySubject(kept)) units.push({ name: subject, task: `confirm the items on the pages of ${subject}`, items, draft: 'none' })
    for (const s of state.steps.filter((s) => s.status === 'pending')) units.push({ name: s.id, task: `research the step: ${describe(s)}`, items: [], draft: draftSection(s.pages) })
  } else {
    const confirmed = state.items.filter((i) => i.confirmed === true)
    const taken = state.steps.filter((s) => s.status === 'taken' && (s.decided ?? state.run) === state.run)
    const touched = new Set(taken.flatMap(stepPages))
    for (const s of taken) {
      const task = s.kind === 'lesson' && s.into ? `write the new page ${s.into}, following .agents/skills/glassbox-lesson/SKILL.md; the items below on ${s.pages.join(', ')} are secondary. ${describe(s)}` : describe(s)
      units.push({ name: s.id, task, items: confirmed.filter((i) => stepPages(s).includes(i.page)), draft: 'none' })
    }
    for (const [subject, items] of bySubject(confirmed.filter((i) => !touched.has(i.page)))) units.push({ name: subject, task: `raise ${[...new Set(items.map((i) => i.page))].join(', ')}`, items, draft: 'none' })
  }
  return units.map((u) => ({
    name: `${kind}-${u.name}`,
    text: fillBrief(template, {
      TASK: u.task, ITEMS: u.items.map(itemLine).join('\n') || 'none', 'DRAFT REPORT': u.draft, COMMIT: state.base, BASE: state.base,
      SCRATCH: join(out, `${kind}-${u.name}`), 'RESEARCH FILE': join(out, `research-${u.name}.md`), 'FALSE CLAIMS': falseClaims.join('\n') || 'none',
    }),
  }))
}

/** What each page's gate judge is told its edits targeted: this run's edited items and taken steps. */
export function gateCriteria(items: Item[], steps: Step[], run: string): Map<string, string[]> {
  const criteria = new Map<string, string[]>()
  const add = (page: string, text: string) => criteria.set(page, [...(criteria.get(page) ?? []), text])
  for (const i of items.filter((i) => i.edited)) add(i.page, `${i.lens ?? i.kind}: ${i.fix}`)
  for (const s of steps.filter((s) => s.status === 'taken' && (s.decided ?? run) === run)) for (const p of new Set([...s.pages, ...(s.into ? [s.into] : [])])) add(p, stepCriterion(s, p))
  return criteria
}

const fence = (text: string) => `\`\`\`\`markdown\n${text.replace(/\n$/, '')}\n\`\`\`\``

/** judge-brief.md filled in for one judge. */
export function judgeBrief(template: string, judge: string, question: string, x: string, y: string): string {
  const values: Record<string, string> = { JUDGE: judge, QUESTION: question, X: fence(x), Y: fence(y) }
  return template.replace(/\{(JUDGE|QUESTION|X|Y)\}/g, (_, key: string) => values[key]!)
}

// The shell: git at the base, the run's scratch state in <out>/run.yml.

const skillDir = '.agents/skills/glassbox-improve'
const recordPath = `${skillDir}/grades.yml`
const runsPath = `${skillDir}/runs.yml`
const pagesDir = (space: string) => `layers/glassbox/content/${space}/pages`
const showAt = (rev: string, path: string) => {
  const r = tryGit(['show', `${rev}:${path}`], root)
  return r.ok ? r.out : undefined
}

/** Each file of a Space's pages at the base, by path under `pages/`, with its text. */
function spaceFiles(base: string, space: string): Record<string, string> {
  const dir = pagesDir(space)
  const files = tryGit(['ls-tree', '-r', '--name-only', base, dir], root).out.split('\n').filter((f) => f.endsWith('.md'))
  return Object.fromEntries(files.map((f) => [f.slice(dir.length + 1), git(['show', `${base}:${f}`], root)]))
}

/** Each page of a Space at the base, by name, with its text. */
function spacePages(base: string, space: string): [string, string][] {
  return Object.entries(spaceFiles(base, space))
    .filter(([f]) => f !== 'index.md' && !f.endsWith('/index.md'))
    .map(([f, text]) => [f.slice(0, -3), text])
}

function catalog(base: string): string[] {
  return ['guide', 'drafts'].flatMap((space) =>
    spacePages(base, space).map(([page, text]) => {
      const { frontmatter } = splitFrontmatter(text)
      return `- ${space}/${page}: ${frontmatter.title} — ${frontmatter.description}`
    }),
  )
}

function currentPages(base: string) {
  return Object.fromEntries(spacePages(base, 'guide').map(([page, text]) => {
    const cited = glassboxPageRefs(splitFrontmatter(text).body).files.map((f) => f.path)
    return [page, { hash: pageHash(text), sources: sourcesHash(cited, (p) => showAt(base, p)) }]
  }))
}

/** The page checks' findings at the base; a "so" clause is a reviewer's call, not a finding. */
function pageChecks(base: string): Record<string, string[]> {
  const files = spaceFiles(base, 'guide')
  const checks: Record<string, string[]> = {}
  for (const [file, text] of Object.entries(files)) {
    const found = glassboxPageWarnings(text).filter((w) => !w.startsWith('In Terrarium may give a motive'))
    if (found.length && file !== 'index.md') checks[file.slice(0, -3)] = found
  }
  for (const file of glassboxOrphans(files)) (checks[file.slice(0, -3)] ??= []).push(glassboxOrphanText)
  return checks
}

interface RunState {
  base: string
  run: string
  plan: Plan
  grades: Tally['grades']
  items: Item[]
  steps: Step[]
  comparisons: Comparison[]
  waiting: string[]
  restated?: string[]
  gate: (Omit<GateEntry, 'merged'> & { merged?: boolean })[]
}

const statePath = (out: string) => join(out, 'run.yml')
const keyPath = (out: string) => join(out, 'judges', 'key.yml')
const readYaml = <T>(path: string, fallback: T): T => (existsSync(path) ? (parseYaml(readFileSync(path, 'utf8')) as T) : fallback)
const writeYaml = (path: string, value: unknown) => writeFileSync(path, stringify(value, { lineWidth: 0 }))

function writeJudge(out: string, judge: string, question: string, challenger: string, other: string) {
  const pair = blindPair(challenger, other)
  const key = readYaml<Record<string, 'X' | 'Y'>>(keyPath(out), {})
  key[judge] = pair.challenger
  mkdirSync(join(out, 'judges'), { recursive: true })
  writeYaml(keyPath(out), key)
  const path = join(out, 'judges', `${judge}.md`)
  writeFileSync(path, judgeBrief(readFileSync(join(root, skillDir, 'judge-brief.md'), 'utf8'), judge, question, pair.X, pair.Y))
  return path
}

/** A lens's definition, from its bullet under QUALITY.md's Lenses: judges get it inline,
 *  since #2792's control showed a named criterion is what lets them reject a worse edit. */
export function lensDefinition(quality: string, lens: Lens): string {
  const name = lens[0]!.toUpperCase() + lens.slice(1)
  const bullet = quality.match(new RegExp(`^- \\*\\*${name}\\.?\\*\\*[^\\n]*(?:\\n  [^\\n]*)*`, 'm'))?.[0]
  if (!bullet) throw new Error(`QUALITY.md has no Lenses bullet for ${name}`)
  return bullet.replace(/^- /, '').replace(/\s*\n\s*/g, ' ')
}

const comparisonQuestion = (base: string, c: Comparison) => {
  const quality = showAt(base, '.agents/skills/glassbox-lesson/QUALITY.md') ?? fail('no QUALITY.md at the base')
  return `X and Y are two different pages of one Subject of the guide. Which is better on this lens: ${lensDefinition(quality, c.lens)} Judge them on that lens alone, never on which topic matters more.`
}

const runsAt = (base: string) => ((parseYaml(showAt(base, runsPath) ?? '') as { runs?: RunEntry[] } | null)?.runs ?? [])

/** Reads judges' verdicts into run.yml and writes the briefs of the A judges now owed. */
function votes(out: string, handbacks: string[]) {
  const state = readYaml<RunState | undefined>(statePath(out), undefined) ?? fail(`no ${statePath(out)}: run tally first`)
  const key = readYaml<Record<string, 'X' | 'Y'>>(keyPath(out), {})
  for (const file of handbacks) {
    const block = [...readFileSync(file, 'utf8').matchAll(/```ya?ml\n([\s\S]*?)\n```/g)].at(-1)?.[1]
    const v = (block ? parseYaml(block) : {}) as { judge?: string; verdict?: string }
    const m = v.judge?.match(/^(gate-(\d+)|(a\d+))-([1-3])$/)
    if (!m || !key[v.judge!]) fail(`${file}: judge ${v.judge} is not one this run briefed`)
    let vote: Vote
    try {
      vote = decodeVerdict(String(v.verdict), key[v.judge!]!)
    } catch (err) {
      return fail(`${file}: ${(err as Error).message}`)
    }
    const votesOf = m[2] ? state.gate[Number(m[2]) - 1]?.votes : state.comparisons.find((c) => c.id === m[3])?.votes
    if (!votesOf) fail(`${file}: no ${m[1]} in run.yml`)
    votesOf[Number(m[4]) - 1] = vote
  }
  const briefs: string[] = []
  const pageText = (p: string) => showAt(state.base, `${pagesDir('guide')}/${p}.md`) ?? ''
  for (const g of state.gate) {
    const merged = gateMerged(g.votes)
    if (merged === undefined) delete g.merged
    else g.merged = merged
  }
  for (const c of state.comparisons) {
    const result = comparisonResult(c.votes)
    if (result) c.result = result
    else if (c.votes.length === 1) for (const j of [2, 3]) briefs.push(writeJudge(out, `${c.id}-${j}`, comparisonQuestion(state.base, c), pageText(c.candidate), pageText(c.against)))
  }
  writeYaml(statePath(out), state)
  console.log([
    ...state.gate.map((g) => `gate ${g.page}: ${g.votes.filter(Boolean).join(', ') || 'no votes'} → ${g.merged === undefined ? 'judges owed' : g.merged ? 'merge' : 'fail'}`),
    ...state.comparisons.filter((c) => c.votes.length).map((c) => `${c.id} ${c.lens} ${c.candidate} vs ${c.against}: ${c.votes.filter(Boolean).join(', ')} → ${c.result ?? 'judges 2 and 3 owed'}`),
    ...(briefs.length ? ['', 'Judges now owed:', ...briefs.map((b) => `- ${b}`)] : []),
  ].join('\n'))
}

const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ')

function summary(state: RunState): string {
  const out = [`# Tally at ${state.base}`, '', '## Work, in order', '', 'id | page | kind | lens | grade | item | fix | skipped', '--- | --- | --- | --- | --- | --- | --- | ---']
  for (const i of state.items) out.push([i.id, i.page, i.kind, i.lens ?? '', i.grade ?? '', i.exemplar ? `${i.quote} (${i.exemplar})` : i.source ? `"${i.quote}" (${i.source})` : i.quote ? `"${i.quote}"` : '', i.fix, i.skipped ?? ''].map(cell).join(' | '))
  out.push('', '## Steps', '', 'id | kind | pages | into | status | raised | gist', '--- | --- | --- | --- | --- | --- | ---')
  for (const s of state.steps) out.push([s.id, s.kind, s.pages.join(', '), s.into ?? '', s.status, s.raised.join(', '), s.gist].map(cell).join(' | '))
  out.push('', `## A comparisons (at most ${comparisonsPerRun})`, '', ...(state.comparisons.length ? state.comparisons.map((c) => `- ${c.id}: ${c.candidate} vs ${c.against} on ${c.lens}`) : ['- none']))
  if (state.restated?.length) out.push('', '## Steps raised again with a new gist (back to pending)', '', ...state.restated.map((l) => `- ${l}`))
  out.push('', `Top-3 pages not compared: ${state.waiting.join('; ') || 'none'}`)
  return out.join('\n')
}

runIfMain(import.meta.url, () => {
  const [command, ...args] = process.argv.slice(2)
  const flags: Record<string, string | undefined> = {}
  let rest = args
  for (const name of ['base', 'briefs', 'kind', 'out', 'pages', 'session', 'pr', 'cost']) {
    const r = extractFlag(rest, `--${name}`)
    flags[name] = r.value
    rest = r.rest
  }
  const out = flags.out
  if (command === 'votes') return votes(out ?? fail('--out <dir> is required'), rest)
  if (!flags.base) fail('--base <sha> is required')
  const sha = git(['rev-parse', `${flags.base}^{commit}`], root).trim()
  const draftsText = () => {
    const termsDir = 'layers/glassbox/content/guide/terms/'
    const terms = tryGit(['ls-tree', '-r', '--name-only', sha, termsDir], root).out.split('\n').filter((f) => f.endsWith('.yml')).map((f) => f.slice(termsDir.length, -4))
    return draftsReport({ base: sha, guide: spaceFiles(sha, 'guide'), drafts: spaceFiles(sha, 'drafts'), terms, journal: glassboxJournalRoutes() }, repoGit)
  }
  if (command === 'drafts') {
    console.log(draftsText())
    return
  }
  const record = readRecord(showAt(sha, recordPath))
  const runs = runsAt(sha)
  const current = currentPages(sha)
  const thePlan: Plan = { base: sha, ...planPages(record, current, runs) }
  if (command === 'plan') {
    const pageCatalog = catalog(sha)
    const held = Object.fromEntries(lenses.map((l) => [l, Object.entries(record.pages).filter(([, p]) => p.lenses[l]?.grade === 'A').map(([page]) => page)]))
    if (flags.briefs) {
      const trimmed = join(flags.briefs, 'trimmed-pages.md')
      mkdirSync(flags.briefs, { recursive: true })
      writeFileSync(trimmed, spacePages(sha, 'guide').map(([page, text]) => `# ${page}\n\n${trimPage(text)}`).join('\n\n'))
      const template = readFileSync(join(root, skillDir, 'rater-brief.md'), 'utf8')
      const briefs: [string, RaterId, string[]][] = [['A', 'A', thePlan.read], ['B', 'B', thePlan.pages], ...claimShards(thePlan).map((pages, i): [string, RaterId, string[]] => [`C${i + 1}`, 'C', pages])]
      for (const [name, r, pages] of briefs) {
        const scratch = join(flags.briefs, `rater-${name}`)
        mkdirSync(scratch, { recursive: true })
        writeFileSync(join(flags.briefs, `rater-brief-${name}.md`), raterBrief(template, r, thePlan, { commit: sha, scratch, pages, trimmed, catalog: pageCatalog, held }))
      }
    }
    const list = (ps: string[]) => (ps.length ? ps.map((p) => `- ${p}`) : ['- none'])
    console.log([
      `# Plan at ${sha}`, '',
      `Relevance this run: ${thePlan.relevance ?? 'no'}`, '',
      `## Read by raters A and C: ${thePlan.read.length} of ${thePlan.pages.length} (rater C in ${claimShards(thePlan).length} claim-check shards of at most ${claimCheckPages})`, '',
      '### Changed since their last read', '', ...list(thePlan.changed), '',
      '### Rematch (won their A comparisons last run)', '', ...list(thePlan.rematch), '',
      `### Rotation (read longest ago; every page at least every ${rotationRuns} runs)`, '', ...list(thePlan.rotation), '',
      `## Entries for pages gone at the base: ${thePlan.stale.join(', ') || 'none'}`,
    ].join('\n'))
    return
  }
  if (!out) fail('--out <dir> is required')
  if (command === 'tally') {
    const reports = rest.map((f) => {
      try {
        return parseReport(readFileSync(f, 'utf8'))
      } catch (err) {
        return fail(`${f}: ${(err as Error).message}`)
      }
    })
    const problems = [...coverageProblems(reports, thePlan), ...reports.flatMap((r) => reportProblems(r, thePlan))]
    if (problems.length) fail(`the reports don't match the plan:\n${problems.join('\n')}`)
    const run = new Date().toISOString().slice(0, 16).replace(':', '')
    const result = tally(record, thePlan, reports, runs, pageChecks(sha), run)
    mkdirSync(out, { recursive: true })
    const state: RunState = { base: sha, run, plan: thePlan, ...result, gate: [] }
    writeYaml(statePath(out), state)
    const pageText = (p: string) => showAt(sha, `${pagesDir('guide')}/${p}.md`) ?? ''
    const briefs = result.comparisons.map((c) => writeJudge(out, `${c.id}-1`, comparisonQuestion(sha, c), pageText(c.candidate), pageText(c.against)))
    console.log(summary(state))
    console.log(['', `## First A judges' briefs (one sonnet judge each)`, '', ...(briefs.length ? briefs.map((b) => `- ${b}`) : ['- none'])].join('\n'))
    return
  }
  const state = readYaml<RunState | undefined>(statePath(out), undefined) ?? fail(`no ${statePath(out)}: run tally first`)
  if (command === 'briefs') {
    if (flags.kind !== 'researcher' && flags.kind !== 'writer') fail('--kind researcher|writer is required')
    const kind = flags.kind
    const report = state.steps.some((s) => s.status === 'pending') && kind === 'researcher' ? draftsText() : ''
    const section = (pages: string[]) => report.split(/^(?=## )/m).filter((s) => pages.some((p) => s.startsWith(`## ${p}.md `))).join('\n').trim() || 'none'
    let written
    try {
      written = agentBriefs(kind, state, readFileSync(join(root, skillDir, `${kind}-brief.md`), 'utf8'), out, section)
    } catch (err) {
      return fail((err as Error).message)
    }
    mkdirSync(out, { recursive: true })
    for (const b of written) writeFileSync(join(out, `${b.name}.md`), b.text)
    console.log([`## ${kind} briefs`, '', ...(written.length ? written.map((b) => `- ${join(out, `${b.name}.md`)}`) : ['- none'])].join('\n'))
    return
  }
  if (command === 'gate') {
    const wanted = flags.pages?.split(',').filter(Boolean)
    const criteria = gateCriteria(state.items, state.steps, state.run)
    const briefs: string[] = []
    for (const [page, list] of [...criteria].filter(([p]) => !wanted || wanted.includes(p))) {
      const path = `${pagesDir('guide')}/${page}.md`
      const old = showAt(sha, path)
      const now = existsSync(join(root, path)) ? readFileSync(join(root, path), 'utf8') : undefined
      if (!old || !now || old === now) {
        console.log(`skipped ${page}: ${!old ? 'new since the base' : !now ? 'gone from the run branch' : 'unchanged'}`)
        continue
      }
      const criterion = list.join('; ')
      const at = state.gate.findIndex((g) => g.page === page)
      const n = at < 0 ? state.gate.push({ page, criterion, votes: [] }) : at + 1
      state.gate[n - 1] = { page, criterion, votes: [] }
      briefs.push(writeJudge(out, `gate-${n}-1`, `X and Y are two versions of one page. Which better meets what its edit targeted: ${criterion}`, now, old))
    }
    writeYaml(statePath(out), state)
    console.log(['## Gate judges\' briefs (one sonnet judge per page)', '', ...(briefs.length ? briefs.map((b) => `- ${b}`) : ['- none'])].join('\n'))
    return
  }
  if (command === 'record') {
    const owed = [...state.gate.filter((g) => g.merged === undefined).map((g) => `gate on ${g.page}`), ...state.comparisons.filter((c) => c.votes.length && !c.result).map((c) => `comparison ${c.id}`)]
    if (owed.length) fail(`judges still owed: ${owed.join(', ')}`)
    const result: Tally = { grades: state.grades, items: state.items, steps: state.steps, comparisons: state.comparisons, waiting: state.waiting }
    const next = nextRecord(record, state.plan, current, result, runs, state.run)
    const meta = { run: state.run, base: sha, ...(flags.session ? { session: flags.session } : {}), ...(flags.pr ? { pr: Number(flags.pr) } : {}), ...(flags.cost ? { costUsd: Number(flags.cost) } : {}) }
    const entry = runEntry(meta, state.plan, result, state.gate as GateEntry[])
    // One line per lens record and edit, as in issue #2792's data shape.
    const doc = new Document(next)
    visit(doc, { Pair: (_, pair) => { if (isPair(pair) && isScalar(pair.key) && [...lenses, 'edited'].includes(String(pair.key.value)) && isMap(pair.value)) pair.value.flow = true } })
    writeFileSync(join(root, recordPath), doc.toString({ lineWidth: 0 }))
    writeYaml(join(root, runsPath), { runs: [entry, ...runs.filter((r) => r.run !== state.run)].slice(0, runsKept) })
    console.error(`wrote ${recordPath} and ${runsPath}`)
    return
  }
  fail(`unknown command ${command}; use plan, tally, gate, briefs, votes, record or drafts`)
})
