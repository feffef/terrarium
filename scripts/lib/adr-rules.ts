// The ADR-rule parsing library: hashes, rule frontmatter, the pointer line and
// the checks over them. `scripts/gate/validate-adr-rules.ts` is the gate CLI on top;
// the hints and session-trace import this directly.
import { createHash } from 'node:crypto'
import { parse as parseYaml } from 'yaml'
import { frontmatterBlock } from './frontmatter.ts'

export const ADR_DIR = 'docs/adr'
export const RULES_DIR = '.claude/rules'

export const adrHash = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 12)

/** A rule's `paths` frontmatter: the files that load it. Empty for a rule
 *  that loads at session start. */
export function rulePaths(ruleText: string): string[] {
  const fm = frontmatterBlock(ruleText)?.yaml
  const paths = fm ? (parseYaml(fm) as { paths?: unknown } | null)?.paths : undefined
  return Array.isArray(paths) ? paths.filter((p): p is string => typeof p === 'string') : []
}

/** The text Claude Code shows for a rule: everything after its frontmatter. */
export const ruleBody = (ruleText: string) => ruleText.slice(frontmatterBlock(ruleText)?.length ?? 0)

/** A rule as the hints inject it. session-trace parses the header back with
 *  `ruleBlockFiles` to record the rule as loaded, so both live here. */
export const ruleBlock = (file: string, ruleText: string) =>
  `Contents of ${RULES_DIR}/${file}:\n\n${ruleBody(ruleText).trim()}`

export const ruleBlockFiles = (text: string): string[] =>
  [...text.matchAll(/^Contents of (\.claude\/rules\/[\w.-]+\.md):$/gm)].map((m) => m[1]!)

export function ruleHash(ruleText: string): string | undefined {
  return frontmatterBlock(ruleText)?.yaml.match(/^adr:\s*(\S+)\s*$/m)?.[1]
}

export function withRuleHash(ruleText: string, hash: string): string {
  const fm = frontmatterBlock(ruleText)
  if (!fm) return `---\nadr: ${hash}\n---\n${ruleText}`
  const head = fm.yaml
  const body = /^adr:.*$/m.test(head) ? head.replace(/^adr:.*$/m, `adr: ${hash}`) : `adr: ${hash}\n${head}`
  return `---\n${body}\n---\n${ruleText.slice(fm.length)}`
}

/** About 4 characters a token, rounded to the nearest 100. */
export const adrTokens = (text: string) => Math.max(100, Math.round(text.length / 400) * 100)

const POINTER_SHAPE = 'Read `docs/adr/NNNN-<name>.md` to change it or review work it governs[, or <what else it answers>].'
const ESTIMATE_RE = /^(Read `docs\/adr\/(\d{4})-[\w.-]+\.md`)(?: \(~\d+ tokens\))?/
const POINTER_RE = new RegExp(`${ESTIMATE_RE.source} to change it or review work it governs(?:, or \\S[^\\n]*)?\\.$`, 'm')
const estimate = (tokens: number) => ` (~${tokens} tokens) to`

export const withRuleTokens = (ruleText: string, tokens: number) =>
  ruleText.replace(POINTER_RE, (line) => line.replace(ESTIMATE_RE, `$1 (~${tokens} tokens)`))

export const isSummary = (file: string) => /^adr-\d{4}\.md$/.test(file)

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

/** History an ADR must not carry: git holds it (ADR-0030). */
const HISTORY: [RegExp, string][] = [
  [/\b\d{4}-\d{2}-\d{2}\b/, 'a date'],
  [/^(Status|Date):/m, 'a status line'],
  [/^>\s*\**(Amended|Superseded)\b/im, 'an amendment banner'],
]

export function newFormatProblems(n: string, text: string): string[] {
  if (!text.startsWith(`# ADR-${n}:`)) return [`ADR-${n} must start with a \`# ADR-${n}: <title>\` heading.`]
  return HISTORY.filter(([re]) => re.test(text)).map(([, what]) => `ADR-${n} has ${what}; ADR-0030 keeps history in git.`)
}

export function findAdrRuleProblems(input: AdrRuleInput): string[] {
  const { adrs, rules } = input
  const problems: string[] = []
  for (const [n, text] of Object.entries(adrs)) {
    if (!(`adr-${n}.md` in rules)) problems.push(`ADR-${n} has no summary rule: add ${RULES_DIR}/adr-${n}.md.`)
    problems.push(...newFormatProblems(n, text))
  }
  for (const file of Object.keys(rules)) {
    const n = ruleAdr(file)
    if (n === undefined || !(n in adrs)) problems.push(`${RULES_DIR}/${file} has no matching ADR in ${ADR_DIR}/.`)
  }
  for (const file of staleRules(input)) {
    problems.push(
      `ADR-${ruleAdr(file)} changed since ${RULES_DIR}/${file} was last checked. Re-read it, update it if the rule changed, then run \`pnpm exec tsx scripts/gate/validate-adr-rules.ts --write\`.`,
    )
  }
  for (const [file, text] of Object.entries(rules)) {
    const adr = adrs[ruleAdr(file) ?? '']
    const pointer = POINTER_RE.exec(text)
    const own = pointer?.[2] === ruleAdr(file)
    if (adr === undefined || !isSummary(file) || (own && pointer![0].includes(estimate(adrTokens(adr))))) continue
    problems.push(
      own
        ? `${RULES_DIR}/${file} gives a stale token estimate: run \`pnpm exec tsx scripts/gate/validate-adr-rules.ts --write\`.`
        : `${RULES_DIR}/${file} must point to its ADR with a line "${POINTER_SHAPE}".`,
    )
  }
  const other = input.otherRules
  for (const [file, text] of Object.entries(other?.files ?? {})) {
    if (rulePaths(text).length === 0) {
      problems.push(
        `${RULES_DIR}/${file} has no \`paths\` list: a non-ADR rule loads with the files it governs (ADR-0029); cross-cutting instructions stay in CLAUDE.md.`,
      )
    }
    for (const p of ruleDocPaths(text)) {
      if (!other!.exists(p)) problems.push(`${RULES_DIR}/${file} names ${p}, which does not exist.`)
    }
  }
  return problems
}
