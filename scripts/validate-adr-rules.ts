// Gate check that every ADR summary in `.claude/rules/adr-NNNN.md` was
// re-checked after its ADR last changed. Each rule's frontmatter carries
// `adr: <hash of the ADR file>`; Claude Code reads only `paths` from a rule's
// frontmatter, so the hash costs no context. Any edit to an ADR changes its
// hash, so the summary cannot go stale silently: the author re-reads the rule,
// updates it if the decision changed, then runs this script with `--write`.
//
// Usage: pnpm validate:content (chained), or
//   pnpm exec tsx scripts/validate-adr-rules.ts [--write]
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ADR_DIR = 'docs/adr'
const RULES_DIR = '.claude/rules'

/** ADRs with no rule: superseded outright, so nothing in them binds an agent. */
export const NO_RULE = new Set(['0007'])

export const adrHash = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 12)

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n/

export function ruleHash(ruleText: string): string | undefined {
  return FRONTMATTER.exec(ruleText)?.[1]?.match(/^adr:\s*(\S+)\s*$/m)?.[1]
}

export function withRuleHash(ruleText: string, hash: string): string {
  const fm = FRONTMATTER.exec(ruleText)
  if (!fm) return `---\nadr: ${hash}\n---\n${ruleText}`
  const head = fm[1] ?? ''
  const body = /^adr:.*$/m.test(head) ? head.replace(/^adr:.*$/m, `adr: ${hash}`) : `adr: ${hash}\n${head}`
  return `---\n${body}\n---\n${ruleText.slice(fm[0].length)}`
}

export interface AdrRuleInput {
  adrs: Record<string, string> // ADR number → ADR file text
  rules: Record<string, string> // rule file name → rule file text
}

/** A rule file names its ADR: `adr-0004.md` is the summary, and an extra
 *  `adr-0004-<topic>.md` covers a part of that ADR with its own `paths`. */
export const ruleAdr = (file: string) => /^adr-(\d{4})(?:-[a-z0-9-]+)?\.md$/.exec(file)?.[1]

/** Rule files whose stamp no longer matches their ADR. */
export function staleRules({ adrs, rules }: AdrRuleInput): string[] {
  return Object.entries(rules)
    .filter(([file, text]) => {
      const adr = adrs[ruleAdr(file) ?? '']
      return adr !== undefined && ruleHash(text) !== adrHash(adr)
    })
    .map(([file]) => file)
}

export function findAdrRuleProblems(input: AdrRuleInput): string[] {
  const { adrs, rules } = input
  const problems: string[] = []
  for (const n of Object.keys(adrs)) {
    if (!NO_RULE.has(n) && !(`adr-${n}.md` in rules)) problems.push(`ADR-${n} has no summary rule: add ${RULES_DIR}/adr-${n}.md.`)
  }
  for (const file of Object.keys(rules)) {
    const n = ruleAdr(file)
    if (n === undefined || !(n in adrs)) problems.push(`${RULES_DIR}/${file} has no matching ADR in ${ADR_DIR}/.`)
  }
  for (const file of staleRules(input)) {
    problems.push(
      `ADR-${ruleAdr(file)} changed since ${RULES_DIR}/${file} was last checked. Re-read it, update it if the rule changed, then run \`pnpm exec tsx scripts/validate-adr-rules.ts --write\`.`,
    )
  }
  return problems
}

function load(): AdrRuleInput {
  const adrs: Record<string, string> = {}
  for (const f of readdirSync(join(root, ADR_DIR))) {
    const n = /^(\d{4})-.*\.md$/.exec(f)?.[1]
    if (n) adrs[n] = readFileSync(join(root, ADR_DIR, f), 'utf8')
  }
  const rules: Record<string, string> = {}
  const dir = join(root, RULES_DIR)
  for (const f of existsSync(dir) ? readdirSync(dir) : []) {
    if (f.startsWith('adr-')) rules[f] = readFileSync(join(dir, f), 'utf8')
  }
  return { adrs, rules }
}

function main(): void {
  const input = load()
  if (process.argv.includes('--write')) {
    const stale = staleRules(input)
    for (const file of stale) {
      writeFileSync(join(root, RULES_DIR, file), withRuleHash(input.rules[file] ?? '', adrHash(input.adrs[ruleAdr(file) ?? ''] ?? '')))
    }
    console.log(`validate-adr-rules: stamped ${stale.length} stale rule(s)${stale.length ? `: ${stale.join(', ')}` : ''}`)
    return
  }
  const problems = findAdrRuleProblems(input)
  if (problems.length) {
    console.error(`validate-adr-rules: FAIL\n${problems.map((p) => `  ${p}`).join('\n')}`)
    process.exit(1)
  }
  console.log(`validate-adr-rules: PASS — ${Object.keys(input.rules).length} rule(s) match their ADRs`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
