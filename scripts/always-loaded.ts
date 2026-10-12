// Prints CLAUDE.md and the always-loaded rules (`.claude/rules/` files with no
// `paths`) for close-session's re-read. Opening those files with the Read tool
// loads the path-scoped rules that govern `.claude/rules/**` and logs the reads
// as docs; one script run does neither (PR #1812).
//
// Usage: pnpm exec tsx scripts/always-loaded.ts
import { readFileSync } from 'node:fs'
import { loadRules } from './skill-rules-hint.ts'
import { RULES_DIR, rulePaths } from './validate-adr-rules.ts'

export function alwaysLoadedText(claudeMd: string, rules: { file: string; text: string }[]): string {
  const always = rules.filter((r) => rulePaths(r.text).length === 0)
  const block = (path: string, text: string) => `===== ${path} =====\n${text.trim()}`
  return [block('CLAUDE.md', claudeMd), ...always.map((r) => block(`${RULES_DIR}/${r.file}`, r.text))].join('\n\n')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(alwaysLoadedText(readFileSync('CLAUDE.md', 'utf8'), loadRules()))
}
