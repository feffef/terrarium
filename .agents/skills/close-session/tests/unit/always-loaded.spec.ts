import { describe, expect, it } from 'vitest'
import { alwaysLoadedText } from '../../scripts/always-loaded.ts'

describe('alwaysLoadedText', () => {
  it('prints CLAUDE.md and only the rules with no paths', () => {
    const out = alwaysLoadedText('# CLAUDE.md\nBody.', [
      { file: 'adr-0003.md', text: '---\nadr: abc\n---\n# ADR-0003: Governance' },
      { file: 'adr-0008.md', text: '---\npaths:\n  - "layers/journal/**"\n---\n# ADR-0008: Journal' },
    ])
    expect(out).toContain('===== CLAUDE.md =====\n# CLAUDE.md\nBody.')
    expect(out).toContain('===== .claude/rules/adr-0003.md =====')
    expect(out).not.toContain('adr-0008')
  })
})
