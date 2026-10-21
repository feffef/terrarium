// The audit-skills mechanical check (#1627, #1720): every issue or PR state a
// run writes must match GitHub now. A prose rule kept failing because a run
// can't tell its own reads from the live reads its subagents made, so this
// reads each cited number itself.
//
// Usage:  tsx .agents/skills/audit-skills/scripts/check-states.ts [--text FILE]
// Default: the lines the branch adds under the Inventory, against origin/main.
// `--text` checks a file instead (an issue or comment body before posting).
// Exit 1 on any mismatch or unreadable number.
import { readFileSync } from 'node:fs'
import { git } from '../../../../scripts/lib/git.ts'
import { flagValue, root, runIfMain } from '../../../../scripts/lib/cli.ts'
import { getJson, resolveAccess, type Access } from '../../../../scripts/lib/github-client.ts'

const INVENTORY_DIR = 'layers/journal/content/current/skills/'
/** How close, in characters, a state word must sit to a `#N` to be its claim. */
const NEAR = 40
const CLAUSE_BREAK = /[;:]|\.\s|\u2014/
/** "was open", "then closed": a past issue state, not a claim about now. */
const HISTORICAL = /\b(?:was|were|been|once|then|originally)\s+$/i
const STATE_WORD = /\b(reopened|open|closed|resolved|fixed|merged|wontfix)\b/gi

export interface StateClaim {
  file: string
  line: number
  num: number
  word: string
}

/** What the issues endpoint says; a PR carries `pull_request`. */
export interface IssueState {
  state: string
  state_reason?: string | null
  pull_request?: { merged_at?: string | null }
}

/** Claims in one run of text: a state word belongs to the nearest `#N` within
 *  `NEAR` characters with no other number and no clause break between them.
 *  Conservative on purpose: a missed claim is no worse than having no check,
 *  while a false one makes a run reword a true note. So "open-issue home" and
 *  "was open then" are not claims. `lineAt` maps a text offset to its line. */
export function claimsIn(text: string, file: string, lineAt: (offset: number) => number): StateClaim[] {
  const refs = [...text.matchAll(/#(\d+)\b/g)].map((m) => ({ num: Number(m[1]), at: m.index, end: m.index + m[0].length }))
  const found = new Map<string, StateClaim>()
  for (const w of text.matchAll(STATE_WORD)) {
    const end = w.index + w[0].length
    const stateOfIssue = /^(?:open|reopened|closed)$/i.test(w[0])
    if (text[end] === '-' || (stateOfIssue && HISTORICAL.test(text.slice(Math.max(0, w.index - 16), w.index)))) continue
    const reach = refs.flatMap((r) => {
      const between = r.at >= end ? text.slice(end, r.at) : text.slice(r.end, w.index)
      const ok = between.length <= NEAR && !CLAUSE_BREAK.test(between) && !/#\d/.test(between)
      return ok ? [{ r, gap: between.length }] : []
    })
    const best = reach.sort((x, y) => x.gap - y.gap)[0]
    if (!best) continue
    const word = w[1]!.toLowerCase()
    const key = `${best.r.num}:${word}`
    if (!found.has(key)) found.set(key, { file, line: lineAt(best.r.at), num: best.r.num, word })
  }
  return [...found.values()]
}

/** Claims on the lines a `git diff -U0` adds. Consecutive added lines are one
 *  block, so a folded YAML note's state word and number may sit on neighbours. */
export function claimsInDiff(diff: string): StateClaim[] {
  const claims: StateClaim[] = []
  let file = ''
  let next = 0
  let block: { start: number; lines: string[] } | null = null
  const flush = () => {
    if (!block) return
    const starts: number[] = []
    let length = 0
    for (const l of block.lines) {
      starts.push(length)
      length += l.length + 1
    }
    const { start } = block
    const lineAt = (offset: number) => start + starts.findLastIndex((s) => s <= offset)
    claims.push(...claimsIn(block.lines.join(' '), file, lineAt))
    block = null
  }
  for (const row of diff.split('\n')) {
    if (row.startsWith('+++ ')) {
      flush()
      file = row.slice(4).replace(/^b\//, '')
    } else if (row.startsWith('@@')) {
      flush()
      next = Number(/\+(\d+)/.exec(row)?.[1] ?? 0)
    } else if (row.startsWith('+')) {
      block ??= { start: next, lines: [] }
      block.lines.push(row.slice(1))
      next++
    } else flush()
  }
  flush()
  return claims
}

/** Why the claim is wrong, or null when GitHub agrees. `fixed` and `resolved`
 *  mean closed (a merged PR is closed). */
export function mismatch(claim: StateClaim, actual: IssueState): string | null {
  const merged = Boolean(actual.pull_request?.merged_at)
  const says = merged ? 'merged' : actual.state === 'closed' ? `closed${actual.state_reason ? ` (${actual.state_reason})` : ''}` : 'open'
  const ok =
    claim.word === 'merged' ? merged
    : claim.word === 'open' || claim.word === 'reopened' ? actual.state === 'open'
    : claim.word === 'wontfix' ? actual.state === 'closed' && actual.state_reason === 'not_planned'
    : actual.state === 'closed'
  return ok ? null : `GitHub says ${says}`
}

function main(): void {
  const argv = process.argv.slice(2)
  const textFile = flagValue(argv, '--text')
  const text = textFile ? readFileSync(textFile, 'utf8') : ''
  const claims = textFile
    ? claimsIn(text, textFile, (offset) => text.slice(0, offset).split('\n').length)
    : claimsInDiff(git(['diff', '--no-renames', '-U0', 'origin/main...HEAD', '--', INVENTORY_DIR], root))
  const access: Access = resolveAccess(root)
  const actual = new Map<number, IssueState | string>()
  let bad = 0
  for (const claim of claims) {
    if (!actual.has(claim.num)) {
      try {
        actual.set(claim.num, getJson<IssueState>(access, `issues/${claim.num}`))
      } catch (err) {
        actual.set(claim.num, err instanceof Error ? err.message.split('\n')[0]! : String(err))
      }
    }
    const got = actual.get(claim.num)!
    const why = typeof got === 'string' ? `unreadable: ${got}` : mismatch(claim, got)
    if (why) {
      bad++
      console.log(`${claim.file}:${claim.line}  #${claim.num} written "${claim.word}", ${why}`)
    }
  }
  console.log(`check-states: ${claims.length} claim(s) on ${actual.size} number(s), ${bad} mismatch(es)`)
  if (bad) process.exit(1)
}

runIfMain(import.meta.url, main)
