// Checks a Glass Box page against the code at its `revision` (issue #1994).
// A stale page passes; only a page wrong about what it cites fails.
import { execFileSync } from 'node:child_process'
import { splitFrontmatter } from '../../../scripts/validate-content.ts'
import { root } from '../../../shared/expand.ts'
import { glassboxLessonIds, glassboxLessonLabels } from '../app/utils/lesson.ts'
import { glassboxSubjects } from '../app/utils/subjects.ts'
import { glassboxPageRefs, type FileRef } from '../page-refs.ts'

export interface GlassboxGit {
  /** The commit's `%cI` date and whether `main` holds it; undefined when this clone lacks it. */
  commit(rev: string): { date: string; onMain: boolean } | undefined
  /** A file's text at `rev`, a folder's entry names (path ending `/`), or undefined. */
  read(rev: string, path: string): string | string[] | undefined
}

function tryGit(args: string[]) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    return undefined
  }
}

export const repoGit: GlassboxGit = {
  commit(rev) {
    const date = tryGit(['show', '-s', '--format=%cI', `${rev}^{commit}`])?.trim()
    if (!date) return undefined
    return { date, onMain: tryGit(['merge-base', '--is-ancestor', rev, 'origin/main']) !== undefined }
  },
  read(rev, path) {
    if (!path.endsWith('/')) return tryGit(['cat-file', 'blob', `${rev}:${path}`])
    return tryGit(['ls-tree', '--name-only', `${rev}:${path}`])?.split('\n').filter(Boolean)
  },
}

export interface GlassboxSite {
  /** Every page file, relative to `layers/glassbox/content/guide/pages/`. */
  pages: string[]
  /** Every Journal page file, relative to `layers/journal/content/` (`current/pages/index.md`). */
  journal: string[]
  /** Every `terms` entry id. */
  terms: string[]
}

/** Nuxt Content's route for a content file: two-digit prefixes and `index` dropped. */
function route(file: string) {
  return file.replace(/\.md$/, '').split('/').map((s) => s.replace(/^\d+\./, '')).join('/').replace(/(^|\/)index$/, '')
}
const at = (base: string, file: string) => (route(file) ? `${base}/${route(file)}` : base)

/** The body's lines with fenced code blanked, and its h2 sections. */
function scan(body: string) {
  let fence: string | undefined
  const prose: string[] = []
  const sections: { title: string; text: string[] }[] = []
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim()
    const opens = trimmed.match(/^(`{3,}|~{3,})/)?.[1]
    const inFence = fence !== undefined || opens !== undefined
    if (fence !== undefined && trimmed.startsWith(fence) && !trimmed.slice(fence.length).trim()) fence = undefined
    else if (fence === undefined && opens) fence = opens
    prose.push(inFence ? '' : line)
    const h2 = inFence ? undefined : line.match(/^## (.+)$/)
    if (h2) sections.push({ title: h2[1]!.trim(), text: [] })
    else sections.at(-1)?.text.push(line)
  }
  return { prose: prose.join('\n'), sections: sections.map((s) => ({ title: s.title, text: s.text.join('\n') })) }
}

/** A Walkthrough's stops are `## N. Title` h2s, each with one `::stop-links` block that links somewhere. */
export function glassboxStopProblems(body: string): string[] {
  return scan(body).sections.filter((s) => /^\d+\.\s/.test(s.title)).flatMap((s) => {
    const blocks = glassboxPageRefs(s.text).stopLinks
    if (blocks.length !== 1) return [`stop "${s.title}" has ${blocks.length} ::stop-links blocks, not 1`]
    return blocks[0]!.links.length + blocks[0]!.files.length ? [] : [`stop "${s.title}" links nothing in its ::stop-links block`]
  })
}

const headingId = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s/g, '-')
const gapLine = /^\s*(?:\/\/|#|--|\/\*|<!--)\s*…\s*(?:\*\/|-->)?\s*$/

/** Whether the Excerpt's runs between `…` lines appear, in order, in `file`. */
function excerptFits(excerpt: string, file: string[]) {
  let from = 0
  const runs: string[][] = [[]]
  for (const line of excerpt.split('\n')) {
    if (gapLine.test(line)) runs.push([])
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

function lessonProblems(file: string, prose: string): string[] {
  const ids = new Set([...prose.matchAll(/^#{2,3} (.+)$/gm)].map((m) => headingId(m[1]!)))
  const problems = Object.values(glassboxLessonIds).filter((id) => !ids.has(id)).map((id) => `Lesson has no #${id} heading`)
  const fullReference = new RegExp(`^${glassboxLessonLabels.fullReference}:?\\s*\\[[^\\]]+\\]\\(https://`, 'm')
  if (!file.startsWith('terrarium-practice/') && !fullReference.test(prose)) problems.push('Lesson has no "Full reference" https link')
  return problems
}

/** Every way a page is wrong about what it cites, or empty. */
export function glassboxPageProblems(file: string, source: string, site: GlassboxSite, git: GlassboxGit): string[] {
  const { frontmatter, body } = splitFrontmatter(source)
  const { prose } = scan(body)
  const refs = glassboxPageRefs(body)
  const problems = placeProblems(file)
  const folder = file.split('/')[0]
  if (folder === 'walkthroughs') problems.push(...glassboxStopProblems(body))
  else if (glassboxSubjects.some((s) => s.slug === folder)) problems.push(...lessonProblems(file, prose))

  const { revision, revisionDate } = frontmatter
  if (typeof revision === 'string') problems.push(...gitProblems(revision, revisionDate, refs.files, prose, git))
  else problems.push('no revision')

  const pages = new Set(site.pages.map((p) => at('/t/glassbox/guide', p)))
  const journal = new Set(site.journal.map((p) => {
    const [space, , ...rest] = p.split('/')
    return at(`/t/journal/${space}`, rest.join('/'))
  }))
  for (const [, link] of prose.matchAll(/\]\((\/t\/(?:glassbox\/guide|journal)(?:\/[^)\s#?]*)?)/g)) {
    const path = link!.replace(/\/$/, '')
    if (path.startsWith('/t/glassbox/') ? !pages.has(path) : !journal.has(path)) problems.push(`link ${link} resolves to no page`)
  }
  for (const id of refs.terms) if (!site.terms.includes(id)) problems.push(`:term ${id} has no entry in terms`)
  for (const [link] of prose.matchAll(/github\.com\/feffef\/terrarium\/(?:blob|tree)\/\S*/g)) problems.push(`hand-written link ${link}: use :file`)
  return problems
}

/** Every term whose `source` glossary does not exist. */
export function glassboxTermProblems(terms: Record<string, { source?: string }>, exists: (path: string) => boolean): string[] {
  return Object.entries(terms).filter(([, t]) => t.source && !exists(t.source)).map(([id, t]) => `term ${id}: source ${t.source} does not exist`)
}
