// The single mechanical enforcement point for ADR-0017 provenance on every
// agent-authored artefact that leaves this session through a tool call. It is
// the repo's only agent-facing home for the rule: the deny message below is
// written to teach the format at the moment of the mistake, because five
// recorded recurrences (#387, #605, #628, #723, #788) each happened to a
// session that had prose available and did not apply it.
//
// What it enforces — ADR-0017's requirement plus its 2026-08-01 amendment:
// **an agent-authored artefact carries a full session URL naming THIS session,
// in the shape its surface prescribes.** Two surfaces, two shapes, checked by
// one registry (`GITHUB_PROVENANCE_TOOLS`):
//
//   • `body`   — GitHub prose (issues, PRs, comments, reviews). The provenance
//     header, FIRST line: `🤖 [Model](<session-url>)`.
//   • `commit` — an MCP-API commit message (`create_or_update_file`,
//     `push_files`), which bypasses local git so neither the harness template
//     nor `.githooks/commit-msg` can reach it. The two-line trailer, last.
//
// Four findings:
//   • `missing`    — no session URL at all (#737). Both observed misses of that
//     class, PRs #755 and #782, were body-less or provenance-less posts.
//   • `mismatch`   — names a session, but not this one. The original #628
//     regression, and the one all five recurrences share.
//   • `malformed`  — names THIS session, but not in the surface's shape. PR
//     #788: a correct id written as `**Session:** <url>`, which every
//     format-agnostic version of this guard passed. Format-agnosticism was
//     justified while ADR-0017's footer competed with the harness's own for the
//     same trailing position; the header moved to a position nothing else
//     claims, so the conflict — and the reason to accept any shape — is gone.
//   • `unverified` — ground truth is unresolvable, so compliance cannot be
//     established. Denied, not passed: fail-CLOSED, per the 2026-08-01
//     amendment. See `main()` for the residual fail-open this cannot close.
//
// Verifying is cheap and near-total: `resolveGroundTruthSessionId` prefers
// `CLAUDE_CODE_REMOTE_SESSION_ID` and falls back to the transcript's own
// `sessionId`, so `unverified` requires BOTH to be absent.
//
// Nothing here can fix an already-posted body. A PR description is editable
// (`update_pull_request`); a comment is not, and its standing remedy is a
// visible follow-up correction, never a rewrite of the original.
//
// Pure core (`checkGithubProvenance`) is kept separate from the shared
// stdin/bootstrap plumbing (`guard-io.ts`, issue #1080) and this guard's own
// transcript-ground-truth resolution (`main`).
//
// Usage (normally invoked by the PreToolUse hook with the payload on stdin):
//   tsx scripts/github-provenance-guard.ts
import { readFileSync } from 'node:fs'
import { SESSION_TRAILER } from './git-helpers.ts'
import { buildDenyOutput, denyUninspectable, readHookPayload, runIfMain, type DenyOutput } from './guard-io.ts'
import { provenanceFooter } from './provenance-footer.ts'
import { provenanceHeader, readProvenanceHeader, sessionIdsIn } from './provenance-header.ts'
import { resolveGroundTruthFromTranscript } from './session-id-guard.ts'

const LABEL = 'provenance guard'
// The dated amendment, not just the ADR: this guard's fail-closed posture is a
// deliberate 2026-08-01 policy flip, not the default — the citation is worth
// keeping in the one message this guard can still show without ground truth.
const REF = 'ADR-0017, 2026-08-01'

/** A global copy of `SESSION_TRAILER` for `matchAll` — the last-match rule needs
 *  every occurrence (issue #692). Built locally rather than adding the `g` flag
 *  to the shared export: `provenance-footer.ts` calls `SESSION_TRAILER.test()`,
 *  which is stateful (`lastIndex`) on a global regex and would break under
 *  repeated calls.
 *
 *  **Not dead code, despite issue #784.** That issue scheduled the removal of
 *  this constant and its `git-helpers` import along with the legacy
 *  body-surface fallback, on the correct premise that nothing would use it once
 *  bodies required the header. The 2026-08-01 amendment removed that fallback
 *  but gave the trailer a new, permanent job: reading the COMMIT surface, where
 *  the two-line trailer is still the prescribed marker. Deleting this now
 *  silently unenforces MCP-API commits. */
const SESSION_TRAILER_GLOBAL = new RegExp(SESSION_TRAILER.source, 'g')

/** Which marker shape a surface prescribes. A commit message renders no
 *  markdown, so the header would be noise there; a GitHub body renders it, and
 *  the top is the one position the harness's own footer never claims. */
export type ProvenanceSurface = 'body' | 'commit'

/** One tool call that can carry agent-authored provenance: which parameter
 *  holds the text, and which surface's shape that text must be in. Field names
 *  are verified against each tool's real schema via `ToolSearch` (issue #628 —
 *  CLAUDE.md: never guess a deferred tool's shape), never assumed from the
 *  tool's name. */
export interface ProvenanceTool {
  tool: string
  /** Default `body`. `message` for the MCP-API commit tools. */
  field?: string
  /** Default `body`. */
  surface?: ProvenanceSurface
  /** Whether THIS call must carry the text at all. Default: always. Set it for
   *  a tool whose call can legitimately have none — a label- or state-only
   *  `issue_write` update, an approve-without-comment review — so the guard
   *  never wedges those. Without it, "no text" was an unconditional pass, which
   *  let a body-less `create_pull_request` post with zero provenance (#737). */
  required?: (input: Record<string, unknown>) => boolean
}

/** The registry: every tool call an agent uses to publish authored text outside
 *  this session. Add a row here when a new provenance-carrying surface appears
 *  — that is the whole extension mechanism, and the reason this file can be the
 *  rule's only home. */
export const GITHUB_PROVENANCE_TOOLS: readonly ProvenanceTool[] = [
  // A comment IS its body — one with none is malformed, not exempt.
  { tool: 'mcp__github__add_issue_comment' },
  { tool: 'mcp__github__add_reply_to_pull_request_comment' },
  { tool: 'mcp__github__add_comment_to_pending_review' },
  // `body` is optional in the schema, but a PR published with an empty
  // description is exactly the #737 case — both observed misses were PR bodies.
  { tool: 'mcp__github__create_pull_request' },
  // Creating an issue publishes prose; updating one may only touch labels/state.
  { tool: 'mcp__github__issue_write', required: (input) => input.method === 'create' },
  // Partial updates (title, base, state) carry no body and must not be wedged.
  { tool: 'mcp__github__update_pull_request', required: () => false },
  // A review can be submitted with no comment (a bare approval).
  { tool: 'mcp__github__pull_request_review_write', required: () => false },

  // MCP-API commits: the one surface that was covered by nothing (ADR-0017's
  // 2026-07-20 amendment named the hole; #723's triage brief carved it out).
  // They bypass local git, so `.githooks/commit-msg` never sees them, and their
  // `message` is a commit message — hence the trailer, not the header. Both
  // schemas mark `message` required, so the default always-required holds.
  { tool: 'mcp__github__create_or_update_file', field: 'message', surface: 'commit' },
  { tool: 'mcp__github__push_files', field: 'message', surface: 'commit' },
  // `merge_pull_request` is deliberately absent: `scripts/merge-pr.ts` is this
  // repo's sole merge path (see its header) and merges via `gh api`/REST
  // without passing a commit message at all, so there is no agent-authored text
  // to police. Add a row here the day that stops being true.
]

/** `missing` — no session URL at all (#737); `mismatch` — a session URL naming
 *  someone else (#628); `malformed` — this session's URL, but not in the shape
 *  its surface prescribes (#788); `unverified` — ground truth unresolvable, so
 *  nothing can be established either way (fail-closed).
 *
 *  `found` is present only on a `mismatch`. `expected` is absent only when
 *  ground truth could not be resolved. */
export interface ProvenanceFinding {
  kind: 'missing' | 'mismatch' | 'malformed' | 'unverified'
  tool: string
  surface: ProvenanceSurface
  found?: string
  expected?: string
}

/** Adjudicate `text` against `truth` once the designated slot has been read.
 *  Shared by both surfaces because only the slot differs, never the verdict:
 *  a slot naming someone else is a `mismatch`; no slot but our own URL loose in
 *  the text is a `malformed` (the agent marked authorship in the wrong shape);
 *  no session URL anywhere is `missing`; anything else is another session's URL
 *  and therefore a `mismatch`. */
function adjudicate(
  slotId: string | undefined,
  text: string,
  truth: string,
  tool: string,
  surface: ProvenanceSurface,
): ProvenanceFinding | null {
  if (slotId !== undefined) {
    return slotId === truth ? null : { kind: 'mismatch', tool, surface, found: slotId, expected: truth }
  }
  const ids = sessionIdsIn(text)
  if (ids.length === 0) return { kind: 'missing', tool, surface, expected: truth }
  if (ids.includes(truth)) return { kind: 'malformed', tool, surface, expected: truth }
  return { kind: 'mismatch', tool, surface, found: ids.at(-1)!, expected: truth }
}

/** The pure, unit-testable core: does this call's authored text carry a full
 *  session URL naming the resolved ground truth, in its surface's shape?
 *
 *  Returns `null` only for something compliant or genuinely out of scope — a
 *  tool outside the registry, an unreadable `tool_input`, or a call with no
 *  text at all where that is legitimate (a label-only `issue_write`; see
 *  `ProvenanceTool.required`). Everything else, INCLUDING unresolvable ground
 *  truth, yields a finding: this guard fails closed. Never throws. */
export function checkGithubProvenance(
  toolName: string,
  toolInput: unknown,
  groundTruthId: string | null | undefined,
  registry: readonly ProvenanceTool[] = GITHUB_PROVENANCE_TOOLS,
): ProvenanceFinding | null {
  const entry = registry.find((r) => r.tool === toolName)
  if (!entry) return null
  if (toolInput === null || typeof toolInput !== 'object') return null
  const input = toolInput as Record<string, unknown>
  const surface = entry.surface ?? 'body'
  const raw = input[entry.field ?? 'body']
  const text = typeof raw === 'string' ? raw : ''

  if (text.trim() === '') {
    // Nothing authored: a violation only for a call that should have published
    // text. Judged before ground truth, so a no-text call that is legitimately
    // exempt passes even where nothing is resolvable — the triage sweep must
    // never wedge on a label-only update.
    return (entry.required ?? (() => true))(input)
      ? { kind: 'missing', tool: toolName, surface, expected: groundTruthId ?? undefined }
      : null
  }

  // Fail closed (ADR-0017, 2026-08-01): text is being published and compliance
  // cannot be established, so the call does not proceed.
  if (!groundTruthId) return { kind: 'unverified', tool: toolName, surface }

  // Read the surface's designated slot FIRST, so text that has one is judged on
  // that slot alone — authored text may legitimately quote another session's
  // URL as evidence (issue #692), and a quote must neither satisfy nor break
  // the check.
  if (surface === 'commit') {
    // The LAST `Claude-Session:` trailer is the message's own; earlier ones are
    // citations (#692).
    const trailer = [...text.matchAll(SESSION_TRAILER_GLOBAL)].at(-1)
    return adjudicate(trailer?.[1], text, groundTruthId, toolName, surface)
  }
  return adjudicate(readProvenanceHeader(text)?.sessionId, text, groundTruthId, toolName, surface)
}

/** The exact marker the offending call should have carried, ready to paste.
 *  Built from the same `provenanceHeader` / `provenanceFooter` the rest of the
 *  repo writes with, so the guard can never teach a shape the codebase does not
 *  itself produce. */
function prescribedMarker(surface: ProvenanceSurface, url: string): string {
  return surface === 'commit'
    ? `${provenanceFooter('<your model name>', url)}\n\n...as the LAST lines of the commit message.`
    : `${provenanceHeader('<your model name>', url)}\n\n...as the FIRST line of the body, its own paragraph.`
}

/** The corrective message shown to the agent when the guard blocks. This is the
 *  rule's teaching surface, not a pointer to one: it names the offending tool,
 *  the real session id, and the exact marker to paste, so it works for an agent
 *  that has read no doc at all — which every recorded recurrence was. */
export function formatGuardMessage(f: ProvenanceFinding): string {
  const head = `Blocked by the ADR-0017 provenance guard: \`${f.tool}\``

  if (f.kind === 'unverified') {
    return (
      `${head} publishes authored text, but this session's ground-truth id could not be resolved ` +
      `(no CLAUDE_CODE_REMOTE_SESSION_ID and no readable transcript), so provenance cannot be ` +
      `verified. This guard fails CLOSED (ADR-0017, 2026-08-01) — an unverifiable post does not ` +
      `proceed. Do not hand-write a session id to get past this: a fabricated one is the exact ` +
      `failure this guard exists for (#387, #605, #628, #723). Surface the resolution failure to ` +
      `the user instead.`
    )
  }

  // `expected` is absent only on a text-less-but-required call in an
  // environment that resolved no ground truth. Never interpolate `undefined`
  // into a URL an agent is being told to paste verbatim — a literal
  // `.../undefined` is exactly the fabricated-identifier class this guards.
  const url = f.expected ? `https://claude.ai/code/${f.expected}` : '<the session URL resolved from your system prompt>'
  const paste = prescribedMarker(f.surface, url)
  const verbatim = f.expected
    ? `Use ${url} verbatim — this hook already resolved it from ground truth; never predict or ` +
      `reconstruct a session id from memory.`
    : `Ground truth was not resolvable here, so resolve the session URL from your system prompt's ` +
      `own commit-footer template — never reconstruct one from memory.`

  if (f.kind === 'missing') {
    return (
      `${head} carries no session URL, so its authorship would not be recoverable from the ` +
      `content (#737). Add:\n\n${paste}\n\n${verbatim}` +
      (f.surface === 'body' ? ' Leave any footer the harness appends alone.' : '')
    )
  }
  if (f.kind === 'malformed') {
    return (
      `${head} names the right session, but not in the shape this surface requires (#788) — a ` +
      `marker only counts where a reader looks for it. Rewrite it as:\n\n${paste}\n\n` +
      `The id is already correct; only the shape and position change.` +
      (f.surface === 'body' ? ' Leave any footer the harness appends alone.' : '')
    )
  }
  return (
    `${head} names session ${f.found}, but this session's resolved ground-truth id is ` +
    `${f.expected} (#628). ${verbatim}\n\n${paste}`
  )
}

/** The `PreToolUse` "deny" control object a hook writes to stdout to block a
 *  call (Claude Code hooks reference). `null` when nothing should be blocked,
 *  so `main` writes nothing and the call proceeds untouched. */
export function denyOutputFor(finding: ProvenanceFinding | null): DenyOutput | null {
  return finding ? buildDenyOutput(formatGuardMessage(finding)) : null
}

/** Reads the hook JSON on stdin, resolves ground truth, runs the pure check,
 *  and writes a deny control object to stdout for any finding.
 *
 *  Always exits 0 — the deny travels in stdout, not the exit code — but unlike
 *  its predecessor it fails CLOSED: an unreadable payload, an unresolvable
 *  ground truth, or a crash in the check all deny rather than pass.
 *
 *  Ground truth is resolved even with no `transcript_path`:
 *  `resolveGroundTruthSessionId` prefers `CLAUDE_CODE_REMOTE_SESSION_ID`, which
 *  is set in this repo's own environment, so an absent transcript alone is not
 *  a verification failure. The old early-return here skipped that env lookup
 *  entirely and passed such calls unchecked.
 *
 *  **The residual fail-open this cannot close:** the hook is invoked as
 *  `pnpm exec tsx … || true`. If tsx or pnpm is unavailable the command dies
 *  before this file is ever evaluated, producing no stdout and therefore no
 *  deny. Closing that needs a change of invocation, not of this script — see
 *  ADR-0017's 2026-08-01 amendment, which records it as accepted. */
export function main(): void {
  const result = readHookPayload()
  if (result.kind === 'none') return
  if (result.kind === 'invalid') return denyUninspectable(LABEL, REF, 'the hook payload was not valid JSON')
  if (result.kind === 'no-tool') return denyUninspectable(LABEL, REF, 'the hook payload named no tool')
  const { payload } = result

  // An unreadable transcript is not fatal on its own — the env var may still
  // carry ground truth — so fall through with an empty transcript and let
  // `checkGithubProvenance` decide whether anything is resolvable.
  let transcriptJsonl = ''
  if (payload.transcript_path) {
    try {
      transcriptJsonl = readFileSync(payload.transcript_path, 'utf8')
    } catch {
      /* unreadable — the env var is still consulted below */
    }
  }

  const groundTruthId = resolveGroundTruthFromTranscript(transcriptJsonl)
  const finding = checkGithubProvenance(payload.tool_name, payload.tool_input, groundTruthId)
  const output = denyOutputFor(finding)
  if (output) process.stdout.write(JSON.stringify(output))
}

runIfMain(import.meta.url, { main, label: LABEL, ref: REF })
