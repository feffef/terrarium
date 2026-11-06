// The orientation step of glassbox-curate: everything a run reads before it
// chooses a focus, in one output. It prints the workshop's memory page, every
// curate run entry, glassbox-update's check state, the Glass Box terms, the
// page-check warnings, the git log of the guide and drafts since the last run,
// and each guide page's title, description, first paragraph and Where next
// links. All of it, unfiltered: trim it only once the output grows too large to
// read.
// Usage: pnpm exec tsx .agents/skills/glassbox-curate/scripts/orient.ts
import { existsSync, globSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { root, runIfMain } from '../../../../scripts/lib/cli.ts'
import { tryGit } from '../../../../scripts/lib/git.ts'
import { splitFrontmatter } from '../../../../scripts/lib/frontmatter.ts'
import { glassboxOrphans, glassboxOrphanText, glassboxPageWarnings } from '../../../../layers/glassbox/page-checks.ts'

const content = 'layers/glassbox/content'

/** One page's block: its stem, then title, description, first paragraph and Where next titles. */
export function pageOverview(stem: string, source: string): string {
  const { frontmatter, body } = splitFrontmatter(source)
  const lede = body.split(/\n\s*\n/).map((p) => p.trim()).find((p) => p && !/^(#|::|<|```)/.test(p)) ?? ''
  const whereNext = body.split(/^## Where next\s*$/m)[1] ?? ''
  const links = [...whereNext.matchAll(/^- \[([^\]]+)\]/gm)].map((m) => m[1])
  return [
    `### ${stem}: ${String(frontmatter.title)}`,
    String(frontmatter.description),
    '',
    lede,
    ...(links.length ? ['', `Where next: ${links.join(' · ')}`] : []),
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

/** A run entry's file stem, `2026-11-06T0930`, as an ISO time: the entry's shape has no date field. */
const runStart = (stem: string) => `${stem.slice(0, 13)}:${stem.slice(13, 15)}:00Z`

export function orientation(base = join(root, content), log = guideLog): string {
  const guide = files(join(base, 'guide/pages'), '**/*.md')
  const runs = files(join(base, 'workshop/runs'), '*.yml').reverse()
  const checks = files(join(base, 'workshop/checks'), '*.yml')
  const terms = files(join(base, 'guide/terms'), '*.yml')
  const memory = files(join(base, 'workshop/pages'), 'index.md')[0]?.[1] ?? ''
  const warnings = [
    ...guide.flatMap(([f, text]) => glassboxPageWarnings(text).map((w) => `- ${f}: ${w}`)),
    ...glassboxOrphans(Object.fromEntries(guide)).map((f) => `- ${f}: ${glassboxOrphanText}`),
  ]
  const section = (title: string, body: string) => `# ${title}\n\n${body.trim() || '(none)'}`
  return [
    section('Memory page', splitFrontmatter(memory).body),
    section('Curate runs, newest first', runs.map(([f, t]) => `## ${f}\n\n${t.trim()}`).join('\n\n')),
    section('glassbox-update checks', checks.map(([, t]) => t.trim()).join('\n')),
    section('Terms', terms.map(([f, t]) => `## ${f}\n${t.trim()}`).join('\n')),
    section('Page-check warnings', warnings.join('\n')),
    section(runs.length ? 'Guide and drafts changes since the last curate run' : 'Last 30 guide and drafts changes (no curate run yet)', log(runs[0] ? runStart(runs[0][0]) : undefined)),
    section('Guide pages', guide.map(([f, t]) => pageOverview(f.replace(/\.md$/, ''), t)).join('\n\n')),
  ].join('\n\n')
}

runIfMain(import.meta.url, () => {
  process.stdout.write(`${orientation()}\n`)
})
