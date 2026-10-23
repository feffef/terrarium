// Aggregation behind the Routine costs page (layers/journal/app/utils/routineRuns.ts).
import { describe, expect, it } from 'vitest'
import {
  formatRoutineMetric,
  routineChartCap,
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

describe('routineWeekTable', () => {
  const routines = [
    {
      name: 'a',
      runs: [run('2026-10-01T04:00:00Z', 1), run('2026-10-08T04:00:00Z', 2), run('2026-10-10T04:00:00Z', 3), run('2026-10-22T04:00:00Z', 4)],
    },
    { name: 'b', runs: [run('2026-10-16T04:00:00Z', 4)] },
  ]

  it('sums seven-day windows ending at the newest run, and totals rows and columns', () => {
    const t = routineWeekTable(routines, 'costUsd')
    expect(t.weeks).toEqual(['2026-10-08', '2026-10-15', '2026-10-22'])
    // a: the 10-01 run is exactly at the first window's start, so it belongs to the one before it.
    expect(t.rows).toEqual([
      { name: 'a', cells: [2, 3, 4], total: 9 },
      { name: 'b', cells: [0, 0, 4], total: 4 },
    ])
    expect(t.totals).toEqual([2, 3, 8])
    expect(t.grandTotal).toBe(13)
  })

  it('keeps only windows that start at or after the oldest run', () => {
    const t = routineWeekTable([{ name: 'a', runs: [run('2026-10-01T04:00:00Z', 1), run('2026-10-21T03:00:00Z', 2)] }], 'costUsd')
    expect(t.weeks).toEqual(['2026-10-14', '2026-10-21'])
  })

  it('sums the metric it is given', () => {
    const t = routineWeekTable([{ name: 'a', runs: [run('2026-10-01T03:00:00Z', 1, 900), run('2026-10-02T04:00:00Z', 1, 500), run('2026-10-08T04:00:00Z', 1, 250)] }], 'outputTokens')
    expect(t.rows[0]!.cells).toEqual([750])
  })

  it('is empty without a full window of runs', () => {
    expect(routineWeekTable([{ name: 'a', runs: [] }], 'costUsd')).toEqual({ weeks: [], rows: [{ name: 'a', cells: [], total: 0 }], totals: [], grandTotal: 0 })
    expect(routineWeekTable([{ name: 'a', runs: [run('2026-10-01T04:00:00Z', 1), run('2026-10-05T04:00:00Z', 1)] }], 'costUsd').weeks).toEqual([])
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
