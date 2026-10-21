// For adr-check: prints every ADR summary rule, then each
// open prune trial's territory. A grep over docs/adr/ for a path or term mostly
// misses (ADR-0030 keeps paths out of ADRs) or hits nearly every ADR, so the
// agent reads all the summaries instead (#2146). Of a trial, only its territory
// is relevant to other sessions (ADR-0027); the rest is for the prune-trial judge.
//
// Usage: pnpm exec tsx .agents/skills/adr-check/scripts/relevant-adrs.ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { LEDGER_PATH } from '../../../../scripts/gate/validate-prune-trials.ts'
import { isSummary, loadRules, ruleBlock, type RuleFile } from '../../../../scripts/lib/adr-rules.ts'
import { root, runIfMain } from '../../../../scripts/lib/cli.ts'

export function adrSummariesText(rules: RuleFile[]): string {
  return rules
    .filter((r) => isSummary(r.file))
    .sort((a, b) => a.file.localeCompare(b.file))
    .map((r) => ruleBlock(r.file, r.text))
    .join('\n\n')
}

interface Trial {
  territory?: { paths?: string[]; keywords?: string[] }
}

export function trialTerritoriesText(ledgerYaml: string): string {
  const trials = (parseYaml(ledgerYaml) as { trials?: Trial[] } | null)?.trials ?? []
  const body = trials.length
    ? trials
        .map(({ territory: t }) =>
          [...(t?.paths ?? []).map((p) => `- ${p}`), `  keywords: ${(t?.keywords ?? []).map((k) => JSON.stringify(k)).join(', ')}`].join('\n'),
        )
        .join('\n\n')
    : 'None open.'
  return `Open prune trial territories (${LEDGER_PATH}):\n\n${body}`
}

runIfMain(import.meta.url, () => {
  const ledger = readFileSync(resolve(root, LEDGER_PATH), 'utf8')
  console.log(`${adrSummariesText(loadRules())}\n\n${trialTerritoriesText(ledger)}`)
})
