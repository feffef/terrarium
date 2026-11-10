// The rule-use report (#3019): aggregates over committed session logs' `ruleUse`.
import { describe, expect, it } from 'vitest'
import { renderReport, ruleUseReport } from '../../scripts/session/rule-use-report.ts'

const A = '.claude/rules/adr-0004.md'
const B = '.claude/rules/adr-0027.md'
const log = (endedAt: string, extra: Record<string, unknown> = {}) => ({ file: `${endedAt}.yml`, data: { endedAt, ...extra } })
const logs = [
  log('2026-11-01T00:00:00Z', { ruleUse: [{ by: 'main', answered: true, loads: [{ rule: A, via: 'native', trigger: 'x.ts' }], reported: [{ path: A, value: 'changed' }] }] }),
  log('2026-11-09T00:00:00Z'),
  log('2026-11-09T12:00:00Z', {
    ruleUse: [
      { by: 'main', answered: true, loads: [{ rule: A, via: 'native', trigger: 'CLAUDE.md' }, { rule: B, via: 'hint' }], reported: [{ path: A, value: 'confirmed' }, { path: 'docs/x.md' }] },
      { by: 'Explore', subagent: 0, answered: true, loads: [{ rule: A, via: 'native' }], reported: [{ path: A, value: 'none' }, { path: '.claude/rules/adr-0099.md', value: 'unsure', why: '(no load recorded)' }] },
      { by: 'Explore', subagent: 1, answered: false, loads: [{ rule: A, via: 'native', trigger: 'CLAUDE.md' }], reported: [] },
    ],
  }),
  log('2026-11-10T00:00:00Z', { external: true, ruleUse: [{ by: 'main', answered: true, loads: [{ rule: A, via: 'native' }], reported: [] }] }),
]

describe('ruleUseReport', () => {
  const report = ruleUseReport(logs, Date.parse('2026-11-08T00:00:00Z'))

  it('counts coverage over internal logs that ended since the start', () => {
    expect(report.coverage).toEqual({ logs: 2, withRuleUse: 1 })
  })

  it('gives the answered rate per agent type', () => {
    expect(report.answered).toEqual({ main: { entries: 1, answered: 1 }, Explore: { entries: 2, answered: 1 } })
  })

  it('rates each rule over the answering agents that loaded it, flagging thin data', () => {
    expect(report.rules).toEqual([
      { rule: A, loads: 3, answeringLoads: 2, changed: 0, changedOrConfirmed: 0.5, none: 0.5, enoughData: false,
        native: 3, hint: 0, triggers: { 'CLAUDE.md': 2, '(none)': 1 } },
      { rule: B, loads: 1, answeringLoads: 1, changed: 0, changedOrConfirmed: 0, none: 0, enoughData: false,
        native: 0, hint: 1, triggers: {} },
    ])
  })

  it('counts loads by via, and the data-quality gaps', () => {
    expect(report.via).toEqual({ native: 3, hint: 1 })
    expect(report.quality).toEqual({ noLoadRecorded: 1, unsure: 1, unansweredSubagents: 1 })
  })

  it('renders text that names each rule and says when data is thin', () => {
    const text = renderReport(report)
    expect(text).toContain(A)
    expect(text).toContain('not enough data')
  })
})
