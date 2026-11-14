import { describe, expect, it } from 'vitest'
import { middenFindTitle } from '../../app/utils/find-title.ts'

describe('middenFindTitle', () => {
  it('capitalises a plain phrase', () => {
    expect(middenFindTitle('the routing map')).toBe('The routing map')
  })

  it.each(['app.vue is gone', 'shared/routing.generated.ts', 'build_index script', 'app.vue'])(
    'leaves a title that starts with a file or code name: %s',
    (t) => expect(middenFindTitle(t)).toBe(t),
  )

  it('judges only the first token', () => {
    expect(middenFindTitle('a map of shared/routing.ts')).toBe('A map of shared/routing.ts')
  })

  it('keeps an empty title', () => {
    expect(middenFindTitle('')).toBe('')
  })
})
