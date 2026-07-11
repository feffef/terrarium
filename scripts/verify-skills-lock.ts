// Integrity gate for the external Skill pack (ADR-0015). The Skills keyed in
// `skills-lock.json` are installed from `mattpocock/skills` and are **off limits
// to edit**: their `SKILL.md` is not ours to patch, because a re-install of the
// pack clobbers any local edit (CLAUDE.md "Skills … off limits to edit"). PR #304
// patched `wayfinder/SKILL.md` — a pack Skill — and the drift went undetected
// because nothing verified the on-disk files against a known-good reference.
// This script is that verification.
//
// Where the reference lives — two files, two owners, kept strictly separate:
//   • `skills-lock.json` is the **CLI's** file (written by the mattpocock/skills
//     installer). READ-ONLY here — we read only its keys, to learn *which* Skills
//     are the external pack, exactly as `audit-skills.ts` does. Never written.
//   • The **Skill Inventory** (`layers/journal/content/current/skills/*.yml`) is
//     **ours** — the repo-owned, per-Skill record already curated for role and
//     importance. Each external pack Skill's entry carries an `installedSha256`
//     pin: the sha256 of its installed `SKILL.md`. The gate compares on-disk
//     content against that pin.
//
// Why not reuse the lock's `computedHash`? That value is the installer's hash of
// the **upstream source** (before install-time frontmatter handling), so it does
// not match a hash of the installed file and is not reproducible offline — unfit
// for a CI gate. Hence our own `installedSha256` pins.
//
// `--write` regenerates the pins in the Inventory from the current tree (run it
// after a legitimate pack install); the default (CI) mode verifies on-disk against
// the pins and fails on any drift, missing file, uncatalogued pack Skill, or
// unpinned entry.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parse as parseYaml } from 'yaml'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Where pack Skills live on disk. */
export const SKILLS_DIR = '.agents/skills'
/** The CLI's lockfile — READ-ONLY here; we read only its keys (which Skills are
 *  the external pack). The single home for "which Skills are external". */
export const SKILLS_LOCK = 'skills-lock.json'
/** The Skill Inventory — our per-Skill record; holds each pack Skill's pin. */
export const INVENTORY_DIR = 'layers/journal/content/current/skills'

/** sha256 hex of a SKILL.md's raw bytes — the pinned identity of an installed file. */
export function sha256(content: Buffer | string): string {
  return createHash('sha256').update(content).digest('hex')
}

/** What the Inventory knows about one pack Skill: whether it has an entry at all,
 *  and the pin recorded in it (if any). */
export interface InventoryPin {
  cataloged: boolean
  pin?: string
}

export interface DriftFinding {
  name: string
  /** `missing` — the SKILL.md is gone; `uncataloged` — a pack Skill with no
   *  Inventory entry (create one); `unpinned` — entry exists but no
   *  installedSha256 (run `--write`); `drifted` — on-disk content ≠ pin. */
  kind: 'missing' | 'uncataloged' | 'unpinned' | 'drifted'
  expected?: string
  actual?: string
}

export interface VerifyResult {
  checked: number
  findings: DriftFinding[]
}

/** Pure core: for every external pack Skill, reconcile its Inventory pin against
 *  the on-disk hash the caller looked up. `onDisk` maps a name to its current
 *  sha256, or `null` when its SKILL.md is missing. `inv` maps a name to what the
 *  Inventory holds. IO lives in the wrappers below so this is unit-testable. */
export function diffLock(
  externalNames: string[],
  inv: Map<string, InventoryPin>,
  onDisk: Map<string, string | null>,
): VerifyResult {
  const findings: DriftFinding[] = []
  for (const name of externalNames) {
    const actual = onDisk.get(name) ?? null
    if (actual === null) {
      findings.push({ name, kind: 'missing' })
      continue
    }
    const entry = inv.get(name)
    if (!entry?.cataloged) {
      findings.push({ name, kind: 'uncataloged', actual })
      continue
    }
    if (!entry.pin) {
      findings.push({ name, kind: 'unpinned', actual })
      continue
    }
    if (entry.pin !== actual) {
      findings.push({ name, kind: 'drifted', expected: entry.pin, actual })
    }
  }
  return { checked: externalNames.length, findings }
}

/** The external pack Skill names — the keys of the CLI's `skills-lock.json`.
 *  Read-only: we never write this file. */
function readExternalNames(cwd = root): string[] {
  const file = join(cwd, SKILLS_LOCK)
  if (!existsSync(file)) throw new Error(`${SKILLS_LOCK} not found at ${file}`)
  const lock = JSON.parse(readFileSync(file, 'utf8')) as { skills?: Record<string, unknown> }
  return Object.keys(lock.skills ?? {})
}

function invPath(name: string, cwd = root): string {
  return join(cwd, INVENTORY_DIR, `${name}.yml`)
}

/** Read each pack Skill's Inventory entry: does it exist, and what pin does it hold. */
function readInventory(names: string[], cwd = root): Map<string, InventoryPin> {
  const out = new Map<string, InventoryPin>()
  for (const name of names) {
    const file = invPath(name, cwd)
    if (!existsSync(file)) {
      out.set(name, { cataloged: false })
      continue
    }
    const parsed = parseYaml(readFileSync(file, 'utf8')) as { installedSha256?: unknown } | null
    const pin = parsed && typeof parsed.installedSha256 === 'string' ? parsed.installedSha256 : undefined
    out.set(name, { cataloged: true, pin })
  }
  return out
}

/** Look up the on-disk sha256 of each named Skill's SKILL.md (null if absent). */
function readOnDisk(names: string[], cwd = root): Map<string, string | null> {
  const out = new Map<string, string | null>()
  for (const name of names) {
    const md = join(cwd, SKILLS_DIR, name, 'SKILL.md')
    out.set(name, existsSync(md) ? sha256(readFileSync(md)) : null)
  }
  return out
}

export function verify(cwd = root): VerifyResult {
  const names = readExternalNames(cwd)
  return diffLock(names, readInventory(names, cwd), readOnDisk(names, cwd))
}

/** Set (or replace) the `installedSha256:` line in a YAML file's text, preserving
 *  every other byte — a line edit, not a parse+reserialize, so the curated `role`
 *  folded blocks and formatting are untouched. Inserts after the `importance:`
 *  line when the key is absent (falling back to end-of-file). Exported for tests. */
export function setPinLine(yaml: string, hash: string): string {
  const line = `installedSha256: ${hash}`
  const lines = yaml.split('\n')
  const existing = lines.findIndex((l) => /^installedSha256:/.test(l))
  if (existing !== -1) {
    lines[existing] = line
    return lines.join('\n')
  }
  const anchor = lines.findIndex((l) => /^importance:/.test(l))
  if (anchor !== -1) {
    lines.splice(anchor + 1, 0, line)
    return lines.join('\n')
  }
  // No anchor — append, tolerating a missing trailing newline.
  const sep = yaml.endsWith('\n') ? '' : '\n'
  return `${yaml}${sep}${line}\n`
}

/** Regenerate the Inventory pins from the current tree and the CLI lock's key set.
 *  Run after a legitimate pack install so the pins match new content. Skips (and
 *  reports) pack Skills that have no Inventory entry or no SKILL.md — those are a
 *  cataloguing gap for a human to close, not something to fabricate here. */
export function write(cwd = root): { pinned: string[]; uncataloged: string[]; missing: string[] } {
  const names = readExternalNames(cwd)
  const onDisk = readOnDisk(names, cwd)
  const pinned: string[] = []
  const uncataloged: string[] = []
  const missing: string[] = []
  for (const name of names) {
    const hash = onDisk.get(name) ?? null
    if (hash === null) {
      missing.push(name)
      continue
    }
    const file = invPath(name, cwd)
    if (!existsSync(file)) {
      uncataloged.push(name)
      continue
    }
    writeFileSync(file, setPinLine(readFileSync(file, 'utf8'), hash))
    pinned.push(name)
  }
  return { pinned, uncataloged, missing }
}

function reportLine(f: DriftFinding): string {
  const skill = `${SKILLS_DIR}/${f.name}/SKILL.md`
  switch (f.kind) {
    case 'missing':
      return `  MISSING      ${skill} — a pack Skill (in ${SKILLS_LOCK}) but not on disk`
    case 'uncataloged':
      return `  UNCATALOGED  ${f.name} — no Skill Inventory entry (${INVENTORY_DIR}/${f.name}.yml)`
    case 'unpinned':
      return `  UNPINNED     ${f.name} — Inventory entry has no installedSha256 (run \`pnpm verify:skills-lock --write\`)`
    case 'drifted':
      return `  DRIFTED      ${skill} — on-disk content differs from its Inventory pin (a local edit?)`
  }
}

function main(argv: string[]): void {
  if (argv.includes('--write')) {
    const { pinned, uncataloged, missing } = write()
    console.log(
      `verify-skills-lock: pinned ${pinned.length} pack Skill(s) in the Skill Inventory` +
        (uncataloged.length ? `; ${uncataloged.length} uncatalogued (add an entry): ${uncataloged.join(', ')}` : '') +
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
      `A SKILL.md for a pack Skill (keyed in ${SKILLS_LOCK}) drifted from, or lacks, its Inventory pin:\n`,
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
