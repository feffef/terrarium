// What a Glass Box page body cites, for the layer test and the glassbox-update
// Skill (issue #1991). Pure: callers read files and run git.

export interface LineRange {
  start: number
  end: number
}

export interface FileRef {
  path: string
  /** The whole span: the first range's start to the last one's end. */
  lines?: LineRange
  /** An Excerpt's one range per run, when `lines` lists several. */
  runs?: LineRange[]
  excerpt?: string
}

/** An Excerpt line that is only a comment holding `…` marks code left out. */
export const glassboxExcerptGap = /^\s*(?:\/\/|#|--|\/\*|<!--)\s*…\s*(?:\*\/|-->)?\s*$/

/** `lines` as its comma-separated ranges, one per Excerpt run. */
export function parseLineRanges(lines: string | undefined): LineRange[] | undefined {
  const ranges = lines?.split(',').map((r) => r.trim().match(/^(\d+)(?:-(\d+))?$/))
  if (!ranges?.every(Boolean)) return undefined
  return ranges.map((m) => ({ start: Number(m![1]), end: Number(m![2] ?? m![1]) }))
}

/** The span `lines` covers, from its first range's start to its last one's end. */
export function parseLineRange(lines: string | undefined): LineRange | undefined {
  const ranges = parseLineRanges(lines)
  return ranges && { start: ranges[0]!.start, end: ranges.at(-1)!.end }
}

export const rangeText = (r: LineRange) => (r.start === r.end ? `${r.start}` : `${r.start}-${r.end}`)

/** A `:term`'s entry id: the rule is under "Term" in `GLOSSARY.md`. */
export function glassboxTermId(text: string, id?: string) {
  return id ?? text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-')
}

/** The entry id of every `:term` in a page's parsed (minimark) body, once
 *  each, so the payload carries only the terms the page uses (ADR-0028). */
export function glassboxPageTerms(body: { value?: unknown[] } | null | undefined): string[] {
  const ids = new Set<string>()
  const walk = (nodes: unknown[]) => {
    for (const node of nodes) {
      if (!Array.isArray(node)) continue
      const [tag, props, ...children] = node as [string, Record<string, unknown>, ...unknown[]]
      if (tag === 'term') ids.add(glassboxTermId(children.filter((c) => typeof c === 'string').join(''), typeof props.id === 'string' ? props.id : undefined))
      else walk(children)
    }
  }
  walk(body?.value ?? [])
  return [...ids]
}

function attr(attrs: string | undefined, name: string) {
  const m = attrs?.match(new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)')`))
  return m?.[1] ?? m?.[2]
}

function withLines(path: string, attrs: string | undefined): FileRef {
  const runs = parseLineRanges(attr(attrs, 'lines'))
  if (!runs) return { path }
  const lines = { start: runs[0]!.start, end: runs.at(-1)!.end }
  return runs.length > 1 ? { path, lines, runs } : { path, lines }
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

/** A ref's new `lines`, or undefined to leave its tag as written. */
type Relines = (ref: FileRef) => LineRange | undefined

function relined(tag: string, ref: FileRef, relines?: Relines) {
  const to = ref.lines && relines?.(ref)
  if (!to) return tag
  const shift = to.start - ref.lines!.start
  const text = ref.runs ? ref.runs.map((r) => rangeText({ start: r.start + shift, end: r.end + shift })).join(',') : rangeText(to)
  return tag.replace(/\blines=(?:"[^"]*"|'[^']*')/, `lines="${text}"`)
}

function scan(body: string, relines?: Relines) {
  const files: FileRef[] = []
  const terms: string[] = []
  const stopLinks: StopLinksBlock[] = []
  const out: string[] = []
  let fence: string | undefined
  let excerpt: FileRef | undefined
  let stop: StopLinksBlock | undefined
  let code: string[] = []

  for (const line of body.split(/\r?\n/)) {
    out.push(line)
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
      out[out.length - 1] = relined(line, excerpt, relines)
      continue
    }
    if (trimmed === '::stop-links') {
      stop = { links: [], files: [], terms: [] }
      stopLinks.push(stop)
      continue
    }
    if (trimmed === '::') excerpt = stop = undefined

    // Blanked, not cut, so match indexes stay those of `line`.
    const prose = line.replace(/(`+)[^`]*?\1/g, (m) => ' '.repeat(m.length))
    let rewritten = ''
    let from = 0
    for (const m of prose.matchAll(/:file\[([^\]]+)\](?:\{([^}]*)\})?/g)) {
      const ref = withLines(m[1]!, m[2])
      files.push(ref)
      stop?.files.push(ref)
      rewritten += line.slice(from, m.index) + relined(m[0], ref, relines)
      from = m.index + m[0].length
    }
    out[out.length - 1] = rewritten + line.slice(from)
    for (const m of prose.matchAll(/:term\[([^\]]+)\](?:\{([^}]*)\})?/g)) {
      const id = glassboxTermId(m[1]!, attr(m[2], 'id'))
      terms.push(id)
      stop?.terms.push(id)
    }
    if (stop) for (const m of prose.matchAll(/\]\(([^)\s]+)/g)) stop.links.push(m[1]!)
  }
  return { files, terms, stopLinks, body: out.join('\n') }
}

/** Every `:file` and `::excerpt` (in order), every `:term`'s entry id, and what each
 *  `::stop-links` block links to. Inline code and fences outside `::excerpt`
 *  show syntax, so they cite nothing. */
export function glassboxPageRefs(body: string): CitedFilesAndTerms & { stopLinks: StopLinksBlock[] } {
  const { files, terms, stopLinks } = scan(body)
  return { files, terms, stopLinks }
}

/** `body` with each cited `lines` range that `relines` moves rewritten, read as
 *  `glassboxPageRefs` reads it (glassbox-update, issue #1998). */
export function glassboxRelineRefs(body: string, relines: Relines): string {
  return scan(body, relines).body
}
