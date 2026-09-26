// Usage (from the repo root):
//   node .agents/skills/tinkerfund-campaign/tools/apply.mjs <figures.mjs> <campaign.md>
// Replaces the Campaign's whole `figures:` list with the module's `figures`, in
// the module's order, as `svg: |-` block scalars. Refuses a list that breaks the
// order rule (isometric first, then patent) or the svg rule.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { check } from './lib.mjs'

const [modulePath, file] = process.argv.slice(2)
if (!modulePath || !file) throw new Error('usage: apply.mjs <figures.mjs> <campaign.md>')
const { figures } = await import(pathToFileURL(resolve(modulePath)).href)
const firstPatent = figures.findIndex((fig) => fig.style === 'patent')
if (figures[0]?.style !== 'isometric' || firstPatent < 0 || figures.slice(firstPatent).some((fig) => fig.style !== 'patent')) {
  throw new Error('figures must be all isometric first, then all patent, with at least one of each')
}
for (const [i, fig] of figures.entries()) {
  const { problems } = check(fig.svg)
  if (problems.length) throw new Error(`FIG. ${i + 1}: ${problems.join('; ')}`)
}
const src = readFileSync(file, 'utf8')
const start = src.indexOf('\n  figures:\n')
const end = src.indexOf('\n  rewards:\n')
if (start < 0 || end < start) throw new Error(`${file}: expected "  figures:" followed by "  rewards:" in the frontmatter`)
const block = figures.map((fig) => [
  `    - style: ${fig.style}`,
  `      caption: ${JSON.stringify(fig.caption)}`,
  '      svg: |-',
  ...fig.svg.split('\n').map((line) => `        ${line}`),
].join('\n')).join('\n')
writeFileSync(file, `${src.slice(0, start)}\n  figures:\n${block}${src.slice(end)}`)
console.log(`${file}: wrote ${figures.length} figures`)
