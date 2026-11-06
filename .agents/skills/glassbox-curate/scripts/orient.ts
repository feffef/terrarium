// The orientation step of glassbox-curate: everything a run reads before it
// chooses a focus, in one output. It prints the workshop's memory page, every
// curate run entry, glassbox-update's check state, the Glass Box terms, the
// page-check warnings, and each guide page's title, description, first
// paragraph and Where next links. All of it, unfiltered: trim it only once the
// output grows too large to read.
// Usage: pnpm exec tsx .agents/skills/glassbox-curate/scripts/orient.ts
import { existsSync, globSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { root, runIfMain } from '../../../../scripts/lib/cli.ts'
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

export function orientation(base = join(root, content)): string {
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
    section('Guide pages', guide.map(([f, t]) => pageOverview(f.replace(/\.md$/, ''), t)).join('\n\n')),
  ].join('\n\n')
}

runIfMain(import.meta.url, () => {
  process.stdout.write(`${orientation()}\n`)
})
