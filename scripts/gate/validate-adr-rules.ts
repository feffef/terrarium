// Gate check that every ADR summary in `.claude/rules/adr-NNNN.md` was
// re-checked after its ADR last changed. Each rule's frontmatter carries
// `adr: <hash of the ADR file>`; Claude Code reads only `paths` from a rule's
// frontmatter, so the hash costs no context. Any edit to an ADR changes its
// hash, so the summary cannot go stale silently: the author re-reads the rule,
// updates it if the decision changed, then runs this script with `--write`.
// Every other rule must have `paths` and name only `docs/` files that exist
// (ADR-0029, issue #1765). A summary's pointer says when to read its ADR in
// full, so the read happens where it pays off (issue #2146), and estimates the
// ADR's tokens so the read looks cheap (issue #1939); `--write` stamps the
// estimate. An ADR in the new shape carries no history (ADR-0030).
//
// Usage: pnpm validate:content (chained), or
//   pnpm exec tsx scripts/gate/validate-adr-rules.ts [--write]
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { root, runIfMain } from '../lib/cli.ts'
import { git } from '../lib/git.ts'
import {
  ADR_DIR,
  adrHash,
  adrTokens,
  findAdrRuleProblems,
  isSummary,
  RULES_DIR,
  ruleAdr,
  withRuleHash,
  withRuleTokens,
  type AdrRuleInput,
} from '../lib/adr-rules.ts'

function load(): AdrRuleInput {
  const adrs: Record<string, string> = {}
  for (const f of readdirSync(join(root, ADR_DIR))) {
    const n = /^(\d{4})-.*\.md$/.exec(f)?.[1]
    if (n) adrs[n] = readFileSync(join(root, ADR_DIR, f), 'utf8')
  }
  const rules: Record<string, string> = {}
  const others: Record<string, string> = {}
  const dir = join(root, RULES_DIR)
  for (const f of existsSync(dir) ? readdirSync(dir) : []) {
    if (f.startsWith('adr-')) rules[f] = readFileSync(join(dir, f), 'utf8')
    else if (f.endsWith('.md')) others[f] = readFileSync(join(dir, f), 'utf8')
  }
  const repoFiles = git(['ls-files', '--cached', '--others', '--exclude-standard'], root).split('\n').filter(Boolean)
  return { adrs, rules, repoFiles, otherRules: { files: others, exists: (p) => existsSync(join(root, p)) } }
}

function main(): void {
  const input = load()
  if (process.argv.includes('--write')) {
    const stamped: string[] = []
    for (const [file, text] of Object.entries(input.rules)) {
      const adr = input.adrs[ruleAdr(file) ?? '']
      if (adr === undefined) continue
      const hashed = withRuleHash(text, adrHash(adr))
      const out = isSummary(file) ? withRuleTokens(hashed, adrTokens(adr)) : hashed
      if (out === text) continue
      writeFileSync(join(root, RULES_DIR, file), out)
      stamped.push(file)
    }
    console.log(`validate-adr-rules: stamped ${stamped.length} rule(s)${stamped.length ? `: ${stamped.join(', ')}` : ''}`)
    return
  }
  const problems = findAdrRuleProblems(input)
  if (problems.length) {
    console.error(`validate-adr-rules: FAIL\n${problems.map((p) => `  ${p}`).join('\n')}`)
    process.exit(1)
  }
  console.log(`validate-adr-rules: PASS — ${Object.keys({ ...input.rules, ...input.otherRules?.files }).length} rule(s)`)
}

runIfMain(import.meta.url, main)
