// Unit tests for `findCadenceViolations()`/`validateSkillCadence()` (issue
// #813) — the mechanical check for CLAUDE.md's "say a Skill *is* scheduled;
// never say *when*" convention. Exercises it against hand-built fixture files
// under a throwaway temp dir, in the same spirit as `validate-content.spec.ts`.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { findCadenceViolations, validateSkillCadence } from '../../scripts/validate-skill-cadence.ts'
import type { ExpandedCollection } from '../../shared/expand.ts'

// ── findCadenceViolations() — the sentence-level proximity check ───────────

describe('findCadenceViolations()', () => {
  it('flags a cadence word paired with "Routine" in the same sentence', () => {
    const hits = findCadenceViolations('This Routine runs daily to sweep frictions.')
    expect(hits).toHaveLength(1)
    expect(hits[0]?.match.toLowerCase()).toBe('daily')
  })

  it('flags an "every N <unit>" cadence phrase', () => {
    const hits = findCadenceViolations('The Routine fires every 4 hours.')
    expect(hits).toHaveLength(1)
    expect(hits[0]?.match.toLowerCase()).toMatch(/every 4 hours/)
  })

  it('does not flag "scheduled" alone — that phrasing is the sanctioned one', () => {
    const hits = findCadenceViolations('It also fires on a scheduled Routine.')
    expect(hits).toEqual([])
  })

  it('does not flag a cadence word and "Routine" in different sentences', () => {
    const hits = findCadenceViolations('It fires on a scheduled Routine. Some other unrelated fact happens daily.')
    expect(hits).toEqual([])
  })

  it('does not flag "Routine" with no cadence word nearby', () => {
    const hits = findCadenceViolations('Reach for it on demand once a Routine has piled up work.')
    expect(hits).toEqual([])
  })

  it('is case-insensitive on both the cadence word and "Routine"', () => {
    const hits = findCadenceViolations('this routine runs WEEKLY.')
    expect(hits).toHaveLength(1)
  })
})

// ── validateSkillCadence() — the Skill Inventory scan ───────────────────────

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'validate-skill-cadence-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

function skillsCollection(cwdRel: string): ExpandedCollection {
  return {
    key: 'journal_current_skills',
    tenant: 'journal',
    space: 'current',
    collection: 'skills',
    include: '**/*.yml',
    cwdRel,
    type: 'data',
    schema: z.object({}).passthrough(), // not read by validateSkillCadence — a placeholder to satisfy the type
  }
}

describe('validateSkillCadence()', () => {
  it('passes a role that says a Skill is scheduled without saying when', () => {
    writeFileSync(
      join(dir, 'ok.yml'),
      'name: ok\nrole: >-\n  It also fires on a scheduled Routine; reach for it on demand otherwise.\nobservations: []\n',
    )
    const violations = validateSkillCadence([skillsCollection('.')], dir)
    expect(violations).toEqual([])
  })

  it('flags a role that restates a Routine\'s cadence', () => {
    writeFileSync(
      join(dir, 'bad.yml'),
      'name: bad\nrole: >-\n  This Routine runs daily to catch regressions.\nobservations: []\n',
    )
    const violations = validateSkillCadence([skillsCollection('.')], dir)
    expect(violations).toHaveLength(1)
    expect(violations[0]?.file).toContain('bad.yml')
    expect(violations[0]?.field).toBe('role')
    expect(violations[0]?.match.toLowerCase()).toBe('daily')
  })

  it('flags a cadence restated in an observations[].note field', () => {
    writeFileSync(
      join(dir, 'bad-note.yml'),
      [
        'name: bad-note',
        'role: >-',
        '  Fine on its own.',
        'observations:',
        '  - date: 2026-01-01',
        '    note: >-',
        '      Confirmed the Routine now runs hourly after the last fix.',
      ].join('\n') + '\n',
    )
    const violations = validateSkillCadence([skillsCollection('.')], dir)
    expect(violations).toHaveLength(1)
    expect(violations[0]?.field).toBe('observations[0].note')
    expect(violations[0]?.match.toLowerCase()).toBe('hourly')
  })

  it('only scans the journal Tenant\'s skills collection, not other collections', () => {
    writeFileSync(join(dir, 'other.yml'), 'name: other\nrole: >-\n  A Routine that runs daily.\nobservations: []\n')
    const notSkills: ExpandedCollection = { ...skillsCollection('.'), collection: 'sessions' }
    const violations = validateSkillCadence([notSkills], dir)
    expect(violations).toEqual([])
  })
})
