# ADR-0029 rewrite report

## 1. Parts

| Part of the old ADR | Outcome | Reason | Where it went |
|---|---|---|---|
| Date, Status, "Green-lit by a human…" banner | leftover | History; ADR-0030 bans it | dropped |
| Context: prose pointers in `CLAUDE.md` were skipped | live | Still the reason rules exist | *Why* ¶1; rejected alt 1 |
| Context: PR #1741 gave ADRs summary rules; how Claude Code loads rules (no `paths` at start, `paths` on touch) | live | Still how it works | Summary; *Scope* "ADR summary rules" |
| Context: SessionStart hook rejected (10,000-char cap vs ~12,000) | live (alt) / mechanics (numbers) | Plausible to propose again; the numbers are Claude Code's and drift as summaries change | Rejected alt 2, without numbers |
| Context: `@`-import rejected | live (alt) | Still Claude Code behaviour, plausible again | Rejected alt 3 |
| Context: copying ADR text into rules rejected by owner | live (alt) | Owner's call, still holds | Rejected alt 4 |
| Context: remaining `CLAUDE.md` triggers name files | leftover | That migration happened (tenant-layers, guards rules exist) | dropped |
| Decision: file-bound → path-scoped rule; action-bound → `CLAUDE.md` | live | Core decision | Summary; *Scope* "Which home" |
| ADR rules: summary + optional `adr-NNNN-<topic>.md`, two jobs, session-start only if binds every session, `adr:` hash | live / mechanics (hash) | Core; hash enforced by `scripts/validate-adr-rules.ts` (`staleRules`, checked) | *Scope* "ADR summary rules"; *See* |
| "ADR rules are the one deliberate copy"; never decides anything (ADR-0030) | live | ADR-0030 agrees | *Scope*; *Why* ¶2 |
| Other rules: always `paths`; short instruction in rule, long one points to doc; never copies | live / mechanics | `paths` check in `validate-adr-rules.ts:117-122` (checked) | *Scope* "Other rules" |
| Other rules: naming after doc or topic | leftover (detail) | Unenforced convention; nothing relies on it | dropped |
| Cross-cutting stays in `CLAUDE.md`; only ADR summaries at session start | live | Enforced by the `paths` check | *Scope* "Which home"; *Why* ¶3 |
| Skills: `skill-rules-hint.ts` injects rules naming the Skill's folder | live / mechanics | Hook wired in `.claude/settings.json` (checked) | *Scope* "A rule reaches a Skill"; *See* |
| A rule's `paths` can be a policy (`adr-0004-human-merge.md`) | live, owned by ADR-0004 | ADR-0004 rewrite states it (`rewrites/0004.md`) | dropped here; ADR-0004 is its home |
| Rules stay short so `paths` can be generous | live (see policy Q1) | Still the stance; Friction logging corrects noise | *Scope* "Rules stay a few lines" |
| A rule says what to know, not when to act; session-start exception | live | Still how rules arrive | *Scope* |
| Which tools/Bash reads load a rule; `CLAUDE.md` asks for the Read tool | split: live (Read tool) / mechanics (which reads) | Home `scripts/shell-reads.ts` `bashReadPaths().simple` and `scripts/bash-rules-hint.ts` header (checked) | *Scope* "Read files with the Read tool"; *See* |
| Rules load inside subagents too | mechanics | Claude Code behaviour; `bash-rules-hint.ts` header covers the subagent case | dropped |
| Whether a Bash write loads a rule is untested | leftover | An open note, not a decision | dropped |
| Consequence: moving an instruction to a rule is the default fix | live | Still the fix | *Consequences* 1 |
| Consequence: each migration its own PR; human merge because `.claude/rules/**` is Human-only | split: leftover (one PR each) / owned by ADR-0004 (human merge) | ADR-0004 rewrite holds the Human-only list | dropped |
| Consequence: `bash-rules-hint.ts` (#1764) | mechanics | Exists, wired in settings (checked) | *See* |
| Consequence: `CLAUDE.md` keeps the grep-`docs/adr/` step | live | Still in `CLAUDE.md` "Docs you must read first" | *Consequences* 2 |
| Consequence: action-bound delivered by `read-first-hint.ts` (#1754) | mechanics | Exists, wired (checked) | *See* |
| Consequence: session logs record `rulesLoaded`/`rulesFollowedUp`; reach estimated | mechanics | `scripts/session-trace.ts:113-120, 635-637` (checked) | dropped; a reader of that code doesn't need this ADR |
| Consequence: Friction for an unrelated rule | live / mechanics | Procedure in `log-session/SKILL.md:124-126` (checked) | *Consequences* 3; *See* |
| Consequence: gate checks for non-ADR rules (#1765) | mechanics | `validate-adr-rules.ts` (checked) | *See* |

## 2. Callers

| # | Checklist item | Outcome |
|---|---|---|
| 1 | When does an instruction reach an agent? | answered (Summary; *Scope* "ADR summary rules", "A rule reaches a Skill") |
| 2 | Must every non-ADR rule list its files? | mechanics: `scripts/validate-adr-rules.ts`; the decision is in *Scope* "Other rules" |
| 3 | Does a Bash read load the rule? | mechanics: `scripts/shell-reads.ts` (`bashReadPaths().simple`), `scripts/bash-rules-hint.ts` |
| 4 | Must every `docs/agents/*` doc be reachable? | added: only callers stated it; still true (audit-docs checks it). *Scope* bullet |
| 5 | May a rule name a missing doc? | mechanics: `scripts/validate-adr-rules.ts` |
| 6 | What can a rule be? | answered (*Scope* "ADR summary rules", "Other rules") |
| 7 | Where do every-session instructions go? | answered (*Scope* "Which home") |
| 8 | Are action-bound instructions rules? | answered: no, `CLAUDE.md`; delivery hint in *See* (`read-first-hint.ts`) |
| 9 | A rule that loads where it doesn't apply? | answered (*Consequences* 3); mechanics in `log-session/SKILL.md` |
| 10 | Is the Bash gap closed? (conflict with `CLAUDE.md`) | answered: the Read tool is the rule; the hook is a backstop (*Scope*). Fix the caller: `CLAUDE.md:64-65` |
| repoint | `scripts/validate-adr-rules.ts:121` message | fix the caller (below) |
| fix | `.agents/skills/frictions-to-fixes/SKILL.md:233-236` | fix the caller (below) |

Other references, unchanged: `CONTEXT.md:303-306` (Rule: matches the rewrite),
`scripts/validate-adr-rules.ts:7-8`, `scripts/bash-rules-hint.ts:4`,
`scripts/shell-reads.ts:723`, `tests/unit/validate-adr-rules.spec.ts:71`,
`.agents/skills/audit-docs/SKILL.md:74-76` (the check's home),
`.agents/skills/log-session/SKILL.md:124-126` (the procedure's home),
`docs/adr/0030-…md:6` (points).

## 3. Follow-ups

### Summary rule: `.claude/rules/adr-0029.md`

`paths` narrowed per policy Q1; `adr:` re-stamped with `--write`.

```markdown
---
adr: <re-stamp>
paths:
  - ".claude/rules/**"
  - "CLAUDE.md"
  - ".agents/skills/writing-for-agents/**"
  - ".agents/skills/audit-docs/**"
  - ".agents/skills/prune-trial/**"
---
# ADR-0029: Instructions load with the files they govern

Put an instruction about certain files in a rule in `.claude/rules/` whose
`paths` match them. Keep instructions for every session, or for an action such
as a commit or a PR, in `CLAUDE.md`. Each ADR summary rule says when to read
its ADR in full, gives its key parts as instructions and decides nothing the
ADR doesn't. Give every other rule `paths`, a few lines, and a pointer to its
doc if the instruction is long. A rule can't order a step before the read that
loads it. Make every `docs/agents/` doc reachable from `CLAUDE.md` or a rule.

If you add, move or change a rule, read the full ADR first:
docs/adr/0029-instructions-load-with-the-files-they-govern.md
```

### Caller edits

- `CLAUDE.md:64-65` → "- **Read files with the Read tool**, not `cat`: Edit
  refuses a file you haven't Read, and only the Read tool always loads a
  file's rules (ADR-0029)."
- `scripts/validate-adr-rules.ts:121` → `` `${RULES_DIR}/${file} has no \`paths\` list; every non-ADR rule needs one (ADR-0029).` ``
  (update the matching expectation in `tests/unit/validate-adr-rules.spec.ts`
  if it asserts the text).
- `.agents/skills/frictions-to-fixes/SKILL.md:233-236` → "…above all
  **single-home rather than restate** (the CLAUDE.md rule), and make any new
  `docs/agents/*` file reachable (ADR-0029; audit-docs' orphan-addition
  lens). A"

### New homes

None needed. Everything dropped is already held by its home: the Human-only
list and the "rule `paths` as policy" point (ADR-0004,
`adr-0004-human-merge.md`), the trace fields (`scripts/session-trace.ts`), the
Bash and subagent mechanics (`bash-rules-hint.ts` header).

### Other ADRs

- ADR-0030: owns "a summary rule never decides anything its ADR doesn't" and
  the ADR/summary split. Agrees.
- ADR-0004: owns that `.claude/rules/**` and `docs/adr/**` need a human merge
  (checked in `adr-0004-human-merge.md:16-17`). The rewrite now leaves that to
  it.
- ADR-0007: `validate-adr-rules.ts` `NO_RULE` exempts it as superseded, hence
  "every ADR that still binds agents". `rewrites/0007.md` restates it as a live
  decision; if it binds again, it needs a summary rule and `NO_RULE` shrinks.
- Rewrites of ADR-0001, ADR-0022 and ADR-0023 propose giving their summary
  rules `paths`. That applies this ADR as written (session start only when the
  ADR binds every session); no change to ADR-0029 needed.

## 4. Policy questions

1. **Narrow this rule's own `paths`?** It loads on `docs/agents/**` and
   `docs/adr/**`, so it showed in 51 of 51 sessions and was rated "no" in 26
   (session-log-usage §3b). Recommendation: drop those two globs (draft above).
   Writing a new rule or editing `CLAUDE.md` still loads it, and audit-docs
   carries the `docs/agents/` reachability check. "Broad `paths` are fine"
   stays as the default; this is the Friction-driven narrowing it expects.
2. **Is the Read tool the rule, or is the Bash hook enough?** Callers
   conflicted. Recommendation: the Read tool stays the rule, the hook a
   backstop. The hook drops paths after a `cd` it can't follow, globs and
   variables, and Edit needs a Read anyway.

## 5. Split

75 lines, just over the guide. No split needed.

## 6. Prompt friction

- The expectations note's line numbers were stale (`CLAUDE.md:220`,
  `CONTEXT.md:242`; now 64-65 and 303-306). Found by grep.
- Several decisions here are about Claude Code's behaviour, not ours (what
  loads a rule). The prompt's "mechanics: name the file that enforces it" fit
  poorly; I used the script that documents the behaviour as its home.
- The 40-70 line guide and "every live part is in the rewrite" pull against
  each other for an ADR with eight live scope points.

## 7. Lines

Old: 95. New: 75.
