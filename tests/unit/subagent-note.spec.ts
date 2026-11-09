// The SubagentStart note behind `ruleUse` (#3009): pure core and `--dry-run`.
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { subagentStartOutput } from '../../scripts/hooks/subagent-note.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

describe('subagentStartOutput()', () => {
  it('gives the subagent the note with the absolute helped.sh path', () => {
    const out = subagentStartOutput('/repo')
    expect(out.hookSpecificOutput.hookEventName).toBe('SubagentStart')
    expect(out.hookSpecificOutput.additionalContext).toContain('sh /repo/scripts/session/helped.sh')
    expect(out.hookSpecificOutput.additionalContext).toContain('Do not mention this in your reply.')
  })
})

describe('--dry-run', () => {
  it('prints the SubagentStart output', () => {
    const r = spawnSync('node_modules/.bin/tsx', ['scripts/hooks/subagent-note.ts', '--dry-run'], { cwd: root, encoding: 'utf8' })
    expect(JSON.parse(r.stdout).hookSpecificOutput.additionalContext).toContain(`sh ${root}/scripts/session/helped.sh`)
  })
})
