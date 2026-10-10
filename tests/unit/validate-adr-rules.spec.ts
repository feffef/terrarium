import { describe, expect, it } from 'vitest'
import { adrHash, findAdrRuleProblems, ruleHash, withRuleHash } from '../../scripts/validate-adr-rules.ts'

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

describe('findAdrRuleProblems', () => {
  it('passes when every rule carries its ADR hash', () => {
    expect(findAdrRuleProblems({ adrs: { '0024': ADR }, rules: { '0024': stamped('x') } })).toEqual([])
  })

  it('fails when an ADR changed after its summary was stamped', () => {
    const [p] = findAdrRuleProblems({ adrs: { '0024': `${ADR}Amended.\n` }, rules: { '0024': stamped('x') } })
    expect(p).toContain('ADR-0024 changed')
  })

  it('fails on a missing rule and on a rule with no ADR, but exempts superseded ADR-0007', () => {
    const problems = findAdrRuleProblems({ adrs: { '0024': ADR, '0007': 'old' }, rules: { '0099': 'x' } })
    expect(problems).toHaveLength(2)
    expect(problems.join('\n')).toContain('ADR-0024 has no summary rule')
    expect(problems.join('\n')).toContain('adr-0099.md has no ADR')
  })
})
