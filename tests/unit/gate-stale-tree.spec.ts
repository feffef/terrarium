// A gate run is only evidence for the tree it started on (#2434).
import { describe, expect, it } from 'vitest'
import { stepAbort, treeChange } from '../../scripts/gate/gate.ts'

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

describe('stepAbort()', () => {
  it('is null when nothing changed', () => {
    expect(stepAbort(start, { head: 'aaa', tree: 'x' }, 'test')).toBeNull()
  })

  it('aborts naming what changed and the step it stopped before', () => {
    const msg = stepAbort(start, { head: 'bbb', tree: 'y' }, 'build')
    expect(msg).toMatch(/abort/i)
    expect(msg).toMatch(/HEAD and working tree/)
    expect(msg).toMatch(/build/)
  })

  it('fails open when either snapshot is missing', () => {
    expect(stepAbort(null, { head: 'bbb', tree: 'y' }, 'test')).toBeNull()
    expect(stepAbort(start, null, 'test')).toBeNull()
  })
})
