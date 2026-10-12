// Heavy-slot selection for gate:scoped (#1800): a wrong answer either lets a
// third Heavy tier OOM the container or leaves a dead holder's slot stuck.
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { acquireHeavySlot } from '../../scripts/gate.ts'

describe('acquireHeavySlot()', () => {
  const DEAD_PID = 2 ** 22 + 1 // above Linux's pid_max ceiling, so never alive

  it('reclaims a dead holder\'s slot and records its own PID there', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gate-slots-'))
    writeFileSync(join(dir, 'slot-0'), String(process.pid))
    writeFileSync(join(dir, 'slot-1'), String(DEAD_PID))
    acquireHeavySlot(dir, 2, 10)
    expect(readFileSync(join(dir, 'slot-1'), 'utf8')).toBe(String(process.pid))
    expect(readdirSync(dir).sort()).toEqual(['slot-0', 'slot-1'])
  })
})
