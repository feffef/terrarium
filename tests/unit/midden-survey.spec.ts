// Unit tests for the midden-survey helper's pure core — deletion-log parsing,
// package.json dependency-removal parsing, the noise filter, the mechanical
// Gate-B screens (regrown paths / relocated files / re-added deps), and the
// dedupe against already-catalogued Midden artifacts. The git shell is a thin
// wrapper over these, exercised by running the script directly
// (`tsx scripts/midden-survey.ts`).
import { describe, expect, it } from 'vitest'
import {
  cataloguedIndex,
  cataloguedLabel,
  cataloguedPathVia,
  indexCurrentTree,
  isDependencyLine,
  isNoisePath,
  parseDeletionLog,
  parseDependencyRemovals,
  provenanceKey,
  provenancePath,
  relocationLabel,
  renamesByOldPath,
  resolveRenamed,
  screenCatalogued,
  screenRegrown,
  screenRelocated,
  type CataloguedPath,
  type DeletionCandidate,
  type DependencyRemovalCandidate,
  type Relocation,
} from '../../scripts/midden-survey.ts'

const SEP = '\x1f'
const ZERO = '0'.repeat(40)
/** A distinct 40-hex blob SHA per fixture file, readable in a failure message. */
const blobOf = (seed: string) => seed.padEnd(40, '0').replace(/[^0-9a-f]/g, 'a')

// Mirrors real `git log --diff-filter=DR -M --raw --no-abbrev --format=%H<SEP>%cI<SEP>%s`
// output: a header line per commit, a blank line, then one `:<modes> <shas>
// <status>\t<paths>` line per changed file.
const CARD = blobOf('ca4d')
const GLYPH = blobOf('617f')
const DOC = blobOf('d0c')
const SPEC_BEFORE = blobOf('5bef')
const SPEC_AFTER = blobOf('5aft')

const DELETION_LOG = [
  `c399e92${SEP}2026-07-24T12:46:36+00:00${SEP}midden: flatten the visitor experience`,
  '',
  `:100644 000000 ${CARD} ${ZERO} D\tlayers/midden/app/components/midden/ArtifactCard.vue`,
  `:100644 000000 ${GLYPH} ${ZERO} D\tlayers/midden/app/components/midden/ConditionGlyph.vue`,
  '',
  `7111d70${SEP}2026-07-22T20:50:03+00:00${SEP}Drop redundant doc file`,
  '',
  `:100644 000000 ${DOC} ${ZERO} D\tdocs/agents/github-footer-guard.md`,
  `:100644 100644 ${SPEC_BEFORE} ${SPEC_AFTER} R067\ttests/unit/github-footer-guard.spec.ts\ttests/unit/github-provenance-guard.spec.ts`,
  '',
].join('\n')

describe('parseDeletionLog()', () => {
  it('yields one candidate per deleted path, carrying its deleting commit and dead content', () => {
    expect(parseDeletionLog(DELETION_LOG).deletions).toEqual<DeletionCandidate[]>([
      {
        path: 'layers/midden/app/components/midden/ArtifactCard.vue',
        blob: CARD,
        hash: 'c399e92',
        isoDate: '2026-07-24T12:46:36+00:00',
        subject: 'midden: flatten the visitor experience',
      },
      {
        path: 'layers/midden/app/components/midden/ConditionGlyph.vue',
        blob: GLYPH,
        hash: 'c399e92',
        isoDate: '2026-07-24T12:46:36+00:00',
        subject: 'midden: flatten the visitor experience',
      },
      {
        path: 'docs/agents/github-footer-guard.md',
        blob: DOC,
        hash: '7111d70',
        isoDate: '2026-07-22T20:50:03+00:00',
        subject: 'Drop redundant doc file',
      },
    ])
  })

  it('surfaces a rename git detected as a relocation, naming both paths (#753)', () => {
    expect(parseDeletionLog(DELETION_LOG).renames).toEqual<Relocation[]>([
      {
        path: 'tests/unit/github-footer-guard.spec.ts',
        newPath: 'tests/unit/github-provenance-guard.spec.ts',
        hash: '7111d70',
        isoDate: '2026-07-22T20:50:03+00:00',
        subject: 'Drop redundant doc file',
      },
    ])
  })

  it('never reports a detected rename among the deletions', () => {
    const dead = parseDeletionLog(DELETION_LOG).deletions.map((c) => c.path)
    expect(dead).not.toContain('tests/unit/github-footer-guard.spec.ts')
  })

  it('returns nothing for empty input', () => {
    expect(parseDeletionLog('')).toEqual({ deletions: [], renames: [] })
    expect(parseDeletionLog('\n\n')).toEqual({ deletions: [], renames: [] })
  })

  it('tolerates a subject containing the odd character but not the separator', () => {
    const raw = `${'a'.repeat(7)}${SEP}2026-07-01T00:00:00Z${SEP}fix: drop "quoted" file (#42)\n\n:100644 000000 ${DOC} ${ZERO} D\tsome/file.ts\n`
    const [cand] = parseDeletionLog(raw).deletions
    expect(cand?.subject).toBe('fix: drop "quoted" file (#42)')
    expect(cand?.path).toBe('some/file.ts')
  })
})

describe('isNoisePath()', () => {
  it('screens journal content churn (archival moves, session logs)', () => {
    expect(isNoisePath('layers/journal/content/current/sessions/2026-07-10-session_x.yml')).toBe(true)
    expect(isNoisePath('layers/journal/content/archive/2026-07/sessions/y.yml')).toBe(true)
  })
  it('screens .claude/skills symlink churn (mirrors .agents/skills)', () => {
    expect(isNoisePath('.claude/skills/old-skill')).toBe(true)
  })
  it('keeps ordinary source, doc, and config paths', () => {
    expect(isNoisePath('app/pages/index.vue')).toBe(false)
    expect(isNoisePath('docs/agents/github-footer-guard.md')).toBe(false)
    expect(isNoisePath('pnpm-workspace.yaml')).toBe(false)
    expect(isNoisePath('.agents/skills/retired-skill/SKILL.md')).toBe(false)
    expect(isNoisePath('layers/journal/app/components/Card.vue')).toBe(false)
  })
})

describe('isDependencyLine()', () => {
  it('accepts real dependency entries', () => {
    expect(isDependencyLine('zod-to-json-schema', '^3.23.5')).toBe(true)
    expect(isDependencyLine('@nuxt/content', '3.15.0')).toBe(true)
    expect(isDependencyLine('yaml', '~2.9.0')).toBe(true)
    expect(isDependencyLine('left-pad', 'workspace:*')).toBe(true)
    expect(isDependencyLine('some-fork', 'github:owner/repo#branch')).toBe(true)
  })
  it('rejects package.json script entries and metadata', () => {
    // script values contain spaces
    expect(isDependencyLine('gate', 'pnpm verify:skills-lock && pnpm lint')).toBe(false)
    // script names with ":" are not valid package names
    expect(isDependencyLine('test:e2e', 'playwright')).toBe(false)
    // a bare one-word command is not a version range
    expect(isDependencyLine('clean', 'rimraf')).toBe(false)
    // top-level metadata
    expect(isDependencyLine('name', 'terrarium')).toBe(false)
    expect(isDependencyLine('version', '1.0.0')).toBe(true) // shape alone can't exclude this — the parser's plus/minus join and Gate B screen handle it
  })
})

// Mirrors real `git log -p --format=%H<SEP>%cI<SEP>%s -- package.json` output,
// abridged to the lines the parser reads (headers and +/- diff lines).
const DEP_LOG = [
  `5fd7ba4${SEP}2026-07-12T09:00:00+00:00${SEP}deps: drop unused zod-to-json-schema devDependency`,
  '',
  'diff --git a/package.json b/package.json',
  '--- a/package.json',
  '+++ b/package.json',
  '@@ -40,7 +40,6 @@',
  '     "yaml": "^2.9.0",',
  '-    "zod-to-json-schema": "^3.23.5"',
  '+    "yaml": "^2.9.0"',
  '',
  `abc1234${SEP}2026-07-20T10:00:00+00:00${SEP}chore: pin @nuxt/content`,
  '',
  'diff --git a/package.json b/package.json',
  '@@ -30,3 +30,3 @@',
  '-    "@nuxt/content": "^3.7.1",',
  '+    "@nuxt/content": "3.15.0",',
  '-    "gate": "pnpm lint && pnpm test",',
  '+    "gate": "pnpm lint && pnpm test && pnpm build",',
].join('\n')

describe('parseDependencyRemovals()', () => {
  it('yields a removal for a dependency line dropped and not re-added in the same commit', () => {
    expect(parseDependencyRemovals(DEP_LOG)).toEqual<DependencyRemovalCandidate[]>([
      {
        name: 'zod-to-json-schema',
        hash: '5fd7ba4',
        isoDate: '2026-07-12T09:00:00+00:00',
        subject: 'deps: drop unused zod-to-json-schema devDependency',
      },
    ])
  })

  it('does not report a version bump (same name removed and re-added) as a removal', () => {
    const names = parseDependencyRemovals(DEP_LOG).map((r) => r.name)
    expect(names).not.toContain('@nuxt/content')
  })

  it('does not report script-line churn as a removal', () => {
    const names = parseDependencyRemovals(DEP_LOG).map((r) => r.name)
    expect(names).not.toContain('gate')
  })

  it('returns nothing for empty input', () => {
    expect(parseDependencyRemovals('')).toEqual([])
  })
})

describe('screenRegrown() — the mechanical half of Gate B', () => {
  const meta = { hash: 'h', isoDate: '2026-07-01T00:00:00Z', subject: 's' }
  const cands: DeletionCandidate[] = [
    { path: 'gone/forever.ts', blob: blobOf('60e'), ...meta },
    { path: 'came/back.ts', blob: blobOf('bac'), ...meta },
  ]
  it('splits candidates whose path exists again in the current tree from truly gone ones', () => {
    const { gone, regrown } = screenRegrown(cands, new Set(['came/back.ts', 'other/live.ts']))
    expect(gone.map((c) => c.path)).toEqual(['gone/forever.ts'])
    expect(regrown.map((c) => c.path)).toEqual(['came/back.ts'])
  })
  it('keeps everything when nothing regrew', () => {
    const { gone, regrown } = screenRegrown(cands, new Set())
    expect(gone).toHaveLength(2)
    expect(regrown).toHaveLength(0)
  })
})

// Mirrors real `git ls-tree -r origin/main` output.
const MOVED = blobOf('m0ed')
const EMPTY = blobOf('e69de29bb2d1d6434b8b29ae775ad8c2e48c5391')
const TREE = [
  `100644 blob ${MOVED}\tlayers/status/content/current/pages/index.md`,
  `100644 blob ${blobOf('11e')}\tapp/app.vue`,
  `100644 blob ${EMPTY}\tlayers/a/.gitkeep`,
  `100644 blob ${EMPTY}\tlayers/b/.gitkeep`,
  '',
].join('\n')

describe('indexCurrentTree()', () => {
  it('reads every path in the tree', () => {
    expect(indexCurrentTree(TREE).paths).toEqual(
      new Set(['layers/status/content/current/pages/index.md', 'app/app.vue', 'layers/a/.gitkeep', 'layers/b/.gitkeep']),
    )
  })
  it('keys a blob only one live path holds to that path', () => {
    expect(indexCurrentTree(TREE).uniqueBlobPaths.get(MOVED)).toBe('layers/status/content/current/pages/index.md')
  })
  it('refuses to key content several live paths share — it names no survivor (#753)', () => {
    expect(indexCurrentTree(TREE).uniqueBlobPaths.has(EMPTY)).toBe(false)
  })
  it('returns nothing for empty input', () => {
    expect(indexCurrentTree('')).toEqual({ paths: new Set(), uniqueBlobPaths: new Map() })
  })
})

// A rename git detected a day after the candidate died, and the archival move
// that followed it — the two hops #730's session log survived through.
const move = (path: string, newPath: string, isoDate: string): Relocation => ({
  path,
  newPath,
  isoDate,
  hash: 'r' + '0'.repeat(6),
  subject: 'move',
})
const CHAIN = [
  move('tenants/journal/x.yml', 'layers/journal/current/x.yml', '2026-05-02T00:00:00Z'),
  move('layers/journal/current/x.yml', 'layers/journal/archived/x.yml', '2026-06-01T00:00:00Z'),
]

describe('resolveRenamed() — following git\'s rename records across commits (#753)', () => {
  const byOldPath = renamesByOldPath(CHAIN)

  it('follows a multi-hop chain to where the path stands today', () => {
    expect(resolveRenamed({ path: 'tenants/journal/x.yml', isoDate: '2026-05-01T00:00:00Z' }, byOldPath)).toBe(
      'layers/journal/archived/x.yml',
    )
  })
  it('yields nothing for a path nothing ever moved', () => {
    expect(resolveRenamed({ path: 'scripts/generate.ts', isoDate: '2026-05-01T00:00:00Z' }, byOldPath)).toBeUndefined()
  })
  it('ignores a move that predates the deletion — that was a different occupant (#753)', () => {
    expect(resolveRenamed({ path: 'tenants/journal/x.yml', isoDate: '2026-07-01T00:00:00Z' }, byOldPath)).toBeUndefined()
  })
  it('compares instants, not strings, across differing UTC offsets', () => {
    expect(resolveRenamed({ path: 'tenants/journal/x.yml', isoDate: '2026-05-02T01:30:00+02:00' }, byOldPath)).toBe(
      'layers/journal/archived/x.yml',
    )
  })
  it('terminates on a chain that loops back on itself', () => {
    const cycle = renamesByOldPath([
      move('a.ts', 'b.ts', '2026-05-02T00:00:00Z'),
      move('b.ts', 'a.ts', '2026-05-03T00:00:00Z'),
    ])
    expect(resolveRenamed({ path: 'a.ts', isoDate: '2026-05-01T00:00:00Z' }, cycle)).toBe('b.ts')
  })
})

describe('screenRelocated() — the cross-commit half of Gate B (#753)', () => {
  const meta = { hash: 'a1b2c3d', isoDate: '2026-05-01T00:00:00Z', subject: 'move tenants/ to layers/' }
  const tree = indexCurrentTree(`${TREE}100644 blob ${blobOf('ed17ed')}\tlayers/journal/archived/x.yml\n`)
  const byOldPath = renamesByOldPath(CHAIN)
  const none = new Map<string, Relocation[]>()

  it('screens a file whose content stands at another path today, naming both paths', () => {
    const moved: DeletionCandidate = { path: 'tenants/status/content/current/pages/index.md', blob: MOVED, ...meta }
    const { gone, relocated } = screenRelocated([moved], tree, none)
    expect(gone).toEqual([])
    expect(relocated).toEqual<Relocation[]>([
      {
        path: 'tenants/status/content/current/pages/index.md',
        newPath: 'layers/status/content/current/pages/index.md',
        ...meta,
      },
    ])
  })

  it('screens a file whose body changed after it moved, via the rename chain (#730)', () => {
    const moved: DeletionCandidate = { path: 'tenants/journal/x.yml', blob: blobOf('01d'), ...meta }
    const { gone, relocated } = screenRelocated([moved], tree, byOldPath)
    expect(gone).toEqual([])
    expect(relocated.map(relocationLabel)).toEqual(['tenants/journal/x.yml → layers/journal/archived/x.yml'])
  })

  it('still reports a file that moved and then died at the end of its chain', () => {
    const chain = renamesByOldPath([move('old/dead.ts', 'new/dead.ts', '2026-05-02T00:00:00Z')])
    const dead: DeletionCandidate = { path: 'old/dead.ts', blob: blobOf('dead'), ...meta }
    const { gone, relocated } = screenRelocated([dead], tree, chain)
    expect(gone).toEqual([dead])
    expect(relocated).toEqual([])
  })

  it('still reports a file whose content is nowhere in the current tree', () => {
    const dead: DeletionCandidate = { path: 'scripts/generate.ts', blob: blobOf('dead'), ...meta }
    const { gone, relocated } = screenRelocated([dead], tree, none)
    expect(gone).toEqual([dead])
    expect(relocated).toEqual([])
  })

  it('still reports a dead file whose content several live paths share — no false screen (#753)', () => {
    const dead: DeletionCandidate = { path: 'layers/retired/.gitkeep', blob: EMPTY, ...meta }
    const { gone, relocated } = screenRelocated([dead], tree, none)
    expect(gone).toEqual([dead])
    expect(relocated).toEqual([])
  })
})

describe('the three outcomes a deletion candidate can have, in report order (#753)', () => {
  const meta = { isoDate: '2026-05-01T00:00:00Z', subject: 's' }
  const tree = indexCurrentTree(TREE)
  const candidates: DeletionCandidate[] = [
    // Deleted and re-created at the same path, in a later commit with different content.
    { path: 'app/app.vue', blob: blobOf('01d'), hash: 'aaaaaaa', ...meta },
    // Deleted in one commit, its content already living at a new path (#730's tree move).
    { path: 'tenants/status/content/current/pages/index.md', blob: MOVED, hash: 'bbbbbbb', ...meta },
    // Deleted and gone.
    { path: 'scripts/generate.ts', blob: blobOf('dead'), hash: 'ccccccc', ...meta },
  ]

  const { gone: notRegrown, regrown } = screenRegrown(candidates, tree.paths)
  const { gone, relocated } = screenRelocated(notRegrown, tree, new Map())

  it('reports a same-path regrowth as regrown, never as a relocation', () => {
    expect(regrown.map((c) => c.path)).toEqual(['app/app.vue'])
    expect(relocated.map((r) => r.path)).not.toContain('app/app.vue')
  })
  it('reports a relocation as relocated, never as a fresh candidate', () => {
    expect(relocated.map(relocationLabel)).toEqual([
      'tenants/status/content/current/pages/index.md → layers/status/content/current/pages/index.md',
    ])
    expect(gone.map((c) => c.path)).not.toContain('tenants/status/content/current/pages/index.md')
  })
  it('leaves a true death among the fresh candidates', () => {
    expect(gone.map((c) => c.path)).toEqual(['scripts/generate.ts'])
  })
})

describe('relocationLabel()', () => {
  it('names both paths', () => {
    expect(relocationLabel({ path: 'a/old.ts', newPath: 'b/new.ts' })).toBe('a/old.ts → b/new.ts')
  })
})

describe('provenanceKey()', () => {
  it('derives one identity key per provenance kind', () => {
    expect(provenanceKey({ kind: 'file', path: 'a/b.ts' })).toBe('file:a/b.ts')
    expect(provenanceKey({ kind: 'dependency', name: 'zod-to-json-schema' })).toBe('dependency:zod-to-json-schema')
    expect(provenanceKey({ kind: 'pr', number: 477, merged: false })).toBe('pr:477')
    expect(provenanceKey({ kind: 'branch', name: 'old/branch' })).toBe('branch:old/branch')
    expect(provenanceKey({ kind: 'skill', name: 'retired-skill' })).toBe('skill:retired-skill')
  })
  it('normalizes a commit hash to its 7-char prefix so long and short forms match', () => {
    expect(provenanceKey({ kind: 'commit', hash: 'c399e92b57843358d791e2e5aba1cc598bde171a' })).toBe('commit:c399e92')
    expect(provenanceKey({ kind: 'commit', hash: 'c399e92' })).toBe('commit:c399e92')
  })
  it('returns undefined for a malformed provenance', () => {
    expect(provenanceKey({})).toBeUndefined()
    expect(provenanceKey({ kind: 'unknown-kind' })).toBeUndefined()
  })
})

describe('provenancePath()', () => {
  it('reads the path a file-kind provenance declares', () => {
    expect(provenancePath({ kind: 'file', path: 'app.vue' })).toBe('app.vue')
  })
  it('reads the path a commit-kind provenance declares (#752)', () => {
    expect(provenancePath({ kind: 'commit', hash: '73bf3dc', path: 'content.config.ts' })).toBe('content.config.ts')
  })
  it('yields nothing for a commit-kind provenance carrying only a hash', () => {
    expect(provenancePath({ kind: 'commit', hash: '04466d6' })).toBeUndefined()
  })
  it('yields nothing for the kinds that declare no path at all', () => {
    expect(provenancePath({ kind: 'pr', number: 477, merged: false })).toBeUndefined()
    expect(provenancePath({ kind: 'branch', name: 'old/branch' })).toBeUndefined()
    expect(provenancePath({ kind: 'dependency', name: 'zod-to-json-schema' })).toBeUndefined()
    expect(provenancePath({ kind: 'skill', name: 'retired-skill' })).toBeUndefined()
    expect(provenancePath({})).toBeUndefined()
  })
})

describe('cataloguedIndex()', () => {
  it('indexes every declared path against the key of the artifact declaring it', () => {
    const { keys, paths } = cataloguedIndex([
      { kind: 'file', path: 'scripts/generate.ts' },
      { kind: 'commit', hash: '73bf3dc', path: 'content.config.ts' },
      { kind: 'commit', hash: '04466d6' },
      { kind: 'dependency', name: 'zod-to-json-schema' },
      { kind: 'pr', number: 477, merged: false },
    ])
    expect(keys).toEqual(
      new Set([
        'file:scripts/generate.ts',
        'commit:73bf3dc',
        'commit:04466d6',
        'dependency:zod-to-json-schema',
        'pr:477',
      ]),
    )
    expect(paths).toEqual(
      new Map<string, CataloguedPath>([
        ['scripts/generate.ts', { key: 'file:scripts/generate.ts' }],
        ['content.config.ts', { key: 'commit:73bf3dc', onlyIfDeletedBy: '73bf3dc' }],
      ]),
    )
  })
  it('binds a commit-kind declaration to its own commit, normalized to 7 chars (#761)', () => {
    const { paths } = cataloguedIndex([
      { kind: 'commit', hash: 'c399e92b57843358d791e2e5aba1cc598bde171a', path: 'CONTEXT.md' },
    ])
    expect(paths.get('CONTEXT.md')).toEqual({ key: 'commit:c399e92', onlyIfDeletedBy: 'c399e92' })
  })
  it('leaves a file-kind declaration unconditional', () => {
    expect(cataloguedIndex([{ kind: 'file', path: 'app.vue' }]).paths.get('app.vue')).toEqual({ key: 'file:app.vue' })
  })
  it('keeps the first declaration of a path a second artifact also declares', () => {
    const { paths } = cataloguedIndex([
      { kind: 'file', path: 'content.config.ts' },
      { kind: 'commit', hash: '73bf3dc', path: 'content.config.ts' },
    ])
    expect(paths.get('content.config.ts')).toEqual({ key: 'file:content.config.ts' })
  })
  it('skips a provenance it cannot key, without throwing', () => {
    const { keys, paths } = cataloguedIndex([{ kind: 'unknown-kind' }, {}])
    expect(keys.size).toBe(0)
    expect(paths.size).toBe(0)
  })
})

describe('cataloguedPathVia()', () => {
  const { paths } = cataloguedIndex([
    { kind: 'file', path: 'scripts/generate.ts' },
    { kind: 'file', path: 'layers/journal/app/components/journal/prototype/' },
    { kind: 'commit', hash: '73bf3dc', path: 'content.config.ts' },
    { kind: 'commit', hash: '551862c', path: 'tenants/status/content/current/glossary/' },
  ])
  // The deleting commit `parseDeletionLog` attaches to every candidate.
  const deletedBy = (path: string, hash: string): DeletionCandidate => ({
    path,
    blob: blobOf('b10b'),
    hash,
    isoDate: '2026-07-01T00:00:00Z',
    subject: 's',
  })

  it('names the file-kind artifact that catalogued a path exactly, whichever commit deleted it', () => {
    expect(cataloguedPathVia(deletedBy('scripts/generate.ts', 'e75bda0'), paths)).toBe('file:scripts/generate.ts')
  })
  it('names the file-kind directory-valued artifact a file lived beneath', () => {
    expect(
      cataloguedPathVia(deletedBy('layers/journal/app/components/journal/prototype/VariantB.vue', '9eeeafa'), paths),
    ).toBe('file:layers/journal/app/components/journal/prototype/')
  })

  it('screens a commit-kind path when that artifact\'s own commit is the one that deleted it (#761)', () => {
    expect(cataloguedPathVia(deletedBy('content.config.ts', '73bf3dc0111222333444555666777888999aaab'), paths)).toBe(
      'commit:73bf3dc',
    )
  })
  it('does NOT screen a commit-kind path its commit merely touched, killed later by another commit (#761)', () => {
    expect(cataloguedPathVia(deletedBy('content.config.ts', 'c399e92'), paths)).toBeUndefined()
  })
  it('screens beneath a commit-kind directory only for that commit\'s own deletions (#761)', () => {
    expect(cataloguedPathVia(deletedBy('tenants/status/content/current/glossary/tenant.md', '551862c'), paths)).toBe(
      'commit:551862c',
    )
    expect(
      cataloguedPathVia(deletedBy('tenants/status/content/current/glossary/tenant.md', 'c399e92'), paths),
    ).toBeUndefined()
  })

  it('does not match on a bare string prefix of a file-valued catalogued path', () => {
    expect(cataloguedPathVia(deletedBy('content.config.ts.bak', '73bf3dc'), paths)).toBeUndefined()
    expect(
      cataloguedPathVia(deletedBy('tenants/status/content/current/glossaryx/tenant.md', '551862c'), paths),
    ).toBeUndefined()
  })
  it('does not match an uncatalogued path', () => {
    expect(cataloguedPathVia(deletedBy('app/pages/index.vue', '5ebba8e'), paths)).toBeUndefined()
    expect(cataloguedPathVia(deletedBy('', '5ebba8e'), paths)).toBeUndefined()
  })
  it('matches nothing when no path is catalogued', () => {
    expect(cataloguedPathVia(deletedBy('content.config.ts', '73bf3dc'), new Map())).toBeUndefined()
  })
})

describe('cataloguedLabel()', () => {
  it('leaves a candidate screened by its own file-kind identity unadorned', () => {
    expect(cataloguedLabel('file:scripts/generate.ts', 'file:scripts/generate.ts')).toBe('file:scripts/generate.ts')
  })
  it('names the commit-kind artifact that screened a file with no identity of its own', () => {
    expect(cataloguedLabel('file:content.config.ts', 'commit:73bf3dc')).toBe('file:content.config.ts (via commit:73bf3dc)')
  })
  it('names the directory-valued artifact a file was screened beneath', () => {
    expect(cataloguedLabel('file:a/b/c.ts', 'file:a/b/')).toBe('file:a/b/c.ts (via file:a/b/)')
  })
})

describe('screenCatalogued()', () => {
  const meta = { blob: blobOf('b10b'), hash: 'h', isoDate: '2026-07-01T00:00:00Z', subject: 's' }
  const index = cataloguedIndex([
    { kind: 'file', path: 'already/catalogued.ts' },
    { kind: 'commit', hash: '9d3e3bc', path: 'tenants/status/content/current/pages/index.md' },
    { kind: 'commit', hash: '551862c', path: 'tenants/status/content/current/glossary/' },
    { kind: 'commit', hash: '04466d6' },
    { kind: 'dependency', name: 'zod-to-json-schema' },
  ])

  it('splits deletion candidates already catalogued as Midden artifacts from fresh ones', () => {
    const cands: DeletionCandidate[] = [
      { path: 'already/catalogued.ts', ...meta },
      { path: 'tenants/status/content/current/pages/index.md', ...meta, hash: '9d3e3bc' },
      { path: 'tenants/status/content/current/glossary/tenant.md', ...meta, hash: '551862c' },
      { path: 'brand/new.ts', ...meta },
    ]
    const { fresh, catalogued } = screenCatalogued(cands, (c) => cataloguedPathVia(c, index.paths) !== undefined)
    expect(fresh.map((c) => c.path)).toEqual(['brand/new.ts'])
    expect(catalogued.map((c) => c.path)).toEqual([
      'already/catalogued.ts',
      'tenants/status/content/current/pages/index.md',
      'tenants/status/content/current/glossary/tenant.md',
    ])
  })

  it('leaves a commit-kind path a later commit killed among the fresh candidates (#761)', () => {
    const cands: DeletionCandidate[] = [
      { path: 'tenants/status/content/current/pages/index.md', ...meta, hash: 'facade1' },
      { path: 'tenants/status/content/current/glossary/tenant.md', ...meta, hash: 'facade1' },
    ]
    const { fresh, catalogued } = screenCatalogued(cands, (c) => cataloguedPathVia(c, index.paths) !== undefined)
    expect(catalogued).toEqual([])
    expect(fresh).toHaveLength(2)
  })

  it('screens dropped dependencies by name, unaffected by the path index', () => {
    const removals: DependencyRemovalCandidate[] = [
      { name: 'zod-to-json-schema', ...meta },
      { name: 'still-fresh', ...meta },
    ]
    const { fresh, catalogued } = screenCatalogued(removals, (r) => index.keys.has(`dependency:${r.name}`))
    expect(fresh.map((r) => r.name)).toEqual(['still-fresh'])
    expect(catalogued.map((r) => r.name)).toEqual(['zod-to-json-schema'])
  })
})
