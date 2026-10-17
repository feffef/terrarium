// The mechanical half of the glassbox-update Skill: what changed in the code each
// Glass Box page cites, between the page's `revision` and main.
// Usage: pnpm exec tsx .agents/skills/glassbox-update/scripts/glassbox-update.ts [--spaces guide,drafts] [--write --to <sha>]
import { existsSync, globSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { glassboxTerms } from '../../../../layers/glassbox/page-checks.ts'
import { glassboxPageRefs, glassboxRelineRefs, rangeText, shiftLines, type LineRange } from '../../../../layers/glassbox/page-refs.ts'
import { fetchOriginMain, git } from '../../../../scripts/git-helpers.ts'
import { splitFrontmatter } from '../../../../scripts/lib/frontmatter.ts'
import { flagValue, root, runIfMain } from '../../../../scripts/lib/cli.ts'

const pagesDir = (space: string) => `layers/glassbox/content/${space}/pages`

export interface PageUpdate {
  space: string
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
  pages: PageUpdate[]
  terms: { id: string; source: string }[]
  versions: Record<string, VersionChange[]>
}

/** Below 1.0, a minor bump may break, so it counts as major. */
function major(version: string) {
  const m = version.match(/(\d+)(?:\.(\d+))?/)
  return m?.[1] === '0' ? `0.${m[2]}` : m?.[1]
}

function dependencies(packageJson: string): Record<string, string> {
  const pkg = JSON.parse(packageJson) as Record<string, Record<string, string> | undefined>
  return { ...pkg.dependencies, ...pkg.devDependencies }
}

/** `write` shifts each page's ranges and pins it to `main`, except a page with an
 *  edited range: the Skill re-checks and pins that one itself. */
export function glassboxUpdate(cwd = root, { main: mainRef = 'origin/main', write = false, spaces = ['guide'] } = {}): UpdateReport {
  const run = (...args: string[]) => git(args, cwd)
  if (run('rev-parse', '--is-shallow-repository').trim() === 'true') {
    throw new Error('this clone is shallow, so a page\'s revision may be missing. Run `git fetch --unshallow origin main` first.')
  }
  const main = run('rev-parse', `${mainRef}^{commit}`).trim()
  const mainDate = run('show', '-s', '--format=%cI', main).slice(0, 10)
  const mainDeps = dependencies(run('show', `${main}:package.json`))
  const terms = glassboxTerms(cwd)

  const report: UpdateReport = { main, mainDate, pages: [], terms: [], versions: {} }
  for (const space of new Set(spaces)) {
    if (!existsSync(join(cwd, pagesDir(space)))) throw new Error(`no Space "${space}" under layers/glassbox/content`)
  }
  const pages = [...new Set(spaces)].flatMap((space) => globSync('**/*.md', { cwd: join(cwd, pagesDir(space)) }).sort().map((file) => ({ space, file })))
  for (const { space, file } of pages) {
    const path = join(cwd, pagesDir(space), file)
    const source = readFileSync(path, 'utf8')
    const { frontmatter, body } = splitFrontmatter(source)
    const revision = String(frontmatter.revision)
    const refs = glassboxPageRefs(body)

    const changed = run('diff', '--name-only', '--no-renames', revision, main).split('\n').filter(Boolean)
    const changedPaths = [...new Set(refs.files.map((r) => r.path))]
      .filter((p) => changed.some((c) => c === p || (p.endsWith('/') && c.startsWith(p))))
    const update: PageUpdate = { space, file, revision, changedPaths, shifted: [], edited: [] }
    const shifts = new Map<string, LineRange>()
    const seen = new Set<string>()
    for (const ref of refs.files) {
      if (!ref.lines || !changedPaths.includes(ref.path)) continue
      const from = rangeText(ref.lines)
      const key = `${ref.path}#${from}`
      if (seen.has(key)) continue
      seen.add(key)
      const moved = shiftLines(ref.lines, run('diff', '-U0', '--no-renames', revision, main, '--', ref.path))
      if (moved === 'edited') update.edited.push({ path: ref.path, lines: from })
      else if (rangeText(moved) !== from) {
        shifts.set(key, moved)
        update.shifted.push({ path: ref.path, from, to: rangeText(moved) })
      }
    }
    if (changedPaths.length) report.pages.push(update)

    for (const id of new Set(refs.terms)) {
      const termSource = terms[id]?.source
      if (termSource && changed.includes(termSource) && !report.terms.some((t) => t.id === id)) report.terms.push({ id, source: termSource })
    }

    if (!(revision in report.versions)) {
      const before = dependencies(run('show', `${revision}:package.json`))
      const changes = Object.keys(mainDeps).sort().filter((name) => before[name] && before[name] !== mainDeps[name])
        .map((name) => ({ name, revision: before[name]!, main: mainDeps[name]!, major: major(before[name]!) !== major(mainDeps[name]!) }))
      if (changes.length) report.versions[revision] = changes
    }

    if (write && !update.edited.length) {
      const pinned = source.slice(0, source.length - body.length)
        .replace(/^revision: .*$/m, `revision: '${main}'`)
        .replace(/^revisionDate: .*$/m, `revisionDate: '${mainDate}'`)
      writeFileSync(path, pinned + glassboxRelineRefs(body, (ref) => shifts.get(`${ref.path}#${rangeText(ref.lines!)}`)))
    }
  }
  return report
}

function main(): void {
  const argv = process.argv.slice(2)
  const write = argv.includes('--write')
  const spacesArg = flagValue(argv, '--spaces')
  const spaces = spacesArg?.split(',').filter(Boolean)
  if (argv.includes('--spaces') && (spacesArg?.startsWith('--') || !spaces?.length)) throw new Error('--spaces needs a comma-separated list, e.g. guide,drafts')
  const to = flagValue(argv, '--to')
  // Pin only to the commit the agent reviewed; a fresh fetch could pass unread changes.
  if (write && !to) throw new Error('--write needs --to <sha>, the `main` of the report you reviewed')
  if (!to) fetchOriginMain(root)
  process.stdout.write(`${JSON.stringify(glassboxUpdate(root, { main: to ?? 'origin/main', write, spaces }), null, 2)}\n`)
}

runIfMain(import.meta.url, main)
