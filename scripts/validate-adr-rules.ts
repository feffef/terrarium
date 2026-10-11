// Gate check that every ADR summary in `.claude/rules/adr-NNNN.md` was
// re-checked after its ADR last changed. Each rule's frontmatter carries
// `adr: <hash of the ADR file>`; Claude Code reads only `paths` from a rule's
// frontmatter, so the hash costs no context. Any edit to an ADR changes its
// hash, so the summary cannot go stale silently: the author re-reads the rule,
// updates it if the decision changed, then runs this script with `--write`.
// Every other rule must have `paths` and name only `docs/` files that exist
// (ADR-0029, issue #1765).
//
// Usage: pnpm validate:content (chained), or
//   pnpm exec tsx scripts/validate-adr-rules.ts [--write]
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parse as parseYaml } from 'yaml'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ADR_DIR = 'docs/adr'
export const RULES_DIR = '.claude/rules'

/** ADRs with no rule: superseded outright, so nothing in them binds an agent. */
export const NO_RULE = new Set(['0007'])

export const adrHash = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 12)

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n/

/** A rule's `paths` frontmatter: the files that load it. Empty for a rule
 *  that loads at session start. */
export function rulePaths(ruleText: string): string[] {
  const fm = FRONTMATTER.exec(ruleText)?.[1]
  const paths = fm ? (parseYaml(fm) as { paths?: unknown } | null)?.paths : undefined
  return Array.isArray(paths) ? paths.filter((p): p is string => typeof p === 'string') : []
}

/** The text Claude Code shows for a rule: everything after its frontmatter. */
export const ruleBody = (ruleText: string) => ruleText.replace(FRONTMATTER, '')

/** A rule as the hints inject it. session-trace parses the header back with
 *  `ruleBlockFiles` to record the rule as loaded, so both live here. */
export const ruleBlock = (file: string, ruleText: string) =>
  `Contents of ${RULES_DIR}/${file}:\n\n${ruleBody(ruleText).trim()}`

const RULE_BLOCK_HEADER = new RegExp(`^Contents of (${RULES_DIR.replace(/[.]/g, '\\.')}/[\\w.-]+\\.md):$`, 'gm')

export const ruleBlockFiles = (text: string): string[] => [...text.matchAll(RULE_BLOCK_HEADER)].map((m) => m[1]!)

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
  // `exists` travels with the files so the docs check can never be skipped.
  otherRules?: { files: Record<string, string>; exists: (repoPath: string) => boolean }
}

/** The `docs/` paths a rule's body names (not its frontmatter globs). */
export const ruleDocPaths = (ruleText: string): string[] => [
  ...new Set(ruleBody(ruleText).match(/(?<![\w./-])docs\/[\w./-]*[\w-]/g) ?? []),
]

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
  if (input.otherRules) problems.push(...otherRuleProblems(input.otherRules))
  return problems
}

function otherRuleProblems({ files, exists }: NonNullable<AdrRuleInput['otherRules']>): string[] {
  const problems: string[] = []
  for (const [file, text] of Object.entries(files)) {
    if (rulePaths(text).length === 0) {
      problems.push(
        `${RULES_DIR}/${file} has no \`paths\` list: a non-ADR rule loads with the files it governs (ADR-0029); cross-cutting instructions stay in CLAUDE.md.`,
      )
    }
    for (const p of ruleDocPaths(text)) {
      if (!exists(p)) problems.push(`${RULES_DIR}/${file} names ${p}, which does not exist.`)
    }
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
  const others: Record<string, string> = {}
  const dir = join(root, RULES_DIR)
  for (const f of existsSync(dir) ? readdirSync(dir) : []) {
    if (f.startsWith('adr-')) rules[f] = readFileSync(join(dir, f), 'utf8')
    else if (f.endsWith('.md')) others[f] = readFileSync(join(dir, f), 'utf8')
  }
  return { adrs, rules, otherRules: { files: others, exists: (p) => existsSync(join(root, p)) } }
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
  console.log(
    `validate-adr-rules: PASS — ${Object.keys(input.rules).length} ADR rule(s) match their ADRs, ${Object.keys(input.otherRules?.files ?? {}).length} other rule(s) have paths and existing docs`,
  )
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
