// Prints every ADR summary rule for adr-check's step 1. A grep over docs/adr/
// for a path or term mostly misses (ADR-0030 keeps paths out of ADRs) or hits
// nearly every ADR, so the agent reads all the summaries instead (#2146).
//
// Usage: pnpm exec tsx .agents/skills/adr-check/scripts/adr-summaries.ts
import { isSummary, loadRules, ruleBlock, type RuleFile } from '../../../../scripts/lib/adr-rules.ts'
import { runIfMain } from '../../../../scripts/lib/cli.ts'

export function adrSummariesText(rules: RuleFile[]): string {
  return rules
    .filter((r) => isSummary(r.file))
    .sort((a, b) => a.file.localeCompare(b.file))
    .map((r) => ruleBlock(r.file, r.text))
    .join('\n\n')
}

runIfMain(import.meta.url, () => {
  console.log(adrSummariesText(loadRules()))
})
