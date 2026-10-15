// The mechanical half of the glassbox-update Skill: what changed in the code each
// Glass Box page cites, between the page's `revision` and main.
// Usage: pnpm exec tsx .agents/skills/glassbox-update/scripts/glassbox-update.ts [--write]
import { execFileSync } from 'node:child_process'
import { globSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parse as parseYaml } from 'yaml'
import { glassboxPageRefs, parseLineRange, shiftLines, type LineRange } from '../../../../layers/glassbox/page-refs.ts'
import { fetchOriginMain } from '../../../../scripts/git-helpers.ts'
import { splitFrontmatter } from '../../../../scripts/validate-content.ts'
import { root } from '../../../../shared/expand.ts'

const content = 'layers/glassbox/content/guide'

export interface PageUpdate {
  file: string
  revision: string
  changedPaths: string[]
  shifted: { path: string; from: string; to: string }[]
  edited: { path: string; lines: string }[]
}

export interface VersionChange {
  name: string
  revision: string
  main: string
  major: boolean
}

export interface UpdateReport {
  main: string
  mainDate: string
  /** Pages whose cited paths changed since their `revision`. */
  pages: PageUpdate[]
  /** Terms whose `source` changed since the `revision` of a page that uses them. */
  terms: { id: string; source: string }[]
  /** Changed `package.json` dependencies, by page `revision`. */
  versions: Record<string, VersionChange[]>
}

const rangeText = (r: LineRange) => (r.start === r.end ? `${r.start}` : `${r.start}-${r.end}`)
const major = (v: string) => v.match(/\d+/)?.[0]

function dependencies(packageJson: string): Record<string, string> {
  const pkg = JSON.parse(packageJson) as Record<string, Record<string, string> | undefined>
  return { ...pkg.dependencies, ...pkg.devDependencies }
}

/** `write` shifts each page's ranges and advances its `revision` to `main`, except a
 *  page with an edited range: the Skill re-checks and re-pins that one itself. */
export function glassboxUpdate(cwd = root, mainRef = 'origin/main', write = false): UpdateReport {
  const git = (...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (git('rev-parse', '--is-shallow-repository').trim() === 'true') {
    throw new Error('this clone is shallow, so a page\'s revision may be missing. Run `git fetch --unshallow origin main` first.')
  }
  const main = git('rev-parse', `${mainRef}^{commit}`).trim()
  const mainDate = git('show', '-s', '--format=%cI', main).slice(0, 10)
  const mainDeps = dependencies(git('show', `${main}:package.json`))

  const termSources = Object.fromEntries(globSync('*.yml', { cwd: join(cwd, content, 'terms') }).map((f) => {
    const { source } = parseYaml(readFileSync(join(cwd, content, 'terms', f), 'utf8')) as { source?: string }
    return [f.replace(/\.yml$/, ''), source]
  }))

  const report: UpdateReport = { main, mainDate, pages: [], terms: [], versions: {} }
  for (const file of globSync('**/*.md', { cwd: join(cwd, content, 'pages') }).sort()) {
    const path = join(cwd, content, 'pages', file)
    const source = readFileSync(path, 'utf8')
    const { frontmatter, body } = splitFrontmatter(source)
    const revision = String(frontmatter.revision)
    const refs = glassboxPageRefs(body)

    const changed = git('diff', '--name-only', '--no-renames', revision, main).split('\n').filter(Boolean)
    const changedPaths = [...new Set(refs.files.map((r) => r.path))]
      .filter((p) => changed.some((c) => c === p || (p.endsWith('/') && c.startsWith(p))))
    const update: PageUpdate = { file, revision, changedPaths, shifted: [], edited: [] }
    const shifts = new Map<string, string>()
    const seen = new Set<string>()
    for (const ref of refs.files) {
      if (!ref.lines || !changedPaths.includes(ref.path)) continue
      const from = rangeText(ref.lines)
      const key = `${ref.path}#${from}`
      if (seen.has(key)) continue
      seen.add(key)
      const moved = shiftLines(ref.lines, git('diff', '-U0', '--no-renames', revision, main, '--', ref.path))
      if (moved === 'edited') update.edited.push({ path: ref.path, lines: from })
      else if (rangeText(moved) !== from) {
        shifts.set(key, rangeText(moved))
        update.shifted.push({ path: ref.path, from, to: rangeText(moved) })
      }
    }
    if (changedPaths.length) report.pages.push(update)

    for (const id of new Set(refs.terms)) {
      const termSource = termSources[id]
      if (termSource && changed.includes(termSource) && !report.terms.some((t) => t.id === id)) report.terms.push({ id, source: termSource })
    }

    if (!(revision in report.versions)) {
      const before = dependencies(git('show', `${revision}:package.json`))
      const changes = Object.keys(mainDeps).sort().filter((name) => before[name] && before[name] !== mainDeps[name])
        .map((name) => ({ name, revision: before[name]!, main: mainDeps[name]!, major: major(before[name]!) !== major(mainDeps[name]!) }))
      if (changes.length) report.versions[revision] = changes
    }

    if (write && !update.edited.length) {
      const pinned = source
        .replace(/^revision: .*$/m, `revision: '${main}'`)
        .replace(/^revisionDate: .*$/m, `revisionDate: '${mainDate}'`)
        .replace(/:file\[([^\]]+)\]\{[^}]*\}|::excerpt\{[^}]*\}/g, (tag, filePath?: string) => {
          const refPath = filePath ?? tag.match(/\bpath="([^"]*)"/)?.[1]
          return tag.replace(/\blines="([^"]*)"/, (attr, range: string) => {
            const lines = parseLineRange(range)
            const to = lines && shifts.get(`${refPath}#${rangeText(lines)}`)
            return to ? `lines="${to}"` : attr
          })
        })
      writeFileSync(path, pinned)
    }
  }
  return report
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    fetchOriginMain(root)
    process.stdout.write(`${JSON.stringify(glassboxUpdate(root, 'origin/main', process.argv.includes('--write')), null, 2)}\n`)
  } catch (err) {
    console.error(`glassbox-update: ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  }
}
