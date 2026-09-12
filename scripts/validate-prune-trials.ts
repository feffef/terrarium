// Gate check for `.agents/prune-trials.yml`'s YAML validity (ADR-0027, issue
// #1222). A prior prune's hand-edit once omitted a `- problem:` list-item
// boundary, merging two trial entries into one mapping with duplicate
// `problem`/`territory`/`opened`/`proven`/`check` keys. Nothing in the gate
// parsed this file, so the corruption shipped unnoticed (whatever produced it
// used a lenient YAML parser that silently mangled the merged entry instead
// of erroring) and only surfaced later, on an unrelated branch, when
// `scripts/prune-trial-window.ts` — which uses the strict `yaml` package —
// threw a `DUPLICATE_KEY` parse error.
//
// This script mirrors `prune-trial-window.ts`'s use of `yaml`'s `parse()`.
// That parser rejects a duplicate key in ANY mapping by default (verified:
// `DUPLICATE_KEY`), and a merged-entry corruption is exactly a duplicate key
// inside one trial's own mapping — so a single clean strict parse already
// answers both "does this parse?" and "are there duplicate top-level trial
// keys?"; no separate duplicate-key pass is needed on top of it.
//
// Usage: pnpm validate:content (runs after the other three checks; see
//   package.json). Exits 0 (silent beyond the summary line) when the ledger
//   parses cleanly, 1 with the parser's own error otherwise.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parse as parseYaml } from 'yaml'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const LEDGER_PATH = '.agents/prune-trials.yml'

export interface PruneTrialsValidation {
  ok: boolean
  error?: string
}

/** Parses the ledger's raw YAML text with the same strict parser
 *  `prune-trial-window.ts` uses. Pure — no file I/O — so it's directly
 *  testable against a fixture string. */
export function validatePruneTrialsYaml(yamlText: string): PruneTrialsValidation {
  let doc: unknown
  try {
    doc = parseYaml(yamlText)
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
  const trials = (doc as { trials?: unknown } | null)?.trials
  if (trials !== undefined && !Array.isArray(trials)) {
    return { ok: false, error: '"trials:" must be a list when present' }
  }
  return { ok: true }
}

// ── CLI ─────────────────────────────────────────────────────────────────────

function main(): void {
  const yamlText = readFileSync(resolve(root, LEDGER_PATH), 'utf8')
  const result = validatePruneTrialsYaml(yamlText)
  if (!result.ok) {
    console.error(`\n${LEDGER_PATH} failed to parse:\n  ${result.error}`)
  }
  const status = result.ok ? 'PASS' : 'FAIL'
  console.log(`\nvalidate-prune-trials: ${status}`)
  if (!result.ok) process.exit(1)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
