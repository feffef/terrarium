import { describe, expect, it } from 'vitest'
import { plainHeader, plainPage, resolveStem } from '../../scripts/plain.ts'

const page = `---
title: SVG
description: D
---

A filter stops :term[cross-site scripting]. Several :term[Tenants]{id="tenant"} draw art; each :term[Tenant] keeps it in :file[app/utils/svg.ts]{lines="9-13"}.

Run \`[x](y)\` to see a link kept in code.

::excerpt{path="app/utils/svg.ts" lines="9-13"}
\`\`\`ts
const x = [a](b)

const y = 1
\`\`\`
::

::lessons
[Content validation](/t/glassbox/guide/verification/content-validation) · :file[app/utils/svg.ts]
::

## Where next

- [](/t/glassbox/guide/verification/gate)
- [the merge checks](/t/glassbox/guide/verification/gate)
- [Journal](/t/journal/current/history)
`

describe('plainPage', () => {
  const out = plainPage(
    page,
    { 'cross-site-scripting': 'an attack that runs code in a page', tenant: 'one site on the Platform' },
    { 'verification/content-validation': 'Content validation', 'verification/gate': 'The gate' },
  )

  it('opens with a line saying what was changed', () => {
    expect(out.startsWith(`${plainHeader}\n\n# SVG\n`)).toBe(true)
  })

  it('puts a term\'s definition in a note after its paragraph, at first use only', () => {
    expect(out).toContain('A filter stops cross-site scripting. Several Tenants draw art; each Tenant keeps it in `app/utils/svg.ts`.\n[term "cross-site scripting": an attack that runs code in a page]\n[term "Tenants": one site on the Platform]')
    expect(out.match(/\[term "Tenant/g)).toHaveLength(1)
  })

  it('shows an Excerpt as code under its path, blank lines and link syntax kept, with no MDC left', () => {
    expect(out).toContain('Excerpt from app/utils/svg.ts, lines 9-13:\n```ts\nconst x = [a](b)\n\nconst y = 1\n```')
    expect(out).toContain('Run `[x](y)` to see')
    expect(out).not.toMatch(/::|:term|:file/)
  })

  it('names a guide link\'s target title unless the text already is it, and a bare link shows the title', () => {
    expect(out).toContain('Content validation · `app/utils/svg.ts`')
    expect(out).toContain('- The gate\n- the merge checks [→ The gate]\n- Journal')
  })
})

describe('resolveStem', () => {
  const pages = ['verification/10.gate.md', 'verification/20.content-validation.md', 'nuxt-content/10.collections.md', 'walkthroughs/adding-a-site.md', 'git-github/10.gate-keeping.md']

  it('takes the exact stem, or one without order prefixes', () => {
    expect(resolveStem('verification/10.gate', pages)).toBe('verification/10.gate')
    expect(resolveStem('verification/gate', pages)).toBe('verification/10.gate')
    expect(resolveStem('gate', pages)).toBe('verification/10.gate')
    expect(resolveStem('adding-a-site.md', pages)).toBe('walkthroughs/adding-a-site')
  })

  it('names the near matches when there is none or more than one', () => {
    expect(() => resolveStem('valid', pages)).toThrow('no guide page "valid"; did you mean verification/20.content-validation?')
    expect(() => resolveStem('gate', [...pages, 'x/10.gate.md'])).toThrow(/names 2 guide pages/)
  })
})
