// Unit coverage for the output-content shell-read matcher (issue #1545): the
// derivation behind the shell half of `docsRead` that credits a doc from the lines of it
// that appear in a Bash tool_result, never from the command text. Expected
// values are worked examples from docs/research/shell-reads-by-output-matching.md.
import { describe, expect, it } from 'vitest'
import { buildDocLineIndex, MIN_LINES_SHOWN, scanShellReadsByOutput } from '../../scripts/shell-reads.ts'

const GUARDS = [
  '# Guards',
  '',
  'The mechanical PreToolUse guards that hold rules prose stopped holding.',
  'Each guard denies with the fix in its message, so the agent can act on it.',
].join('\n')

const index = () => buildDocLineIndex([{ path: 'docs/agents/guards.md', text: GUARDS }])

describe('crediting from output', () => {
  it('credits a doc whose line appears in the output, whatever the command was', () => {
    const scan = scanShellReadsByOutput(
      [{ command: 'for f in docs/agents/*.md; do cat "$f"; done', output: GUARDS }],
      index(),
    )
    expect(scan.paths).toEqual(['docs/agents/guards.md'])
    expect(scan.creditedBy.get('docs/agents/guards.md')).toBe('for f in docs/agents/*.md; do cat "$f"; done')
  })

  it('credits nothing from an empty result or the harness placeholder', () => {
    expect(scanShellReadsByOutput([{ command: 'cat docs/agents/guards.md', output: '' }], index()).paths).toEqual([])
    expect(
      scanShellReadsByOutput([{ command: 'cat docs/agents/guards.md 2>/dev/null | head', output: '(Bash completed with no output)' }], index()).paths,
    ).toEqual([])
  })

  it('sees through the prefixes reader commands wrap a line in', () => {
    const line = 'Each guard denies with the fix in its message, so the agent can act on it.'
    for (const output of [
      `4:${line}`, // grep -n
      `4-${line}`, // grep -A/-B context
      `docs/agents/guards.md:4:${line}`, // multi-file grep
      `     4\t${line}`, // cat -n
      `+${line}`, // unified diff / git show -p
      `-${line}`,
      `> ${line}`, // plain diff
      `< ${line}`,
    ]) {
      expect(scanShellReadsByOutput([{ command: 'x', output }], index(), (p) => p, 1).paths, output).toEqual(['docs/agents/guards.md'])
    }
  })
})

describe('what counts as distinctive', () => {
  const shared = 'This sentence is long enough and appears in two different docs.'
  const docs = [
    { path: 'docs/agents/a.md', text: `# A\n${shared}\nOnly doc a says this particular thing, at length.` },
    { path: 'docs/agents/b.md', text: `# B\n${shared}\nOnly doc b says this other particular thing, at length.` },
  ]

  it('never credits from a short line, a line two docs share, or a line a sink holds', () => {
    const idx = buildDocLineIndex(docs, [{ path: 'CLAUDE.md', text: 'Only doc a says this particular thing, at length.' }])
    expect(scanShellReadsByOutput([{ command: 'x', output: '# A' }], idx).paths).toEqual([])
    expect(scanShellReadsByOutput([{ command: 'x', output: shared }], idx).paths).toEqual([])
    expect(scanShellReadsByOutput([{ command: 'x', output: 'Only doc a says this particular thing, at length.' }], idx).paths).toEqual([])
    expect(scanShellReadsByOutput([{ command: 'x', output: 'Only doc b says this other particular thing, at length.' }], idx).paths).toEqual(['docs/agents/b.md'])
  })

  it('keys the .claude/skills spelling onto its .agents home, like the parser does', () => {
    const idx = buildDocLineIndex([{ path: '.claude/skills/tdd/SKILL.md', text: 'Tests verify behavior through public interfaces only.' }])
    expect(scanShellReadsByOutput([{ command: 'x', output: 'Tests verify behavior through public interfaces only.' }], idx).paths).toEqual([
      '.agents/skills/tdd/SKILL.md',
    ])
  })
})

describe('the path-prefix signal', () => {
  // A multi-file grep prints the doc's own path before each hit, which is
  // output-only evidence too — and the only evidence when the hit is a short
  // fragment (the 24-char case in docs/research/shell-reads-by-output-matching.md).
  // One line is enough here: these cases test what a line counts for, not how many it takes.
  const rel = (p: string): string => (p.startsWith('/repo/') ? p.slice(6) : p)

  it('credits a doc whose path prefixes an output line, even when the line itself is short', () => {
    const scan = scanShellReadsByOutput([{ command: 'grep -rn recurred docs/agents/*.md', output: 'docs/agents/pr-workflow.md:72:  recurred as #853).' }], index(), rel, 1)
    expect(scan.paths).toEqual(['docs/agents/pr-workflow.md'])
  })

  it('sees through a multi-file grep CONTEXT line (`path-12-`), and credits the file it names', () => {
    const line = 'Each guard denies with the fix in its message, so the agent can act on it.'
    const scan = scanShellReadsByOutput([{ command: 'grep -rn -A2 x docs/agents/*.md', output: `docs/agents/other.md-4-${line}` }], index(), rel, 1)
    expect(scan.paths).toEqual(['docs/agents/other.md'])
  })

  it('does not take a linter-shaped `path:line:col message` line as a read', () => {
    const scan = scanShellReadsByOutput([{ command: 'markdownlint docs/agents/guards.md', output: 'docs/agents/guards.md:12:1 MD013/line-length Line length' }], index(), rel, 1)
    expect(scan.paths).toEqual([])
  })

  it('relativizes an absolute prefix and ignores one that is not an instruction doc', () => {
    const out = ['/repo/.claude/skills/tdd/SKILL.md:3:short', 'scripts/gate.ts:9:short', 'layers/journal/content/current/pages/x.md:1:short'].join('\n')
    expect(scanShellReadsByOutput([{ command: 'x', output: out }], index(), rel, 1).paths).toEqual(['.agents/skills/tdd/SKILL.md'])
  })
})

describe('a glance is not a read', () => {
  const LONG = Array.from({ length: 12 }, (_, i) => `Line ${i} of the long doc, distinctive enough to be matched.`)
  const idx = () => buildDocLineIndex([{ path: 'docs/agents/long.md', text: LONG.join('\n') }])
  const scan = (outputs: string[]) =>
    scanShellReadsByOutput(outputs.map((output, i) => ({ command: `sed -n ${i}p docs/agents/long.md`, output })), idx()).paths

  it(`credits a doc only once the session has shown ${MIN_LINES_SHOWN} distinct lines of it`, () => {
    expect(scan([LONG.slice(0, MIN_LINES_SHOWN - 1).join('\n')])).toEqual([])
    expect(scan([LONG.slice(0, 5).join('\n'), LONG.slice(5, MIN_LINES_SHOWN).join('\n')])).toEqual(['docs/agents/long.md'])
  })

  it('counts a line shown twice once', () => {
    const half = LONG.slice(0, 5).join('\n')
    expect(scan([half, half])).toEqual([])
  })

  it('credits a doc shorter than the minimum once all of it is shown', () => {
    expect(scanShellReadsByOutput([{ command: 'cat docs/agents/guards.md', output: GUARDS }], index()).paths).toEqual(['docs/agents/guards.md'])
  })

  it("does not credit a doc from a commit's diff, only from a diff scoped to the doc", () => {
    const diff = LONG.map((l) => `+${l}`).join('\n')
    const run = (command: string) => scanShellReadsByOutput([{ command, output: diff }], idx()).paths
    expect(run('git show abc123')).toEqual([])
    expect(run('git log -p -3')).toEqual([])
    expect(run('git diff main -- docs/agents/long.md')).toEqual(['docs/agents/long.md'])
  })
})
