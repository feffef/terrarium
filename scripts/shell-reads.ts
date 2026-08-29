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

export interface NearMiss {
  command: string
  token: string
  rule: SkipRule
}

export interface ShellReadScan {
  paths: string[]
  nearMisses: NearMiss[]
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

/** One command's tokens, split into pipeline/list segments. Quote-aware: the
 *  naive `split('|')` shreds a quoted alternation (`grep "a\|b" docs/x.md`) and
 *  orphans the path into a segment whose verb is a pattern fragment — #1074's
 *  prototype scored 1/2 until this existed. */
function segments(rawCommand: string): Token[][] {
  const command = stripHeredocs(rawCommand)
  const out: Token[][] = []
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
  const endSegment = (): void => {
    endToken()
    if (tokens.length) out.push(tokens)
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
      endSegment()
    } else if (c === '|' || c === ';' || c === '&' || c === '(' || c === ')' || c === '\n') endSegment()
    else if (c === ' ' || c === '\t' || c === '\r') endToken()
    else {
      cur += c
      started = true
    }
  }
  endSegment()
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

/** Scan every Bash command of a session for shell-read instruction docs.
 *  `rel` relativizes an absolute path the way the trace does, so `/repo/docs/x.md`
 *  and `docs/x.md` land on one key. Near-misses are ordered reader-segment first:
 *  a rejected token inside a real reader command is likelier to be a genuine
 *  extractor bug than a doc path mentioned by some other program. */
export function scanShellReads(commands: string[], rel: (p: string) => string = (p) => p): ShellReadScan {
  const paths = new Set<string>()
  const fromReader: NearMiss[] = []
  const fromOther: NearMiss[] = []
  const norm = (t: string): string => canonicalizeInstructionPath(rel(t))

  for (const command of commands) {
    for (const raw of segments(command)) {
      const tokens = unwrap(raw)
      if (tokens.length === 0) continue
      const verb = tokens[0]!.text.replace(/^.*\//, '')
      const note = (into: NearMiss[], token: string, rule: SkipRule): void => {
        const p = norm(token)
        if (isInstructionDoc(p) || isGlobbedInstructionDoc(p)) into.push({ command, token, rule })
      }
      const noteAll = (rule: SkipRule, from = 1): void => {
        for (const t of tokens.slice(from)) note(fromReader, t.text, rule)
      }

      if (!READER_VERBS.has(verb)) {
        for (const t of tokens) note(fromOther, t.text, 'not a reader command')
        continue
      }
      if (isInPlaceEdit(verb, tokens)) {
        noteAll('in-place edit: written, not read')
        continue
      }
      if (showsNoContent(verb, tokens)) {
        noteAll('no contents shown: -l/-q/-c reports only a name or a count')
        continue
      }

      let skipReason: SkipRule | null = null
      const patternSupplied = tokens.some((t) => !t.quoted && PATTERN_FLAGS.has(t.text))
      let positionals = 0
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
        const p = norm(t.text)
        if (isInstructionDoc(p)) paths.add(p)
        else if (isGlobbedInstructionDoc(p)) note(fromReader, t.text, 'not a literal path: glob or variable')
      }
    }
  }

  // A path that WAS counted somewhere is not a near-miss, however many other
  // commands mentioned it — the session has it either way.
  const missed = [...fromReader, ...fromOther].filter((m) => !paths.has(norm(m.token)))
  return { paths: [...paths], nearMisses: missed }
}
