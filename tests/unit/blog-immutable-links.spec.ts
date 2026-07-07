// Guards the blog's "no stale links" rule: when a post references a repo FILE
// (or a file line), the GitHub URL must be pinned to an immutable commit SHA —
// `blob/<sha>/…` — never a moving branch ref like `blob/main/…`. A branch ref
// rots silently: line anchors drift as the file changes, and a later rename or
// delete 404s the link, so a long-published post quietly points at the wrong
// thing (some `blob/main/…` links here were already dead by the time this test
// was written). The authoring convention lives in `.claude/skills/blog-post/
// SKILL.md` ("Cite facts and link to the code"); this test is its enforcement —
// `commit`, `pull`, and `issues` URLs are already immutable and are left alone.
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const BLOG_CONTENT = resolve(root, 'tenants/blog/content')

// Only file-serving GitHub routes take a ref that can be a branch; `commit`,
// `pull`, `issues`, `compare`, … don't, so they can't rot this way.
const FILE_ROUTE_LINK = /github\.com\/[^/]+\/[^/]+\/(?:blob|tree|raw|blame|edit)\/([^/\s)]+)\//g
// An immutable pin is a hex commit SHA (7–40 chars). Anything else — `main`, a
// feature-branch name, a tag — is mutable and rejected.
const SHA = /^[0-9a-f]{7,40}$/

function markdownFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name)
    if (e.isDirectory()) return markdownFiles(p)
    return e.isFile() && e.name.endsWith('.md') ? [p] : []
  })
}

describe('blog posts pin file links to an immutable commit SHA', () => {
  const files = markdownFiles(BLOG_CONTENT)

  it('finds blog content to check (canary — the walk must not silently match nothing)', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(files.map((f) => [f.slice(root.length + 1), f] as const))(
    '%s uses no mutable branch ref for a file link',
    (_rel, file) => {
      const src = readFileSync(file, 'utf8')
      const mutable: string[] = []
      for (const m of src.matchAll(FILE_ROUTE_LINK)) {
        const ref = m[1]!
        if (!SHA.test(ref)) mutable.push(m[0])
      }
      expect(
        mutable,
        `mutable file link(s) — pin to a commit SHA (blob/<sha>/…), not a branch:\n  ${mutable.join('\n  ')}`,
      ).toEqual([])
    },
  )
})
