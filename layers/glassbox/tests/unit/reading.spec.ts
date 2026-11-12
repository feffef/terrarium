import { describe, expect, it } from 'vitest'
import { glassboxCountLabel, glassboxReadKey, glassboxSubjectCount, markGlassboxRead, readGlassboxProgress, resetGlassboxProgress, type GlassboxStorage } from '../../app/utils/reading.ts'

const memory = (initial: Record<string, string> = {}): GlassboxStorage & { data: Record<string, string> } => {
  const data = { ...initial }
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => { data[k] = v },
    removeItem: (k) => { Reflect.deleteProperty(data, k) },
  }
}
const broken: GlassboxStorage = {
  getItem: () => { throw new Error('blocked') },
  setItem: () => { throw new Error('blocked') },
  removeItem: () => { throw new Error('blocked') },
}

describe('glassbox reading progress', () => {
  it('starts empty, and marks a Lesson once however often it is opened', () => {
    const storage = memory()
    expect(readGlassboxProgress(storage)).toEqual([])
    expect(markGlassboxRead('/nuxt-vue/layers', storage)).toEqual(['/nuxt-vue/layers'])
    markGlassboxRead('/hooks/gate', storage)
    expect(markGlassboxRead('/nuxt-vue/layers', storage)).toEqual(['/nuxt-vue/layers', '/hooks/gate'])
    expect(JSON.parse(storage.data[glassboxReadKey]!)).toEqual(['/nuxt-vue/layers', '/hooks/gate'])
  })

  it('reads corrupt or foreign values as nothing read, keeping only strings', () => {
    expect(readGlassboxProgress(memory({ [glassboxReadKey]: 'not json' }))).toEqual([])
    expect(readGlassboxProgress(memory({ [glassboxReadKey]: '{"a":1}' }))).toEqual([])
    expect(readGlassboxProgress(memory({ [glassboxReadKey]: '[1,"/ok"]' }))).toEqual(['/ok'])
  })

  it('reset removes only its own key', () => {
    const storage = memory({ [glassboxReadKey]: '["/a/b"]', 'other:key': 'keep' })
    expect(resetGlassboxProgress(storage)).toEqual([])
    expect(storage.data).toEqual({ 'other:key': 'keep' })
  })

  it('survives storage that throws', () => {
    expect(readGlassboxProgress(broken)).toEqual([])
    expect(markGlassboxRead('/a/b', broken)).toEqual(['/a/b'])
    expect(resetGlassboxProgress(broken)).toEqual([])
  })

  it('labels a Subject count: total when none read, read/total after, done when all', () => {
    expect(glassboxCountLabel(0, 8)).toEqual({ text: '8', done: false })
    expect(glassboxCountLabel(3, 8)).toEqual({ text: '3/8', done: false })
    expect(glassboxCountLabel(8, 8)).toEqual({ text: '8/8', done: true })
    expect(glassboxCountLabel(0, 0).done).toBe(false)
  })

  it("words a Subject page's count: Lesson total until one is read, then `N of M read`", () => {
    expect(glassboxSubjectCount(0, 8)).toBe('8 Lessons')
    expect(glassboxSubjectCount(3, 8)).toBe('3 of 8 read')
    expect(glassboxSubjectCount(8, 8)).toBe('8 of 8 read')
    expect(glassboxSubjectCount(0, 1)).toBe('1 Lesson')
    expect(glassboxSubjectCount(1, 1)).toBe('1 of 1 read')
  })
})
