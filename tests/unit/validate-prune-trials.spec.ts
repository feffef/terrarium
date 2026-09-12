// Unit tests for `validatePruneTrialsYaml()` (issue #1222) — the strict-YAML
// gate check for `.agents/prune-trials.yml`. Exercised against fixture
// strings, never the repo's own ledger (that file's content stays untouched).
import { describe, expect, it } from 'vitest'
import { validatePruneTrialsYaml } from '../../scripts/validate-prune-trials.ts'

const CLEAN_LEDGER = `# header comment, ordinary YAML below
trials:
  - problem: >
      A wall of prose about pkill teardown.
    territory:
      paths:
        - CLAUDE.md
    opened: 2026-08-23
    proven: true
    check: >
      how you'd tell.
  - problem: >
      A second entry about ADR-0009's amendment history.
    territory:
      paths:
        - docs/adr/0009-session-logs-commit-directly-to-main.md
    opened: 2026-08-25
    proven: true
    check: >
      how you'd tell.
`

// The exact corruption shape from issue #1222: a missing `- problem:`
// list-item boundary merges two trial entries into one mapping, duplicating
// every one of its keys.
const CORRUPTED_LEDGER = `trials:
  - problem: >
      A wall of prose about pkill teardown.
    territory:
      paths:
        - CLAUDE.md
    opened: 2026-08-23
    proven: true
    check: >
      how you'd tell.
    problem: >
      A second entry about ADR-0009's amendment history, merged in by mistake.
    territory:
      paths:
        - docs/adr/0009-session-logs-commit-directly-to-main.md
    opened: 2026-08-25
    proven: true
    check: >
      how you'd tell, again.
`

describe('validatePruneTrialsYaml()', () => {
  it('accepts a clean, well-formed ledger', () => {
    const result = validatePruneTrialsYaml(CLEAN_LEDGER)
    expect(result).toEqual({ ok: true })
  })

  it('accepts an empty trials list', () => {
    expect(validatePruneTrialsYaml('trials: []\n')).toEqual({ ok: true })
  })

  it('rejects a ledger with a merged, duplicate-keyed trial entry', () => {
    const result = validatePruneTrialsYaml(CORRUPTED_LEDGER)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/[Dd]uplicate|unique/)
  })

  it('rejects text that is not valid YAML at all', () => {
    const result = validatePruneTrialsYaml('trials:\n  - problem: >\n  broken indentation\n- [')
    expect(result.ok).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('rejects a "trials:" value that is not a list', () => {
    const result = validatePruneTrialsYaml('trials: "not a list"\n')
    expect(result).toEqual({ ok: false, error: '"trials:" must be a list when present' })
  })
})
