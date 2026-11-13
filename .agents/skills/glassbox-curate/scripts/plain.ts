// A guide page as the plain text a fresh reader gets (SKILL.md, Diagnose): MDC stripped, each
// Excerpt as code under its file path, a term's definition in a note after the paragraph that
// first uses it (never inside the sentence), a link followed by its target's title, and code kept
// as written. Every run had hand-built this.
// Usage: pnpm exec tsx .agents/skills/glassbox-curate/scripts/plain.ts <page stem>...
// A stem is the path under the guide's pages, with or without the order prefixes: verification/10.gate or gate.
import { existsSync, globSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { fail, root, runIfMain } from '../../../../scripts/lib/cli.ts'
import { splitFrontmatter } from '../../../../scripts/lib/frontmatter.ts'
import { glassboxTermId } from '../../../../layers/glassbox/page-refs.ts'
import { guidePath } from './orient.ts'

const guide = 'layers/glassbox/content/guide'
const guideRoute = '/t/glassbox/guide/'

/** Each term's definition by id, from the `terms` Collection. */
export function termDefinitions(base = join(root, guide)): Record<string, string> {
  const dir = join(base, 'terms')
  return Object.fromEntries(globSync('*.yml', { cwd: dir }).map((f) => [f.slice(0, -4), String((parse(readFileSync(join(dir, f), 'utf8')) as { definition?: string }).definition ?? '')]))
}

/** Each guide page's title, by its path under the guide without the order prefixes (how a link names it). */
export function pageTitles(base = join(root, guide)): Record<string, string> {
  const pages = join(base, 'pages')
  return Object.fromEntries(globSync('**/*.md', { cwd: pages }).map((f) => [guidePath(f.replace(/\.md$/, '')), String(splitFrontmatter(readFileSync(join(pages, f), 'utf8')).frontmatter.title)]))
}

/** The page file a stem names: exact, else the one page whose stem matches once order prefixes are dropped. */
export function resolveStem(stem: string, pages: string[]): string {
  const want = stem.replace(/\.md$/, '')
  const stems = pages.map((f) => f.replace(/\.md$/, ''))
  if (stems.includes(want)) return want
  const hits = stems.filter((s) => guidePath(s) === want || guidePath(s).endsWith(`/${want}`))
  if (hits.length === 1) return hits[0]!
  const near = hits.length ? hits : stems.filter((s) => s.includes(want))
  throw new Error(`${hits.length ? `"${stem}" names ${hits.length} guide pages` : `no guide page "${stem}"`}${near.length ? `; did you mean ${near.slice(0, 5).join(', ')}?` : ''}`)
}

export const plainHeader = '(Plain copy of a guide page: each term\'s definition follows the paragraph that first uses it, a link shows its target\'s title in [→ …], and the page\'s markup is removed.)'

export function plainPage(source: string, definitions: Record<string, string>, titles: Record<string, string> = {}): string {
  const { frontmatter, body } = splitFrontmatter(source)
  // Code stays as written: fenced blocks and inline spans are set aside, then put back.
  const code: string[] = []
  const park = (s: string) => `\uE000${code.push(s) - 1}\uE000`
  const defined = new Set<string>()
  const title = (path: string) => titles[path.replace(guideRoute, '').replace(/[#?].*$/, '').replace(/\/$/, '')]
  const paragraph = (text: string) => {
    const notes: string[] = []
    const out = text
      .replace(/:term\[([^\]]+)\](?:\{id="([^"]+)"\})?/g, (_, word: string, id?: string) => {
        const key = glassboxTermId(word, id)
        if (!defined.has(key) && definitions[key]) {
          defined.add(key)
          notes.push(`[term "${word}": ${definitions[key]}]`)
        }
        return word
      })
      .replace(/:file\[([^\]]+)\](\{[^}]*\})?/g, '`$1`')
      .replace(/:lessons\[(.*)\]/g, '$1')
      .replace(/\[([^\]]*)\]\(([^)]*)\)/g, (_, text: string, url: string) => {
        const target = url.startsWith(guideRoute) ? title(url) : undefined
        if (!text) return target ?? ''
        return target && target !== text ? `${text} [→ ${target}]` : text
      })
    return [out, ...notes].join('\n')
  }
  const text = body
    .replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, park)
    .replace(/(`+)[^`\n]*?\1/g, park)
    .replace(/^::excerpt\{path="([^"]+)"(?: lines="([^"]+)")?[^}]*\}\n/gm, (_, path: string, lines?: string) => `Excerpt from ${path}${lines ? `, lines ${lines}` : ''}:\n`)
    .replace(/^::[a-z-]*(\{[^}]*\})?\s*$\n?/gm, '')
    .split(/\n{2,}/)
    .map(paragraph)
    .join('\n\n')
    .replace(/\uE000(\d+)\uE000/g, (_, i: string) => code[Number(i)]!)
  return [plainHeader, '', `# ${String(frontmatter.title)}`, '', text.trim()].join('\n').replace(/\n{3,}/g, '\n\n')
}

runIfMain(import.meta.url, () => {
  const stems = process.argv.slice(2)
  if (!stems.length) fail('give one or more page stems, such as verification/10.gate or gate')
  const pages = join(root, guide, 'pages')
  const all = globSync('**/*.md', { cwd: pages })
  const definitions = termDefinitions()
  const titles = pageTitles()
  const out = stems.map((stem) => {
    let found: string
    try {
      found = resolveStem(stem, all)
    } catch (err) {
      fail(err instanceof Error ? err.message : String(err))
    }
    const path = join(pages, `${found}.md`)
    if (!existsSync(path)) fail(`no guide page ${found}`)
    return plainPage(readFileSync(path, 'utf8'), definitions, titles)
  })
  process.stdout.write(`${out.join('\n\n---\n\n')}\n`)
})
