import { describe, expect, it } from 'vitest'
import { glassboxPageTerms } from '../../app/utils/terms.ts'

describe('glassboxPageTerms', () => {
  it('picks each term a page body uses once, by its entry id', () => {
    // The minimark tree Nuxt Content stores for:
    //   A :term[Space] holds Collections; two :term[Spaces]{id="space"} never share one.
    //   > Each :term[Tenant] owns its layer.
    const body = {
      type: 'minimark',
      value: [
        ['p', {}, 'A ', ['term', {}, 'Space'], ' holds Collections; two ', ['term', { id: 'space' }, 'Spaces'], ' never share one.'],
        ['blockquote', {}, ['p', {}, 'Each ', ['term', {}, 'Tenant'], ' owns its layer.']],
      ],
    }
    expect(glassboxPageTerms(body)).toEqual(['space', 'tenant'])
  })

  it('picks none from a body without terms, or no body', () => {
    expect(glassboxPageTerms({ type: 'minimark', value: [['p', {}, 'Plain prose.']] })).toEqual([])
    expect(glassboxPageTerms(undefined)).toEqual([])
  })
})
