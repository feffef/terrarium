import { describe, expect, it } from 'vitest'
import { adrHash, findAdrRuleProblems, newFormatProblems, ruleAdr, ruleDocPaths, ruleHash, staleRules, withRuleHash } from '../../scripts/validate-adr-rules.ts'

const ADR = '# 24. Mermaid\n\nDecision text.\n'
const stamped = (body: string) => withRuleHash(body, adrHash(ADR))

describe('withRuleHash / ruleHash', () => {
  it('adds frontmatter to a rule that has none, keeping the body', () => {
    const out = stamped('# ADR-0024: x\n')
    expect(out).toBe(`---\nadr: ${adrHash(ADR)}\n---\n# ADR-0024: x\n`)
    expect(ruleHash(out)).toBe(adrHash(ADR))
  })

  it('keeps `paths` and replaces an old hash', () => {
    const rule = '---\nadr: old\npaths:\n  - "a.ts"\n---\nbody\n'
    expect(stamped(rule)).toBe(`---\nadr: ${adrHash(ADR)}\npaths:\n  - "a.ts"\n---\nbody\n`)
  })
})

describe('ruleAdr', () => {
  it('reads the ADR number from a summary or a topic rule', () => {
    expect(ruleAdr('adr-0024.md')).toBe('0024')
    expect(ruleAdr('adr-0004-human-merge.md')).toBe('0004')
    expect(ruleAdr('notes.md')).toBeUndefined()
  })
})

describe('findAdrRuleProblems / staleRules', () => {
  it('passes when every rule carries its ADR hash, a topic rule included', () => {
    const rules = { 'adr-0024.md': stamped('x'), 'adr-0024-render.md': stamped('y') }
    expect(findAdrRuleProblems({ adrs: { '0024': ADR }, rules })).toEqual([])
  })

  it('names only the rules whose ADR changed after they were stamped', () => {
    const input = { adrs: { '0024': `${ADR}Amended.\n`, '0012': ADR }, rules: { 'adr-0024.md': stamped('x'), 'adr-0012.md': stamped('y') } }
    expect(staleRules(input)).toEqual(['adr-0024.md'])
    expect(findAdrRuleProblems(input).join('\n')).toContain('ADR-0024 changed')
  })

  it('fails on a missing summary and on a rule with no ADR, but exempts superseded ADR-0007', () => {
    const problems = findAdrRuleProblems({ adrs: { '0024': ADR, '0007': 'old' }, rules: { 'adr-0099.md': 'x' } })
    expect(problems).toHaveLength(2)
    expect(problems.join('\n')).toContain('ADR-0024 has no summary rule')
    expect(problems.join('\n')).toContain('adr-0099.md has no matching ADR')
  })
})

describe('newFormatProblems (ADR-0030)', () => {
  const NEW = '# ADR-0024: Mermaid\n\nDecision text.\n'

  it('passes a clean new-shape ADR and exempts an old-shape one', () => {
    expect(newFormatProblems('0024', NEW)).toEqual([])
    expect(newFormatProblems('0024', '# 24. Mermaid\n\nDate: 2026-01-01\nStatus: Accepted\n')).toEqual([])
  })

  it('flags a date, a status line and an amendment banner', () => {
    const text = `${NEW}Status: Accepted\n\n> **Amended (2026-07-06).** Changed.\n`
    expect(newFormatProblems('0024', text)).toEqual([
      'ADR-0024 has a date; ADR-0030 keeps history in git.',
      'ADR-0024 has a status line; ADR-0030 keeps history in git.',
      'ADR-0024 has an amendment banner; ADR-0030 keeps history in git.',
    ])
  })

  it('flags a heading whose number is not the file\'s, and reaches the gate', () => {
    expect(newFormatProblems('0025', NEW)).toEqual(["ADR-0025's heading names a different number."])
    expect(findAdrRuleProblems({ adrs: { '0024': `${NEW}Date: 2026-01-01\n` }, rules: { 'adr-0024.md': withRuleHash('x', adrHash(`${NEW}Date: 2026-01-01\n`)) } })).toHaveLength(2)
  })
})

describe('non-ADR rules (ADR-0029)', () => {
  const exists = (p: string) => p === 'docs/agents/guards.md'
  const check = (files: Record<string, string>) => findAdrRuleProblems({ adrs: {}, rules: {}, otherRules: { files, exists } })
  const scoped = (body: string) => `---\npaths:\n  - "scripts/*-guard.ts"\n---\n${body}`

  it('passes a rule with paths whose docs exist, with no adr hash and no "no matching ADR"', () => {
    expect(check({ 'guards.md': scoped('# Guards\n\nSee docs/agents/guards.md.\n') })).toEqual([])
  })

  it('fails a rule with missing, empty or bare-string paths, naming the file', () => {
    for (const fm of ['', '---\npaths: []\n---\n', '---\npaths: "scripts/x.ts"\n---\n']) {
      const problems = check({ 'guards.md': `${fm}# Guards\n` })
      expect(problems).toHaveLength(1)
      expect(problems[0]).toContain('.claude/rules/guards.md has no `paths` list')
    }
  })

  it('fails on a docs/ path that does not exist, naming file and path', () => {
    expect(check({ 'guards.md': scoped('Read docs/agents/missing.md.\n') })).toEqual([
      '.claude/rules/guards.md names docs/agents/missing.md, which does not exist.',
    ])
  })

  it('ignores frontmatter globs, trailing punctuation, anchors and backticks', () => {
    const rule = '---\npaths:\n  - "docs/adr/**"\n---\n(docs/agents/guards.md), `docs/agents/guards.md`, docs/agents/guards.md#the-roster.\n'
    expect(ruleDocPaths(rule)).toEqual(['docs/agents/guards.md'])
    expect(check({ 'guards.md': rule })).toEqual([])
  })
})
