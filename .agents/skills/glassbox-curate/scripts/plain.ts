// A guide page as the plain text a fresh reader gets (SKILL.md, Diagnose): MDC
// stripped, each term followed by its definition at first use, each Excerpt as code
// under its file path. Every run had hand-built this.
// Usage: pnpm exec tsx .agents/skills/glassbox-curate/scripts/plain.ts <page stem>...
import { existsSync, globSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { fail, root, runIfMain } from '../../../../scripts/lib/cli.ts'
import { splitFrontmatter } from '../../../../scripts/lib/frontmatter.ts'
import { glassboxTermId } from '../../../../layers/glassbox/page-refs.ts'

const guide = 'layers/glassbox/content/guide'

/** Each term's definition by id, from the `terms` Collection. */
export function termDefinitions(base = join(root, guide)): Record<string, string> {
  const dir = join(base, 'terms')
  return Object.fromEntries(globSync('*.yml', { cwd: dir }).map((f) => [f.slice(0, -4), String((parse(readFileSync(join(dir, f), 'utf8')) as { definition?: string }).definition ?? '')]))
}

export function plainPage(source: string, definitions: Record<string, string>): string {
  const { frontmatter, body } = splitFrontmatter(source)
  const defined = new Set<string>()
  const text = body
    .replace(/^::excerpt\{path="([^"]+)"(?: lines="([^"]+)")?[^}]*\}\n/gm, (_, path: string, lines?: string) => `Excerpt from ${path}${lines ? `, lines ${lines}` : ''}:\n`)
    .replace(/^::[a-z-]*(\{[^}]*\})?\s*$\n?/gm, '')
    .replace(/:term\[([^\]]+)\](?:\{id="([^"]+)"\})?/g, (_, word: string, id?: string) => {
      const key = glassboxTermId(word, id)
      if (defined.has(key) || !definitions[key]) return word
      defined.add(key)
      return `${word} (${definitions[key]})`
    })
    .replace(/:file\[([^\]]+)\](\{[^}]*\})?/g, '`$1`')
    .replace(/:lessons\[(.*)\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  return [`# ${String(frontmatter.title)}`, '', text.trim()].join('\n').replace(/\n{3,}/g, '\n\n')
}

runIfMain(import.meta.url, () => {
  const stems = process.argv.slice(2)
  if (!stems.length) fail('give one or more page stems, such as web-standards/02.svg')
  const definitions = termDefinitions()
  const pages = stems.map((stem) => {
    const path = join(root, guide, 'pages', `${stem.replace(/\.md$/, '')}.md`)
    if (!existsSync(path)) fail(`no guide page ${stem}`)
    return plainPage(readFileSync(path, 'utf8'), definitions)
  })
  process.stdout.write(`${pages.join('\n\n---\n\n')}\n`)
})
