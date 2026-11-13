// The orientation step of glassbox-curate. It prints the run's state and writes every guide
// page's entry to a file the run reads whole: the run reads its own Subject in full
// (`--subject`), so an entry need only say what every other page teaches.
// Usage: pnpm exec tsx .agents/skills/glassbox-curate/scripts/orient.ts [--subject <folder> | --index]
// `--index` is for a new Lesson (glassbox-lesson): the open PRs and the guide index files, without the run's state.
import { existsSync, globSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { fail, flagValue, root, runIfMain } from '../../../../scripts/lib/cli.ts'
import { tryGit } from '../../../../scripts/lib/git.ts'
import { splitFrontmatter } from '../../../../scripts/lib/frontmatter.ts'
import { listAll, resolveAccess } from '../../../../scripts/lib/github-client.ts'
import { glassboxWorkshopWordCap, glassboxWorkshopWords } from '../../../../layers/glassbox/app/utils/workshop.ts'
import { glassboxFewNextLinks, glassboxFewNextText, glassboxMotiveWarning, glassboxOrphans, glassboxGlossaryWords, glassboxOrphanText, glassboxPageWarnings } from '../../../../layers/glassbox/page-checks.ts'

const content = 'layers/glassbox/content'
// The churn guard looks back this many runs (SKILL.md).
const recentRuns = 5

/** Text with its MDC and link markup reduced to the words a reader sees. */
const plainText = (s: string) => s.replace(/:\w+\[([^\]]*)\](\{[^}]*\})?/g, '$1').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[.,:;]+$/, '')

/** The guide pages a line links, by path under the guide: where a shared point may have its home. */
const guideLinks = (line: string) => [...new Set([...line.matchAll(/\]\(\/t\/glassbox\/guide\/([^)#]+)/g)].map((m) => m[1]!))]

/** The bold lead-in of each bullet in the `### <heading>` section of `body`, with the guide pages it links. */
function leadIns(body: string, heading: string): { lead: string; links: string[] }[] {
  const lines = body.split('\n')
  const at = lines.indexOf(`### ${heading}`)
  if (at < 0) return []
  const end = lines.findIndex((l, i) => i > at && /^#{2,3} /.test(l))
  return lines.slice(at + 1, end < 0 ? undefined : end).flatMap((l) => {
    const lead = /^- \*\*(.+?)\*\*/.exec(l)?.[1]
    return lead ? [{ lead: plainText(lead), links: guideLinks(l) }] : []
  })
}

/** Each numbered stop of a Walkthrough, with the titles of the Lessons its `::lessons` row links. */
function stops(body: string): string[] {
  return body.split(/^## \d+\. /m).slice(1).map((part) => {
    const [heading = '', ...rest] = part.split('\n')
    const row = rest.join('\n').match(/^::lessons\n(.*)$/m)?.[1] ?? ''
    const lessons = [...row.matchAll(/\[([^\]]+)\]\(\/t\/glassbox\//g)].map((m) => m[1])
    return `${plainText(heading)}${lessons.length ? ` [${lessons.join(', ')}]` : ''}`
  })
}

/** A guide page's URL path under the guide, from its stem: the `NN.` order prefixes dropped. */
export const guidePath = (stem: string) => stem.replace(/(^|\/)\d+\./g, '$1')

/** What a curate run last knows of a page: when a run last read it in full, and when glassbox-update last fully checked it. */
export interface PageDates { read?: string; checked?: string }

/** One page's entry: its stem, title, description and dates, then what it teaches, its Why and watch lead-ins, or a Walkthrough's stops. */
export function pageOverview(stem: string, source: string, titles: Record<string, string> = {}, dates: PageDates = {}): string {
  const { frontmatter, body } = splitFrontmatter(source)
  const titled = (items: { lead: string; links: string[] }[]) =>
    items.map(({ lead, links }) => `${lead}${links.length ? ` → ${links.map((p) => titles[p] ?? p).join(', ')}` : ''}`)
  const sections = [
    ['Teaches', frontmatter.teaches ? [String(frontmatter.teaches)] : []],
    ['Stops', stops(body)],
    ['Why', titled(leadIns(body, "Why it's built this way"))],
    ['Watch', titled(leadIns(body, 'What to watch for'))],
  ] as const
  return [
    `- ${stem}: ${String(frontmatter.title)}. ${String(frontmatter.description)} [read ${dates.read ?? 'never'} · checked ${dates.checked ?? 'never'}]`,
    ...sections.filter(([, items]) => items.length).map(([label, items]) => `  ${label}: ${items.join(' · ')}`),
  ].join('\n')
}

/** Each file under `dir` matching `pattern`, sorted, as [path under dir, text]. */
const files = (dir: string, pattern: string): [string, string][] =>
  existsSync(dir) ? globSync(pattern, { cwd: dir }).sort().map((f) => [f, readFileSync(join(dir, f), 'utf8')]) : []

/** Commits to the guide since `since` (ISO time), or their last 30 when no run has happened yet. */
export function guideLog(since: string | undefined): string {
  const r = tryGit(['log', '--oneline', '--no-merges', ...(since ? [`--since=${since}`] : ['-n', '30']), '--', `${content}/guide`], root)
  return r.ok ? r.out : '(git log failed)'
}

/** A guide page's stem, or a path under `layers/glassbox/`, so a PR that touches every page stays short. */
export const shortPath = (path: string) => path.replace(/^layers\/glassbox\/(content\/guide\/pages\/)?/, '').replace(/\.md$/, '')

/** Each open PR that touches `layers/glassbox/`, with those files; a line saying the lookup failed otherwise. */
export function openGlassboxPrs(): string {
  try {
    const access = resolveAccess(root)
    return listAll<{ number: number; title: string }>(access, 'pulls', { state: 'open' })
      .map((pr) => [pr, listAll<{ filename: string }>(access, `pulls/${pr.number}/files`).map((f) => f.filename).filter((f) => f.startsWith('layers/glassbox/')).map(shortPath)] as const)
      .filter(([, touched]) => touched.length)
      .map(([pr, touched]) => `- #${pr.number} ${pr.title}: ${touched.join(', ')}`)
      .join('\n') || '(none)'
  } catch (err) {
    return `(lookup failed, list open PRs yourself: ${err instanceof Error ? err.message : String(err)})`
  }
}

/** A run entry's file stem, `2026-11-06T0930`, as an ISO time: the entry's shape has no date field. */
const runStart = (stem: string) => `${stem.slice(0, 13)}:${stem.slice(13, 15)}:00Z`

/** `now` as a run entry's file stem. */
export const runStem = (now: Date) => now.toISOString().slice(0, 16).replace(':', '')

/** "In Terrarium may give a motive" warnings, which are mostly fine (writing-pages.md), as one count per page; the rest in full. */
export function warningLines(byFile: [string, string[]][]): string[] {
  const motives = byFile.map(([f, ws]) => [f, ws.filter((w) => w.startsWith(glassboxMotiveWarning)).length] as const).filter(([, n]) => n)
  return [
    ...byFile.flatMap(([f, ws]) => ws.filter((w) => !w.startsWith(glassboxMotiveWarning)).map((w) => `- ${f}: ${w}`)),
    ...(motives.length ? [`- ${glassboxMotiveWarning}: ${motives.map(([f, n]) => `${f} ×${n}`).join(', ')}`] : []),
  ]
}

const section = (title: string, body: string) => `# ${title}\n\n${body.trim() || '(none)'}`

/** Where the CLI writes the guide index: git-ignored, and outside the output so neither part outgrows its tool. */
const guideIndexDir = '.throwaway/glassbox-curate'

// A tool result above about 30 KB is saved to a file and shown as a preview, and runs then worked
// from a cut orientation (Journal Friction orient-output-truncates).
const inlineCap = 25_000
// Read stops at 25,000 tokens, and the index's code names run near 2.5 bytes a token, so one 66 KB file was cut off.
const indexPartCap = 40_000

const guideKey = [
  'Each page: `- stem: Title. description [read <date> · checked <date>]`. `read` is the last curate run whose pagesRead lists it, `checked` the last glassbox-update full check.',
  'Then, where the page has them: Teaches, what it covers beyond its lead-ins; Why and Watch, the bold lead-ins of its "Why it\'s built this way" and "What to watch for" bullets, with → the guide pages a bullet links; Stops, a Walkthrough\'s stops, with [the Lessons each links].',
].join('\n')

/** Each renamed guide page's old stem and its new one, oldest rename first, so a run entry's pagesRead finds the page as it is named now. */
export function guideRenames(): [string, string][] {
  const r = tryGit(['log', '--reverse', '--format=', '--name-status', '-M', '--diff-filter=R', '--', `${content}/guide/pages`], root)
  if (!r.ok) return []
  return r.out.split('\n').flatMap((l) => {
    const [, from, to] = l.split('\t')
    return from && to ? [[shortPath(from), shortPath(to)] as [string, string]] : []
  })
}

/** Every guide page's entry, under the key that says how to read one, in parts of at most `partCap` bytes so each fits one Read. */
export function guideIndex(base = join(root, content), renames = guideRenames, partCap = indexPartCap): string[] {
  const renamed = new Map<string, string>()
  for (const [from, to] of renames()) {
    for (const [old, now] of renamed) if (now === from) renamed.set(old, to)
    renamed.set(from, to)
  }
  const guide = files(join(base, 'guide/pages'), '**/*.md')
  const titles = Object.fromEntries(guide.map(([f, t]) => [guidePath(f.replace(/\.md$/, '')), String(splitFrontmatter(t).frontmatter.title)]))
  const dates: Record<string, PageDates> = {}
  for (const [f, t] of files(join(base, 'workshop/runs'), '*.yml')) {
    for (const page of (parseYaml(t)?.pagesRead ?? []) as string[]) (dates[renamed.get(page) ?? page] ??= {}).read = f.slice(0, 10)
  }
  for (const [, t] of files(join(base, 'workshop/checks'), '*.yml')) {
    for (const { page, checked } of (parseYaml(t)?.pages ?? []) as { page: string; checked: string }[]) (dates[page] ??= {}).checked = checked
  }
  const parts: string[][] = [[]]
  let size = 0
  for (const [f, t] of guide) {
    const stem = f.replace(/\.md$/, '')
    const entry = pageOverview(stem, t, titles, dates[stem])
    if (size && size + entry.length > partCap) {
      parts.push([])
      size = 0
    }
    parts.at(-1)!.push(entry)
    size += entry.length + 1
  }
  return parts.map((entries, i) => section(`Guide pages, part ${i + 1} of ${parts.length}`, [guideKey, '', ...entries].join('\n')))
}

/** A run entry without its pagesRead list, which the guide index's `read` dates carry. */
const runSummary = (text: string) => {
  const { pagesRead: _, ...entry } = parseYaml(text) ?? {}
  return stringifyYaml(entry).trim()
}

/** A guide index file the orientation wrote. */
type IndexFile = { path: string; bytes: number }

const guideIndexSection = (index: IndexFile[]) =>
  section('Guide pages', [`Every page's entry is in these files. Read each whole, one Read per file, never through head:`, ...index.map((f) => `- ${f.path} (${Math.round(f.bytes / 1000)} KB)`)].join('\n'))

/** What a new Lesson needs from the orientation: the open Glass Box PRs and the guide index files. */
export function indexOrientation(index: IndexFile[], prs = openGlassboxPrs): string {
  return [section('Open PRs that touch Glass Box', prs()), guideIndexSection(index)].join('\n\n')
}

export function orientation(base = join(root, content), { log = guideLog, prs = openGlassboxPrs, now = new Date(), index = [] as IndexFile[], words = glassboxGlossaryWords } = {}): string {
  const guide = files(join(base, 'guide/pages'), '**/*.md')
  const runs = files(join(base, 'workshop/runs'), '*.yml').reverse()
  const memory = files(join(base, 'workshop/pages'), 'index.md')[0]?.[1] ?? ''
  const memoryBody = splitFrontmatter(memory).body
  const glossary = words()
  const warnings = [
    ...warningLines(guide.map(([f, text]) => [f, glassboxPageWarnings(text, glossary)])),
    ...glassboxOrphans(Object.fromEntries(guide)).map((f) => `- ${f}: ${glassboxOrphanText}`),
    ...glassboxFewNextLinks(Object.fromEntries(guide)).map(({ file, count }) => `- ${file}: ${glassboxFewNextText(count)}`),
  ]
  const skeleton = ['session: <this session id>', 'mode: <autonomous or interactive>', 'focus: "<what you take on, and why>"', 'changes: []', 'pagesRead: []']
  const out = [
    section('Run entry', [`Write it to ${content}/workshop/runs/${runStem(now)}.yml when you claim the focus:`, '', ...skeleton.map((l) => `    ${l}`)].join('\n')),
    section('Open PRs that touch Glass Box', prs()),
    section(`Memory page (${glassboxWorkshopWords(memoryBody)} of ${glassboxWorkshopWordCap.toLocaleString('en-US')} words)`, memoryBody),
    section(`Last ${recentRuns} curate runs, newest first`, runs.slice(0, recentRuns).map(([f, t]) => `## ${f}\n\n${runSummary(t)}`).join('\n\n')),
    section('Page-check warnings', warnings.join('\n')),
    section(runs.length ? 'Guide changes since the last curate run' : 'Last 30 guide changes (no curate run yet)', log(runs[0] ? runStart(runs[0][0]) : undefined)),
    guideIndexSection(index),
  ].join('\n\n')
  const bytes = Buffer.byteLength(out)
  return `${out}\n\n(This output: ${Math.round(bytes / 1000)} KB.${bytes > inlineCap ? ` Over ${inlineCap / 1000} KB: a tool may cut it, so shorten a section before it grows further.` : ''})`
}

/** Every page of one Subject's folder (or `walkthroughs`) in full, then the `pagesRead` lines they make. */
export function subjectPages(subject: string, base = join(root, content)): string {
  const pages = files(join(base, 'guide/pages', subject), '*.md')
  if (!pages.length) throw new Error(`no guide pages under "${subject}"; a Subject is a folder of ${content}/guide/pages`)
  const stems = pages.map(([f]) => `${subject}/${f.replace(/\.md$/, '')}`)
  return [
    ...pages.map(([, t], i) => `# ${stems[i]}\n\n${t.trim()}`),
    section('pagesRead for these pages', ['pagesRead:', ...stems.map((s) => `  - ${s}`)].join('\n')),
  ].join('\n\n')
}

runIfMain(import.meta.url, () => {
  const subject = flagValue(process.argv, '--subject')
  if (process.argv.includes('--subject') && !subject) fail('--subject needs a Subject folder, such as git-github')
  try {
    if (subject) return void process.stdout.write(`${subjectPages(subject)}\n`)
    const dir = join(root, guideIndexDir)
    rmSync(dir, { recursive: true, force: true })
    mkdirSync(dir, { recursive: true })
    const index = guideIndex().map((text, i) => {
      const path = `${guideIndexDir}/guide-pages-${i + 1}.md`
      writeFileSync(join(root, path), `${text}\n`)
      return { path, bytes: Buffer.byteLength(text) }
    })
    process.stdout.write(`${process.argv.includes('--index') ? indexOrientation(index) : orientation(undefined, { index })}\n`)
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
})
