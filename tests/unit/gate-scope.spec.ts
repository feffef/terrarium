// Unit tests for the `gate:scoped` helper's pure core — the inert-path
// predicate and the scope decision, where a classification bug would let the
// scoped gate skip a heavy layer it shouldn't (or vice versa). The git shell
// (`changedPaths`) is a thin, fail-safe wrapper, exercised by running the script
// directly (`tsx scripts/gate.ts --dry`). See issue #350.
import { describe, expect, it } from 'vitest'
import { decideScope, isInert, planSteps, FLOOR, HEAVY } from '../../scripts/gate.ts'

describe('isInert()', () => {
  it('treats a Markdown file outside layers/ as inert', () => {
    expect(isInert('docs/adr/0004-objective-safety-gate.md')).toBe(true)
    expect(isInert('README.md')).toBe(true)
    expect(isInert('CLAUDE.md')).toBe(true)
    expect(isInert('.agents/skills/wayfinder/SKILL.md')).toBe(true)
  })

  it('treats any .md UNDER layers/ as non-inert (content + per-Tenant CONTEXT)', () => {
    expect(isInert('layers/blog/content/karen/pages/index.md')).toBe(false)
    expect(isInert('layers/atlas/CONTEXT.md')).toBe(false)
  })

  it('treats any non-.md path as non-inert', () => {
    expect(isInert('scripts/gate.ts')).toBe(false)
    expect(isInert('package.json')).toBe(false)
    expect(isInert('.github/workflows/gate.yml')).toBe(false)
    expect(isInert('docs/research/diagram.png')).toBe(false)
  })
})

describe('decideScope()', () => {
  it('skips heavy layers when EVERY changed path is inert', () => {
    const scope = decideScope(['docs/adr/0004.md', 'README.md', '.agents/skills/x/SKILL.md'])
    expect(scope.skipHeavy).toBe(true)
    expect(planSteps(scope)).toEqual([...FLOOR])
  })

  it('runs the full gate when ANY changed path is non-inert', () => {
    const scope = decideScope(['docs/adr/0004.md', 'scripts/gate.ts'])
    expect(scope.skipHeavy).toBe(false)
    expect(scope.reason).toContain('scripts/gate.ts')
    expect(planSteps(scope)).toEqual([...FLOOR, ...HEAVY])
  })

  it('a single content .md under layers/ forces the full gate', () => {
    expect(decideScope(['layers/blog/content/karen/pages/index.md']).skipHeavy).toBe(false)
  })

  it('fails safe to the full gate when the changed set is unknown (null)', () => {
    const scope = decideScope(null)
    expect(scope.skipHeavy).toBe(false)
    expect(scope.reason).toMatch(/could not determine/i)
    expect(planSteps(scope)).toEqual([...FLOOR, ...HEAVY])
  })

  it('fails safe to the full gate when nothing changed (empty)', () => {
    const scope = decideScope([])
    expect(scope.skipHeavy).toBe(false)
    expect(planSteps(scope)).toEqual([...FLOOR, ...HEAVY])
  })
})
