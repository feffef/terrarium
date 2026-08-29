// Unit coverage for the shell-read detector (issue #1074) — the extractor behind
// `docsReadViaShell`. Every false-positive case below is a real command shape from
// this repo's own transcripts, not an invented one: the decoys #1074's prototype
// was measured against, plus the classes found while building it.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { canonicalizeInstructionPath, isInstructionDoc, scanShellReads } from '../../scripts/shell-reads.ts'

/** Mirrors the trace's own relativizer for an absolute in-repo path. */
const rel = (p: string): string => (p.startsWith('/repo/') ? p.slice(6) : p)
const paths = (cmd: string): string[] => scanShellReads([cmd], rel).paths.sort()
const rules = (cmd: string): string[] => scanShellReads([cmd], rel).nearMisses.map((m) => m.rule)

describe('scope', () => {
  it('admits the four instruction shapes', () => {
    expect(paths('cat docs/agents/git-conventions.md')).toEqual(['docs/agents/git-conventions.md'])
    expect(paths('cat .agents/skills/log-session/SKILL.md')).toEqual(['.agents/skills/log-session/SKILL.md'])
    expect(paths('cat layers/journal/CONTEXT.md')).toEqual(['layers/journal/CONTEXT.md'])
    expect(paths('cat CONTEXT.md CONTEXT-MAP.md')).toEqual(['CONTEXT-MAP.md', 'CONTEXT.md'])
  })

  it('excludes a Tenant content tree — the exact-depth layers pattern (ADR-0021)', () => {
    expect(paths('cat layers/journal/content/current/pages/how-it-works.md')).toEqual([])
    expect(isInstructionDoc('layers/journal/CONTEXT.md')).toBe(true)
  })

  it('excludes CLAUDE.md: harness-injected, so permanently unmeasurable', () => {
    expect(paths('cat CLAUDE.md')).toEqual([])
    expect(isInstructionDoc('CLAUDE.md')).toBe(false)
  })

  it('canonicalizes the .claude symlink spelling onto its .agents home', () => {
    expect(canonicalizeInstructionPath('.claude/skills/tdd/SKILL.md')).toBe('.agents/skills/tdd/SKILL.md')
    expect(paths('cat .claude/skills/tdd/SKILL.md')).toEqual(['.agents/skills/tdd/SKILL.md'])
  })

  it('relativizes an absolute in-repo path onto the same key', () => {
    expect(paths('head -20 /repo/docs/agents/guards.md')).toEqual(['docs/agents/guards.md'])
  })
})

describe('reader commands', () => {
  it('counts the shapes agents actually inspect files with', () => {
    expect(paths("sed -n '1,40p' docs/adr/0009-x.md")).toEqual(['docs/adr/0009-x.md'])
    expect(paths('cat < docs/agents/in.md')).toEqual(['docs/agents/in.md'])
    expect(paths("sed -n '1,5p' docs/a.md && cat docs/b.md")).toEqual(['docs/a.md', 'docs/b.md'])
  })

  it('survives a quoted alternation pattern — the case that scored 1/2 in #1074', () => {
    // A naive split on `|` shreds the pattern and orphans the path into a
    // segment whose first token is a pattern fragment.
    expect(paths('grep -n "search_\\|list_\\|fuzzy" docs/agents/github-integration.md')).toEqual([
      'docs/agents/github-integration.md',
    ])
  })
})

describe('false positives', () => {
  it("rejects grep's first positional — it is the pattern, not a path", () => {
    expect(paths('grep -n "docs/agents/x.md" CLAUDE.md')).toEqual([])
    expect(rules('grep -n "docs/agents/x.md" CLAUDE.md')).toEqual(['first positional: a pattern or program, not a path'])
  })

  it('rejects a names-only grep: the contents never reached the session', () => {
    expect(paths('grep -rln "foo" --include=*.md docs/agents/x.md')).toEqual([])
  })

  it('rejects a path bound to -v/-e/-f, which is data not a file to read', () => {
    expect(paths('awk -v P="docs/agents/foo.md" \'{print}\' file.txt')).toEqual([])
    // `-v P=docs/…` needs no near-miss: the token is `P=docs/…`, not a path.
    // A BARE path bound to a flag is the case worth surfacing.
    expect(paths('grep -e docs/agents/x.md docs/agents/y.md')).toEqual(['docs/agents/y.md'])
    expect(rules('grep -e docs/agents/x.md docs/agents/y.md')).toEqual(['value bound to a flag'])
  })

  it('rejects a redirect target: that doc is being WRITTEN', () => {
    expect(paths("cat > docs/agents/new-doc.md <<'EOF'")).toEqual([])
    expect(rules('cat foo.txt > docs/agents/new.md')).toEqual(['redirect target: written, not read'])
    // …while the same doc on the read side of the same command still counts.
    expect(paths('cat docs/a.md > docs/b.md')).toEqual(['docs/a.md'])
  })

  it('rejects a heredoc BODY: written content, not commands that ran', () => {
    // The class the near-miss report caught on its first live transcript: a
    // fixture or doc written via `<<EOF` is full of paths that were never read.
    const writing = ["cat > probe.ts <<'TS'", "const cases = ['cat docs/a.md']", 'cat docs/agents/x.md', 'TS'].join('\n')
    expect(paths(writing)).toEqual([])
  })

  it('rejects the three decoys #1074 measured against', () => {
    expect(paths('grep -rln "x" --include=*.md docs/')).toEqual([])
    expect(paths('for p in "docs/agents/pr-workflow.md"; do echo $p; done')).toEqual([])
    expect(paths('const targets=["docs/agents/x.md"]')).toEqual([])
  })

  it('refuses a glob or variable rather than guessing which doc it named', () => {
    expect(paths('cat docs/adr/*.md')).toEqual([])
    expect(rules('cat docs/adr/*.md')).toEqual(['not a literal path: glob or variable'])
  })
})

describe('writes are not reads', () => {
  // The likeliest false positive in this repo: the harness instructs agents to
  // make file changes with sed, so `sed -i` on a docs/ file is routine. It
  // prints nothing, and the resulting entry would contradict `filesEdited`.
  it('rejects sed -i in every spelling', () => {
    expect(paths('sed -i "s/a/b/" docs/agents/guards.md')).toEqual([])
    expect(paths('sed -i.bak "s/a/b/" docs/agents/guards.md')).toEqual([])
    expect(paths('sed -e "s/a/b/" -i docs/agents/guards.md')).toEqual([])
    expect(paths('sed --in-place "s/a/b/" docs/agents/guards.md')).toEqual([])
    expect(rules('sed -i "s/a/b/" docs/agents/guards.md')).toEqual(['in-place edit: written, not read'])
  })

  it('still counts a sed that only prints', () => {
    expect(paths('sed -n "1,5p" docs/agents/guards.md')).toEqual(['docs/agents/guards.md'])
  })
})

describe('flags that consume an argument', () => {
  // Without these the numeric value takes the "first positional is the pattern"
  // slot, so the PATTERN lands in slot 2 and a doc path grepped FOR is counted —
  // the decoy class #1074 named, reappearing whenever a context flag is present.
  it('keeps the positional index straight across -A/-B/-C/-m', () => {
    for (const flag of ['-A', '-B', '-C', '-m']) {
      expect(paths(`grep ${flag} 3 "docs/agents/guards.md" CLAUDE.md`)).toEqual([])
    }
    // The attached form consumes nothing, so the index is unshifted.
    expect(paths('grep -C3 "docs/agents/guards.md" CLAUDE.md')).toEqual([])
  })
})

describe('flags that show no contents', () => {
  it('rejects -q/-c, which print nothing and a count', () => {
    expect(paths('grep -q foo docs/agents/guards.md')).toEqual([])
    expect(paths('grep -c foo docs/agents/guards.md')).toEqual([])
    expect(paths('rg --count foo docs/agents/guards.md')).toEqual([])
    expect(paths('grep --files-with-matches foo docs/agents/guards.md')).toEqual([])
  })

  it('treats -L as names-only for grep but --follow for rg', () => {
    // Verified against both binaries: grep -L is --files-without-match, rg -L is
    // --follow. Applying grep's meaning to rg loses a real read.
    expect(paths('grep -L foo docs/agents/guards.md')).toEqual([])
    expect(paths('rg -L foo docs/agents/guards.md')).toEqual(['docs/agents/guards.md'])
  })

  it('does not read a QUOTED pattern as a flag', () => {
    expect(paths('grep -rn "-l" docs/agents/guards.md')).toEqual(['docs/agents/guards.md'])
    expect(paths('grep -e "-i" docs/agents/guards.md')).toEqual(['docs/agents/guards.md'])
  })
})

describe('shell syntax around the reader', () => {
  it('ignores a trailing comment', () => {
    expect(paths('cat docs/a.md # also see docs/agents/guards.md')).toEqual(['docs/a.md'])
  })

  it('sees through wrappers standing in front of the verb', () => {
    // `timeout` is the one that matters: agent briefs here mandate foreground
    // commands with an explicit timeout.
    expect(paths('timeout 60 cat docs/agents/guards.md')).toEqual(['docs/agents/guards.md'])
    expect(paths('timeout 120 grep -n foo docs/agents/guards.md')).toEqual(['docs/agents/guards.md'])
    expect(paths('sudo cat docs/agents/guards.md')).toEqual(['docs/agents/guards.md'])
    expect(paths('FOO=1 cat docs/agents/guards.md')).toEqual(['docs/agents/guards.md'])
    expect(paths('(cat docs/agents/guards.md)')).toEqual(['docs/agents/guards.md'])
  })

  it('handles both redirect spellings and a numbered fd', () => {
    expect(paths('cat foo.txt >docs/agents/guards.md')).toEqual([])
    expect(paths('cat foo.txt 2> docs/agents/guards.md')).toEqual([])
    expect(paths('cat docs/a.md >> docs/b.md')).toEqual(['docs/a.md'])
  })

  it('canonicalizes a ./-prefixed path', () => {
    expect(canonicalizeInstructionPath('./docs/a.md')).toBe('docs/a.md')
    expect(paths('cat ./docs/agents/guards.md')).toEqual(['docs/agents/guards.md'])
  })
})

describe('heredoc edge cases', () => {
  // stripHeredocs is the function likeliest to eat a legitimate read, so its
  // failure modes are pinned rather than left to the happy path.
  it('drops only the marker when the command has no body at all', () => {
    // A quoted "<<EOF" in a pattern. Truncating at the marker would eat the path.
    expect(paths('grep -n "<<EOF" docs/agents/guards.md')).toEqual(['docs/agents/guards.md'])
  })

  it('keeps the rest of the marker\'s own line', () => {
    expect(paths("cat <<'EOF' > /tmp/f && cat docs/agents/guards.md\nbody\nEOF")).toEqual([
      'docs/agents/guards.md',
    ])
  })

  it('is not confused by a herestring, which has no body', () => {
    expect(paths('cat <<<EOF docs/agents/guards.md')).toEqual(['docs/agents/guards.md'])
  })

  it('strips to end of string when the terminator never arrives', () => {
    expect(paths("cat > /tmp/f <<'EOF'\ncat docs/agents/guards.md")).toEqual([])
  })

  it('handles the indented <<- form and two heredocs in one command', () => {
    expect(paths('cat > /tmp/a <<-EOF\ncat docs/a.md\nEOF\ncat > /tmp/b <<EOF2\ncat docs/b.md\nEOF2')).toEqual([])
    // …while a real read after both still survives.
    expect(paths('cat > /tmp/a <<EOF\nx\nEOF\ncat docs/agents/guards.md')).toEqual(['docs/agents/guards.md'])
  })
})

describe('near-misses', () => {
  it('omits a path that was counted elsewhere — the session has it either way', () => {
    const scan = scanShellReads(['cat docs/a.md', 'grep -n "docs/a.md" CLAUDE.md'], rel)
    expect(scan.paths).toEqual(['docs/a.md'])
    expect(scan.nearMisses).toEqual([])
  })

  it('carries the command so a reported miss is actionable', () => {
    const [miss] = scanShellReads(['cat docs/adr/*.md'], rel).nearMisses
    expect(miss?.command).toBe('cat docs/adr/*.md')
    expect(miss?.token).toBe('docs/adr/*.md')
  })

  it('orders reader-segment rejections before other commands', () => {
    // A rejected token inside a real reader is likelier to be a genuine
    // extractor bug than a doc path some other program merely mentioned.
    const scan = scanShellReads(['echo docs/a.md', 'grep -n "docs/b.md" CLAUDE.md'], rel)
    expect(scan.nearMisses.map((m) => m.rule)).toEqual([
      'first positional: a pattern or program, not a path',
      'not a reader command',
    ])
  })
})

describe('no other consumer acts on the field', () => {
  // The rule is a decision, not an accident (ADR-0009's shell-read amendment):
  // nothing may read `docsReadViaShell` except the trace that derives it, the
  // stitch that lands it, the authoring loop, and the Journal card that shows
  // it. Prose alone has repeatedly failed to hold rules like this here
  // (docs/agents/guards.md), and the natural way to add a consumer is to copy
  // one that already reads a sibling trace field — so it is checked.
  const ALLOWED = new Set([
    'scripts/shell-reads.ts',
    'scripts/session-trace.ts',
    'scripts/log-session.ts',
    'shared/schemas/session.ts',
    'shared/trace-fields.ts',
    'layers/journal/app/types/journal.ts',
    'layers/journal/app/utils/dashboard.ts',
    'layers/journal/app/components/journal/SessionCard.vue',
    'tests/unit/shell-reads.spec.ts',
    'tests/unit/session-trace.spec.ts',
    'tests/unit/log-session.spec.ts',
  ])

  // Known narrowing: this greps for the literal field name, so a consumer that
  // reaches the field by ITERATING `FOLDED_TRACE_FIELDS` would pass unnoticed.
  // Both existing iterators (session-trace.ts, SessionCard.vue) are allowlisted,
  // so the hole is latent rather than open — but a new iterator is not caught.

  it('is referenced only by the trace, the stitch, the loop, and the card', () => {
    const tracked = execFileSync('git', ['ls-files', '*.ts', '*.vue'], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
    const referencing = tracked.filter((f) => readFileSync(f, 'utf8').includes('docsReadViaShell'))
    expect(referencing.filter((f) => !ALLOWED.has(f))).toEqual([])
  })
})
