// Aggregates the session logs' `ruleUse` (#3009) over a window, for a review
// of which rules earn their load (#3017, #3019).
//
// Usage:  tsx scripts/session/rule-use-report.ts --since ISO [--json] [--out PATH]
//   Reads internal logs, current and archived, that ended since ISO. Prints a
//   text report, or JSON with --json; output above OUTPUT_FILE_THRESHOLD goes
//   to a file (resolveOutputTarget).
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { isExternalSession, type RuleUseEntry } from '../../shared/schemas/session.ts'
import { extractSwitch, fail, flagValue, resolveOutputTarget, root, runIfMain } from '../lib/cli.ts'
import { readSessionLogs, type SessionLog } from './journal-files.ts'
import { NO_LOAD_WHY } from './transcript-trace.ts'

/** Below this many answering loads a rule's shares say little. */
export const ENOUGH_DATA = 20

export interface RuleRow {
  rule: string
  /** Every agent that loaded it. */
  loads: number
  /** Loads by agents that answered; the shares' denominator. */
  answeringLoads: number
  changed: number
  changedOrConfirmed: number
  none: number
  enoughData: boolean
  native: number
  hint: number
  /** Native loads by the file that triggered them. */
  triggers: Record<string, number>
}

export interface RuleUseReport {
  since: string
  coverage: { logs: number; withRuleUse: number }
  answered: Record<string, { entries: number; answered: number }>
  rules: RuleRow[]
  via: { native: number; hint: number }
  /** `unsure` includes unknown values the writer coerced to it; an unanswered
   *  subagent may never have been asked (its loads still count, #3019). */
  quality: { noLoadRecorded: number; unsure: number; unansweredSubagents: number }
}

const share = (n: number, of: number) => (of ? Math.round((1000 * n) / of) / 1000 : 0)

export function ruleUseReport(logs: SessionLog[], since: number): RuleUseReport {
  const inWindow = logs.filter(({ data }) => !isExternalSession(data) && Date.parse(String(data.endedAt ?? data.startedAt)) >= since)
  const entries = inWindow.flatMap(({ data }) => (data.ruleUse ?? []) as RuleUseEntry[])
  const answered: RuleUseReport['answered'] = {}
  const rows = new Map<string, RuleRow & { values: Record<string, number> }>()
  const via = { native: 0, hint: 0 }
  const quality = { noLoadRecorded: 0, unsure: 0, unansweredSubagents: 0 }
  for (const e of entries) {
    const a = (answered[e.by] ??= { entries: 0, answered: 0 })
    a.entries++
    if (e.answered) a.answered++
    else if (e.by !== 'main') quality.unansweredSubagents++
    for (const r of e.reported) {
      if (r.why?.startsWith(NO_LOAD_WHY)) quality.noLoadRecorded++
      if (r.value === 'unsure') quality.unsure++
    }
    for (const l of e.loads) {
      const row = rows.get(l.rule) ?? { rule: l.rule, loads: 0, answeringLoads: 0, changed: 0, changedOrConfirmed: 0, none: 0, enoughData: false, native: 0, hint: 0, triggers: {}, values: {} }
      rows.set(l.rule, row)
      row.loads++
      row[l.via]++
      via[l.via]++
      const trigger = l.trigger ?? '(none)'
      if (l.via === 'native') row.triggers[trigger] = (row.triggers[trigger] ?? 0) + 1
      if (!e.answered) continue
      row.answeringLoads++
      const value = e.reported.find((r) => r.path === l.rule)?.value
      if (value) row.values[value] = (row.values[value] ?? 0) + 1
    }
  }
  const rules = [...rows.values()].map(({ values, ...row }) => ({
    ...row,
    changed: share(values.changed ?? 0, row.answeringLoads),
    changedOrConfirmed: share((values.changed ?? 0) + (values.confirmed ?? 0), row.answeringLoads),
    none: share(values.none ?? 0, row.answeringLoads),
    enoughData: row.answeringLoads >= ENOUGH_DATA,
  })).sort((a, b) => b.loads - a.loads || a.rule.localeCompare(b.rule))
  return {
    since: new Date(since).toISOString(),
    coverage: { logs: inWindow.length, withRuleUse: inWindow.filter(({ data }) => Array.isArray(data.ruleUse)).length },
    answered,
    rules,
    via,
    quality,
  }
}

const pct = (n: number) => `${Math.round(n * 100)}%`

export function renderReport(r: RuleUseReport): string {
  const lines = [
    `Rule use since ${r.since}`,
    `Coverage: ${r.coverage.withRuleUse} of ${r.coverage.logs} logs carry ruleUse`,
    '',
    'Answered, by agent:',
    ...Object.entries(r.answered).map(([by, a]) => `  ${by}: ${a.answered}/${a.entries} (${pct(share(a.answered, a.entries))})`),
    '',
    'Per rule (shares over answering agents that loaded it):',
    ...r.rules.flatMap((row) => [
      `  ${row.rule}: ${row.loads} loads, ${row.answeringLoads} answering — ` +
        (row.enoughData
          ? `changed ${pct(row.changed)}, changed or confirmed ${pct(row.changedOrConfirmed)}, none ${pct(row.none)}`
          : `not enough data (under ${ENOUGH_DATA})`),
      `    native ${row.native}, hint ${row.hint}${Object.keys(row.triggers).length ? `; triggers: ${Object.entries(row.triggers).map(([t, n]) => `${t} ${n}`).join(', ')}` : ''}`,
    ]),
    '',
    `Loads by via: native ${r.via.native}, hint ${r.via.hint}`,
    `Data quality: ${r.quality.noLoadRecorded} reported with no load recorded, ${r.quality.unsure} unsure (includes coerced unknown values), ${r.quality.unansweredSubagents} subagent entries unanswered`,
  ]
  return `${lines.join('\n')}\n`
}

function main(): void {
  const { on: json, rest: argv } = extractSwitch(process.argv.slice(2), '--json')
  const since = Date.parse(flagValue(argv, '--since') ?? '')
  if (Number.isNaN(since)) fail('usage: rule-use-report.ts --since ISO [--json] [--out PATH]')
  const report = ruleUseReport(readSessionLogs(root, { archived: true }), since)
  const out = json ? `${JSON.stringify(report, null, 2)}\n` : renderReport(report)
  const target = resolveOutputTarget(argv, out.length, join(tmpdir(), `rule-use-report.${json ? 'json' : 'txt'}`))
  if (!target) return void process.stdout.write(out)
  writeFileSync(target, out)
  process.stdout.write(`rule-use-report: ${out.length} bytes written to ${target}\n`)
}

runIfMain(import.meta.url, main)
