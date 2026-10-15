// What a Glass Box page body cites, for the layer test and the glassbox-update
// Skill (issue #1991). Pure: callers read files and run git.

export interface LineRange {
  start: number
  end: number
}

export interface FileRef {
  path: string
  lines?: LineRange
  excerpt?: string
}

export function parseLineRange(lines: string | undefined): LineRange | undefined {
  const m = lines?.match(/^(\d+)(?:-(\d+))?$/)
  if (!m) return undefined
  return { start: Number(m[1]), end: Number(m[2] ?? m[1]) }
}

/** A `:term`'s entry in the `terms` Collection: its `id`, else its text
 *  (`Space` → `space.yml`). */
export function glassboxTermId(text: string, id?: string) {
  return id ?? text.trim().toLowerCase().replace(/\s+/g, '-')
}

/** The entry id of every `:term` in a page's parsed (minimark) body, once
 *  each, so the payload carries only the terms the page uses (ADR-0028). */
export function glassboxPageTerms(body: { value?: unknown[] } | null | undefined): string[] {
  const ids = new Set<string>()
  const walk = (nodes: unknown[]) => {
    for (const node of nodes) {
      if (!Array.isArray(node)) continue
      const [tag, props, ...children] = node as [string, Record<string, unknown>, ...unknown[]]
      if (tag !== 'term') walk(children)
      else ids.add(glassboxTermId(children.filter((c) => typeof c === 'string').join(''), typeof props.id === 'string' ? props.id : undefined))
    }
  }
  walk(body?.value ?? [])
  return [...ids]
}

function attr(attrs: string | undefined, name: string) {
  return attrs?.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1]
}

function withLines(path: string, attrs: string | undefined): FileRef {
  const lines = parseLineRange(attr(attrs, 'lines'))
  return lines ? { path, lines } : { path }
}

/** Moves `range` through the hunks of a `git diff -U0` of its file, or returns
 *  `'edited'` when a hunk changes a line inside it. */
export function shiftLines(range: LineRange, diff: string): LineRange | 'edited' {
  let shift = 0
  for (const m of diff.matchAll(/^@@ -(\d+)(?:,(\d+))? \+\d+(?:,(\d+))? @@/gm)) {
    const at = Number(m[1])
    const removed = Number(m[2] ?? 1)
    const added = Number(m[3] ?? 1)
    // A pure insertion's `at` is the line it follows; otherwise the first line it changes.
    const inside = removed
      ? at <= range.end && at + removed > range.start
      : at >= range.start && at < range.end
    if (inside) return 'edited'
    if (at < range.start) shift += added - removed
  }
  return { start: range.start + shift, end: range.end + shift }
}

interface CitedFilesAndTerms {
  files: FileRef[]
  terms: string[]
}

export interface StopLinksBlock extends CitedFilesAndTerms {
  /** Markdown link targets. */
  links: string[]
}

/** Every `:file` and `::excerpt` (in order), every `:term`'s entry id, and what each
 *  `::stop-links` block links to. Inline code and fences outside `::excerpt`
 *  show syntax, so they cite nothing. */
export function glassboxPageRefs(body: string): CitedFilesAndTerms & { stopLinks: StopLinksBlock[] } {
  const files: FileRef[] = []
  const terms: string[] = []
  const stopLinks: StopLinksBlock[] = []
  let fence: string | undefined
  let excerpt: FileRef | undefined
  let stop: StopLinksBlock | undefined
  let code: string[] = []

  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (fence) {
      if (trimmed.startsWith(fence) && !trimmed.slice(fence.length).trim()) {
        if (excerpt) excerpt.excerpt = code.join('\n')
        fence = undefined
      }
      else if (excerpt) code.push(line)
      continue
    }
    const opens = trimmed.match(/^(`{3,}|~{3,})/)
    if (opens) {
      fence = opens[1]
      code = []
      continue
    }
    const open = trimmed.match(/^::excerpt(?:\{([^}]*)\})?$/)
    if (open) {
      excerpt = withLines(attr(open[1], 'path') ?? '', open[1])
      files.push(excerpt)
      continue
    }
    if (trimmed === '::stop-links') {
      stop = { links: [], files: [], terms: [] }
      stopLinks.push(stop)
      continue
    }
    if (trimmed === '::') excerpt = stop = undefined

    const prose = line.replace(/(`+)[^`]*?\1/g, '')
    for (const m of prose.matchAll(/:file\[([^\]]+)\](?:\{([^}]*)\})?/g)) {
      const ref = withLines(m[1]!, m[2])
      files.push(ref)
      stop?.files.push(ref)
    }
    for (const m of prose.matchAll(/:term\[([^\]]+)\](?:\{([^}]*)\})?/g)) {
      const id = glassboxTermId(m[1]!, attr(m[2], 'id'))
      terms.push(id)
      stop?.terms.push(id)
    }
    if (stop) for (const m of prose.matchAll(/\]\(([^)\s]+)/g)) stop.links.push(m[1]!)
  }
  return { files, terms, stopLinks }
}
