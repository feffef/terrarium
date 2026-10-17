// Coverage for the read-first hint (issue #1754; contract in
// `scripts/hooks/read-first-hint.ts`).
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { CLOSE_SESSION_HINT, LATE_READ_NOTE, READ_FIRST, triggeredDocs } from '../../scripts/hooks/read-first-hint.ts'
import { runTsx } from '../support/run-script.ts'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const GIT = 'docs/agents/git-conventions.md'
const GH = 'docs/agents/github-integration.md'
const bashDocs = (command: string) => triggeredDocs('Bash', command).map((r) => r.doc)

describe('the registry', () => {
  it('names docs that exist, under a trigger CLAUDE.md states', () => {
    const claude = readFileSync(join(repo, 'CLAUDE.md'), 'utf8').replace(/\*\*/g, '').replace(/\s+/g, ' ')
    for (const r of READ_FIRST) {
      expect(existsSync(join(repo, r.doc)), r.doc).toBe(true)
      expect(claude, r.doc).toContain(r.doc)
      expect(claude, r.trigger).toContain(r.trigger)
    }
  })
})

describe('triggeredDocs()', () => {
  it('matches git beyond status/diff, and gh, only as a command word', () => {
    const cases: [string, string[]][] = [
      ['git log -1', [GIT]],
      ['git status', []],
      ['git diff HEAD~1', []],
      ['git', []],
      ['git -C /x status', []],
      ['git -C /x log', [GIT]],
      ['git --no-pager -c a=b show HEAD', [GIT]],
      ['cd x && git fetch origin main', [GIT]],
      ['git status | cat; git commit -F m', [GIT]],
      ['ls\ngit push', [GIT]],
      ['FOO=1 timeout 60 git rebase main', [GIT]],
      ['/usr/bin/git blame a', [GIT]],
      ['echo "git log"', []],
      ["grep -n 'git push' a && echo gh", []],
      ["cat > f <<'EOF'\ngit log\ngh pr list\nEOF\nwc -l f", []],
      ['ghost run; ./gh-helper; git-lfs ls; npx digit log', []],
      ['gh api repos/x/y', [GH]],
      ['git status && gh pr view 1', [GH]],
      ['git push && gh pr create', [GIT, GH]],
    ]
    for (const [command, docs] of cases) expect(bashDocs(command), command).toEqual(docs)
  })

  it('matches a screenshot script run directly or through tsx, not preview stop', () => {
    const UI = 'docs/agents/verifying-ui-changes.md'
    const cases: [string, string[]][] = [
      ['scripts/ui/preview.ts shot /x', [UI]],
      ['pnpm exec tsx scripts/ui/preview.ts shot --width 390 /x', [UI]],
      ['scripts/ui/preview.ts review / /tmp/out', [UI]],
      ['node_modules/.bin/tsx scripts/ui/screenshot.ts /x', [UI]],
      ['scripts/ui/preview.ts stop 123', []],
      ['cat scripts/ui/preview.ts', []],
    ]
    for (const [command, docs] of cases) expect(bashDocs(command), command).toEqual(docs)
  })

  it('matches every mcp__github__ tool and no other tool', () => {
    expect(triggeredDocs('mcp__github__issue_read', undefined).map((r) => r.doc)).toEqual([GH])
    expect(triggeredDocs('Read', 'git log')).toEqual([])
    expect(triggeredDocs('Bash', undefined)).toEqual([])
  })
})

describe('the hook entry (sh pre-filter → tsx)', () => {
  const run = (payload: unknown) =>
    spawnSync('sh', ['scripts/hooks/read-first-hint.sh'], {
      cwd: repo,
      input: typeof payload === 'string' ? payload : JSON.stringify(payload),
      encoding: 'utf8',
    })
  const dir = mkdtempSync(join(tmpdir(), 'read-first-'))
  const transcript = (name: string, records: unknown[]) => {
    const path = join(dir, name)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, records.map((r) => JSON.stringify(r)).join('\n') + '\n')
    return path
  }
  const empty = transcript('empty.jsonl', [{ type: 'user', cwd: repo, message: { content: 'hi' } }])
  const call = (command: string, extra: object = {}) => ({
    hook_event_name: 'PostToolUse', tool_name: 'Bash', cwd: repo, transcript_path: empty, tool_input: { command }, ...extra,
  })
  const context = (r: { stdout: string }) => (r.stdout ? JSON.parse(r.stdout).hookSpecificOutput.additionalContext as string : '')
  const toolUse = (id: string, name: string, input: object) => ({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input }] } })
  const toolResult = (id: string, content: string) => ({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content }] } })

  it('points to the doc on PostToolUse and PostToolUseFailure, without a rule header', () => {
    for (const event of ['PostToolUse', 'PostToolUseFailure']) {
      const r = run(call('cd x && git fetch origin main', { hook_event_name: event }))
      expect(r.status).toBe(0)
      expect(JSON.parse(r.stdout).hookSpecificOutput.hookEventName).toBe(event)
      expect(context(r)).toContain(GIT)
      expect(context(r)).not.toContain('Contents of .claude/rules/')
    }
    expect(context(run(call('x', { tool_name: 'mcp__github__get_me', tool_input: {} })))).toContain(GH)
  })

  it('ends a pointer hint with the late-read note exactly once, and not the close-session hint alone', () => {
    const count = (s: string) => s.split(LATE_READ_NOTE).length - 1
    for (const command of ['git log', 'git log && gh api x']) {
      const hint = context(run(call(command)))
      expect(count(hint), command).toBe(1)
      expect(hint.endsWith(LATE_READ_NOTE), command).toBe(true)
    }
    const ghRead = transcript('note-gh-read.jsonl', [toolUse('r', 'Read', { file_path: `${repo}/${GH}` })])
    const pr = run(call('x', { tool_name: 'mcp__github__create_pull_request', tool_input: {}, transcript_path: ghRead }))
    expect(context(pr)).toBe(CLOSE_SESSION_HINT)
  })

  it('skips tsx and writes nothing for a command with no git or gh word', () => {
    // The pre-filter reads the first `command` key; JSON.parse keeps the last.
    const probe = `{"tool_name":"Bash","cwd":${JSON.stringify(repo)},"transcript_path":${JSON.stringify(empty)},"tool_input":{"command":"ls -la","command":"git log"}}`
    expect(run(probe)).toMatchObject({ status: 0, stdout: '' })
  })

  it('stays silent once the transcript shows the doc read, shell-read or already pointed to', () => {
    const doc = readFileSync(join(repo, GIT), 'utf8')
    const read = transcript('read.jsonl', [toolUse('r', 'Read', { file_path: `/elsewhere/${GIT}` })])
    const shell = transcript('shell.jsonl', [toolUse('b', 'Bash', { command: `cat ${GIT}` }), toolResult('b', doc)])
    const first = context(run(call('git log')))
    const pointed = transcript('pointed.jsonl', [{ type: 'attachment', attachment: { type: 'hook_additional_context', content: [first] } }])
    for (const t of [read, shell, pointed]) expect(run(call('git log', { transcript_path: t })).stdout, t).toBe('')
    // Seeing one doc does not silence the other.
    expect(context(run(call('git log && gh api x', { transcript_path: pointed })))).toContain(GH)
  })

  it("dedupes a subagent against its own transcript, and points when that is missing", () => {
    const parent = transcript('p.jsonl', [toolUse('r', 'Read', { file_path: `${repo}/${GIT}` })])
    transcript('p/subagents/agent-a1.jsonl', [toolUse('r', 'Read', { file_path: `${repo}/${GIT}` })])
    transcript('p/subagents/agent-a2.jsonl', [{ type: 'user', message: { content: 'go' } }])
    const sub = (agent_id: string) => run(call('git log', { transcript_path: parent, agent_id }))
    expect(sub('a1').stdout).toBe('')
    expect(context(sub('a2'))).toContain(GIT)
    expect(context(sub('missing'))).toContain(GIT)
  })

  it('fails open: malformed payload or missing main transcript adds nothing', () => {
    expect(run('{"tool_input":{"command":"git log"')).toMatchObject({ status: 0, stdout: '' })
    expect(run(call('git log', { transcript_path: join(dir, 'nope.jsonl') }))).toMatchObject({ status: 0, stdout: '' })
  })

  it('says to invoke close-session after a main-session PR create, until the transcript shows it invoked', () => {
    const pr = (extra: object = {}) => context(run(call('x', { tool_name: 'mcp__github__create_pull_request', tool_input: {}, ...extra })))
    expect(pr()).toContain(CLOSE_SESSION_HINT)
    // Not tied to a doc pointer being due.
    const ghRead = transcript('gh-read.jsonl', [toolUse('r', 'Read', { file_path: `${repo}/${GH}` })])
    expect(pr({ transcript_path: ghRead })).toBe(CLOSE_SESSION_HINT)
    transcript('pr/subagents/agent-s1.jsonl', [{ type: 'user', message: { content: 'go' } }])
    expect(pr({ transcript_path: join(dir, 'pr.jsonl'), agent_id: 's1' })).not.toContain(CLOSE_SESSION_HINT)
    expect(pr({ hook_event_name: 'PostToolUseFailure' })).not.toContain(CLOSE_SESSION_HINT)
    const skill = transcript('skill.jsonl', [toolUse('s', 'Skill', { skill: 'close-session' })])
    const slash = transcript('slash.jsonl', [{ type: 'user', message: { content: '<command-name>/close-session</command-name>' } }])
    for (const t of [skill, slash]) expect(pr({ transcript_path: t }), t).not.toContain(CLOSE_SESSION_HINT)
    expect(context(run(call('x', { tool_name: 'mcp__github__get_me', tool_input: {} })))).not.toContain(CLOSE_SESSION_HINT)
  })

  it('--dry-run prints the pointer for an unread doc, and nothing for git status', () => {
    const dry = (command: string, tool_name = 'Bash') => {
      const input = JSON.stringify({ tool_name, cwd: repo, tool_input: { command } })
      return JSON.parse(runTsx(join(repo, 'scripts/hooks/read-first-hint.ts'), { args: ['--dry-run', '--input', input] })).hint as string | null
    }
    expect(dry('git log -1')).toContain(GIT)
    expect(dry('git status')).toBeNull()
    expect(dry('', 'mcp__github__create_pull_request')).toContain(CLOSE_SESSION_HINT)
  })
})
