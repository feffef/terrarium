import { describe, expect, it } from 'vitest'
import { glassboxPageRefs, shiftLines } from '../../page-refs.ts'

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

  it('reads every :term, and the links inside each ::stop-links block', () => {
    const body = [
      'A :term[Lesson] explains one concept; a :term[Walkthrough] follows a story.',
      '',
      '## 1. The request arrives',
      '',
      'The router picks a :term[Space].',
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
    expect(refs.terms).toEqual(['Lesson', 'Walkthrough', 'Space', 'Tenant'])
    expect(refs.stopLinks).toEqual([
      {
        links: ['/t/glassbox/guide/nuxt-vue/layers'],
        files: [{ path: 'docs/adr/0016-tenant-root-routes.md' }],
        terms: ['Tenant'],
      },
      { links: ['/t/glassbox/guide/nuxt-content/collections'], files: [], terms: [] },
    ])
  })
})
