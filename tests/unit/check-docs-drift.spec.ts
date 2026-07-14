// Unit tests for `findDriftViolations()` / `isAllowedHome()` (issue #442) —
// the pure core of `pnpm check:docs-drift` (`scripts/check-docs-drift.ts`).
// Exercises hand-built `Doc` fixtures, not the real repo tree, so a regression
// here is caught in isolation from actual doc content.
import { describe, expect, it } from 'vitest'
import { findDriftViolations, isAllowedHome, type Doc } from '../../scripts/check-docs-drift.ts'

describe('isAllowedHome()', () => {
  it('matches an exact path', () => {
    expect(isAllowedHome('docs/adr/0009-x.md', ['docs/adr/0009-x.md'])).toBe(true)
  })

  it('matches a `*`-wildcard pattern', () => {
    expect(isAllowedHome('docs/adr/0009-session-logs.md', ['docs/adr/0009-*'])).toBe(true)
  })

  it('does not match an unrelated path', () => {
    expect(isAllowedHome('docs/agents/other.md', ['docs/adr/0009-*'])).toBe(false)
  })
})

describe('findDriftViolations()', () => {
  const homes = { SessionEnd: ['docs/adr/0009-*', 'scripts/session-end.ts'] }

  it('flags a noun mentioned in a doc outside its sanctioned home', () => {
    const docs: Doc[] = [{ file: 'docs/agents/other.md', content: 'The `SessionEnd` hook lands the log.\n' }]
    const violations = findDriftViolations(homes, docs)
    expect(violations).toHaveLength(1)
    expect(violations[0]).toMatchObject({ noun: 'SessionEnd', file: 'docs/agents/other.md', line: 1 })
  })

  it('does not flag a mention inside a sanctioned home', () => {
    const docs: Doc[] = [{ file: 'docs/adr/0009-session-logs.md', content: 'The `SessionEnd` hook is a fallback.\n' }]
    expect(findDriftViolations(homes, docs)).toEqual([])
  })

  it('does not flag a doc with no mention at all', () => {
    const docs: Doc[] = [{ file: 'README.md', content: 'Nothing relevant here.\n' }]
    expect(findDriftViolations(homes, docs)).toEqual([])
  })

  it('does not false-positive on a longer identifier containing the noun as a substring', () => {
    const docs: Doc[] = [{ file: 'docs/agents/other.md', content: 'Hits the SessionEndpoint handler.\n' }]
    expect(findDriftViolations(homes, docs)).toEqual([])
  })

  it('reports one violation per matching line, across multiple docs', () => {
    const docs: Doc[] = [
      { file: 'docs/agents/a.md', content: 'line one\nSessionEnd here\nSessionEnd again\n' },
      { file: 'docs/agents/b.md', content: 'SessionEnd too\n' },
    ]
    const violations = findDriftViolations(homes, docs)
    expect(violations).toHaveLength(3)
    expect(violations.map((v) => v.file)).toEqual(['docs/agents/a.md', 'docs/agents/a.md', 'docs/agents/b.md'])
  })

  it('scopes violations independently per configured noun', () => {
    const twoNouns = { SessionEnd: ['docs/adr/0009-*'], Foo: ['docs/foo-home.md'] }
    const docs: Doc[] = [
      { file: 'docs/agents/other.md', content: 'SessionEnd and Foo both mentioned here.\n' },
      { file: 'docs/foo-home.md', content: 'Foo lives here.\n' },
    ]
    const violations = findDriftViolations(twoNouns, docs)
    expect(violations.map((v) => `${v.noun}@${v.file}`).sort()).toEqual(['Foo@docs/agents/other.md', 'SessionEnd@docs/agents/other.md'])
  })
})
