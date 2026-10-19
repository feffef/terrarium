import { describe, expect, it } from 'vitest'
import { adrSummariesText, trialTerritoriesText } from '../../scripts/binding.ts'

describe('adrSummariesText', () => {
  it('prints every ADR summary rule body in number order, and no other rule', () => {
    const out = adrSummariesText([
      { file: 'adr-0008.md', text: '---\npaths:\n  - "layers/journal/**"\n---\n# ADR-0008: Journal' },
      { file: 'adr-0003.md', text: '---\nadr: abc\n---\n# ADR-0003: Governance' },
      { file: 'adr-0004-human-merge.md', text: '---\npaths:\n  - "shared/**"\n---\n# Human-only files' },
      { file: 'guards.md', text: '# The guards' },
    ])
    expect(out).toContain('Contents of .claude/rules/adr-0003.md:\n\n# ADR-0003: Governance')
    expect(out.indexOf('ADR-0003')).toBeLessThan(out.indexOf('ADR-0008'))
    expect(out).not.toContain('adr: abc')
    expect(out).not.toContain('Human-only')
    expect(out).not.toContain('guards')
  })
})

describe('trialTerritoriesText', () => {
  it("prints each open trial's territory and nothing else of it", () => {
    const out = trialTerritoriesText(`trials:
  - problem: why it was cut
    territory:
      paths:
        - "docs/a.md (all of it)"
      keywords:
        - "Reviewed:"
        - closing keyword
    opened: 2026-10-16
    check: how to tell it broke
`)
    expect(out).toContain('- docs/a.md (all of it)\n  keywords: "Reviewed:", "closing keyword"')
    expect(out).not.toMatch(/why it was cut|how to tell|2026/)
  })

  it('separates trials and tolerates one with no keywords', () => {
    const out = trialTerritoriesText(`trials:
  - territory:
      paths: [a.md]
      keywords: [x]
  - territory:
      paths: [b.md]
`)
    expect(out).toContain('keywords: "x"\n\n- b.md\n  keywords: ')
  })

  it('says so when no trial is open', () => {
    expect(trialTerritoriesText('trials: []\n')).toMatch(/none/i)
  })
})
