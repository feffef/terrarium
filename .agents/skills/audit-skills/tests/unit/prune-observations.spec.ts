import { describe, expect, it } from 'vitest'
import { cutoffFor, pruneObservations } from '../../scripts/prune-observations.ts'

const entry = `name: x
role: >-
  A role.
observations:
  - date: "2026-08-01"
    note: >-
      Old note that should go away once the window
      has passed.
  - date: 2026-10-20
    note: >-
      Recent note, folded
      across lines.
`

describe('pruneObservations', () => {
  it('removes an entry older than the cutoff and keeps a recent one byte-for-byte', () => {
    const { text, removed } = pruneObservations(entry, '2026-09-14')
    expect(text).toBe(`name: x
role: >-
  A role.
observations:
  - date: 2026-10-20
    note: >-
      Recent note, folded
      across lines.
`)
    expect(removed).toEqual([{ date: '2026-08-01', note: 'Old note that should go away once the window has passed.' }])
  })

  it('keeps an entry dated exactly 40 days before today and removes one a day older', () => {
    expect(cutoffFor('2026-10-24')).toBe('2026-09-14')
    const one = (date: string) => `observations:\n  - date: "${date}"\n    note: n\n`
    expect(pruneObservations(one('2026-09-14'), cutoffFor('2026-10-24')).removed).toEqual([])
    expect(pruneObservations(one('2026-09-13'), cutoffFor('2026-10-24')).removed).toHaveLength(1)
  })

  it('leaves `[]` when every entry is removed', () => {
    const { text } = pruneObservations(entry.replace('2026-10-20', '2026-08-02'), '2026-09-14')
    expect(text).toBe('name: x\nrole: >-\n  A role.\nobservations: []\n')
  })

  it('keeps and reports an entry without a readable date', () => {
    const text = 'observations:\n  - date: soon\n    note: undated\n  - note: no date at all\n'
    expect(pruneObservations(text, '2026-09-14')).toEqual({ text, removed: [], unreadable: ['undated', 'no date at all'] })
  })

  it('leaves a file without observations untouched', () => {
    const text = 'name: x\nrole: >-\n  A role.\n'
    expect(pruneObservations(text, '2026-09-14')).toEqual({ text, removed: [], unreadable: [] })
  })
})
