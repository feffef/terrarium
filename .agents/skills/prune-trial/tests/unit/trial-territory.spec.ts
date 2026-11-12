import { describe, expect, it } from 'vitest'
import { matchTerritory } from '../../scripts/trial-territory.ts'

const trials = [
  {
    problem: 'First problem line\nmore',
    opened: '2026-11-09',
    territory: {
      paths: ['docs/agents/pr-workflow.md: step 1', 'layers/journal/'],
      keywords: ['gate:scoped', 'chained git'],
    },
  },
]

describe('matchTerritory', () => {
  it('matches an equal path, ignoring the note after the colon', () => {
    const [hit] = matchTerritory(trials, 'docs/agents/pr-workflow.md')
    expect(hit).toMatchObject({ entry: 'docs/agents/pr-workflow.md: step 1', opened: '2026-11-09' })
  })
  it('matches a path inside a territory folder', () => {
    expect(matchTerritory(trials, 'layers/journal/content/a.md')).toHaveLength(1)
  })
  it('matches a keyword contained in the word, ignoring case', () => {
    expect(matchTerritory(trials, 'Run PNPM gate:scoped now')).toHaveLength(1)
  })
  it('returns nothing for a non-match', () => {
    expect(matchTerritory(trials, 'docs/agents/other.md')).toEqual([])
    expect(matchTerritory(trials, 'layers/journal-x/a.md')).toEqual([])
  })
})
