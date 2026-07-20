// Coverage for the ADR-0017 provenance-footer backstop (issue #346): a commit-msg
// git hook that appends the two-line footer when the harness template misses it on
// a cloud `git commit -m`. The pure core (`hasProvenanceFooter` /
// `computeFooterAction` / `applyFooter` / `reconstructFooterValues`) is pinned
// directly; the whole script is then exercised end to end via `tsx` against a real
// commit-message file that omits the footer — the acceptance-criterion trace that
// #318/#320 never produced.
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  applyFooter,
  computeFooterAction,
  hasProvenanceFooter,
  provenanceFooter,
  reconstructFooterValues,
  sessionUrlFor,
  sessionUrlFromEnv,
} from '../../scripts/provenance-footer.ts'
import { busiestModelId, formatModelId } from '../../scripts/session-trace.ts'

const scriptPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../scripts/provenance-footer.ts')

const FOOTERED = [
  'a real commit subject',
  '',
  'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>',
  'Claude-Session: https://claude.ai/code/session_ABC',
].join('\n')

describe('hasProvenanceFooter()', () => {
  it('is true only when BOTH lines are present', () => {
    expect(hasProvenanceFooter(FOOTERED)).toBe(true)
  })

  it('is false when the Claude-Session line is missing', () => {
    expect(hasProvenanceFooter('subject\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')).toBe(false)
  })

  it('is false when the Co-Authored-By line is missing', () => {
    expect(hasProvenanceFooter('subject\n\nClaude-Session: https://claude.ai/code/session_ABC')).toBe(false)
  })

  it('does not treat an unrelated human co-author (no anthropic noreply) as the footer', () => {
    const msg = 'subject\n\nCo-Authored-By: Some Human <human@example.com>\nClaude-Session: https://claude.ai/code/session_ABC'
    expect(hasProvenanceFooter(msg)).toBe(false)
  })

  it('is false for a bare message with no footer at all', () => {
    expect(hasProvenanceFooter('just a subject line')).toBe(false)
  })
})

describe('provenanceFooter()', () => {
  it('produces the exact ADR-0017 two-line format', () => {
    expect(provenanceFooter('Claude Opus 4.8', 'https://claude.ai/code/session_X')).toBe(
      'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_X',
    )
  })
})

describe('applyFooter()', () => {
  it('appends the footer as its own paragraph with a single trailing newline', () => {
    const out = applyFooter('subject line\n', 'FOOTER')
    expect(out).toBe('subject line\n\nFOOTER\n')
  })

  it('collapses pre-existing trailing whitespace before the blank-line separator', () => {
    expect(applyFooter('subject\n\n\n', 'FOOTER')).toBe('subject\n\nFOOTER\n')
  })

  it('round-trips: applying then re-checking sees the footer as present', () => {
    const footer = provenanceFooter('Claude', 'https://claude.ai/code/session_X')
    expect(hasProvenanceFooter(applyFooter('subject', footer))).toBe(true)
  })
})

describe('computeFooterAction() — the decision matrix', () => {
  it('no-ops when the footer is already present (idempotent, never double-append)', () => {
    expect(computeFooterAction(FOOTERED, 'https://claude.ai/code/session_X', 'Claude')).toEqual({ action: 'noop' })
  })

  it('appends a full footer when absent and a session URL is available', () => {
    const action = computeFooterAction('bare subject', 'https://claude.ai/code/session_X', 'Claude Opus 4.8')
    expect(action).toEqual({
      action: 'append',
      footer: 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_X',
    })
  })

  it('no-ops when no session URL is resolvable — never appends half a footer (the load-bearing line)', () => {
    expect(computeFooterAction('bare subject', null, 'Claude Opus 4.8')).toEqual({ action: 'noop' })
  })
})

describe('sessionUrlFromEnv() — env-only reconstruction (issue #387/#346)', () => {
  it('normalizes cse_ → session_ and wraps it as a URL', () => {
    expect(sessionUrlFromEnv({ CLAUDE_CODE_REMOTE_SESSION_ID: 'cse_01CPwUoxTZ3wJ5LQW8Nd98Mm' })).toBe(
      'https://claude.ai/code/session_01CPwUoxTZ3wJ5LQW8Nd98Mm',
    )
  })

  it('is null when no remote session id is set (a plain human commit resolves nothing)', () => {
    expect(sessionUrlFromEnv({})).toBeNull()
  })

  it('sessionUrlFor is null for a null/empty id', () => {
    expect(sessionUrlFor(null)).toBeNull()
    expect(sessionUrlFor(undefined)).toBeNull()
    expect(sessionUrlFor('')).toBeNull()
  })
})

describe('reconstructFooterValues() — transcript-preferred, env fallback', () => {
  const transcript = [
    JSON.stringify({
      type: 'assistant',
      timestamp: '2026-07-20T10:00:00Z',
      sessionId: 'b84dc292-4954-52dc-b693-5681f040259e',
      message: { model: 'claude-opus-4-8', content: [] },
    }),
    JSON.stringify({
      type: 'assistant',
      timestamp: '2026-07-20T10:01:00Z',
      sessionId: 'b84dc292-4954-52dc-b693-5681f040259e',
      message: { model: 'claude-opus-4-8', content: [] },
    }),
  ].join('\n')

  it('derives both the busiest model and the session URL from the transcript', () => {
    expect(reconstructFooterValues({}, transcript)).toEqual({
      sessionUrl: 'https://claude.ai/code/b84dc292-4954-52dc-b693-5681f040259e',
      modelName: 'Claude Opus 4.8',
    })
  })

  it('prefers the normalized remote session id over the transcript id for the URL', () => {
    expect(reconstructFooterValues({ CLAUDE_CODE_REMOTE_SESSION_ID: 'cse_REMOTE' }, transcript)).toEqual({
      sessionUrl: 'https://claude.ai/code/session_REMOTE',
      modelName: 'Claude Opus 4.8',
    })
  })

  it('falls back to env session URL and the generic model when no transcript is found', () => {
    expect(reconstructFooterValues({ CLAUDE_CODE_REMOTE_SESSION_ID: 'cse_REMOTE' }, null)).toEqual({
      sessionUrl: 'https://claude.ai/code/session_REMOTE',
      modelName: 'Claude',
    })
  })

  it('yields a null URL (→ downstream no-op) when neither transcript nor env resolves a session', () => {
    expect(reconstructFooterValues({}, null)).toEqual({ sessionUrl: null, modelName: 'Claude' })
  })
})

describe('busiestModelId() / formatModelId() — single-homed model helpers (issue #346)', () => {
  it('picks the highest-count model, tiebreaking lexically', () => {
    expect(busiestModelId({ 'claude-opus-4-8': 3, 'claude-sonnet-5': 1 })).toBe('claude-opus-4-8')
    expect(busiestModelId({ b: 2, a: 2 })).toBe('a') // tie → lexical
  })

  it('is undefined for an empty map', () => {
    expect(busiestModelId({})).toBeUndefined()
  })

  it('formats a claude model id into the harness display wording', () => {
    expect(formatModelId('claude-opus-4-8')).toBe('Claude Opus 4.8')
    expect(formatModelId('claude-sonnet-5')).toBe('Claude Sonnet 5')
  })
})

describe('end-to-end: running the script over a real commit-message file (issue #346 acceptance)', () => {
  let scratch: string
  let msgFile: string

  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), 'provenance-footer-'))
    msgFile = join(scratch, 'COMMIT_EDITMSG')
  })

  afterEach(() => {
    rmSync(scratch, { recursive: true, force: true })
  })

  /** Run the script with a controlled env and an empty config dir (no transcript,
   *  so the env-only session-URL path is what lands). */
  function runScript(env: Record<string, string>): void {
    execFileSync('tsx', [scriptPath, msgFile], {
      env: { ...process.env, CLAUDE_CONFIG_DIR: join(scratch, 'empty-config'), ...env },
      encoding: 'utf8',
    })
  }

  it('appends the footer to a message that omits it, using the remote session id from env', () => {
    writeFileSync(msgFile, 'feat: a commit with no footer\n')
    runScript({ CLAUDE_CODE_REMOTE_SESSION_ID: 'cse_01CPwUoxTZ3wJ5LQW8Nd98Mm' })
    const out = readFileSync(msgFile, 'utf8')
    expect(out).toContain('Co-Authored-By: Claude <noreply@anthropic.com>')
    expect(out).toContain('Claude-Session: https://claude.ai/code/session_01CPwUoxTZ3wJ5LQW8Nd98Mm')
    expect(hasProvenanceFooter(out)).toBe(true)
  })

  it('is idempotent: a second run does not append a second footer', () => {
    writeFileSync(msgFile, 'feat: a commit with no footer\n')
    runScript({ CLAUDE_CODE_REMOTE_SESSION_ID: 'cse_01CPwUoxTZ3wJ5LQW8Nd98Mm' })
    const once = readFileSync(msgFile, 'utf8')
    runScript({ CLAUDE_CODE_REMOTE_SESSION_ID: 'cse_01CPwUoxTZ3wJ5LQW8Nd98Mm' })
    expect(readFileSync(msgFile, 'utf8')).toBe(once)
    expect((once.match(/Claude-Session:/g) ?? []).length).toBe(1)
  })

  it('leaves the message untouched when no session id is resolvable (a plain human commit)', () => {
    writeFileSync(msgFile, 'chore: human local commit\n')
    runScript({ CLAUDE_CODE_REMOTE_SESSION_ID: '' })
    expect(readFileSync(msgFile, 'utf8')).toBe('chore: human local commit\n')
  })

  it('derives the model from a transcript when one is present at the CLAUDE_CONFIG_DIR', () => {
    const uuid = 'c0ffee00-0000-4000-8000-000000000000'
    const projDir = join(scratch, 'cfg', 'projects', 'some-munged-cwd')
    mkdirSync(projDir, { recursive: true })
    writeFileSync(
      join(projDir, `${uuid}.jsonl`),
      JSON.stringify({
        type: 'assistant',
        timestamp: '2026-07-20T10:00:00Z',
        sessionId: uuid,
        message: { model: 'claude-opus-4-8', content: [] },
      }),
    )
    writeFileSync(msgFile, 'feat: transcript-derived model\n')
    execFileSync('tsx', [scriptPath, msgFile], {
      env: {
        ...process.env,
        CLAUDE_CONFIG_DIR: join(scratch, 'cfg'),
        CLAUDE_CODE_SESSION_ID: uuid,
        CLAUDE_CODE_REMOTE_SESSION_ID: '',
      },
      encoding: 'utf8',
    })
    const out = readFileSync(msgFile, 'utf8')
    expect(out).toContain('Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')
    expect(out).toContain(`Claude-Session: https://claude.ai/code/${uuid}`)
  })
})
