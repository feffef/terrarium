import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { appendRuns, pruneRuns, ROUTINES_DIR, RUNS_KEPT, run } from '../../scripts/session/prune-routine-runs'

const seedRun = (n: number) =>
  `  - session: s${n}\n    startedAt: "2026-10-${String(n).padStart(2, '0')}T01:00:00Z"\n    durationSeconds: 60\n`
const file = (ns: number[]) => `name: digest\nruns:\n${ns.map(seedRun).join('')}`

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

const usage = (session: string) => ({
  session,
  input_tokens: 10,
  output_tokens: 20,
  cache_read_tokens: 30,
  cache_write_tokens: 40,
  cost_usd: 1.5,
})
const scored = (session: string) => ({ session, startedAt: '2026-10-20T01:00:00Z', durationSeconds: 90 })
const row = (session: string) =>
  `  - session: ${session}\n    startedAt: 2026-10-20T01:00:00Z\n    durationSeconds: 90\n    inputTokens: 10\n    outputTokens: 20\n    cacheReadTokens: 30\n    cacheWriteTokens: 40\n    costUsd: 1.5\n`

describe('appendRuns()', () => {
  it('appends only sessions the file does not list yet, in the existing row shape', () => {
    const before = `name: digest\nruns:\n${row('s1')}`
    const r = appendRuns(before, 'digest', [scored('s1'), scored('s9')], new Map([['s1', usage('s1')], ['s9', usage('s9')]]))
    expect(r).toEqual({ text: `${before}${row('s9')}`, appended: 1, skipped: [] })
  })

  it('creates a missing file with the name and the new rows', () => {
    expect(appendRuns(undefined, 'digest', [scored('s9')], new Map([['s9', usage('s9')]])).text).toBe(
      `name: digest\nruns:\n${row('s9')}`,
    )
  })

  it('skips and reports a run with no usage instead of writing blanks', () => {
    const before = `name: digest\nruns:\n${row('s1')}`
    expect(appendRuns(before, 'digest', [scored('s9')], new Map())).toEqual({ text: before, appended: 0, skipped: ['s9'] })
  })
})

describe('run()', () => {
  const tmp = () => {
    const cwd = mkdtempSync(join(tmpdir(), 'routines-'))
    mkdirSync(join(cwd, ROUTINES_DIR), { recursive: true })
    return cwd
  }
  const sessions = (path: string) => parse(readFileSync(path, 'utf8')).runs.map((r: { session: string }) => r.session)

  it('appends, then prunes to the newest RUNS_KEPT, and reports both per file', () => {
    const cwd = tmp()
    const full = Array.from({ length: RUNS_KEPT }, (_, i) => i + 1)
    writeFileSync(join(cwd, ROUTINES_DIR, 'digest.yml'), file(full))
    writeFileSync(join(cwd, 'usage.jsonl'), `${JSON.stringify(usage('s99'))}\n\n`)
    const routineRuns = [{ routine: 'digest', runs: [scored('s99'), scored('s98')] }]
    writeFileSync(join(cwd, 'scorecard.json'), JSON.stringify({ routineRuns }))
    const report = run(['--append', join(cwd, 'usage.jsonl'), '--scorecard', join(cwd, 'scorecard.json')], cwd)
    expect(report).toEqual(['digest.yml: appended 1, skipped 1 without usage (s98), dropped 1'])
    const kept = sessions(join(cwd, ROUTINES_DIR, 'digest.yml'))
    expect(kept).toHaveLength(RUNS_KEPT)
    expect(kept).not.toContain('s1')
    expect(kept.at(-1)).toBe('s99')
  })

  it('only prunes without --append', () => {
    const cwd = tmp()
    writeFileSync(join(cwd, ROUTINES_DIR, 'digest.yml'), file(Array.from({ length: RUNS_KEPT + 2 }, (_, i) => i + 1)))
    expect(run([], cwd)).toEqual([`digest.yml: dropped 2 run(s) beyond the newest ${RUNS_KEPT}`])
  })

  it('fails with a non-zero exit when --append comes without --scorecard', () => {
    const r = spawnSync('pnpm', ['exec', 'tsx', 'scripts/session/prune-routine-runs.ts', '--append', 'usage.jsonl'], { encoding: 'utf8' })
    expect(r.status).not.toBe(0)
    expect(r.stderr).toContain('--append <usage.jsonl> and --scorecard <scorecard.json> go together')
  })
})
