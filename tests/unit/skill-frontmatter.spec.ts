// A Skill whose frontmatter fails to parse is silently dropped by the harness
// (#2608). The gate runs `pnpm test` for a Skill-only change, so check here.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse as parseYaml } from 'yaml'
import { asRecord, frontmatterBlock } from '../../scripts/lib/frontmatter'

const SKILLS = join(__dirname, '../../.agents/skills')

/** The first problem with a Skill's frontmatter, or null when it is valid. */
function frontmatterProblem(folder: string, text: string): string | null {
  const block = frontmatterBlock(text)
  if (!block) return 'no frontmatter'
  let data: Record<string, unknown>
  try {
    data = asRecord(parseYaml(block.yaml))
  } catch (e) {
    return `YAML parse error: ${(e as Error).message}`
  }
  if (typeof data.name !== 'string' || data.name !== folder) {
    return `name ${JSON.stringify(data.name)} is not the folder name "${folder}"`
  }
  if (typeof data.description !== 'string' || !data.description.trim()) {
    return 'description is missing or not a non-empty string'
  }
  return null
}

describe('Skill frontmatter checker', () => {
  const doc = (description: string) => `---\nname: x\ndescription: ${description}\n---\nBody\n`

  it('accepts a valid Skill', () => {
    expect(frontmatterProblem('x', doc('Does a thing.'))).toBeNull()
  })

  it('rejects an unquoted ": " in a description', () => {
    expect(frontmatterProblem('x', doc('Use when: asked'))).toMatch(/YAML parse error/)
  })

  it('rejects missing frontmatter, a wrong name and an empty description', () => {
    expect(frontmatterProblem('x', 'Body only')).toBe('no frontmatter')
    expect(frontmatterProblem('y', doc('Ok.'))).toMatch(/not the folder name "y"/)
    expect(frontmatterProblem('x', doc('""'))).toMatch(/description/)
  })
})

describe('.agents/skills/*/SKILL.md', () => {
  const folders = readdirSync(SKILLS, { withFileTypes: true }).filter((d) => d.isDirectory())
  it.each(folders.map((d) => d.name))('%s has valid frontmatter', (folder) => {
    const file = `.agents/skills/${folder}/SKILL.md`
    const problem = frontmatterProblem(folder, readFileSync(join(SKILLS, folder, 'SKILL.md'), 'utf8'))
    expect(problem, `${file}: ${problem}`).toBeNull()
  })
})
