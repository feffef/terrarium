import { describe, expect, it } from 'vitest'
import { adrSummariesText } from '../../scripts/adr-summaries.ts'

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
