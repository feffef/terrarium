// Coverage for the workflow-edit guard (issue #897; rationale and detection
// contract in `scripts/workflow-edit-guard.ts`). The pure core is pinned
// directly; the CLI's stdin→deny-JSON path, `--dry-run`, and the hot-path
// pre-filter are exercised end to end against the real scripts — the same
// reviewability bar the sibling guards' specs set for an unattended hook
// (ADR-0004).
import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { checkWorkflowEdit, denyOutputFor, formatGuardMessage } from '../../scripts/workflow-edit-guard.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SCRIPT = join(root, 'scripts', 'workflow-edit-guard.ts')
const PREFILTER = join(root, 'scripts', 'workflow-edit-guard.sh')

/** A PreToolUse payload in the shape the harness sends. */
function payloadFor(tool: string, input: Record<string, unknown>): Record<string, unknown> {
  return {
    session_id: '657b9532-8ed5-5695-a08d-d87a60f7a665',
    transcript_path: '/root/.claude/projects/x/657b9532.jsonl',
    hook_event_name: 'PreToolUse',
    tool_name: tool,
    tool_input: input,
  }
}

describe('checkWorkflowEdit() — Edit/Write file paths (issue #897)', () => {
  it('DENIES a repo-relative workflow path', () => {
    const finding = checkWorkflowEdit('Edit', { file_path: '.github/workflows/gate.yml' })
    expect(finding).toMatchObject({ tool: 'Edit', via: 'file_path', target: '.github/workflows/gate.yml' })
  })

  it('DENIES an absolute path, including one inside a dispatched subagent worktree', () => {
    expect(checkWorkflowEdit('Write', { file_path: '/home/user/terrarium/.github/workflows/new.yml' })).not.toBeNull()
    expect(checkWorkflowEdit('Write', { file_path: '/tmp/wt/agent-1/.github/workflows/gate.yml' })).not.toBeNull()
  })

  it('ALLOWS `.github/actions/gate/action.yml` — agents CAN push it (ADR-0026)', () => {
    expect(checkWorkflowEdit('Edit', { file_path: '.github/actions/gate/action.yml' })).toBeNull()
  })

  it('ALLOWS the proposals drop-zone the guard redirects to, and ordinary repo files', () => {
    expect(checkWorkflowEdit('Write', { file_path: 'docs/proposals/897-workflow-guard.md' })).toBeNull()
    expect(checkWorkflowEdit('Edit', { file_path: 'layers/journal/tenant.config.ts' })).toBeNull()
  })

  it('ALLOWS a tool it does not police, and never throws on a malformed input', () => {
    expect(checkWorkflowEdit('Read', { file_path: '.github/workflows/gate.yml' })).toBeNull()
    expect(checkWorkflowEdit('Edit', null)).toBeNull()
    expect(checkWorkflowEdit('Edit', { file_path: 42 })).toBeNull()
  })
})

describe('checkWorkflowEdit() — Bash write shapes, the shell-first bypass', () => {
  const denies = (command: string) => expect(checkWorkflowEdit('Bash', { command })).not.toBeNull()
  const allows = (command: string) => expect(checkWorkflowEdit('Bash', { command })).toBeNull()

  it('DENIES a heredoc write — how a shell-first session authors a file', () => {
    denies("cat > .github/workflows/gate.yml <<'EOF'\non: push\nEOF")
    denies('cat >> .github/workflows/gate.yml <<EOF\nx\nEOF')
  })

  it('DENIES an in-place edit and a `tee`', () => {
    denies("sed -i 's/20/22/' .github/workflows/gate.yml")
    denies('echo x | tee .github/workflows/gate.yml')
  })

  it('DENIES a copy, move, or delete of a workflow file', () => {
    denies('cp /tmp/new.yml .github/workflows/gate.yml')
    denies('git mv .github/workflows/gate.yml .github/workflows/ci.yml')
    denies('rm .github/workflows/stale.yml')
  })

  it('DENIES `git add` of a workflow path — the last step before the stranding commit', () => {
    denies('git add .github/workflows/gate.yml && git commit -m "ci: bump"')
  })

  it('ALLOWS reading a workflow — reads never strand a branch', () => {
    allows('cat .github/workflows/gate.yml')
    allows('grep -n "pnpm gate" .github/workflows/gate.yml')
    allows('git log --oneline -- .github/workflows/')
    allows('git diff origin/main -- .github/workflows/gate.yml')
  })

  it('ALLOWS a read piped into a write somewhere else — order matters, not mere mention', () => {
    allows('cat .github/workflows/gate.yml | tee /tmp/gate-copy.yml')
    allows("grep -rn '.github/workflows' docs/ > /tmp/hits.txt")
  })

  it('ALLOWS writing a proposal file that quotes the directory in its heredoc body', () => {
    allows("cat > docs/proposals/897.md <<'EOF'\nApply this to .github/workflows/gate.yml.\nEOF")
  })
})

describe('the deny message (the rule’s whole teaching surface for an agent that opened no doc)', () => {
  const message = formatGuardMessage(checkWorkflowEdit('Edit', { file_path: '.github/workflows/gate.yml' })!)

  it('names the issue, the real consequence, and the concrete alternative', () => {
    expect(message).toContain('issue #897')
    expect(message).toContain('every commit in the ref update')
    expect(message).toContain('docs/proposals/README.md')
  })

  it('carves out `.github/actions/gate/action.yml`, which agents CAN push (ADR-0026)', () => {
    expect(message).toContain('.github/actions/gate/action.yml')
  })

  it('emits nothing (null) for an allowed call, so the call proceeds untouched', () => {
    expect(denyOutputFor(null)).toBeNull()
  })
})

describe('the CLI as the PreToolUse hook would invoke it (stdin JSON → stdout deny)', () => {
  function runHook(payload: unknown): { hookSpecificOutput: Record<string, string> } | null {
    const out = execFileSync('pnpm', ['exec', 'tsx', SCRIPT], {
      cwd: root,
      input: typeof payload === 'string' ? payload : JSON.stringify(payload),
      encoding: 'utf8',
    }).trim()
    return out ? JSON.parse(out) : null
  }

  it('END TO END: blocks an Edit of a workflow file', () => {
    const deny = runHook(payloadFor('Edit', { file_path: '.github/workflows/gate.yml' }))
    expect(deny?.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(deny?.hookSpecificOutput.permissionDecisionReason).toContain('issue #897')
  })

  it('END TO END: stays silent for an ordinary edit and for a read of a workflow', () => {
    expect(runHook(payloadFor('Write', { file_path: 'docs/proposals/897.md' }))).toBeNull()
    expect(runHook(payloadFor('Bash', { command: 'cat .github/workflows/gate.yml' }))).toBeNull()
  })

  it('END TO END: denies uninspectable stdin (not JSON) — fail-closed', () => {
    expect(runHook('not json')?.hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('END TO END: stays silent on empty stdin (a bare manual run is not a tool call to police)', () => {
    const out = execFileSync('pnpm', ['exec', 'tsx', SCRIPT], { cwd: root, input: '', encoding: 'utf8' }).trim()
    expect(out).toBe('')
  })
})

describe('the workflow-edit-guard.sh hot-path pre-filter', () => {
  function runPrefilter(payload: unknown): string {
    return execFileSync('sh', [PREFILTER], {
      cwd: root,
      input: typeof payload === 'string' ? payload : JSON.stringify(payload),
      encoding: 'utf8',
    }).trim()
  }

  it('exits silently without ever starting the guard — the hot path', () => {
    expect(runPrefilter(payloadFor('Edit', { file_path: 'CLAUDE.md' }))).toBe('')
    expect(runPrefilter(payloadFor('Bash', { command: 'pnpm gate:scoped' }))).toBe('')
  })

  it('forwards a workflow write to the guard, whose deny comes back on stdout', () => {
    const out = runPrefilter(payloadFor('Edit', { file_path: '.github/workflows/gate.yml' }))
    expect(JSON.parse(out).hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('forwards a textual false positive (a read), which the guard then allows', () => {
    expect(runPrefilter(payloadFor('Bash', { command: 'cat .github/workflows/gate.yml' }))).toBe('')
  })
})

describe('the guarded tools and the live hook matcher must not drift', () => {
  it('a PreToolUse hook invokes the pre-filter, and its matcher covers every tool the core polices', () => {
    const settings = JSON.parse(readFileSync(join(root, '.claude', 'settings.json'), 'utf8'))
    const entry = settings.hooks.PreToolUse.find((h: { hooks: { command: string }[] }) =>
      h.hooks.some((c) => c.command.includes('workflow-edit-guard.sh')),
    )
    expect(entry, 'no PreToolUse hook invokes workflow-edit-guard.sh').toBeDefined()
    const matched = new Set<string>(entry.matcher.split('|'))
    // An unmatched tool is a silently unenforced rule: the core would deny it,
    // but the hook never sees the call.
    for (const tool of ['Edit', 'Write', 'Bash']) expect(matched.has(tool), `${tool} unmatched`).toBe(true)
  })
})

describe('the --dry-run path (ADR-0004: an unattended hook needs a way to be exercised by hand)', () => {
  function dryRun(args: string[]): { decision: string; via?: string; reason?: string } {
    return JSON.parse(
      execFileSync('pnpm', ['exec', 'tsx', SCRIPT, '--dry-run', ...args], { cwd: root, encoding: 'utf8' }),
    )
  }

  it('prints the deny decision and how the write was spotted', () => {
    const out = dryRun(['--tool', 'Edit', '--input', JSON.stringify({ file_path: '.github/workflows/gate.yml' })])
    expect(out.decision).toBe('deny')
    expect(out.via).toBe('file_path')
  })

  it('prints the allow decision for an ordinary edit', () => {
    expect(dryRun(['--tool', 'Edit', '--input', '{"file_path":"CLAUDE.md"}']).decision).toBe('allow')
  })

  // A denying Bash `--input` cannot be passed inline: that probe is itself the
  // shape the guard blocks. `--input-file` is the reachable path.
  it('reads the input from --input-file, the way to probe a denying Bash input from a shell', () => {
    const file = join(tmpdir(), 'workflow-edit-guard-dryrun.json')
    writeFileSync(file, JSON.stringify({ command: "cat > .github/workflows/gate.yml <<'EOF'\nx\nEOF" }))
    try {
      const out = dryRun(['--tool', 'Bash', '--input-file', file])
      expect(out.decision).toBe('deny')
      expect(out.via).toBe('command')
    } finally {
      rmSync(file, { force: true })
    }
  })

  it('fails loudly on an unreadable --input-file rather than silently allowing', () => {
    expect(() => dryRun(['--tool', 'Edit', '--input-file', join(tmpdir(), 'no-such-file.json')])).toThrow()
  })
})
