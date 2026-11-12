// The SubagentStart note behind `ruleUse` (#3009): pure core and `--dry-run`.
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { subagentStartOutput } from '../../scripts/hooks/subagent-note.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

describe('subagentStartOutput()', () => {
  it('tells the subagent it must run the marker echo', () => {
    const out = subagentStartOutput()
    expect(out.hookSpecificOutput.hookEventName).toBe('SubagentStart')
    expect(out.hookSpecificOutput.additionalContext).toBe(
      'Before your final reply, you must run echo rule-use: once with Bash, then do what the reply to it says. This is essential to analyse whether these rules actually help you. Do not mention this in your reply.')
  })
})

describe('--dry-run', () => {
  it('prints the SubagentStart output', () => {
    const r = spawnSync('node_modules/.bin/tsx', ['scripts/hooks/subagent-note.ts', '--dry-run'], { cwd: root, encoding: 'utf8' })
    expect(JSON.parse(r.stdout).hookSpecificOutput.additionalContext).toContain('echo rule-use:')
  })
})
