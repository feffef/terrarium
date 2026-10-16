import { parse as parseYaml } from 'yaml'

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

/** Coerce a parsed YAML/JSON value into a plain object, or `{}` for anything
 *  else (`null`, a scalar, an array) — a Document's data is always a record. */
export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

/** The YAML text between a file's leading `---` fences and how many characters
 *  the fenced block takes, or `null` when there is none. For a caller that
 *  edits or parses the block itself. */
export function frontmatterBlock(text: string): { yaml: string; length: number } | null {
  const m = text.match(FRONTMATTER)
  return m ? { yaml: m[1] as string, length: m[0].length } : null
}

/** Split a Markdown file into its leading YAML frontmatter and the body that
 *  follows. Frontmatter is `{}` when there is none. */
export function splitFrontmatter(text: string): { frontmatter: Record<string, unknown>; body: string } {
  const block = frontmatterBlock(text)
  if (!block) return { frontmatter: {}, body: text }
  return { frontmatter: asRecord(parseYaml(block.yaml)), body: text.slice(block.length) }
}
