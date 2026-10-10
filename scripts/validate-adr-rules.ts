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
  rules: Record<string, string> // ADR number → rule file text
}

export function findAdrRuleProblems({ adrs, rules }: AdrRuleInput): string[] {
  const problems: string[] = []
  for (const [n, text] of Object.entries(adrs)) {
    if (NO_RULE.has(n)) continue
    const rule = rules[n]
    if (rule === undefined) problems.push(`ADR-${n} has no summary rule: add ${RULES_DIR}/adr-${n}.md.`)
    else if (ruleHash(rule) !== adrHash(text))
      problems.push(
        `ADR-${n} changed since its summary was last checked. Re-read ${RULES_DIR}/adr-${n}.md, update it if the rule changed, then run \`pnpm exec tsx scripts/validate-adr-rules.ts --write\`.`,
      )
  }
  for (const n of Object.keys(rules)) {
    if (!(n in adrs)) problems.push(`${RULES_DIR}/adr-${n}.md has no ADR ${n} in ${ADR_DIR}/.`)
  }
  return problems
}

function load(): AdrRuleInput & { ruleFiles: Record<string, string> } {
  const adrs: Record<string, string> = {}
  for (const f of readdirSync(join(root, ADR_DIR))) {
    const n = /^(\d{4})-.*\.md$/.exec(f)?.[1]
    if (n) {
      adrs[n] = readFileSync(join(root, ADR_DIR, f), 'utf8')
    }
  }
  const rules: Record<string, string> = {}
  const ruleFiles: Record<string, string> = {}
  const dir = join(root, RULES_DIR)
  for (const f of existsSync(dir) ? readdirSync(dir) : []) {
    const n = /^adr-(\d{4})\.md$/.exec(f)?.[1]
    if (n) {
      const path = join(dir, f)
      ruleFiles[n] = path
      rules[n] = readFileSync(path, 'utf8')
    }
  }
  return { adrs, rules, ruleFiles }
}

function main(): void {
  const { adrs, rules, ruleFiles } = load()
  if (process.argv.includes('--write')) {
    for (const [n, path] of Object.entries(ruleFiles)) {
      const adr = adrs[n]
      const rule = rules[n]
      if (adr !== undefined && rule !== undefined) writeFileSync(path, withRuleHash(rule, adrHash(adr)))
    }
    console.log(`validate-adr-rules: stamped ${Object.keys(ruleFiles).length} rule(s)`)
    return
  }
  const problems = findAdrRuleProblems({ adrs, rules })
  if (problems.length) {
    console.error(`validate-adr-rules: FAIL\n${problems.map((p) => `  ${p}`).join('\n')}`)
    process.exit(1)
  }
  console.log(`validate-adr-rules: PASS — ${Object.keys(rules).length} rule(s) match their ADRs`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
