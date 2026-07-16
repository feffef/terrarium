// The blog-rotation helper: computes the blog-post Skill's A0 rotation gate
// (`.agents/skills/blog-post/SKILL.md`, "A0. Rotation gate") as a script
// instead of a hand-run shell pipeline + manual reading of the two rules —
// so a run picks the eligible Persona set the same way every time (#448).
//
// Usage:  tsx scripts/blog-rotation.ts
//   Prints `{ last, starved, eligible }` as JSON — see `eligiblePersonas`'s
//   doc comment for what each field means.
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BLOG_CONTENT_DIR = 'layers/blog/content'

// ── Types ───────────────────────────────────────────────────────────────────

/** One published post, reduced to the two fields A0 needs. */
export interface RotationPost {
  publishedAt: string
  persona: string
}

/** A0's result: `last` is the newest post's Persona (`null` with zero posts);
 *  `starved` lists any Persona that has sat out the four newest posts (rule
 *  2 — empty unless that rule fires); `eligible` is the set a draft/pick may
 *  actually use this run. */
export interface RotationState {
  last: string | null
  starved: string[]
  eligible: string[]
}

// ── Pure core (unit-tested) ───────────────────────────────────────────────────

/** A0, verbatim (SKILL.md "A0. Rotation gate"):
 *
 *  1. Sort posts newest-first.
 *  2. `last` = the newest post's Persona, or `null` with no posts.
 *  3. `recentFour` = the Personas among the four newest posts.
 *  4. `missing` = universe Personas absent from `recentFour`.
 *  5. Fewer than four posts total (rule 2 can't apply yet): `starved = []`,
 *     eligible = universe minus `last`.
 *  6. A Persona missing from `recentFour` (starved past four): rule 2
 *     collapses the set — `starved = missing`, `eligible = missing`.
 *  7. Otherwise (all of `recentFour`): `starved = []`, eligible = universe
 *     minus `last`.
 *
 *  "Universe minus `last`" falls back to the full universe when that would
 *  otherwise be empty — the only way it can be is a single-Persona universe,
 *  where `last` is necessarily that one Persona and must remain eligible. */
export function eligiblePersonas(posts: RotationPost[], personaUniverse: string[]): RotationState {
  const newestFirst = [...posts].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
  const last = newestFirst.length > 0 ? newestFirst[0]!.persona : null

  const universeMinusLast = (): string[] => {
    const filtered = personaUniverse.filter((p) => p !== last)
    return filtered.length > 0 ? filtered : personaUniverse.slice()
  }

  if (newestFirst.length < 4) {
    return { last, starved: [], eligible: universeMinusLast() }
  }

  const recentFour = new Set(newestFirst.slice(0, 4).map((p) => p.persona))
  const missing = personaUniverse.filter((p) => !recentFour.has(p))
  if (missing.length > 0) {
    return { last, starved: missing, eligible: missing }
  }

  return { last, starved: [], eligible: universeMinusLast() }
}

// ── fs shell (thin) ─────────────────────────────────────────────────────────

/** Every Persona is a `content/<persona>/` directory (A0's own
 *  `layers/blog/content/<persona>/pages/<slug>.md` glob and its
 *  `content/([^/]+)/` persona extraction — every such directory name is a
 *  Persona). */
function personaUniverse(cwd = root): string[] {
  return readdirSync(resolve(cwd, BLOG_CONTENT_DIR), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

/** `publishedAt:`'s value, read straight off the frontmatter line — a full
 *  YAML parse is more than this single-field read needs (mirrors A0's own
 *  `grep -m1 '^publishedAt:'`). */
function readPublishedAt(path: string): string | null {
  const text = readFileSync(path, 'utf8')
  const m = /^publishedAt:\s*(.+)$/m.exec(text)
  return m ? m[1]!.trim() : null
}

function readPosts(personas: string[], cwd = root): RotationPost[] {
  const posts: RotationPost[] = []
  for (const persona of personas) {
    const pagesDir = resolve(cwd, BLOG_CONTENT_DIR, persona, 'pages')
    for (const entry of readdirSync(pagesDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.md') || entry.name === 'index.md') continue
      const publishedAt = readPublishedAt(resolve(pagesDir, entry.name))
      if (publishedAt) posts.push({ publishedAt, persona })
    }
  }
  return posts
}

// ── Command ─────────────────────────────────────────────────────────────────

export function currentRotation(cwd = root): RotationState {
  const personas = personaUniverse(cwd)
  return eligiblePersonas(readPosts(personas, cwd), personas)
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`blog-rotation: ${msg}`)
  process.exit(1)
}

function main(): void {
  process.stdout.write(JSON.stringify(currentRotation(), null, 2) + '\n')
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
}
