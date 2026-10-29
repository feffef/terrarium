// Checks a Glass Box page against the code at its `revision`, for the layer
// test and the glassbox-update Skill (issue #1994). A stale page passes; only a
// page wrong about what it cites fails.
import { globSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { splitFrontmatter } from '../../scripts/lib/frontmatter.ts'
import { tryGit } from '../../scripts/lib/git.ts'
import { parseDocument } from '../../scripts/gate/validate-content-schema.ts'
import { root } from '../../shared/expand.ts'
import { glassboxLessonIds, glassboxLessonLabels } from './app/utils/lesson.ts'
import { glassboxSubjectOf, glassboxSubjects, glassboxWalkthroughOf } from './app/utils/subjects.ts'
import { glassboxStopNumber } from './app/utils/walkthrough.ts'
import { glassboxExcerptGap, glassboxPageRefs, glassboxTermId, parseLineRanges, rangeText, type FileRef } from './page-refs.ts'

export interface GlassboxGit {
  /** Undefined when this clone can't tell (no such commit, or no `origin/main`): the git checks skip. */
  commit(rev: string): { date: string; onMain: boolean } | undefined
  /** A path ending `/` reads a folder's entry names. */
  read(rev: string, path: string): string | string[] | undefined
}

export const repoGit: GlassboxGit = {
  commit(rev) {
    const shown = tryGit(['show', '-s', '--format=%cI', `${rev}^{commit}`], root)
    // `--is-ancestor` exits 1 for "not an ancestor" and otherwise for anything it can't resolve.
    const { status } = tryGit(['merge-base', '--is-ancestor', rev, 'origin/main'], root)
    const date = shown.out.trim()
    return date && status <= 1 ? { date, onMain: status === 0 } : undefined
  },
  read(rev, path) {
    if (!path.endsWith('/')) {
      const blob = tryGit(['cat-file', 'blob', `${rev}:${path}`], root)
      return blob.ok ? blob.out : undefined
    }
    const tree = tryGit(['ls-tree', '--name-only', `${rev}:${path}`], root)
    return tree.ok ? tree.out.split('\n').filter(Boolean) : undefined
  },
}

export interface GlassboxSite {
  /** Every page's site path, in every Space, as `glassboxSitePath` gives them. */
  pages: string[]
  /** Site paths, as `glassboxJournalRoutes` gives them. */
  journal: string[]
  terms: string[]
  /** The repo paths each page cites, by site path, as `glassboxCites` gives them. */
  cites: Record<string, string[]>
  /** Each page's frontmatter `title`, by site path. */
  titles: Record<string, string>
}

// The most chips a stop holds and pages a Where next lists (GLOSSARY.md, Lesson and Walkthrough).
const cap = 5

/** Nuxt Content's route for a content file: two-digit prefixes and `index` dropped. */
function contentRoute(file: string) {
  return file.replace(/\.(md|vue)$/, '').split('/').map((s) => s.replace(/^\d+\./, '')).join('/').replace(/(^|\/)index$/, '')
}
const sitePath = (base: string, file: string) => (contentRoute(file) ? `${base}/${contentRoute(file)}` : base)

/** A Glass Box page's site path, from its Space and its file in that Space's `pages/`. */
export const glassboxSitePath = (space: string, file: string) => sitePath(`/t/glassbox/${space}`, file)

/** The repo paths each page cites, by site path, from its source by file in one Space. */
export function glassboxCites(sources: Record<string, string>, space: string): Record<string, string[]> {
  return Object.fromEntries(Object.entries(sources).map(([file, source]) =>
    [glassboxSitePath(space, file), glassboxPageRefs(splitFrontmatter(source).body).files.map((ref) => ref.path)]))
}

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

/** A stop's sentences before its `::stop-links`, counted by their end marks; none inside
 *  code, a "quote" or "e.g." counts (#2096). */
function stopSentences(text: string) {
  const prose = readBody(text.split(/^::stop-links/m)[0]!).prose.replace(/"[^"\n]*"/g, 'quote').replace(/\b(e\.g|i\.e)\./g, '$1')
  return prose.match(/[.!?](?=["')\]]*(\s|$))/g)?.length ?? 0
}

/** The Walkthrough entry in GLOSSARY.md: at least one `## N. Title` stop of 2–4 sentences, each with exactly one
 *  `::stop-links` block holding a link or `:file`, at most `cap` chips and no `:file` a Lesson
 *  it links cites. Outside a stop the block renders unstyled. */
export function glassboxStopProblems(body: string, walkthrough: boolean, cites: GlassboxSite['cites']): string[] {
  const stops = walkthrough ? readBody(body).sections.filter((s) => glassboxStopNumber(s.title)) : []
  const problems = walkthrough && !stops.length ? ['Walkthrough has no "## N. Title" stops'] : []
  let inStops = 0
  for (const s of stops) {
    const blocks = glassboxPageRefs(s.text).stopLinks
    inStops += blocks.length
    if (blocks.length !== 1) problems.push(`stop "${s.title}" has ${blocks.length} ::stop-links blocks, not 1`)
    else if (!blocks[0]!.links.length && !blocks[0]!.files.length) problems.push(`stop "${s.title}" links nothing in its ::stop-links block`)
    else {
      const { links, files, terms } = blocks[0]!
      const chips = links.length + files.length + terms.length
      if (chips > cap) problems.push(`stop "${s.title}" has ${chips} chips, more than ${cap}`)
      for (const { path } of files) {
        const by = links.find((link) => cites[link.replace(/\/$/, '')]?.includes(path))
        if (by) problems.push(`stop "${s.title}" repeats ${path}, which ${by} cites`)
      }
    }
    const sentences = stopSentences(s.text)
    if (sentences < 2 || sentences > 4) problems.push(`stop "${s.title}" has ${sentences} sentence(s), not 2 to 4`)
  }
  const stray = glassboxPageRefs(body).stopLinks.length - inStops
  if (stray) problems.push(`${stray} ::stop-links block(s) sit outside a Walkthrough stop`)
  return problems
}

/** The Excerpt's runs between gaps, the empty ones included. */
function excerptRuns(excerpt: string) {
  const runs: string[][] = [[]]
  for (const line of excerpt.split('\n')) {
    if (glassboxExcerptGap.test(line)) runs.push([])
    else runs.at(-1)!.push(line)
  }
  return runs
}

// With `lines`, Excerpt.vue numbers rows from both ends of the range, so the
// first run must open it and the last run close it.
function excerptFits(excerpt: string, file: string[], anchored: boolean) {
  const kept = excerptRuns(excerpt).filter((r) => r.length)
  let from = 0
  for (const [k, run] of kept.entries()) {
    const matches = (i: number) => run.every((line, j) => file[i + j] === line)
    const first = anchored && k === 0
    const last = anchored && k === kept.length - 1
    let i = last ? file.length - run.length : from
    if (first || last) {
      if (i < from || (first && i !== 0) || !matches(i)) return false
    } else {
      while (i + run.length <= file.length && !matches(i)) i++
      if (i + run.length > file.length) return false
    }
    from = i + run.length
  }
  return true
}

function fileProblems(ref: FileRef, rev: string, git: GlassboxGit): string[] {
  const found = git.read(rev, ref.path)
  if (found === undefined || (Array.isArray(found) && !found.length)) return [`${ref.path} does not exist at revision`]
  if (typeof found !== 'string') return []
  let lines = found.replace(/\n$/, '').split('\n')
  // One range per run: each run is exactly its range.
  if (ref.runs && ref.excerpt !== undefined) {
    const runs = excerptRuns(ref.excerpt).filter((r) => r.length)
    const fits = runs.length === ref.runs.length && ref.runs.every(({ start, end }, k) => {
      const prev = ref.runs![k - 1]
      return start >= 1 && end >= start && (!prev || start > prev.end) && end <= lines.length && lines.slice(start - 1, end).join('\n') === runs[k]!.join('\n')
    })
    return fits ? [] : [`the Excerpt of ${ref.path} does not match its ranges ${ref.runs.map(rangeText).join(',')} at revision`]
  }
  if (ref.lines) {
    const { start, end } = ref.lines
    if (start < 1 || end < start || end > lines.length) return [`${ref.path} lines ${start}-${end} do not fit its ${lines.length} lines`]
    lines = lines.slice(start - 1, end)
  }
  return ref.excerpt !== undefined && !excerptFits(ref.excerpt, lines, !!ref.lines) ? [`the Excerpt of ${ref.path} is not in the file at revision`] : []
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
  if (glassboxWalkthroughOf(`/${contentRoute(file)}`)) return []
  if (!glassboxSubjects.some((s) => s.slug === folder)) return [`folder ${folder}/ is not in the Subject map`]
  return /^\d{2}\./.test(rest.at(-1)!) ? [] : ['Lesson file has no two-digit prefix']
}

// The Lesson contract in GLOSSARY.md: these sections, in this order; the two under In Terrarium are h3.
const subsections: string[] = [glassboxLessonIds.why, glassboxLessonIds.watch]
// Why it's built this way explains each reason in a bullet of its own words (GLOSSARY.md, Lesson); drafts meet the bullet form and length bounds on promotion.
const adrCite = /ADR-(\d{4}) \(:file\[docs\/adr\/(\d{4})-[^\]\s]+\.md\]\)/g
const ownWords = { min: 12, max: 65 }

function lessonProblems(file: string, prose: string, space: string): string[] {
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
  const lines = prose.split('\n')
  const start = lines.findIndex((l) => /^### /.test(l) && glassboxTermId(l.slice(4)) === glassboxLessonIds.why)
  const end = lines.findIndex((l, i) => i > start && /^#{2,3} /.test(l))
  const items = start < 0 ? [] : lines.slice(start + 1, end < 0 ? undefined : end).join('\n').split(/\n\s*\n|\n(?=- )/).filter((p) => p.trim())
  for (const p of items) {
    if ([...p.matchAll(adrCite)].some((m) => m[1] !== m[2])) problems.push(`Why it's built this way cites an ADR by another ADR's file: ${p}`)
    const rest = p.replace(adrCite, '')
    if (/\bADR-\d{4}\b|docs\/adr\//.test(rest)) problems.push(`Why it's built this way cites an ADR not as "ADR-NNNN (:file[…])": ${p}`)
    if (space !== 'guide') continue
    if (!/^- \*\*[^*]+\*\*/.test(p)) problems.push(`Why it's built this way item is not a bullet that opens with a bold lead-in: ${p}`)
    const words = rest.replace(/:file\[[^\]]*\]/g, '').split(/\s+/).filter((w) => /\w/.test(w)).length
    if (words < ownWords.min || words > ownWords.max) problems.push(`Why it's built this way item has ${words} words of its own, not ${ownWords.min}-${ownWords.max}: ${p}`)
  }
  const fullReference = new RegExp(`^${glassboxLessonLabels.fullReference}:?\\s*\\[[^\\]]+\\]\\(https://`, 'm')
  if (!file.startsWith('terrarium-practice/') && !fullReference.test(prose)) problems.push('Lesson has no "Full reference" https link')
  return problems
}

// Where next holds the closest pages, any one Journal page last.
function nextProblems(prose: string): string[] {
  const lines = prose.split('\n')
  const at = lines.findIndex((l) => /^## /.test(l) && glassboxTermId(l.slice(3)) === glassboxLessonIds.whereNext)
  const next = at < 0 ? [] : lines.slice(at + 1).filter((l) => l.startsWith('- '))
  const problems = next.length > cap ? [`Where next lists ${next.length} pages, more than ${cap}`] : []
  if (next.slice(0, -1).some((l) => l.includes('](/t/journal'))) problems.push('Where next lists a Journal page before its end')
  return problems
}

// The landing shows each `title` as a card row and its `description` as the teaser under it (EVERY-PAGE.md, Pin).
const lengths = { lesson: { title: 28, description: 120 }, walkthrough: { title: 36, description: 140 } }
const lessonTitleWords = 4

function lengthProblems(route: string, frontmatter: Record<string, unknown>): string[] {
  const limit = glassboxSubjectOf(route) ? lengths.lesson : glassboxWalkthroughOf(route) ? lengths.walkthrough : undefined
  if (!limit) return []
  const words = String(frontmatter.title ?? '').split(/\s+/).filter(Boolean).length
  const wordProblems = glassboxSubjectOf(route) && words > lessonTitleWords ? [`title "${frontmatter.title}" is ${words} words, more than ${lessonTitleWords}`] : []
  return [...wordProblems, ...(['title', 'description'] as const).flatMap((field) => {
    const text = String(frontmatter[field] ?? '')
    return text.length > limit[field] ? [`${field} "${text}" is ${text.length} chars, more than ${limit[field]}`] : []
  })]
}

/** `file` is relative to its Space's `pages/`. */
export function glassboxPageProblems(file: string, source: string, site: GlassboxSite, git: GlassboxGit, space: string): string[] {
  const { frontmatter, body } = splitFrontmatter(source)
  const { prose } = readBody(body)
  const refs = glassboxPageRefs(body)
  const problems = placeProblems(file)
  const route = `/${contentRoute(file)}`
  problems.push(...glassboxStopProblems(body, glassboxWalkthroughOf(route), site.cites))
  if (glassboxSubjectOf(route)) problems.push(...lessonProblems(file, prose, space))
  if (glassboxSubjectOf(route) || glassboxWalkthroughOf(route)) problems.push(...nextProblems(prose))
  // Drafts are set aside (GLOSSARY.md, Two Spaces); a page moved to the guide meets its caps.
  if (space === 'guide') problems.push(...lengthProblems(route, frontmatter))

  const { revision, revisionDate } = frontmatter
  if (typeof revision === 'string') problems.push(...gitProblems(revision, revisionDate, refs.files, prose, git))
  else problems.push('no revision')

  const pages = new Set(site.pages)
  const journal = new Set(site.journal)
  const guide = glassboxSitePath('guide', 'index.md')
  for (const [, text, link] of prose.matchAll(/\[([^\]]*)\]\((\/t\/(?:glassbox\/[a-z0-9]+|journal)(?:\/[^)\s#?]*)?)/g)) {
    const path = link!.replace(/\/$/, '')
    // A link quoting its target's title goes stale when the title changes; lowercase text is running prose (#2114).
    const title = site.titles[path]
    if (space === 'guide' && title !== undefined && !/^[a-z]/.test(text!) && text !== title) problems.push(`link text "${text}" is not the title "${title}" of ${path}`)
    // The guide stands alone; drafts may lean on it (GLOSSARY.md, Two Spaces).
    if (space === 'guide' && path.startsWith('/t/glassbox/') && path !== guide && !path.startsWith(`${guide}/`)) problems.push(`guide page links outside the guide: ${link}`)
    else if (path.startsWith('/t/glassbox/') ? !pages.has(path) : !journal.has(path)) problems.push(`link ${link} resolves to no page`)
  }
  // With one range, Excerpt.vue numbers only the runs that touch its ends.
  for (const ref of refs.files) {
    const gaps = ref.excerpt?.split('\n').filter((l) => glassboxExcerptGap.test(l)).length ?? 0
    if (ref.lines && !ref.runs && gaps > 1) problems.push(`the Excerpt of ${ref.path} has ${gaps} gaps: give lines one range per run`)
    // Excerpt.vue counts runs from the gap lines, so none may be empty but the last.
    if (ref.runs && ref.excerpt !== undefined && excerptRuns(ref.excerpt).slice(0, -1).some((r) => !r.length)) problems.push(`the Excerpt of ${ref.path} opens with a gap or has two in a row`)
    // EVERY-PAGE.md, Excerpts teach: end on a whole statement.
    const last = ref.excerpt === undefined ? undefined : excerptRuns(ref.excerpt).flat().filter((l) => l.trim()).at(-1)
    if (last && /[{[(]\s*$/.test(last)) problems.push(`the Excerpt of ${ref.path} ends on an open bracket: end it on a whole statement`)
  }
  for (const [, a, b] of prose.matchAll(/\blines=(?:"([^"]*)"|'([^']*)')/g)) {
    if (!parseLineRanges(a ?? b)) problems.push(`lines="${a ?? b}" is not one or more comma-separated ranges`)
  }
  for (const id of refs.terms) if (!site.terms.includes(id)) problems.push(`:term ${id} has no entry in terms`)
  for (const [link] of prose.matchAll(/github\.com\/feffef\/terrarium\/(?:blob|tree)\/\S*/g)) problems.push(`hand-written link ${link}: use :file`)
  return problems
}

/** Every entry in the `terms` Collection, by id. */
export function glassboxTerms(projectRoot = root): Record<string, { source?: string }> {
  const dir = join(projectRoot, 'layers/glassbox/content/guide/terms')
  return Object.fromEntries(globSync('**/*.yml', { cwd: dir }).map((f) => [f.replace(/\.yml$/, ''), parseDocument(join(dir, f)) as { source?: string }]))
}

export function glassboxTermProblems(terms: Record<string, { source?: string }>, exists: (path: string) => boolean): string[] {
  return Object.entries(terms).filter(([, t]) => t.source && !exists(t.source)).map(([id, t]) => `term ${id}: source ${t.source} does not exist`)
}
