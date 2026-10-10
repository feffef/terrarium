import { describe, expect, it } from 'vitest'
import { adrHash, findAdrRuleProblems, ruleAdr, ruleHash, staleRules, withRuleHash } from '../../scripts/validate-adr-rules.ts'

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
