// Aggregation behind the Routine costs page (layers/journal/app/utils/routineRuns.ts).
import { describe, expect, it } from 'vitest'
import {
  formatRoutineMetric,
  routineChartCap,
  routineWeekStart,
  routineWeekTable,
} from '../../app/utils/routineRuns.ts'

const run = (startedAt: string, costUsd: number, outputTokens = 0) => ({
  session: 's',
  startedAt,
  durationSeconds: 60,
  inputTokens: 0,
  outputTokens,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  costUsd,
})

describe('routineWeekStart', () => {
  it('maps any day to its Monday, in UTC', () => {
    expect(routineWeekStart('2026-10-12T00:00:00Z')).toBe('2026-10-12') // Monday
    expect(routineWeekStart('2026-10-18T23:59:00Z')).toBe('2026-10-12') // Sunday
    expect(routineWeekStart('2026-10-19T00:01:00Z')).toBe('2026-10-19')
  })
})

describe('routineWeekTable', () => {
  const routines = [
    {
      name: 'a',
      runs: [run('2026-10-05T04:00:00Z', 1), run('2026-10-19T04:00:00Z', 2), run('2026-10-20T04:00:00Z', 3), run('2026-10-25T04:00:00Z', 4)],
    },
    { name: 'b', runs: [run('2026-10-13T04:00:00Z', 4)] },
  ]

  it('sums per week, fills the gap week and totals rows and columns', () => {
    const t = routineWeekTable(routines, 'costUsd')
    expect(t.weeks).toEqual(['2026-10-05', '2026-10-12', '2026-10-19'])
    expect(t.rows).toEqual([
      { name: 'a', cells: [1, 0, 9], total: 10 },
      { name: 'b', cells: [0, 4, 0], total: 4 },
    ])
    expect(t.totals).toEqual([1, 4, 9])
    expect(t.grandTotal).toBe(14)
  })

  it('drops an incomplete first and last week', () => {
    const t = routineWeekTable(
      [{ name: 'a', runs: [run('2026-09-17T04:00:00Z', 5), run('2026-09-22T04:00:00Z', 1), run('2026-09-29T04:00:00Z', 2), run('2026-10-07T04:00:00Z', 7)] }],
      'costUsd',
    )
    expect(t.weeks).toEqual(['2026-09-21', '2026-09-28'])
    expect(t.rows[0]!.cells).toEqual([1, 2])
  })

  it('sums the metric it is given', () => {
    const t = routineWeekTable([{ name: 'a', runs: [run('2026-10-05T04:00:00Z', 1, 500), run('2026-10-11T04:00:00Z', 1, 250)] }], 'outputTokens')
    expect(t.rows[0]!.cells).toEqual([750])
  })

  it('is empty without runs', () => {
    expect(routineWeekTable([{ name: 'a', runs: [] }], 'costUsd')).toEqual({ weeks: [], rows: [{ name: 'a', cells: [], total: 0 }], totals: [], grandTotal: 0 })
  })
})

describe('routineChartCap', () => {
  const runsOf = (values: number[]) => [{ name: 'a', runs: values.map((v, i) => run(`2026-10-${10 + i}T04:00:00Z`, v)) }]

  it('keeps the maximum when no run is an outlier', () => {
    expect(routineChartCap(runsOf([1, 2, 3, 4]), 'costUsd')).toBe(4)
  })

  it('cuts an outlier down to just above the 95th percentile', () => {
    const values = [...Array.from({ length: 19 }, () => 10), 500]
    expect(routineChartCap(runsOf(values), 'costUsd')).toBe(12.5)
  })

  it('is 0 without runs', () => {
    expect(routineChartCap([{ name: 'a', runs: [] }], 'costUsd')).toBe(0)
  })
})

describe('formatRoutineMetric', () => {
  it('formats dollars, tokens and durations', () => {
    expect(formatRoutineMetric('costUsd', 7.7473)).toBe('$7.75')
    expect(formatRoutineMetric('costUsd', 121.48)).toBe('$121')
    expect(formatRoutineMetric('cacheReadTokens', 22_557_819)).toBe('22.6M')
    expect(formatRoutineMetric('outputTokens', 950)).toBe('950')
    expect(formatRoutineMetric('durationSeconds', 1147)).toBe('19m')
    expect(formatRoutineMetric('durationSeconds', 5642)).toBe('1h 34m')
  })
})
