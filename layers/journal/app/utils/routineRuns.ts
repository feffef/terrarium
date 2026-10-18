// Pure aggregation and formatting for the Routine runs page (`routines.vue` and
// the `::routine-chart` / `::routine-weekly-table` blocks). The numbers come from
// the `routines` collection, so a new run row shows up with no page edit.
import type { RoutineDoc } from '../types/journal'

export type RoutineRun = RoutineDoc['runs'][number]
export type RoutineMetric =
  | 'costUsd'
  | 'outputTokens'
  | 'inputTokens'
  | 'cacheReadTokens'
  | 'cacheWriteTokens'
  | 'durationSeconds'

export const ROUTINE_METRICS: readonly { key: RoutineMetric; label: string }[] = [
  { key: 'costUsd', label: 'Cost (USD)' },
  { key: 'outputTokens', label: 'Output tokens' },
  { key: 'inputTokens', label: 'Input tokens' },
  { key: 'cacheReadTokens', label: 'Cache reads' },
  { key: 'cacheWriteTokens', label: 'Cache writes' },
  { key: 'durationSeconds', label: 'Duration' },
]

const TOKENS = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

export function formatRoutineMetric(metric: RoutineMetric, value: number): string {
  if (metric === 'costUsd') return `$${value.toFixed(value >= 100 ? 0 : 2)}`
  if (metric === 'durationSeconds') {
    const minutes = Math.round(value / 60)
    return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`
  }
  return TOKENS.format(value)
}

const byStart = (a: RoutineRun, b: RoutineRun) => a.startedAt.localeCompare(b.startedAt)

export function sortedRuns(routine: RoutineDoc): RoutineRun[] {
  return [...routine.runs].sort(byStart)
}

/** The y-axis ceiling shared by every chart, so bars compare across Routines.
 *  One outlier run would flatten every chart, so a ceiling far above the 95th
 *  percentile is cut down to just over it; the taller bars are drawn clipped. */
export function routineChartCap(routines: readonly RoutineDoc[], metric: RoutineMetric): number {
  const values = routines.flatMap((r) => r.runs.map((run) => run[metric])).sort((a, b) => a - b)
  if (!values.length) return 0
  const max = values[values.length - 1]!
  const p95 = values[Math.ceil(values.length * 0.95) - 1]!
  return max > p95 * 2 ? p95 * 1.25 : max
}

/** The Monday (UTC) of the week a timestamp falls in, as `YYYY-MM-DD`. */
export function routineWeekStart(iso: string): string {
  const d = new Date(iso)
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

export interface RoutineWeekRow {
  name: string
  cells: number[]
  total: number
}

export interface RoutineWeekTable {
  /** Week-start dates, oldest first, with no gaps. */
  weeks: string[]
  rows: RoutineWeekRow[]
  totals: number[]
  grandTotal: number
}

/** Each Routine's `metric` summed per UTC week. */
export function routineWeekTable(routines: readonly RoutineDoc[], metric: RoutineMetric): RoutineWeekTable {
  const starts = routines.flatMap((r) => r.runs.map((run) => routineWeekStart(run.startedAt))).sort()
  const weeks: string[] = []
  if (starts.length) {
    const last = starts[starts.length - 1]!
    for (let w = starts[0]!; w <= last; ) {
      weeks.push(w)
      const next = new Date(w)
      next.setUTCDate(next.getUTCDate() + 7)
      w = next.toISOString().slice(0, 10)
    }
  }
  const rows = routines.map((r) => {
    const cells = weeks.map(() => 0)
    for (const run of r.runs) cells[weeks.indexOf(routineWeekStart(run.startedAt))]! += run[metric]
    return { name: r.name, cells, total: cells.reduce((a, b) => a + b, 0) }
  })
  const totals = weeks.map((_, i) => rows.reduce((a, row) => a + row.cells[i]!, 0))
  return { weeks, rows, totals, grandTotal: totals.reduce((a, b) => a + b, 0) }
}
