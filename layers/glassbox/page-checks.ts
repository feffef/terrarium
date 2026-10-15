// Checks a Glass Box page against the code at its `revision`, for the layer
// test and the glassbox-update Skill (issue #1994). A stale page passes; only a
// page wrong about what it cites fails.
import { execFileSync } from 'node:child_process'
import { globSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { splitFrontmatter } from '../../scripts/validate-content.ts'
import { root } from '../../shared/expand.ts'
import { glassboxLessonIds, glassboxLessonLabels } from './app/utils/lesson.ts'
import { glassboxSubjects } from './app/utils/subjects.ts'
import { glassboxStopNumber } from './app/utils/walkthrough.ts'
import { glassboxExcerptGap, glassboxPageRefs, glassboxTermId, type FileRef } from './page-refs.ts'

export interface GlassboxGit {
  /** Undefined when this clone can't tell (no such commit, or no `origin/main`): the git checks skip. */
  commit(rev: string): { date: string; onMain: boolean } | undefined
  /** A path ending `/` reads a folder's entry names. */
  read(rev: string, path: string): string | string[] | undefined
}

function git(args: string[]): { out?: string; status: number } {
  try {
    return { out: execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }), status: 0 }
  } catch (error) {
    return { status: (error as { status?: number }).status ?? -1 }
  }
}

export const repoGit: GlassboxGit = {
  commit(rev) {
    const date = git(['show', '-s', '--format=%cI', `${rev}^{commit}`]).out?.trim()
    // `--is-ancestor` exits 1 for "not an ancestor" and otherwise for anything it can't resolve.
    const { status } = git(['merge-base', '--is-ancestor', rev, 'origin/main'])
    return date && status <= 1 ? { date, onMain: status === 0 } : undefined
  },
  read(rev, path) {
    if (!path.endsWith('/')) return git(['cat-file', 'blob', `${rev}:${path}`]).out
    return git(['ls-tree', '--name-only', `${rev}:${path}`]).out?.split('\n').filter(Boolean)
  },
}

export interface GlassboxSite {
  /** Relative to `layers/glassbox/content/guide/pages/`. */
  pages: string[]
  /** Site paths, as `glassboxJournalRoutes` gives them. */
  journal: string[]
  terms: string[]
}

/** Nuxt Content's route for a content file: two-digit prefixes and `index` dropped. */
function contentRoute(file: string) {
  return file.replace(/\.(md|vue)$/, '').split('/').map((s) => s.replace(/^\d+\./, '')).join('/').replace(/(^|\/)index$/, '')
}
const sitePath = (base: string, file: string) => (contentRoute(file) ? `${base}/${contentRoute(file)}` : base)

/** Every Journal page a link may reach: its content pages and its own Vue routes, in each Space. */
export function glassboxJournalRoutes(projectRoot = root) {
  const journal = join(projectRoot, 'layers/journal')
  const vue = globSync('*.vue', { cwd: join(journal, 'app/pages/t/journal/[space]') }).filter((f) => !f.startsWith('['))
  return readdirSync(join(journal, 'content')).flatMap((space) => [
    ...globSync('**/*.md', { cwd: join(journal, 'content', space, 'pages') }),
    ...vue,
  ].map((file) => sitePath(`/t/journal/${space}`, file)))
}

/** The body outside fenced and inline code, and its h2 sections (raw, for `glassboxPageRefs`). */
function readBody(body: string) {
  let fence: string | undefined
  const prose: string[] = []
  const sections: { title: string; text: string[] }[] = []
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim()
    const opens = trimmed.match(/^(`{3,}|~{3,})/)?.[1]
    const inFence = fence !== undefined || opens !== undefined
    if (fence !== undefined && trimmed.startsWith(fence) && !trimmed.slice(fence.length).trim()) fence = undefined
    else if (fence === undefined && opens) fence = opens
    prose.push(inFence ? '' : line.replace(/(`+)[^`]*?\1/g, ''))
    const h2 = inFence ? undefined : line.match(/^## (.+)$/)
    if (h2) sections.push({ title: h2[1]!.trim(), text: [] })
    else sections.at(-1)?.text.push(line)
  }
  return { prose: prose.join('\n'), sections: sections.map((s) => ({ title: s.title, text: s.text.join('\n') })) }
}

/** The Walkthrough entry in GLOSSARY.md: at least one `## N. Title` stop, each with exactly one
 *  `::stop-links` block holding a link or `:file`. Outside a stop the block renders unstyled. */
export function glassboxStopProblems(body: string, walkthrough: boolean): string[] {
  const stops = walkthrough ? readBody(body).sections.filter((s) => glassboxStopNumber(s.title)) : []
  const problems = walkthrough && !stops.length ? ['Walkthrough has no "## N. Title" stops'] : []
  let inStops = 0
  for (const s of stops) {
    const blocks = glassboxPageRefs(s.text).stopLinks
    inStops += blocks.length
    if (blocks.length !== 1) problems.push(`stop "${s.title}" has ${blocks.length} ::stop-links blocks, not 1`)
    else if (!blocks[0]!.links.length && !blocks[0]!.files.length) problems.push(`stop "${s.title}" links nothing in its ::stop-links block`)
  }
  const stray = glassboxPageRefs(body).stopLinks.length - inStops
  if (stray) problems.push(`${stray} ::stop-links block(s) sit outside a Walkthrough stop`)
  return problems
}

function excerptFits(excerpt: string, file: string[]) {
  let from = 0
  const runs: string[][] = [[]]
  for (const line of excerpt.split('\n')) {
    if (glassboxExcerptGap.test(line)) runs.push([])
    else runs.at(-1)!.push(line)
  }
  for (const run of runs.filter((r) => r.length)) {
    let i = from
    while (i + run.length <= file.length && run.some((line, j) => file[i + j] !== line)) i++
    if (i + run.length > file.length) return false
    from = i + run.length
  }
  return true
}

function fileProblems(ref: FileRef, rev: string, git: GlassboxGit): string[] {
  const found = git.read(rev, ref.path)
  if (found === undefined || (Array.isArray(found) && !found.length)) return [`${ref.path} does not exist at revision`]
  if (typeof found !== 'string') return []
  let lines = found.replace(/\n$/, '').split('\n')
  if (ref.lines) {
    const { start, end } = ref.lines
    if (start < 1 || end < start || end > lines.length) return [`${ref.path} lines ${start}-${end} do not fit its ${lines.length} lines`]
    lines = lines.slice(start - 1, end)
  }
  return ref.excerpt !== undefined && !excerptFits(ref.excerpt, lines) ? [`the Excerpt of ${ref.path} is not in the file at revision`] : []
}

function gitProblems(revision: string, revisionDate: unknown, refs: FileRef[], prose: string, git: GlassboxGit): string[] {
  const commit = git.commit(revision)
  if (!commit) return [] // a shallow clone; CI fetches full history
  const problems: string[] = []
  if (!commit.onMain) problems.push(`revision ${revision} is not on main`)
  if (commit.date.slice(0, 10) !== revisionDate) problems.push(`revisionDate ${revisionDate} is not the revision's date ${commit.date.slice(0, 10)}`)
  for (const ref of refs) problems.push(...fileProblems(ref, revision, git))
  const adrs = git.read(revision, 'docs/adr/')
  for (const [, n] of prose.matchAll(/\bADR-(\d{4})\b/g)) {
    if (!Array.isArray(adrs) || !adrs.some((name) => name.startsWith(`${n}-`))) problems.push(`ADR-${n} does not exist at revision`)
  }
  return problems
}

function placeProblems(file: string): string[] {
  const [folder, ...rest] = file.split('/')
  if (!rest.length) return file === 'index.md' ? [] : ['sits outside a Subject folder']
  if (folder === 'walkthroughs') return []
  if (!glassboxSubjects.some((s) => s.slug === folder)) return [`folder ${folder}/ is not in the Subject map`]
  return /^\d{2}\./.test(rest.at(-1)!) ? [] : ['Lesson file has no two-digit prefix']
}

// The Lesson contract in GLOSSARY.md: these sections, in this order; the two under In Terrarium are h3.
const subsections: string[] = [glassboxLessonIds.why, glassboxLessonIds.watch]

function lessonProblems(file: string, prose: string): string[] {
  const headings = [...prose.matchAll(/^(#{2,3}) (.+)$/gm)].map((m) => ({ level: m[1]!.length, id: glassboxTermId(m[2]!) }))
  const problems: string[] = []
  let last = -1
  for (const id of Object.values(glassboxLessonIds)) {
    const level = subsections.includes(id) ? 3 : 2
    const i = headings.findIndex((h) => h.id === id && h.level === level)
    if (i < 0) problems.push(`Lesson has no h${level} #${id}`)
    else if (i < last) problems.push(`Lesson section #${id} is out of order`)
    else last = i
  }
  const fullReference = new RegExp(`^${glassboxLessonLabels.fullReference}:?\\s*\\[[^\\]]+\\]\\(https://`, 'm')
  if (!file.startsWith('terrarium-practice/') && !fullReference.test(prose)) problems.push('Lesson has no "Full reference" https link')
  return problems
}

export function glassboxPageProblems(file: string, source: string, site: GlassboxSite, git: GlassboxGit): string[] {
  const { frontmatter, body } = splitFrontmatter(source)
  const { prose } = readBody(body)
  const refs = glassboxPageRefs(body)
  const problems = placeProblems(file)
  const folder = file.split('/')[0]
  problems.push(...glassboxStopProblems(body, folder === 'walkthroughs'))
  if (glassboxSubjects.some((s) => s.slug === folder)) problems.push(...lessonProblems(file, prose))

  const { revision, revisionDate } = frontmatter
  if (typeof revision === 'string') problems.push(...gitProblems(revision, revisionDate, refs.files, prose, git))
  else problems.push('no revision')

  const pages = new Set(site.pages.map((p) => sitePath('/t/glassbox/guide', p)))
  const journal = new Set(site.journal)
  for (const [, link] of prose.matchAll(/\]\((\/t\/(?:glassbox\/guide|journal)(?:\/[^)\s#?]*)?)/g)) {
    const path = link!.replace(/\/$/, '')
    if (path.startsWith('/t/glassbox/') ? !pages.has(path) : !journal.has(path)) problems.push(`link ${link} resolves to no page`)
  }
  for (const id of refs.terms) if (!site.terms.includes(id)) problems.push(`:term ${id} has no entry in terms`)
  for (const [link] of prose.matchAll(/github\.com\/feffef\/terrarium\/(?:blob|tree)\/\S*/g)) problems.push(`hand-written link ${link}: use :file`)
  return problems
}

export function glassboxTermProblems(terms: Record<string, { source?: string }>, exists: (path: string) => boolean): string[] {
  return Object.entries(terms).filter(([, t]) => t.source && !exists(t.source)).map(([id, t]) => `term ${id}: source ${t.source} does not exist`)
}
