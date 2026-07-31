// Unit tests for the record-fact formatters (layers/midden/app/utils/find.ts),
// shared by both Midden renderers — MiddenArtifact.vue and StoresLanding.vue.
// Pins the file-name-only rule: a repo-root-relative path overflowed the record
// line on a narrow column, and the provenance link already carries the full path.
import { describe, expect, it } from 'vitest'
import { formatMiddenDate, middenProvenanceLine } from '../../app/utils/find.ts'

describe('middenProvenanceLine', () => {
  it('shows a file provenance as its file name alone, not its path', () => {
    expect(
      middenProvenanceLine({
        kind: 'file',
        path: 'layers/midden/app/components/midden/StratigraphySidebar.vue',
      }),
    ).toBe('file · StratigraphySidebar.vue')
  })

  it('shows a commit provenance path as its file name alone', () => {
    expect(
      middenProvenanceLine({
        kind: 'commit',
        hash: 'c399e92aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        path: 'layers/journal/app/pages/t/journal/[space]/index.vue',
      }),
    ).toBe('commit c399e92 · index.vue')
  })

  it('leaves a bare root-level file name untouched', () => {
    expect(middenProvenanceLine({ kind: 'file', path: 'app.vue' })).toBe('file · app.vue')
  })

  it('omits the path segment for a commit that carries none', () => {
    expect(middenProvenanceLine({ kind: 'commit', hash: 'c399e92aaaaaaaa' })).toBe('commit c399e92')
  })

  it('renders the non-path kinds unabbreviated', () => {
    expect(middenProvenanceLine({ kind: 'pr', number: 12, merged: true })).toBe('PR #12 · merged')
    expect(middenProvenanceLine({ kind: 'pr', number: 12, merged: false })).toBe('PR #12 · closed')
    expect(middenProvenanceLine({ kind: 'branch', name: 'claude/some-branch' })).toBe(
      'branch · claude/some-branch',
    )
    expect(middenProvenanceLine({ kind: 'dependency', name: 'zod-adapter' })).toBe(
      'dependency · zod-adapter',
    )
    expect(middenProvenanceLine({ kind: 'skill', name: 'log-session' })).toBe('Skill · log-session')
  })
})

describe('formatMiddenDate', () => {
  it('renders an ISO date as locale-independent prose', () => {
    expect(formatMiddenDate('2026-07-16')).toBe('16 Jul 2026')
    expect(formatMiddenDate('2026-01-01')).toBe('1 Jan 2026')
  })
})
