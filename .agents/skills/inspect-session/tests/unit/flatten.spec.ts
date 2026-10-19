import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { bashReads, flatten, parsePage, report } from '../../scripts/flatten.ts'
import { coverageLine, nextLine, parseLine, toLine, type FlatLine } from '../../scripts/flat.ts'

const page = (name: string) => parsePage(readFileSync(join(import.meta.dirname, 'fixtures', name), 'utf8'), name)
const older = page('page-older.txt')
const newer = page('page-newer.txt')
const { lines, meta } = flatten([newer, older], 'session_01Fixture', null)
const at = (uuidTime: string): FlatLine => lines.find((l) => l.at.endsWith(uuidTime))!

describe('parsePage', () => {
  it('reads a wrapped and an unwrapped page, and takes a missing has_more as the session start', () => {
    expect(older).toMatchObject({ firstId: 'o1', hasMore: false })
    expect(newer).toMatchObject({ firstId: 'n1', hasMore: true })
    expect(page('page-older-repeat.txt').data).toHaveLength(11)
  })
})

describe('flatten', () => {
  it('writes one line per event, oldest first, whatever order the pages came in', () => {
    expect(lines).toHaveLength(20)
    expect(lines.map((l) => l.n)).toEqual([...Array(20).keys()].map((i) => i + 1))
    expect(lines[0]!.input).toBe('Please fix the PR docs')
    expect(lines.at(-1)!.kind).toBe('other/prompt_suggestion')
  })

  it('drops image blocks', () => {
    const sed = at('10:00:05')
    expect(sed.result).toContain('[image dropped]')
    expect(lines.map(toLine).join('\n')).not.toContain('iVBORw0KGgo')
  })

  it('puts each result on its call line and points the result line back to it', () => {
    expect(at('10:00:01').result).toContain('Landing a gated PR')
    expect(at('10:00:02').input).toBe(`result of L${at('10:00:01').n}`)
  })

  it('tags Read, a Bash read and a Skill call as reads, but not a heredoc', () => {
    expect(at('10:00:01')).toMatchObject({ tags: ['read'], target: '/home/user/terrarium/docs/agents/pr-workflow.md' })
    expect(at('10:00:05')).toMatchObject({ tags: ['read'], target: 'sed -n 1,40p CLAUDE.md' })
    expect(at('10:01:00')).toMatchObject({ tags: ['read'], target: '.agents/skills/close-session/SKILL.md' })
    expect(at('10:00:03').tags).toEqual([])
  })

  it("counts only a pipeline's first command, on a path, as a Bash read", () => {
    expect(bashReads('cd x && cat a.md | head -5 && git show origin/main:b.md')).toEqual(['cat a.md', 'git show origin/main:b.md'])
    expect(bashReads('pnpm exec tsx scripts/gate/gate.ts | tail -20')).toEqual([])
    expect(bashReads('find . -name x.ts | grep src/')).toEqual([])
    expect(bashReads("sed -i 's/a/b/' f.md; tail -3")).toEqual([])
  })

  it('joins a background dispatch to its later hand-back by agent id', () => {
    const dispatch = at('10:00:07')
    const handback = at('10:01:04')
    expect(dispatch.tags).toEqual(['dispatch'])
    expect(dispatch.result).toBe(`agent=agbg1 handback=L${handback.n} reply: Found 3 failing logs`)
    expect(handback).toMatchObject({ kind: 'user/handback', tags: ['handback'], input: `from agbg1, dispatch L${dispatch.n}` })
  })

  it('labels subagent lines and tags one whose dispatch is out of range', () => {
    expect(at('10:00:09')).toMatchObject({ agent: 'sub:agbg1', tags: ['error', 'read'] })
    expect(at('10:01:05')).toMatchObject({ agent: 'sub:aorph', tags: ['dispatch-not-in-range'] })
  })

  it('tags only the typed prompt as human, not a hook, task notification or hand-back', () => {
    expect(lines.filter((l) => l.tags.includes('human-prompt')).map((l) => l.at)).toEqual(['2026-10-19T10:00:00'])
    expect(at('10:01:02').kind).toBe('user/synthetic')
    expect(at('10:01:03').kind).toBe('user/task-notification')
  })

  it('reaches the session start when the oldest page has no has_more', () => {
    expect(meta).toMatchObject({ pages: 2, events: 20, reachedStart: true, duplicates: [] })
    expect(nextLine(meta)).toBe('NEXT: done, session start reached')
  })

  it('merges pages from several fetchers into the same file, whatever order they arrive in', () => {
    const repeat = page('page-older-repeat.txt')
    const inOrder = flatten([older, newer], 'x', null)
    for (const pages of [[newer, older], [newer, repeat, older], [repeat, newer, older]]) {
      const r = flatten(pages, 'x', null)
      expect(r.lines.map(toLine)).toEqual(inOrder.lines.map(toLine))
      expect(r.meta).toMatchObject({ pages: 2, reachedStart: true, nextBeforeId: 'o1' })
    }
  })

  it('drops and reports a page whose first_id repeats', () => {
    const r = flatten([newer, older, page('page-older-repeat.txt')], 'x', null)
    expect(r.lines).toHaveLength(20)
    expect(r.meta.duplicates).toEqual([{ file: 'page-older-repeat.txt', firstId: 'o1' }])
    expect(report(r.meta, 'f.txt', 20)).toContain('DUPLICATE: page-older-repeat.txt repeats page first_id=o1')
  })

  it('points to the page before the oldest one, until the page limit', () => {
    const one = flatten([newer], 'x', null, 1).meta
    expect(one).toMatchObject({ reachedStart: false, nextBeforeId: 'n1' })
    expect(nextLine(one)).toBe('NEXT: page limit reached (1 of 1); report coverage as is')
    expect(nextLine({ ...one, pageLimit: 5 })).toBe('NEXT: fetch list_events limit 100 before_id=n1')
  })
})

describe('the line format', () => {
  it('round-trips a line', () => {
    for (const l of lines) expect(parseLine(toLine(l))).toEqual({ ...l, input: l.input.replace(/\s+/g, ' ').trim(), result: l.result.replace(/\s+/g, ' ').trim(), target: l.target.replace(/\s+/g, ' ').trim() })
  })

  it('names the source of the blind spots in the coverage line', () => {
    expect(coverageLine({ ...meta, sessionLog: 'layers/journal/content/current/sessions/x.yml' })).toContain('rules: from session log layers/journal/content/current/sessions/x.yml; workflow agents: reads only, no turns')
    expect(coverageLine(meta)).toContain('no session log yet')
  })
})
