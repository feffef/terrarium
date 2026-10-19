// Outline: a file-only overview of a flattened-events file, so only its path,
// line count and coverage reach the caller's context.
//
// Usage: pnpm exec tsx .agents/skills/inspect-session/scripts/outline.ts <flattened file>
import { writeFileSync } from 'node:fs'
import { fail, runIfMain } from '../../../../scripts/lib/cli.ts'
import { coverageLine, readFlat, shown, sibling, type FlatLine } from './flat.ts'

const cut = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

export function outline(lines: FlatLine[]): string[] {
  return lines.flatMap((l) => {
    if (l.tags.includes('human-prompt')) return ['', `L${l.n} ${l.at} PROMPT: ${cut(l.input, 300)}`]
    if (l.kind !== 'assistant' || !l.tool) return []
    const tags = l.tags.length ? ` [${l.tags.join(',')}]` : ''
    return [`  L${l.n} ${l.at.slice(11)} ${l.agent} ${l.tool}${tags} ${cut(shown(l), 150)}`]
  })
}

runIfMain(import.meta.url, () => {
  const flatFile = process.argv[2]
  if (!flatFile) fail('usage: outline.ts <flattened file>')
  const { lines, meta } = readFlat(flatFile)
  const out = outline(lines)
  const file = sibling(flatFile, '.outline.txt')
  writeFileSync(file, out.join('\n') + '\n')
  console.log(`OUTLINE: ${file} (${out.length} lines)\n${coverageLine(meta)}`)
})
