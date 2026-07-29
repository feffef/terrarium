// Unit tests for the midden-survey helper's pure core — deletion-log parsing,
// package.json dependency-removal parsing, the noise filter, the mechanical
// Gate-B screens (regrown paths / re-added deps), and the dedupe against
// already-catalogued Midden artifacts. The git shell is a thin wrapper over
// these, exercised by running the script directly (`tsx scripts/midden-survey.ts`).
import { describe, expect, it } from 'vitest'
import {
  isDependencyLine,
  isNoisePath,
  parseDeletionLog,
  parseDependencyRemovals,
  provenanceKey,
  screenCatalogued,
  screenRegrown,
  type DeletionCandidate,
  type DependencyRemovalCandidate,
} from '../../scripts/midden-survey.ts'

const SEP = '\x1f'

// Mirrors real `git log --diff-filter=D -M --name-only --format=%H<SEP>%cI<SEP>%s`
// output: a header line per commit, a blank line, then one path per line.
const DELETION_LOG = [
  `c399e92${SEP}2026-07-24T12:46:36+00:00${SEP}midden: flatten the visitor experience`,
  '',
  'layers/midden/app/components/midden/ArtifactCard.vue',
  'layers/midden/app/components/midden/ConditionGlyph.vue',
  '',
  `7111d70${SEP}2026-07-22T20:50:03+00:00${SEP}Drop redundant doc file`,
  '',
  'docs/agents/github-footer-guard.md',
  '',
].join('\n')

describe('parseDeletionLog()', () => {
  it('yields one candidate per deleted path, carrying its deleting commit', () => {
    expect(parseDeletionLog(DELETION_LOG)).toEqual<DeletionCandidate[]>([
      {
        path: 'layers/midden/app/components/midden/ArtifactCard.vue',
        hash: 'c399e92',
        isoDate: '2026-07-24T12:46:36+00:00',
        subject: 'midden: flatten the visitor experience',
      },
      {
        path: 'layers/midden/app/components/midden/ConditionGlyph.vue',
        hash: 'c399e92',
        isoDate: '2026-07-24T12:46:36+00:00',
        subject: 'midden: flatten the visitor experience',
      },
      {
        path: 'docs/agents/github-footer-guard.md',
        hash: '7111d70',
        isoDate: '2026-07-22T20:50:03+00:00',
        subject: 'Drop redundant doc file',
      },
    ])
  })

  it('returns nothing for empty input', () => {
    expect(parseDeletionLog('')).toEqual([])
    expect(parseDeletionLog('\n\n')).toEqual([])
  })

  it('tolerates a subject containing the odd character but not the separator', () => {
    const raw = `${'a'.repeat(7)}${SEP}2026-07-01T00:00:00Z${SEP}fix: drop "quoted" file (#42)\n\nsome/file.ts\n`
    const [cand] = parseDeletionLog(raw)
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
    { path: 'gone/forever.ts', ...meta },
    { path: 'came/back.ts', ...meta },
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

describe('screenCatalogued()', () => {
  const meta = { hash: 'h', isoDate: '2026-07-01T00:00:00Z', subject: 's' }
  it('splits candidates already catalogued as Midden artifacts from fresh ones', () => {
    const cands: DeletionCandidate[] = [
      { path: 'already/catalogued.ts', ...meta },
      { path: 'brand/new.ts', ...meta },
    ]
    const { fresh, catalogued } = screenCatalogued(
      cands,
      (c) => `file:${c.path}`,
      new Set(['file:already/catalogued.ts', 'dependency:zod-to-json-schema']),
    )
    expect(fresh.map((c) => c.path)).toEqual(['brand/new.ts'])
    expect(catalogued.map((c) => c.path)).toEqual(['already/catalogued.ts'])
  })
})
