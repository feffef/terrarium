import { describe, expect, it } from 'vitest'
import { glassboxPageRefs, glassboxPageTerms, glassboxRelineRefs, glassboxTermId, parseLineRanges, shiftLines } from '../../page-refs.ts'

// `git diff -U0` output for one file: only hunk headers matter.
const diff = (...hunks: string[]) =>
  ['diff --git a/shared/expand.ts b/shared/expand.ts', '--- a/shared/expand.ts', '+++ b/shared/expand.ts', ...hunks].join('\n')

describe('shiftLines', () => {
  it('moves catalogFrom from 189 to 196 when seven lines land above it (#1971)', () => {
    const d = diff('@@ -40,0 +41,7 @@ import', '+a', '+b', '+c', '+d', '+e', '+f', '+g')
    expect(shiftLines({ start: 189, end: 208 }, d)).toEqual({ start: 196, end: 215 })
  })

  it('flags a range with an edit inside it', () => {
    expect(shiftLines({ start: 196, end: 215 }, diff('@@ -200 +200 @@', '-old', '+new'))).toBe('edited')
    expect(shiftLines({ start: 196, end: 215 }, diff('@@ -205,0 +206,2 @@', '+a', '+b'))).toBe('edited')
    expect(shiftLines({ start: 196, end: 215 }, diff('@@ -190,7 +190,0 @@'))).toBe('edited')
  })

  it('shifts by deletions above and ignores edits touching only its edges from outside', () => {
    const d = diff(
      '@@ -10,3 +9,0 @@', // 3 lines deleted above
      '@@ -195,0 +193 @@', // 1 line inserted just above line 196
      '@@ -215,0 +214,4 @@', // inserted after the range's last line
      '@@ -216,2 +218,2 @@', // edited below
    )
    expect(shiftLines({ start: 196, end: 215 }, d)).toEqual({ start: 194, end: 213 })
  })
})

describe('glassboxRelineRefs', () => {
  it('rewrites the ranges it moves, in either quote style, and leaves code and other refs alone', () => {
    const body = [
      "Built in :file[a.ts]{lines='3-4'}, `:file[a.ts]{lines=\"3-4\"}` shows the syntax, :file[b.ts]{lines=\"3-4\"} stays.",
      "::excerpt{lines='3-4' path='a.ts'}",
      '```md',
      ':file[a.ts]{lines="3-4"}',
      '```',
      '::',
    ].join('\n')
    const moved = glassboxRelineRefs(body, (ref) => (ref.path === 'a.ts' ? { start: 5, end: 5 } : undefined))
    expect(moved).toBe(body.replace("{lines='3-4'}", '{lines="5"}').replace("{lines='3-4' path", '{lines="5" path'))
  })

  it('moves every range of an Excerpt with one range per run', () => {
    const body = '::excerpt{path="a.ts" lines="3,5-6,9"}'
    expect(glassboxRelineRefs(body, () => ({ start: 10, end: 16 }))).toBe('::excerpt{path="a.ts" lines="10,12-13,16"}')
  })
})

describe('glassboxPageRefs on an Excerpt with one range per run', () => {
  it('reads the whole span and each run\'s range', () => {
    expect(glassboxPageRefs('::excerpt{path="a.ts" lines="3,5-6,9"}\n::').files).toEqual([
      { path: 'a.ts', lines: { start: 3, end: 9 }, runs: [{ start: 3, end: 3 }, { start: 5, end: 6 }, { start: 9, end: 9 }] },
    ])
  })
})

describe('glassboxPageRefs', () => {
  it('reads :file paths, with and without a line range', () => {
    const refs = glassboxPageRefs('Built in :file[shared/expand.ts]{lines="196-215"} from :file[layers/].')
    expect(refs.files).toEqual([
      { path: 'shared/expand.ts', lines: { start: 196, end: 215 } },
      { path: 'layers/' },
    ])
  })

  it('reads an ::excerpt with its code, and an ::excerpt without lines', () => {
    const body = [
      '::excerpt{path="shared/expand.ts" lines="196-215"}',
      '```ts {3}',
      'export function catalogFrom(cols: ExpandedCollection[]) {',
      '  // …',
      '}',
      '```',
      '::',
      '',
      '::excerpt{path="app/utils/repo.ts"}',
      '```ts',
      "export const REPO_URL = 'https://github.com/feffef/terrarium'",
      '```',
      '::',
    ].join('\n')
    expect(glassboxPageRefs(body).files).toEqual([
      {
        path: 'shared/expand.ts',
        lines: { start: 196, end: 215 },
        excerpt: 'export function catalogFrom(cols: ExpandedCollection[]) {\n  // …\n}',
      },
      { path: 'app/utils/repo.ts', excerpt: "export const REPO_URL = 'https://github.com/feffef/terrarium'" },
    ])
  })

  it('ignores the syntax shown in inline code and in fences outside ::excerpt', () => {
    const body = [
      'Write `:file[shared/expand.ts]` to link a file.',
      '',
      '```md',
      ':file[app/app.vue]',
      '::excerpt{path="app/app.vue"}',
      '```',
    ].join('\n')
    expect(glassboxPageRefs(body).files).toEqual([])
  })

  it('reads every :term as its entry id, and the links inside each ::stop-links block', () => {
    const body = [
      'A :term[Lesson] explains one concept; a :term[Walkthrough] follows a story.',
      '',
      '## 1. The request arrives',
      '',
      'The router picks one of the :term[Spaces]{id="space"}.',
      '',
      '::stop-links',
      '- [Nuxt layers](/t/glassbox/guide/nuxt-vue/layers)',
      '- :file[docs/adr/0016-tenant-root-routes.md]',
      '- :term[Tenant]',
      '::',
      '',
      'See [the Journal](/t/journal/meta) too.',
      '',
      '::stop-links',
      '- [Collections](/t/glassbox/guide/nuxt-content/collections)',
      '::',
    ].join('\n')
    const refs = glassboxPageRefs(body)
    expect(refs.terms).toEqual(['lesson', 'walkthrough', 'space', 'tenant'])
    expect(refs.stopLinks).toEqual([
      {
        links: ['/t/glassbox/guide/nuxt-vue/layers'],
        files: [{ path: 'docs/adr/0016-tenant-root-routes.md' }],
        terms: ['tenant'],
      },
      { links: ['/t/glassbox/guide/nuxt-content/collections'], files: [], terms: [] },
    ])
  })

  it("reads single-quoted attributes: {id='space'} and {lines='3-4'}", () => {
    const refs = glassboxPageRefs(":term[Spaces]{id='space'} live in :file[shared/expand.ts]{lines='3-4'}.")
    expect(refs.terms).toEqual(['space'])
    expect(refs.files).toEqual([{ path: 'shared/expand.ts', lines: { start: 3, end: 4 } }])
  })
})

describe('glassboxTermId', () => {
  it('slugs the text to letters, digits and hyphens, unless an id is given', () => {
    expect(glassboxTermId('Nuxt & Vue')).toBe('nuxt-vue')
    expect(glassboxTermId(' Session log ')).toBe('session-log')
    expect(glassboxTermId('ADR-0004')).toBe('adr-0004')
    expect(glassboxTermId('Spaces', 'space')).toBe('space')
  })
})

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
    expect(glassboxPageTerms({ value: [['p', {}, 'Plain prose.']] })).toEqual([])
    expect(glassboxPageTerms(undefined)).toEqual([])
  })
})

describe('parseLineRanges', () => {
  it('rejects malformed input, which the layer test then fails', () => {
    expect(parseLineRanges('3,,5')).toBeUndefined()
    expect(parseLineRanges(' 3 - 5')).toBeUndefined()
  })

  it('parses overlapping and descending ranges as written; the layer test rejects them against the Excerpt', () => {
    expect(parseLineRanges('3-5,4')).toEqual([{ start: 3, end: 5 }, { start: 4, end: 4 }])
    expect(parseLineRanges('9,5-6')).toEqual([{ start: 9, end: 9 }, { start: 5, end: 6 }])
  })
})
