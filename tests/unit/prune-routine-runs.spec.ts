import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { pruneRuns } from '../../scripts/session/prune-routine-runs'

const run = (n: number) =>
  `  - session: s${n}\n    startedAt: "2026-10-${String(n).padStart(2, '0')}T01:00:00Z"\n    durationSeconds: 60\n`
const file = (ns: number[]) => `name: digest\nruns:\n${ns.map(run).join('')}`

describe('pruneRuns()', () => {
  it('keeps the newest runs by start time, whatever the order in the file', () => {
    const { text, dropped } = pruneRuns(file([3, 1, 4, 2]), 2)
    expect(dropped).toBe(2)
    expect(parse(text).runs.map((r: { session: string }) => r.session)).toEqual(['s3', 's4'])
  })

  it('leaves a file at or under the limit untouched', () => {
    const text = file([1, 2])
    expect(pruneRuns(text, 2)).toEqual({ text, dropped: 0 })
  })
})
