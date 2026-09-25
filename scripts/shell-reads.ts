// Detects platform agent-instruction docs a session read through the SHELL
// (`cat`, `sed -n`, `grep`) rather than the `Read` tool — the gap issue #1074
// measured: shell-first inspection is now the dominant access path (Read:Bash
// fell 0.38 → 0.21 across the corpus), so a `Read`-only trace undercounts what
// a session actually consulted.
//
// One detected path claims exactly this: A COMMAND RAN THAT STREAMED THIS DOC'S
// CONTENTS INTO THE SESSION. That is a claim about the command, not about the
// agent's attention — which makes it checkable against the transcript, so a
// wrong entry is an extractor bug, not a different kind of evidence. The
// extractor is young and its output is a floor, exactly as `filesRead` already
// is (see session-trace.ts's header); `scanShellReads` reports its near-misses
// so the authoring agent can drive it toward correctness (#1074's loop, and
// log-session/SKILL.md for the friction that carries a correction).
//
// Detection is a PATH-SHAPE test, not a membership test against a filesystem
// scan of the repo. #1074's prototype matched a scanned 118-path needle set;
// `extractTrace` is a pure function over transcript records with no filesystem
// access, and a shape test additionally survives a doc added after any scan.
// The decoys that motivated the needle set are rejected here by the segment and
// verb rules instead.

/** Argv-0s that stream a file's CONTENTS into the session. `find`/`ls`/`wc` are
 *  deliberately absent: they report *about* a file without showing it. */
const READER_VERBS = new Set(['cat', 'bat', 'sed', 'head', 'tail', 'awk', 'grep', 'rg', 'less', 'more'])

/** Wrappers that sit in front of the real command. `timeout` matters most: agent
 *  briefs in this environment mandate foreground commands with an explicit
 *  timeout, so `timeout 60 cat <doc>` is a routine shape, not a hypothetical. */
const PREFIX_VERBS = new Set(['sudo', 'command', 'env', 'nice', 'stdbuf', 'nohup', 'time', 'timeout'])

/** Readers whose FIRST positional is a pattern or a program, never a path being
 *  read. `grep "docs/agents/x.md" CLAUDE.md` reads CLAUDE.md, not `x.md`. */
const SCRIPT_FIRST = new Set(['sed', 'awk', 'grep', 'rg'])

/** Flags whose value is the next token AND supplies the pattern/program, so the
 *  first positional is then a FILE. Without the second half, `grep -e foo
 *  docs/x.md` loses the doc to the SCRIPT_FIRST rule. */
const PATTERN_FLAGS = new Set(['-e', '-f', '--regexp', '--file', '--expression'])

/** Flags whose value is the next token but is NOT the pattern — a context or
 *  count argument. Missing these shifts the positional index, so the pattern
 *  lands in slot 2 and a doc path used as a grep pattern gets counted:
 *  `grep -C 3 "docs/x.md" CLAUDE.md` reads CLAUDE.md only. */
const ARG_FLAGS = new Set([
  '-A', '-B', '-C', '-m', '-d', '-v',
  '--after-context', '--before-context', '--context', '--max-count', '--max-depth',
])

/** Long flags under which a match is reported without ever showing the file. */
const NO_CONTENT_FLAGS = new Set([
  '--files-with-matches', '--files-without-match', '--count', '--quiet', '--silent',
])

/** The repo-relative shapes that ARE platform agent instruction (#1074's scope).
 *  `layers/[^/]+/CONTEXT\.md` is deliberately exact-depth: it admits the
 *  per-Tenant contexts (ADR-0021) while excluding the Tenants' content trees,
 *  which are not instruction. */
const INSTRUCTION_DOC_PATTERNS = [
  /^docs\/(?:[^/]+\/)*[^/]+\.md$/,
  /^\.agents\/(?:[^/]+\/)*[^/]+\.md$/,
  /^layers\/[^/]+\/CONTEXT\.md$/,
  /^CONTEXT(?:-MAP)?\.md$/,
]

const GLOB_OR_VAR = /[*?$`~[\]{}]/

/** Why a token that named an in-scope doc was NOT counted — surfaced to the
 *  authoring agent so checking for a MISS is recognition rather than recall. */
export type SkipRule =
  | 'not a reader command'
  | 'in-place edit: written, not read'
  | 'no contents shown: -l/-q/-c reports only a name or a count'
  | 'first positional: a pattern or program, not a path'
  | 'value bound to a flag'
  | 'redirect target: written, not read'
  | 'not a literal path: glob or variable'
  | 'grep/rg output does not show this file being read'
  | '|| fallback: stderr suppressed, output may belong to the other side'
  | 'git show diff does not touch this path'

export interface NearMiss {
  command: string
  token: string
  /** `token` canonicalized the way a counted path is, so a caller merging
   *  several scans can compare the two — it cannot re-derive this itself, since
   *  canonicalization needs the relativizer of the scan the token came from. */
  path: string
  rule: SkipRule
}

export interface ShellReadScan {
  paths: string[]
  /** Each counted path's first crediting command, so the advisory can show its
   *  evidence instead of leaving a surprising entry to be guessed at (issue #1244). */
  creditedBy: Map<string, string>
  nearMisses: NearMiss[]
}

/** `git show <ref>:<path>` dumps a blob straight to stdout — a content-revealing
 *  read of `<path>` whether or not anything follows it in a pipe (issue #1206's
 *  miss: `git` isn't in `READER_VERBS` at all, and the positional-path shape
 *  every other reader uses doesn't apply — the path sits after a colon in
 *  `show`'s own argument, not as a bare positional). Returns the raw path
 *  portion (everything after the FIRST colon — a ref like `HEAD~1` never
 *  contains one, so splitting once is exact), or `undefined` for any other
 *  `git` invocation (`git log`, `git show <sha>` with no colon, …), which then
 *  falls through to the ordinary "not a reader command" handling below. */
function extractGitShowPath(tokens: Token[]): string | undefined {
  if (tokens.length < 2 || tokens[1]!.quoted || tokens[1]!.text !== 'show') return undefined
  for (const t of tokens.slice(2)) {
    if (!t.quoted && t.text.startsWith('-')) continue
    const idx = t.text.indexOf(':')
    if (idx === -1) continue
    return t.text.slice(idx + 1)
  }
  return undefined
}

/** `git show <ref> -- <path…>` (the diff form) — unlike the colon form above,
 *  the path sits after a literal `--` separator, and `<ref>` may be omitted
 *  entirely (`git show -- <path>` means HEAD). Returns every positional after
 *  the FIRST bare `--`, or `undefined` when there is none (`git show <sha>`,
 *  `git show --stat`, `git log`, …), which then falls through to "not a
 *  reader command" like any other non-matching `git` invocation. A session on
 *  2026-09-14 used exactly this shape to inspect historical changes to
 *  instruction docs and went uncredited — neither #1206/PR #1241 (the colon
 *  form) nor #1247/PR #1250 (grep/rg output-gating) covers it. */
function extractGitShowDiffPaths(tokens: Token[]): string[] | undefined {
  if (tokens.length < 2 || tokens[1]!.quoted || tokens[1]!.text !== 'show') return undefined
  const sepIdx = tokens.findIndex((t) => !t.quoted && t.text === '--')
  if (sepIdx < 2) return undefined
  const rest = tokens.slice(sepIdx + 1).map((t) => t.text)
  return rest.length > 0 ? rest : undefined
}

/** `git diff [--stat] [--] <path…>` — a bare working-tree diff with no ref,
 *  which streams the file's real added/removed content into the session just
 *  like `git show -- <path>` does. Returns every non-flag positional, or
 *  `undefined` for any other `git diff` invocation (no path at all), which
 *  then falls through to "not a reader command" like any other non-matching
 *  `git` call. A session on 2026-09-17 ran exactly this shape (`git diff
 *  --stat <path> && git diff <path>`) and went uncredited despite the output
 *  genuinely showing the diff — neither `extractGitShowPath` nor
 *  `extractGitShowDiffPaths` covers `diff` at all, only `show`. */
function extractGitDiffPaths(tokens: Token[]): string[] | undefined {
  if (tokens.length < 2 || tokens[1]!.quoted || tokens[1]!.text !== 'diff') return undefined
  const rest = tokens.slice(2).filter((t) => t.quoted || t.text !== '--')
  const paths = rest.filter((t) => t.quoted || !t.text.startsWith('-')).map((t) => t.text)
  return paths.length > 0 ? paths : undefined
}

/** A `-- <path>` positional only reveals `path`'s CONTENT when the diff
 *  actually has a hunk for it — the ref range given may not touch that path
 *  at all — so this gates on the output exactly like `outputMentionsFile`
 *  gates grep/rg (#1247), rather than crediting off the argument list alone.
 *  Matches either diff's own `diff --git a/<path> b/<path>` header or the
 *  path on a `+++`/`---` line, covering a rename where only one side matches. */
function outputShowsGitDiffFor(output: string, path: string): boolean {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return (
    new RegExp(`(^|\\n)diff --git a/${escaped} b/${escaped}(\\n|$)`).test(output) ||
    new RegExp(`(^|\\n)(\\+\\+\\+|---) [ab]/${escaped}(\\t|\\n|$)`).test(output)
  )
}

/** `.claude/skills/x` and `.agents/skills/x` are the same file — the former is a
 *  symlink tree over the latter, and both spellings appear in agent commands.
 *  Without this, one file's reads split across two keys and both undercount. */
export function canonicalizeInstructionPath(path: string): string {
  return path.replace(/^\.\//, '').replace(/^\.claude\/skills\//, '.agents/skills/')
}

/** True for a repo-relative path that is platform agent instruction. */
export function isInstructionDoc(path: string): boolean {
  // CLAUDE.md is harness-injected via system-reminder and produces no tool call,
  // so it is permanently unmeasurable by this method — counting it could only
  // ever report it as unread, which is worse than silence (#1074).
  if (path === 'CLAUDE.md' || path.endsWith('/CLAUDE.md')) return false
  if (GLOB_OR_VAR.test(path)) return false
  return INSTRUCTION_DOC_PATTERNS.some((re) => re.test(path))
}

/** A glob/variable token that would be in scope if it named one literal file —
 *  reported as a near-miss so an unresolvable read is visible rather than silent. */
function isGlobbedInstructionDoc(path: string): boolean {
  if (!GLOB_OR_VAR.test(path)) return false
  return isInstructionDoc(path.replace(new RegExp(GLOB_OR_VAR.source, 'g'), 'x'))
}

/** `quoted` is load-bearing, not bookkeeping: every flag rule below must ignore a
 *  token that only LOOKS like a flag because a pattern was quoted. Without it
 *  `grep -rn "-l" docs/x.md` reads as a names-only grep and the doc is lost. */
interface Token {
  text: string
  quoted: boolean
}

/** Remove heredoc bodies before anything is tokenized. A `cat > x.ts <<'EOF' …`
 *  carries arbitrary CONTENT inside the command string, so a fixture, script or
 *  doc being WRITTEN gets scanned as if it were commands being run — the file
 *  this repo writes that way is often precisely a doc or a test full of doc
 *  paths. Found by the near-miss report on its first real transcript.
 *
 *  Only the marker and the body are removed, never the rest of the marker's own
 *  line: `cat <<'EOF' > f && cat docs/x.md` still carries a real read. */
function stripHeredocs(command: string): string {
  // `(?<!<)` and `(?!<)` exclude the `<<<WORD` herestring, which shares the
  // prefix but has no body to strip.
  const marker = /(?<!<)<<-?(?!<)\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/g
  let out = command
  let m: RegExpExecArray | null
  while ((m = marker.exec(out)) !== null) {
    const afterMarker = m.index + m[0].length
    const nl = out.indexOf('\n', m.index)
    if (nl === -1) {
      // No body on this command at all (a quoted "<<EOF" in a pattern, or a
      // truncated command). Drop the marker only — truncating here would eat
      // every path after it.
      out = out.slice(0, m.index) + out.slice(afterMarker)
      marker.lastIndex = m.index
      continue
    }
    const rest = out.slice(nl + 1)
    const end = new RegExp(`^\\s*${m[2]!}\\s*$`, 'm').exec(rest)
    const bodyEnd = end ? nl + 1 + end.index + end[0].length : out.length
    out = out.slice(0, m.index) + out.slice(afterMarker, nl + 1) + out.slice(bodyEnd)
    marker.lastIndex = m.index
  }
  return out
}

/** One command's tokens, split into pipeline/list segments, each tagged with
 *  whether it is immediately followed by `||` rather than an ordinary `|`
 *  pipe or a `;`/`&&`/newline separator (issue #1327) — `handleSegment` needs
 *  this to tell a `cmd1 || cmd2` fallback's primary side from a segment whose
 *  output genuinely feeds the next command. Quote-aware: the naive
 *  `split('|')` shreds a quoted alternation (`grep "a\|b" docs/x.md`) and
 *  orphans the path into a segment whose verb is a pattern fragment — #1074's
 *  prototype scored 1/2 until this existed. */
function segments(rawCommand: string): { tokens: Token[]; followedByOr: boolean }[] {
  const command = stripHeredocs(rawCommand)
  const out: { tokens: Token[]; followedByOr: boolean }[] = []
  let tokens: Token[] = []
  let cur = ''
  let started = false
  let quoted = false
  let quote: '"' | "'" | null = null
  const endToken = (): void => {
    if (started) tokens.push({ text: cur, quoted })
    cur = ''
    started = false
    quoted = false
  }
  const endSegment = (followedByOr: boolean): void => {
    endToken()
    if (tokens.length) out.push({ tokens, followedByOr })
    tokens = []
  }
  for (let i = 0; i < command.length; i++) {
    const c = command[i]!
    if (quote) {
      if (c === quote) quote = null
      else if (c === '\\' && quote === '"' && i + 1 < command.length) cur += command[++i]
      else cur += c
      started = true
      quoted = true
      continue
    }
    if (c === '"' || c === "'") {
      quote = c
      started = true
      quoted = true
    } else if (c === '\\' && i + 1 < command.length) {
      cur += command[++i]
      started = true
    } else if (c === '#' && !started) {
      // A trailing comment is prose, not arguments: `cat a.md # see also b.md`
      // never showed b.md.
      while (i < command.length && command[i] !== '\n') i++
      endSegment(false)
    } else if (c === '|') {
      // `||` doubles up: consume both chars as one operator and tag the
      // segment it closes as the primary (failure-triggers-fallback) side.
      const isOr = command[i + 1] === '|'
      if (isOr) i++
      endSegment(isOr)
    } else if (c === '&') {
      if (command[i + 1] === '&') i++
      endSegment(false)
    } else if (c === ';' || c === '(' || c === ')' || c === '\n') endSegment(false)
    else if (c === ' ' || c === '\t' || c === '\r') endToken()
    else {
      cur += c
      started = true
    }
  }
  endSegment(false)
  return out
}

/** Drop `timeout 60`, `sudo`, `FOO=1` — anything standing between the segment and
 *  the reader verb it actually runs. (A subshell's parens are already segment
 *  separators, so they never reach here.) */
function unwrap(tokens: Token[]): Token[] {
  let i = 0
  while (i < tokens.length) {
    const t = tokens[i]!
    if (t.quoted) break
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(t.text)) {
      i++
      continue
    }
    const verb = t.text.replace(/^.*\//, '')
    if (!PREFIX_VERBS.has(verb)) break
    i++
    // `timeout`/`nice` take a leading duration or adjustment argument.
    while (i < tokens.length && /^-|^\d+(\.\d+)?[smhd]?$/.test(tokens[i]!.text)) i++
  }
  return tokens.slice(i)
}

/** `sed -i` edits in place and prints nothing — the doc is written, not read.
 *  `i` is unambiguous among sed's short flags (n/e/f/i/r/E/s/u/z). */
function isInPlaceEdit(verb: string, tokens: Token[]): boolean {
  if (verb !== 'sed') return false
  return tokens.some(
    (t) => !t.quoted && (t.text.startsWith('--in-place') || /^-[a-zA-Z]*i([.=].*)?$/.test(t.text)),
  )
}

/** `-l`/`-L`/`-q`/`-c`: the match is reported as a name or a count, so the file's
 *  contents never reached the session. `-L` is names-only for grep but means
 *  `--follow` for rg — verified against both binaries. */
function showsNoContent(verb: string, tokens: Token[]): boolean {
  if (verb !== 'grep' && verb !== 'rg') return false
  return tokens.some((t) => {
    if (t.quoted) return false
    if (NO_CONTENT_FLAGS.has(t.text)) return true
    if (!/^-[a-zA-Z]+$/.test(t.text)) return false
    const flags = t.text.slice(1)
    return /[lqc]/.test(flags) || (verb === 'grep' && flags.includes('L'))
  })
}

/** A reader verb whose output is a FILTERED SUBSET of what it was given, so
 *  which of its file arguments actually reached the session depends on the
 *  command's own output (issue #1247) — `cat`/`sed`/etc. stream everything
 *  they're pointed at and stay ungated *in the general case*.
 *
 *  Issue #1327 considered widening this set to `cat`/`sed`/`awk`/`head`/`tail`
 *  too, but the real caller (`session-trace.ts`'s `bashCommandsOf`) pairs
 *  EVERY Bash command with an output string, defaulting to `''` for one whose
 *  `tool_result` is simply missing from a transcript (a torn transcript, or a
 *  test fixture that never wires one up) — not `undefined`. Widening this set
 *  would silently stop crediting every such command, which is a much bigger
 *  behavior change than this issue's actual bug (a `cmd1 || cmd2` fallback
 *  misattributing output) calls for. The `redirectsStderrToDevNull` check
 *  below fixes that specific shape without touching this set at all. */
const OUTPUT_FILTERED_VERBS = new Set(['grep', 'rg'])

/** One command, optionally paired with the text its own `tool_result` carried.
 *  A bare string means "output unknown" — gating is skipped, same as before
 *  #1247, which is what every pre-existing caller/test still passes. The real
 *  caller (session-trace.ts's `bashCommandsOf`) always supplies the pair. */
export type ShellCommand = string | { command: string; output?: string }

function normalizeShellCommand(entry: ShellCommand): { command: string; output?: string } {
  return typeof entry === 'string' ? { command: entry } : entry
}

/** `for VAR in <literal-list>; do … ; done` (issue #1305) — the header segment
 *  `segments()` already splits out on its own (`;` separates it from `do`).
 *  Matches only a BARE literal word list: any header value carrying a glob or
 *  variable character (`GLOB_OR_VAR`) means the list isn't literal (e.g. a
 *  `$(...)` command substitution or a nested expansion), so this returns
 *  `undefined` and the segment falls through to ordinary handling — `for`
 *  isn't a reader verb, so it is simply noted as 'not a reader command' like
 *  any other non-matching command. Out of scope deliberately (#1305): `while`
 *  loops, and a `for` whose list itself needs resolving. */
function matchForHeader(tokens: Token[]): { varName: string; values: string[] } | undefined {
  if (tokens.length < 4) return undefined
  if (tokens[0]!.quoted || tokens[0]!.text !== 'for') return undefined
  const varToken = tokens[1]!
  if (varToken.quoted || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(varToken.text)) return undefined
  if (tokens[2]!.quoted || tokens[2]!.text !== 'in') return undefined
  const values = tokens.slice(3)
  if (values.some((t) => GLOB_OR_VAR.test(t.text))) return undefined
  return { varName: varToken.text, values: values.map((t) => t.text) }
}

/** Substitutes every `$VAR`/`${VAR}` occurrence in a body segment's tokens with
 *  one of the loop header's own literal values (issue #1305) — not filesystem
 *  globbing, the loop's own list is the whole universe of what `$VAR` can be.
 *  The negative lookahead stops `$p` from also eating `$path`: a real shell
 *  would never treat the two as the same variable. */
function substituteLoopVar(tokens: Token[], varName: string, value: string): Token[] {
  const re = new RegExp(`\\$\\{${varName}\\}|\\$${varName}(?![A-Za-z0-9_])`, 'g')
  return tokens.map((t) => ({ ...t, text: t.text.replace(re, value) }))
}

/** True when `output` shows `token` (the literal argument grep/rg was given)
 *  was actually part of what matched — either grep's own multi-file
 *  `<token>:<line>:<match>` prefix, or rg's default grouped format, whose
 *  header line is the bare path with nothing after it (`--no-heading` makes rg
 *  emit the grep-style prefix instead, also covered here). Scoped to these two
 *  shapes deliberately (issue #1247) rather than the full space of grep/rg
 *  flags that reshape output (`-H`, `--heading`, `-z`, …). */
function outputMentionsFile(output: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|\\n)${escaped}(:|\\r?\\n|$)`).test(output)
}

/** `2>/dev/null`, attached or spaced — the shape a `cmd1 2>/dev/null ||
 *  cmd2` fallback uses to fail silently (issue #1327). Detected structurally
 *  from the command's own tokens rather than from `output`: the whole point
 *  is that the shared `output` a `||` command carries could belong to either
 *  side, so a command built to swallow its own stderr this way can't be
 *  trusted to have produced that output at all — see the call site. */
function redirectsStderrToDevNull(tokens: Token[]): boolean {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!
    if (t.quoted) continue
    const attached = /^2>>?(.+)$/.exec(t.text)
    if (attached) {
      if (attached[1] === '/dev/null') return true
      continue
    }
    if (/^2>>?$/.test(t.text)) {
      const next = tokens[i + 1]
      if (next && !next.quoted && next.text === '/dev/null') return true
    }
  }
  return false
}

/** Scan every Bash command of a session for shell-read instruction docs.
 *  `rel` relativizes an absolute path the way the trace does, so `/repo/docs/x.md`
 *  and `docs/x.md` land on one key. Near-misses are ordered reader-segment first:
 *  a rejected token inside a real reader command is likelier to be a genuine
 *  extractor bug than a doc path mentioned by some other program.
 *
 *  `resolveGlob` keeps this function itself fs-free and pure (unit-testable over
 *  plain strings): when supplied, a token otherwise rejected as a glob/variable is
 *  handed to it, and a single resolved match is credited exactly like a literal
 *  path. `undefined` (0 or 2+ matches) falls through to today's near-miss — never
 *  guessed between candidates (issue #1246). The real caller (session-trace.ts)
 *  injects an `fs`-backed implementation; tests exercise the pure default.
 *
 *  Each `commands` entry may pair a command with its own `tool_result` output
 *  text (issue #1247): a grep/rg invocation with more than one file positional
 *  is then only credited for a file its output actually shows a match from, and
 *  one with exactly one file positional only when the output is non-empty. A
 *  bare string (no output known) skips this gate entirely, matching every
 *  caller/test that predates #1247. Issue #1327 adds a second, verb-independent
 *  gate ahead of this one: it withholds credit from the primary side of a
 *  `cmd1 <stderr to /dev/null> || cmd2` fallback, whose shared output may
 *  really belong to `cmd2` — see `redirectsStderrToDevNull`. */
export function scanShellReads(
  commands: ShellCommand[],
  rel: (p: string) => string = (p) => p,
  resolveGlob?: (token: string) => string | undefined,
): ShellReadScan {
  const creditedBy = new Map<string, string>()
  const fromReader: NearMiss[] = []
  const fromOther: NearMiss[] = []
  const norm = (t: string): string => canonicalizeInstructionPath(rel(t))
  /** `p` is already in scope as a glob/variable shaped like an instruction doc
   *  (the caller only reaches this after `isGlobbedInstructionDoc(p)`). Resolving
   *  it can still land outside `INSTRUCTION_DOC_PATTERNS` if a caller's resolver
   *  is loose, so the result is re-checked rather than trusted blindly. */
  const resolveGlobbedDoc = (p: string): string | undefined => {
    const resolved = resolveGlob?.(p)
    if (resolved === undefined) return undefined
    const canonical = canonicalizeInstructionPath(resolved)
    return isInstructionDoc(canonical) ? canonical : undefined
  }

  for (const entry of commands) {
    const { command, output } = normalizeShellCommand(entry)
    const credit = (p: string): void => {
      if (!creditedBy.has(p)) creditedBy.set(p, command)
    }

    const handleSegment = (segTokens: Token[], followedByOr: boolean): void => {
      const tokens = unwrap(segTokens)
      if (tokens.length === 0) return
      const verb = tokens[0]!.text.replace(/^.*\//, '')
      const note = (into: NearMiss[], token: string, rule: SkipRule): void => {
        const p = norm(token)
        if (isInstructionDoc(p) || isGlobbedInstructionDoc(p)) into.push({ command, token, path: p, rule })
      }
      const noteAll = (rule: SkipRule, from = 1): void => {
        for (const t of tokens.slice(from)) note(fromReader, t.text, rule)
      }

      if (verb === 'git') {
        const showPath = extractGitShowPath(tokens)
        if (showPath !== undefined) {
          const p = norm(showPath)
          if (isInstructionDoc(p)) credit(p)
          else if (isGlobbedInstructionDoc(p)) {
            const resolved = resolveGlobbedDoc(p)
            if (resolved !== undefined) credit(resolved)
            else note(fromReader, showPath, 'not a literal path: glob or variable')
          }
          return
        }

        const diffPaths = extractGitShowDiffPaths(tokens) ?? extractGitDiffPaths(tokens)
        if (diffPaths !== undefined) {
          for (const diffPath of diffPaths) {
            const p = norm(diffPath)
            const creditDiff = (path: string): void => {
              if (output === undefined || outputShowsGitDiffFor(output, diffPath)) credit(path)
              else note(fromReader, diffPath, 'git show diff does not touch this path')
            }
            if (isInstructionDoc(p)) creditDiff(p)
            else if (isGlobbedInstructionDoc(p)) {
              const resolved = resolveGlobbedDoc(p)
              if (resolved !== undefined) creditDiff(resolved)
              else note(fromReader, diffPath, 'not a literal path: glob or variable')
            }
          }
          return
        }
      }

      if (!READER_VERBS.has(verb)) {
        for (const t of tokens) note(fromOther, t.text, 'not a reader command')
        return
      }
      if (isInPlaceEdit(verb, tokens)) {
        noteAll('in-place edit: written, not read')
        return
      }
      if (showsNoContent(verb, tokens)) {
        noteAll('no contents shown: -l/-q/-c reports only a name or a count')
        return
      }

      // Candidates this segment would credit, held back until the file-count/
      // output gate below decides (issue #1247): grep/rg filter their input,
      // so which of several given files actually reached the session depends
      // on what the command actually matched, not the argument list alone.
      // `matchText` is what to look for in that output — the raw argument for
      // a literal path (what grep/rg actually echoes back), but the RESOLVED
      // filename for a glob candidate, since the tool never echoes the glob
      // pattern itself (issue #1298). `token` stays the raw argument text for
      // near-miss reporting regardless.
      const candidates: { path: string; token: string; matchText: string }[] = []
      let skipReason: SkipRule | null = null
      const patternSupplied = tokens.some((t) => !t.quoted && PATTERN_FLAGS.has(t.text))
      let positionals = 0
      let fileCount = 0
      for (const t of tokens.slice(1)) {
        if (skipReason) {
          note(fromReader, t.text, skipReason)
          skipReason = null
          continue
        }
        if (!t.quoted) {
          // `> out`, `2>> log`, and the attached `>out` form. `<` is NOT here:
          // `cat < docs/x.md` genuinely streams the file.
          if (/^\d*>>?$/.test(t.text)) {
            skipReason = 'redirect target: written, not read'
            continue
          }
          const attached = /^\d*>>?(.+)$/.exec(t.text)
          if (attached) {
            note(fromReader, attached[1]!, 'redirect target: written, not read')
            continue
          }
          if (t.text.length > 1 && t.text.startsWith('-')) {
            if (PATTERN_FLAGS.has(t.text) || ARG_FLAGS.has(t.text)) skipReason = 'value bound to a flag'
            continue
          }
        }
        positionals++
        if (positionals === 1 && SCRIPT_FIRST.has(verb) && !patternSupplied) {
          note(fromReader, t.text, 'first positional: a pattern or program, not a path')
          continue
        }
        fileCount++
        const p = norm(t.text)
        if (isInstructionDoc(p)) candidates.push({ path: p, token: t.text, matchText: t.text })
        else if (isGlobbedInstructionDoc(p)) {
          const resolved = resolveGlobbedDoc(p)
          if (resolved !== undefined) candidates.push({ path: resolved, token: t.text, matchText: resolved })
          else note(fromReader, t.text, 'not a literal path: glob or variable')
        }
      }

      // A `cmd1 <stderr to /dev/null> || cmd2` fallback (issue #1327): `cmd1`
      // is built to fail silently, so the shared `output` this command entry
      // carries may really be `cmd2`'s — crediting `cmd1`'s candidates off it
      // would launder the fallback's output onto files `cmd1` never showed.
      // Checked ahead of, and for every verb, not just the ones the gate below
      // covers: this is an attribution problem, not an output-filtering one.
      if (followedByOr && output !== undefined && redirectsStderrToDevNull(tokens)) {
        for (const c of candidates) {
          note(fromReader, c.token, '|| fallback: stderr suppressed, output may belong to the other side')
        }
      } else if (OUTPUT_FILTERED_VERBS.has(verb) && output !== undefined) {
        // `output === undefined` means the caller has no tool_result to gate
        // with (every pre-#1247 caller/test) — credit unconditionally, as before.
        for (const c of candidates) {
          const confirmed = fileCount > 1 ? outputMentionsFile(output, c.matchText) : output.trim() !== ''
          if (confirmed) credit(c.path)
          else note(fromReader, c.token, 'grep/rg output does not show this file being read')
        }
      } else {
        for (const c of candidates) credit(c.path)
      }
    }

    /** The `for VAR in <literal-list>` header currently open across this
     *  command's own segments (issue #1305) — `undefined` outside one. Never
     *  carries over to the next `commands` entry: a loop can't span two
     *  separate Bash invocations. */
    let loop: { varName: string; values: string[] } | undefined
    for (const seg of segments(command)) {
      const raw = seg.tokens
      const header = matchForHeader(raw)
      if (header) {
        loop = header
        continue
      }

      // The header always ends at the `;` before `do` (`segments()` splits on
      // it), so a loop's body starts as its own segment led by `do` and ends
      // when one is trailing `done` — both keywords, not part of the command
      // substituted or run.
      let body = raw
      let closesLoop = false
      if (loop) {
        if (body[0] && !body[0].quoted && body[0].text === 'do') body = body.slice(1)
        if (body.length > 0 && !body[body.length - 1]!.quoted && body[body.length - 1]!.text === 'done') {
          closesLoop = true
          body = body.slice(0, -1)
        }
      }

      if (loop && body.length > 0) {
        for (const value of loop.values) {
          handleSegment(substituteLoopVar(body, loop.varName, value), seg.followedByOr)
        }
      } else if (body.length > 0) {
        handleSegment(body, seg.followedByOr)
      }
      if (closesLoop) loop = undefined
    }
  }

  // A path that WAS counted somewhere is not a near-miss, however many other
  // commands mentioned it — the session has it either way. Collapse the rest by
  // canonical path and rule: the report is capped, so one file rejected the same
  // way twice (`.claude/…` and `.agents/…` name one file) must not take two of
  // the slots a genuinely different miss needs.
  const seen = new Set<string>()
  const missed = [...fromReader, ...fromOther].filter((m) => {
    const key = `${m.path}\u0000${m.rule}`
    if (creditedBy.has(m.path) || seen.has(key)) return false
    seen.add(key)
    return true
  })
  return { paths: [...creditedBy.keys()], creditedBy, nearMisses: missed }
}
