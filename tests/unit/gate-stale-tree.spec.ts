// A gate run is only evidence for the tree it started on (#2434).
import { describe, expect, it } from 'vitest'
import { treeChange } from '../../scripts/gate/gate.ts'

const start = { head: 'aaa', tree: 'x' }

describe('treeChange()', () => {
  it('is null when HEAD and tree are unchanged', () => {
    expect(treeChange(start, { head: 'aaa', tree: 'x' })).toBeNull()
  })

  it('warns when only HEAD moved', () => {
    expect(treeChange(start, { head: 'bbb', tree: 'x' })).toMatch(/HEAD/)
  })

  it('warns when only the working tree changed', () => {
    expect(treeChange(start, { head: 'aaa', tree: 'y' })).toMatch(/working tree/)
  })

  it('warns when both changed', () => {
    expect(treeChange(start, { head: 'bbb', tree: 'y' })).toMatch(/HEAD.*working tree/)
  })

  it('tells the reader to re-run the gate', () => {
    expect(treeChange(start, { head: 'bbb', tree: 'x' })).toMatch(/re-run/i)
  })
})
