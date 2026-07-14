// Pure-core tests for gate:scoped's stale-deps preflight (#445) — a
// misclassification here means either a stale-dependency failure keeps
// masquerading as a real typecheck/build break, or `pnpm install` fires on
// every run for no reason.
import { describe, expect, it } from 'vitest'
import { isStale } from '../../scripts/gate.ts'

describe('isStale()', () => {
  it('is fresh when node_modules/.pnpm is newer than both source files', () => {
    expect(isStale(100, 100, 200)).toBe(false)
  })

  it('is stale when package.json is newer than node_modules/.pnpm', () => {
    expect(isStale(300, 100, 200)).toBe(true)
  })

  it('is stale when pnpm-lock.yaml is newer than node_modules/.pnpm', () => {
    expect(isStale(100, 300, 200)).toBe(true)
  })

  it('is stale when node_modules/.pnpm is missing entirely', () => {
    expect(isStale(100, 100, null)).toBe(true)
  })

  it('treats an equal mtime as fresh, not stale', () => {
    expect(isStale(200, 200, 200)).toBe(false)
  })
})
