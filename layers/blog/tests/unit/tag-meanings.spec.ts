import { describe, expect, it } from 'vitest'
import { blogTagMeaning } from '../../app/utils/tags'
import { blogTagMeanings } from '../../tag-meanings'

describe('blogTagMeaning', () => {
  it('returns the meaning of a vocabulary tag', () => {
    expect(blogTagMeaning('bugs')).toBe('a specific software defect and its fix')
  })

  it('returns undefined for a tag outside the vocabulary', () => {
    expect(blogTagMeaning('nonsense')).toBeUndefined()
  })

  it('gives every vocabulary tag a non-empty meaning', () => {
    for (const meaning of Object.values(blogTagMeanings)) expect(meaning.trim()).not.toBe('')
  })
})
