// Heavy-slot selection for gate:scoped (#1800): a wrong answer either lets a
// third Heavy tier OOM the container or leaves a dead holder's slot stuck.
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { acquireHeavySlot, pickSlot } from '../../scripts/gate.ts'

const alive = (live: number[]) => (pid: number) => live.includes(pid)

describe('pickSlot()', () => {
  it('takes a free slot', () => {
    expect(pickSlot([null, null], alive([]))).toBe(0)
    expect(pickSlot([101, null], alive([101]))).toBe(1)
  })

  it('returns null (wait) when every slot has a live holder', () => {
    expect(pickSlot([101, 102], alive([101, 102]))).toBeNull()
  })

  it('reclaims a slot whose holder is dead', () => {
    expect(pickSlot([101, 102], alive([101]))).toBe(1)
  })
})

describe('acquireHeavySlot()', () => {
  const DEAD_PID = 2 ** 22 + 1 // above Linux's pid_max ceiling, so never alive

  it('records its PID, reclaims a dead holder, and releases', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gate-slots-'))
    writeFileSync(join(dir, 'slot-0'), String(process.pid))
    writeFileSync(join(dir, 'slot-1'), String(DEAD_PID))
    const release = acquireHeavySlot(dir, 2, 10)
    expect(readFileSync(join(dir, 'slot-1'), 'utf8')).toBe(String(process.pid))
    release()
    expect(existsSync(join(dir, 'slot-1'))).toBe(false)
  })
})
