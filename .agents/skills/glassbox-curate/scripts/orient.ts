// The orientation step of glassbox-curate, in one output a run reads whole. Each
// guide page shows as its title and description only: the run reads its own Subject
// in full (`--subject`), so the overview need only say what every other page teaches.
// Usage: pnpm exec tsx .agents/skills/glassbox-curate/scripts/orient.ts [--subject <folder>]
import { existsSync, globSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fail, flagValue, root, runIfMain } from '../../../../scripts/lib/cli.ts'
import { tryGit } from '../../../../scripts/lib/git.ts'
import { splitFrontmatter } from '../../../../scripts/lib/frontmatter.ts'
import { listAll, resolveAccess } from '../../../../scripts/lib/github-client.ts'
import { glassboxMotiveWarning, glassboxOrphans, glassboxOrphanText, glassboxPageWarnings } from '../../../../layers/glassbox/page-checks.ts'

const content = 'layers/glassbox/content'
// The churn guard looks back this many runs (SKILL.md).
const recentRuns = 5

/** Text with its MDC and link markup reduced to the words a reader sees. */
const plainText = (s: string) => s.replace(/:\w+\[([^\]]*)\](\{[^}]*\})?/g, '$1').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[.,:;]+$/, '')

/** The guide pages a line links, by path under the guide: where a shared point may have its home. */
const guideLinks = (line: string) => [...new Set([...line.matchAll(/\]\(\/t\/glassbox\/guide\/([^)#]+)/g)].map((m) => m[1]!))]

/** The bold lead-in of each bullet in the `### <heading>` section of `body`, with the guide pages it links. */
function leadIns(body: string, heading: string): string[] {
  const lines = body.split('\n')
  const at = lines.indexOf(`### ${heading}`)
  if (at < 0) return []
  const end = lines.findIndex((l, i) => i > at && /^#{2,3} /.test(l))
  return lines.slice(at + 1, end < 0 ? undefined : end).flatMap((l) => {
    const lead = /^- \*\*(.+?)\*\*/.exec(l)?.[1]
    if (!lead) return []
    const links = guideLinks(l)
    return [`${plainText(lead)}${links.length ? ` → ${links.join(', ')}` : ''}`]
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

/** One page's line: its stem, title and description, then its Why and watch lead-ins, or a Walkthrough's stops. */
export function pageOverview(stem: string, source: string): string {
  const { frontmatter, body } = splitFrontmatter(source)
  const extra = [['Stops', stops(body)],['Why', leadIns(body, "Why it's built this way")], ['Watch', leadIns(body, 'What to watch for')]] as const
  return [
    `- ${stem}: ${String(frontmatter.title)}. ${String(frontmatter.description)}`,
    ...extra.filter(([, items]) => items.length).map(([label, items]) => `  ${label}: ${items.join(' · ')}`),
  ].join('\n')
}

/** Each file under `dir` matching `pattern`, sorted, as [path under dir, text]. */
const files = (dir: string, pattern: string): [string, string][] =>
  existsSync(dir) ? globSync(pattern, { cwd: dir }).sort().map((f) => [f, readFileSync(join(dir, f), 'utf8')]) : []

/** Commits to the guide and drafts since `since` (ISO time), or their last 30 when no run has happened yet. */
export function guideLog(since: string | undefined): string {
  const r = tryGit(['log', '--oneline', '--no-merges', ...(since ? [`--since=${since}`] : ['-n', '30']), '--', `${content}/guide`, `${content}/drafts`], root)
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

/** "In Terrarium may give a motive" warnings, which are mostly fine (EVERY-PAGE.md), as one count per page; the rest in full. */
export function warningLines(byFile: [string, string[]][]): string[] {
  const motives = byFile.map(([f, ws]) => [f, ws.filter((w) => w.startsWith(glassboxMotiveWarning)).length] as const).filter(([, n]) => n)
  return [
    ...byFile.flatMap(([f, ws]) => ws.filter((w) => !w.startsWith(glassboxMotiveWarning)).map((w) => `- ${f}: ${w}`)),
    ...(motives.length ? [`- ${glassboxMotiveWarning}: ${motives.map(([f, n]) => `${f} ×${n}`).join(', ')}`] : []),
  ]
}

const section = (title: string, body: string) => `# ${title}\n\n${body.trim() || '(none)'}`

export function orientation(base = join(root, content), { log = guideLog, prs = openGlassboxPrs, now = new Date() } = {}): string {
  const guide = files(join(base, 'guide/pages'), '**/*.md')
  const runs = files(join(base, 'workshop/runs'), '*.yml').reverse()
  const checks = files(join(base, 'workshop/checks'), '*.yml')
  const memory = files(join(base, 'workshop/pages'), 'index.md')[0]?.[1] ?? ''
  const warnings = [
    ...warningLines(guide.map(([f, text]) => [f, glassboxPageWarnings(text)])),
    ...glassboxOrphans(Object.fromEntries(guide)).map((f) => `- ${f}: ${glassboxOrphanText}`),
  ]
  const skeleton = ['session: <this session id>', 'mode: <autonomous or interactive>', 'focus: "<what you take on, and why>"', 'changes: []', 'pagesRead: []']
  return [
    section('Run entry', [`Write it to ${content}/workshop/runs/${runStem(now)}.yml when you claim the focus:`, '', ...skeleton.map((l) => `    ${l}`)].join('\n')),
    section('Open PRs that touch Glass Box', prs()),
    section('Memory page', splitFrontmatter(memory).body),
    section(`Last ${recentRuns} curate runs, newest first`, runs.slice(0, recentRuns).map(([f, t]) => `## ${f}\n\n${t.trim()}`).join('\n\n')),
    section('glassbox-update checks', checks.map(([, t]) => t.trim()).join('\n')),
    section('Page-check warnings', warnings.join('\n')),
    section(runs.length ? 'Guide and drafts changes since the last curate run' : 'Last 30 guide and drafts changes (no curate run yet)', log(runs[0] ? runStart(runs[0][0]) : undefined)),
    section('Guide pages', guide.map(([f, t]) => pageOverview(f.replace(/\.md$/, ''), t)).join('\n')),
  ].join('\n\n')
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
    process.stdout.write(`${subject ? subjectPages(subject) : orientation()}\n`)
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
})
