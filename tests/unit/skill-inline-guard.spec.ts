// Coverage for the Skill-inline guard (issue #1018; rationale and detection
// contract in `scripts/skill-inline-guard.ts`). The pure core is pinned
// directly against parsed transcript records — the same shape
// `loop-only-tool-guard.spec.ts` uses for its `<command-name>` fixtures — plus
// the CLI's stdin→deny-JSON path and `--dry-run`, exercised end to end against
// the real script (ADR-0004's reviewability bar for an unattended hook).
import { execFileSync } from 'node:child_process'
import { rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { checkSkillInlineCall, denyOutputFor, formatGuardMessage } from '../../scripts/skill-inline-guard.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SCRIPT = join(root, 'scripts', 'skill-inline-guard.ts')

/** A transcript `user` record carrying a slash-command expansion, in the exact
 *  shape a live transcript uses — the same fixture shape as
 *  `loop-only-tool-guard.spec.ts`'s `commandTurn`. */
function commandTurn(name: string): Record<string, unknown> {
  return {
    type: 'user',
    message: { role: 'user', content: `<command-message>${name}</command-message>\n<command-name>/${name}</command-name>` },
  }
}

describe('checkSkillInlineCall() — the pure predicate (issue #1018)', () => {
  it('DENIES: the recorded regression — a Skill call naming a skill this turn already inlined', () => {
    const finding = checkSkillInlineCall({ skill: 'digest' }, [commandTurn('digest')])
    expect(finding?.name).toBe('digest')
    expect(finding?.undeterminable).toBe(false)
  })

  it('DENIES: the `command` argument shape, and a leading slash on the call side', () => {
    expect(checkSkillInlineCall({ command: '/audit-skills' }, [commandTurn('audit-skills')])?.name).toBe('audit-skills')
  })

  it('ALLOWS: an ordinary interactive Skill call — no matching `<command-name>` block this turn', () => {
    expect(checkSkillInlineCall({ skill: 'domain-modeling' }, [commandTurn('digest')])).toBeNull()
    expect(checkSkillInlineCall({ skill: 'domain-modeling' }, [])).toBeNull()
  })

  it('does not mistake a lookalike command (/digest-something) for the real one', () => {
    expect(checkSkillInlineCall({ skill: 'digest' }, [commandTurn('digest-weekly')])).toBeNull()
  })

  it('does not take a command name quoted inside a tool_result as evidence of inlining', () => {
    const readingALogAboutIt: Record<string, unknown> = {
      type: 'user',
      message: { role: 'user', content: [{ type: 'tool_result', content: '<command-name>/digest</command-name>' }] },
    }
    expect(checkSkillInlineCall({ skill: 'digest' }, [readingALogAboutIt])).toBeNull()
  })

  it('FAILS CLOSED: an unreadable transcript (`records: null`) denies, even without a real match', () => {
    const finding = checkSkillInlineCall({ skill: 'digest' }, null)
    expect(finding?.name).toBe('digest')
    expect(finding?.undeterminable).toBe(true)
  })

  it('ALLOWS: a call naming no skill at all — nothing to compare against', () => {
    expect(checkSkillInlineCall({}, null)).toBeNull()
    expect(checkSkillInlineCall({ skill: '' }, [commandTurn('digest')])).toBeNull()
  })

  it('never throws on a null / non-object tool_input', () => {
    expect(checkSkillInlineCall(null, [commandTurn('digest')])).toBeNull()
    expect(checkSkillInlineCall('a string', [commandTurn('digest')])).toBeNull()
  })
})

describe('formatGuardMessage()', () => {
  it('names the skill and tells the agent to follow the inlined body', () => {
    const msg = formatGuardMessage(checkSkillInlineCall({ skill: 'digest' }, [commandTurn('digest')])!)
    expect(msg).toContain('issue #1018')
    expect(msg).toContain('digest')
    expect(msg).toMatch(/follow the already-inlined body/i)
  })

  it('says plainly that an unreadable transcript is a fail-closed denial', () => {
    const msg = formatGuardMessage(checkSkillInlineCall({ skill: 'digest' }, null)!)
    expect(msg).toMatch(/fails? CLOSED/i)
  })
})

describe('denyOutputFor() — the PreToolUse control object', () => {
  it('emits a deny decision for a finding', () => {
    const out = denyOutputFor(checkSkillInlineCall({ skill: 'digest' }, [commandTurn('digest')]))
    expect(out?.hookSpecificOutput.hookEventName).toBe('PreToolUse')
    expect(out?.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(out?.hookSpecificOutput.permissionDecisionReason).toContain('issue #1018')
  })

  it('emits nothing (null) for an allowed call, so the call proceeds untouched', () => {
    expect(denyOutputFor(null)).toBeNull()
  })
})

describe('the CLI as the PreToolUse hook would invoke it (stdin JSON → stdout deny)', () => {
  function runHook(payload: unknown): { hookSpecificOutput: Record<string, string> } | null {
    const out = execFileSync('pnpm', ['exec', 'tsx', SCRIPT], {
      cwd: root,
      input: typeof payload === 'string' ? payload : JSON.stringify(payload),
      encoding: 'utf8',
    }).trim()
    return out ? JSON.parse(out) : null
  }

  function payload(skill: string, transcript_path?: string): Record<string, unknown> {
    return { hook_event_name: 'PreToolUse', tool_name: 'Skill', tool_input: { skill }, transcript_path }
  }

  it('END TO END: denies a skill named this turn\'s inlined `<command-name>` block', () => {
    const file = join(tmpdir(), 'skill-inline-guard-transcript-deny.jsonl')
    writeFileSync(file, `${JSON.stringify(commandTurn('digest'))}\n`)
    try {
      const deny = runHook(payload('digest', file))
      expect(deny?.hookSpecificOutput.permissionDecision).toBe('deny')
      expect(deny?.hookSpecificOutput.permissionDecisionReason).toContain('issue #1018')
    } finally {
      rmSync(file, { force: true })
    }
  })

  it('END TO END: stays silent for a skill never inlined this turn', () => {
    const file = join(tmpdir(), 'skill-inline-guard-transcript-allow.jsonl')
    writeFileSync(file, `${JSON.stringify(commandTurn('digest'))}\n`)
    try {
      expect(runHook(payload('domain-modeling', file))).toBeNull()
    } finally {
      rmSync(file, { force: true })
    }
  })

  it('END TO END: denies (fail-closed) when the transcript is unreadable', () => {
    const deny = runHook(payload('digest', join(tmpdir(), 'skill-inline-guard-no-such-file.jsonl')))
    expect(deny?.hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('END TO END: stays silent on empty stdin (a bare manual run is not a tool call to police)', () => {
    const out = execFileSync('pnpm', ['exec', 'tsx', SCRIPT], { cwd: root, input: '', encoding: 'utf8' }).trim()
    expect(out).toBe('')
  })

  it('END TO END: denies uninspectable stdin (not JSON) — fail-closed', () => {
    expect(runHook('not json')?.hookSpecificOutput.permissionDecision).toBe('deny')
  })
})

describe('the --dry-run path (ADR-0004: an unattended hook needs a way to be exercised by hand)', () => {
  function dryRun(args: string[]): { decision: string; reason?: string } {
    return JSON.parse(execFileSync('pnpm', ['exec', 'tsx', SCRIPT, '--dry-run', ...args], { cwd: root, encoding: 'utf8' }))
  }

  it('reports deny (fail-closed) with no --transcript at all', () => {
    const out = dryRun(['--tool', 'Skill', '--input', '{"skill":"digest"}'])
    expect(out.decision).toBe('deny')
    expect(out.reason).toMatch(/fails? CLOSED/i)
  })

  it('reports allow for a skill not present in a real transcript file', () => {
    const file = join(tmpdir(), 'skill-inline-guard-dryrun.jsonl')
    writeFileSync(file, `${JSON.stringify(commandTurn('digest'))}\n`)
    try {
      expect(dryRun(['--tool', 'Skill', '--transcript', file, '--input', '{"skill":"domain-modeling"}']).decision).toBe('allow')
      expect(dryRun(['--tool', 'Skill', '--transcript', file, '--input', '{"skill":"digest"}']).decision).toBe('deny')
    } finally {
      rmSync(file, { force: true })
    }
  })
})
