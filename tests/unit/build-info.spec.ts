// Coverage for the footer's build stamp (contract in `shared/build-info.ts`).
import { describe, expect, it } from 'vitest'
import { resolveBuildInfo } from '../../shared/build-info.ts'

const now = new Date('2026-11-11T10:20:30.456Z')

describe('resolveBuildInfo', () => {
  it('uses the short SHA git reports and an ISO minute-precision time', () => {
    expect(resolveBuildInfo(() => 'abc1234\n', now)).toEqual({ sha: 'abc1234', time: '2026-11-11T10:20Z' })
  })

  it('leaves the SHA empty when git is unavailable, so the build never fails', () => {
    const noGit = () => {
      throw new Error('git: not found')
    }
    expect(resolveBuildInfo(noGit, now)).toEqual({ sha: '', time: '2026-11-11T10:20Z' })
  })

  it('ignores output that is not a SHA', () => {
    expect(resolveBuildInfo(() => 'fatal: not a git repository', now).sha).toBe('')
  })
})
