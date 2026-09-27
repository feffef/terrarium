// `provenance.url` is bound to :href, so the schema must refuse script URLs.
import { describe, expect, it } from 'vitest'
import type { z } from 'zod'
import manifest from '../../tenant.config.ts'

const provenance = (manifest.collections.artifacts!.schema as z.AnyZodObject).shape.provenance as z.ZodTypeAny

describe('provenance.url', () => {
  it.each(['https://github.com/feffef/terrarium/pull/1', undefined])('accepts %s', (url) => {
    expect(provenance.safeParse({ kind: 'skill', name: 'x', url }).success).toBe(true)
  })

  it.each(['javascript:alert(1)', 'http://example.com', 'data:text/html,x'])('rejects %s', (url) => {
    expect(provenance.safeParse({ kind: 'skill', name: 'x', url }).success).toBe(false)
  })
})
