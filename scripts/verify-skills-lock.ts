// Integrity gate for the external Skill pack (ADR-0015). The Skills keyed in
// `skills-lock.json` are installed from `mattpocock/skills` and are **off limits
// to edit**: their `SKILL.md` is not ours to patch, because a re-install of the
// pack clobbers any local edit (CLAUDE.md "Skills … off limits to edit"). PR #304
// patched `wayfinder/SKILL.md` — a pack Skill — and the drift went undetected
// because nothing verified the on-disk files against their pins. This script is
// that verification.
//
// Why not reuse the lock's existing `computedHash`? That value is produced by the
// external installer over the **upstream source** file (before install-time
// frontmatter handling), so it does not match a hash of the installed file and is
// not reproducible offline — unfit for a gate that must run in CI without network.
// Instead we pin `installedSha256`: the sha256 of the SKILL.md **as it must sit on
// disk**. `--write` regenerates those pins from the current tree (run it after a
// legitimate pack install); the default (CI) mode verifies on-disk against them and
// fails on any drift, missing file, or unpinned entry.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Where pack Skills live on disk, and the lockfile that names them. Kept in sync
 *  with `audit-skills.ts`'s own copies (the single home for "which Skills are the
 *  external pack" is `skills-lock.json` itself; these are just the paths to it). */
export const SKILLS_DIR = '.agents/skills'
export const SKILLS_LOCK = 'skills-lock.json'

export interface LockEntry {
  installedSha256?: string
  [k: string]: unknown
}
export interface SkillsLock {
  version?: number
  skills?: Record<string, LockEntry>
  [k: string]: unknown
}

/** sha256 hex of a SKILL.md's raw bytes — the pinned identity of an installed file. */
export function sha256(content: Buffer | string): string {
  return createHash('sha256').update(content).digest('hex')
}

export interface DriftFinding {
  name: string
  /** `missing` — the SKILL.md is gone; `unpinned` — no `installedSha256` in the
   *  lock yet (run `--write`); `drifted` — on-disk content ≠ the pin (an edit). */
  kind: 'missing' | 'unpinned' | 'drifted'
  expected?: string
  actual?: string
}

export interface VerifyResult {
  checked: number
  findings: DriftFinding[]
}

/** Pure core: compare each locked entry's pin against the on-disk hash the caller
 *  looked up. `onDisk` maps a pack-Skill name to its current sha256, or `null`
 *  when its SKILL.md is missing. IO lives in the wrappers below so this is unit-testable. */
export function diffLock(
  skills: Record<string, LockEntry>,
  onDisk: Map<string, string | null>,
): VerifyResult {
  const findings: DriftFinding[] = []
  const names = Object.keys(skills)
  for (const name of names) {
    const actual = onDisk.get(name) ?? null
    if (actual === null) {
      findings.push({ name, kind: 'missing' })
      continue
    }
    const expected = skills[name]?.installedSha256
    if (!expected) {
      findings.push({ name, kind: 'unpinned', actual })
      continue
    }
    if (expected !== actual) {
      findings.push({ name, kind: 'drifted', expected, actual })
    }
  }
  return { checked: names.length, findings }
}

function readLock(cwd = root): SkillsLock {
  const file = join(cwd, SKILLS_LOCK)
  if (!existsSync(file)) throw new Error(`${SKILLS_LOCK} not found at ${file}`)
  return JSON.parse(readFileSync(file, 'utf8')) as SkillsLock
}

/** Look up the on-disk sha256 of every locked Skill's SKILL.md (null if absent). */
function readOnDisk(names: string[], cwd = root): Map<string, string | null> {
  const out = new Map<string, string | null>()
  for (const name of names) {
    const md = join(cwd, SKILLS_DIR, name, 'SKILL.md')
    out.set(name, existsSync(md) ? sha256(readFileSync(md)) : null)
  }
  return out
}

export function verify(cwd = root): VerifyResult {
  const lock = readLock(cwd)
  const skills = lock.skills ?? {}
  return diffLock(skills, readOnDisk(Object.keys(skills), cwd))
}

/** Regenerate `installedSha256` from the current tree and rewrite the lockfile.
 *  Run after a legitimate pack install so the pins match the new upstream content. */
export function write(cwd = root): { updated: string[]; missing: string[] } {
  const lock = readLock(cwd)
  const skills = lock.skills ?? {}
  const onDisk = readOnDisk(Object.keys(skills), cwd)
  const updated: string[] = []
  const missing: string[] = []
  for (const name of Object.keys(skills)) {
    const entry = skills[name]
    if (!entry) continue
    const hash = onDisk.get(name) ?? null
    if (hash === null) {
      missing.push(name)
      continue
    }
    if (entry.installedSha256 !== hash) updated.push(name)
    entry.installedSha256 = hash
  }
  writeFileSync(join(cwd, SKILLS_LOCK), `${JSON.stringify(lock, null, 2)}\n`)
  return { updated, missing }
}

function reportLine(f: DriftFinding): string {
  const skill = `${SKILLS_DIR}/${f.name}/SKILL.md`
  switch (f.kind) {
    case 'missing':
      return `  MISSING   ${skill} — locked but not on disk`
    case 'unpinned':
      return `  UNPINNED  ${f.name} — no installedSha256 (run \`pnpm verify:skills-lock --write\`)`
    case 'drifted':
      return `  DRIFTED   ${skill} — on-disk content differs from its pin (a local edit?)`
  }
}

function main(argv: string[]): void {
  if (argv.includes('--write')) {
    const { updated, missing } = write()
    console.log(
      `verify-skills-lock: wrote installedSha256 for ${Object.keys(readLock().skills ?? {}).length} pack Skill(s)` +
        (updated.length ? ` — updated ${updated.length}: ${updated.join(', ')}` : ' — no changes') +
        (missing.length ? `; ${missing.length} missing on disk: ${missing.join(', ')}` : ''),
    )
    return
  }
  const { checked, findings } = verify()
  if (findings.length === 0) {
    console.log(`verify-skills-lock: PASS — ${checked} external pack Skill(s) match their pins`)
    return
  }
  console.error(
    `\nverify-skills-lock: FAIL — external pack Skills are off limits to edit (ADR-0015).\n` +
      `A SKILL.md keyed in ${SKILLS_LOCK} was edited, removed, or is unpinned:\n`,
  )
  for (const f of findings) console.error(reportLine(f))
  console.error(
    `\nPack Skills come from mattpocock/skills — a re-install clobbers local edits.\n` +
      `Restore the file from upstream, or (after a legitimate install) re-pin with\n` +
      `  pnpm verify:skills-lock --write\n`,
  )
  process.exit(1)
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main(process.argv.slice(2))
}
