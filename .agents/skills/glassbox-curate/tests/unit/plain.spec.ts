import { describe, expect, it } from 'vitest'
import { plainPage } from '../../scripts/plain.ts'

const page = `---
title: SVG
description: D
---

A filter stops :term[cross-site scripting]. Several :term[Tenants]{id="tenant"} draw art; each :term[Tenant] keeps it in :file[app/utils/svg.ts]{lines="9-13"}.

::excerpt{path="app/utils/svg.ts" lines="9-13"}
\`\`\`ts
const x = 1
\`\`\`
::

::lessons
[Content validation](/t/glassbox/guide/verification/content-validation) · :file[app/utils/svg.ts]
::
`

describe('plainPage', () => {
  const out = plainPage(page, { 'cross-site-scripting': 'an attack that runs code in a page', tenant: 'one site on the Platform' })

  it('defines each term at its first use only', () => {
    expect(out).toContain('cross-site scripting (an attack that runs code in a page)')
    expect(out).toContain('Tenants (one site on the Platform) draw art; each Tenant keeps')
  })

  it('shows an Excerpt as code under its path, with no MDC left', () => {
    expect(out).toContain('Excerpt from app/utils/svg.ts, lines 9-13:\n```ts\nconst x = 1\n```')
    expect(out).not.toMatch(/::|:term|:file|\]\(/)
  })

  it('keeps files and link text', () => {
    expect(out.startsWith('# SVG\n')).toBe(true)
    expect(out).toContain('in `app/utils/svg.ts`.')
    expect(out).toContain('Content validation · `app/utils/svg.ts`')
  })
})
