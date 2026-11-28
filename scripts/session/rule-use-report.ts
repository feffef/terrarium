// Aggregates the session logs' `ruleUse` (#3009) over a window, for a review
// of which rules earn their load (#3017, #3019).
//
// Usage:  tsx scripts/session/rule-use-report.ts --since ISO [--split] [--json] [--out PATH]
//   --split reports the main session and the subagents separately; subagents
//   show loads and triggers only, as they no longer rate (#3741).
//   Reads internal logs, current and archived, that ended since ISO. Prints a
//   text report, or JSON with --json; output above OUTPUT_FILE_THRESHOLD goes
//   to a file (resolveOutputTarget).
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { isExternalSession, NO_LOAD_WHY, ruleValue, valueWords, whyWord, type RuleUseEntry } from '../../shared/schemas/session.ts'
import { extractSwitch, fail, flagValue, resolveOutputTarget, root, runIfMain } from '../lib/cli.ts'
import { readSessionLogs, type SessionLog } from './journal-files.ts'

/** Below this many answering loads a rule's shares say little. */
export const ENOUGH_DATA = 20

export interface RuleRow {
  rule: string
  /** Every agent that loaded it. */
  loads: number
  /** Loads by agents that answered; the shares' denominator. */
  answeringLoads: number
  /** Each reported value's share of the answering loads; a load that gave none counts for none. */
  shares: Record<string, number>
  /** How often each fixed word followed a value (`missed:late`), over answering loads. */
  words: Record<string, number>
  enoughData: boolean
  start: number
  native: number
  hint: number
  read: number
  /** Native loads by the file that triggered them. */
  triggers: Record<string, number>
}

export interface RuleUseReport {
  since: string
  coverage: { logs: number; withRuleUse: number }
  answered: Record<string, { entries: number; answered: number }>
  rules: RuleRow[]
  via: { start: number; native: number; hint: number; read: number }
  quality: { noLoadRecorded: number }
}

const share = (n: number, of: number) => (of ? Math.round((1000 * n) / of) / 1000 : 0)

export function ruleUseReport(logs: SessionLog[], since: number): RuleUseReport {
  const inWindow = logs.filter(({ data }) => !isExternalSession(data) && Date.parse(String(data.endedAt ?? data.startedAt)) >= since)
  const entries = inWindow.flatMap(({ data }) => (data.ruleUse ?? []) as RuleUseEntry[])
  const answered: RuleUseReport['answered'] = {}
  const rows = new Map<string, Omit<RuleRow, 'shares'> & { values: Record<string, number> }>()
  const via = { start: 0, native: 0, hint: 0, read: 0 }
  const quality = { noLoadRecorded: 0 }
  for (const e of entries) {
    const a = (answered[e.by] ??= { entries: 0, answered: 0 })
    a.entries++
    if (e.answered) a.answered++
    for (const r of e.reported) if (r.why?.startsWith(NO_LOAD_WHY)) quality.noLoadRecorded++
    for (const l of e.loads) {
      const row = rows.get(l.rule) ?? { rule: l.rule, loads: 0, answeringLoads: 0, words: {}, enoughData: false, start: 0, native: 0, hint: 0, read: 0, triggers: {}, values: {} }
      rows.set(l.rule, row)
      row.loads++
      row[l.via]++
      via[l.via]++
      const trigger = l.trigger ?? '(none)'
      if (l.via === 'native') row.triggers[trigger] = (row.triggers[trigger] ?? 0) + 1
      if (!e.answered) continue
      row.answeringLoads++
      const reported = e.reported.find((r) => r.path === l.rule)
      if (!reported?.value) continue
      row.values[reported.value] = (row.values[reported.value] ?? 0) + 1
      const word = whyWord(reported.why)
      if (word && reported.value in valueWords) row.words[`${reported.value}:${word}`] = (row.words[`${reported.value}:${word}`] ?? 0) + 1
    }
  }
  const rules = [...rows.values()].map(({ values, ...row }) => ({
    ...row,
    shares: Object.fromEntries(ruleValue.options.filter((v) => values[v]).map((v) => [v, share(values[v]!, row.answeringLoads)])),
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

/** `loadsOnly` is for subagents, which no longer rate: no answered counts or shares. */
export function renderReport(r: RuleUseReport, loadsOnly = false): string {
  const lines = [
    `Rule use since ${r.since}`,
    `Coverage: ${r.coverage.withRuleUse} of ${r.coverage.logs} logs carry ruleUse`,
    '',
    ...(loadsOnly ? [] : [
      'Answered, by agent:',
      ...Object.entries(r.answered).map(([by, a]) => `  ${by}: ${a.answered}/${a.entries} (${pct(share(a.answered, a.entries))})`),
      '',
    ]),
    loadsOnly ? 'Per rule:' : 'Per rule (shares over answering agents that loaded it):',
    ...r.rules.flatMap((row) => [
      loadsOnly
        ? `  ${row.rule}: ${row.loads} loads`
        : `  ${row.rule}: ${row.loads} loads, ${row.answeringLoads} answering — ` +
          (row.enoughData
            ? Object.entries(row.shares).map(([v, s]) => `${v} ${pct(s)}`).join(', ') || 'no value reported'
            : `not enough data (under ${ENOUGH_DATA})`),
      ...(!loadsOnly && Object.keys(row.words).length ? [`    ${Object.entries(row.words).map(([w, n]) => `${w} ${n}`).join(', ')}`] : []),
      `    start ${row.start}, native ${row.native}, hint ${row.hint}, read ${row.read}${Object.keys(row.triggers).length ? `; triggers: ${Object.entries(row.triggers).map(([t, n]) => `${t} ${n}`).join(', ')}` : ''}`,
    ]),
    '',
    `Loads by via: start ${r.via.start}, native ${r.via.native}, hint ${r.via.hint}, read ${r.via.read}`,
    ...(loadsOnly ? [] : [`Data quality: ${r.quality.noLoadRecorded} reported with no load recorded`]),
  ]
  return `${lines.join('\n')}\n`
}

// Their shares differ a lot, so one combined table hides which side a rule steers (#3017).
export function splitByAgent(logs: SessionLog[]): { main: SessionLog[]; subagents: SessionLog[] } {
  const keep = (wantMain: boolean) =>
    logs.map((l) => ({ ...l, data: { ...l.data, ruleUse: ((l.data.ruleUse ?? []) as RuleUseEntry[]).filter((e) => (e.by === 'main') === wantMain) } }))
  return { main: keep(true), subagents: keep(false) }
}

function main(): void {
  const { on: json, rest: rest1 } = extractSwitch(process.argv.slice(2), '--json')
  const { on: split, rest: argv } = extractSwitch(rest1, '--split')
  const since = Date.parse(flagValue(argv, '--since') ?? '')
  if (Number.isNaN(since)) fail('usage: rule-use-report.ts --since ISO [--split] [--json] [--out PATH]')
  const logs = readSessionLogs(root, { archived: true })
  let out: string
  if (split) {
    const parts = splitByAgent(logs)
    const [m, s] = [ruleUseReport(parts.main, since), ruleUseReport(parts.subagents, since)]
    out = json ? `${JSON.stringify({ main: m, subagents: s }, null, 2)}\n` : `== Main session ==\n${renderReport(m)}\n== Subagents (loads only) ==\n${renderReport(s, true)}`
  } else {
    const report = ruleUseReport(logs, since)
    out = json ? `${JSON.stringify(report, null, 2)}\n` : renderReport(report)
  }
  const target = resolveOutputTarget(argv, out.length, join(tmpdir(), `rule-use-report.${json ? 'json' : 'txt'}`))
  if (!target) return void process.stdout.write(out)
  writeFileSync(target, out)
  process.stdout.write(`rule-use-report: ${out.length} bytes written to ${target}\n`)
}

runIfMain(import.meta.url, main)
