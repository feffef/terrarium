import { describe, expect, it } from 'vitest'
import { glassboxReadKey, markGlassboxRead, readGlassboxProgress, resetGlassboxProgress, type GlassboxStorage } from '../../app/utils/reading.ts'

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
})
