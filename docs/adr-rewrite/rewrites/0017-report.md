# ADR-0017 rewrite report

## 1. Parts

| Part of the old ADR | Outcome | Reason | Where it went |
|---|---|---|---|
| Title "Provenance footer on every…" | leftover | GitHub bodies carry a header, not a footer | New title states the decision |
| Date, Status, two amendment banners | leftover | ADR-0030: no history in the text | Dropped |
| Context: owner's account shows on every agent write (`user`, `merged_by`) | live | Still true; the core reason | Summary, Why |
| Context: #124 misreads, #132 self-approval | leftover (story) | The incidents are history; the effect (misreading authorship) stays | Why, one clause |
| Context: bot identity set aside (managed connector, three plumbing points) | live | Still the reason; plausible to propose again | Rejected alternatives, When to revisit |
| Context: commits already had a harness trailer; bodies had nothing | leftover | Describes the starting point | Dropped |
| Decision: every write to GitHub or any outside system names the session, no exemptions, no "top-level only"/"GitHub only" | live | Enforced by the guard and hook; callers rely on it | Summary, Scope "What covers", Why |
| Decision: "the session log names the model" (#1684: model optional) | live | Guard, merge script and audit read only the session id | Scope "The mark names this session" |
| Decision: GitHub-body header, its exact text | live (header first line) / mechanics (text) | Home: `scripts/provenance-header.ts` (`provenanceHeader`, `PROVENANCE_HEADER`) | Scope, See |
| Decision: guard enforces it fail-closed | live | `github-provenance-guard.ts` denies `unverified`; checked | Scope "blocked", Why |
| Decision: legacy trailer on old bodies stays readable; writing one is blocked | live | `LEGACY_PROVENANCE_FOOTER` read forever; guard `malformed` blocks other shapes | Scope "Reading is wider", Consequences |
| Decision: commit trailer, its two lines | live (trailer exists) / mechanics (text) | Home: `scripts/provenance-footer.ts`, `scripts/git-helpers.ts` | Summary, See |
| Decision: hook adds or corrects the trailer, whoever wrote it | live | `.githooks/commit-msg` → `provenance-footer.ts`; checked. #1652 removed the guard that denied hand-typed trailers | Scope "Commits are repaired" |
| Decision: log commit and MCP-API tools build the same trailer repo-side | mechanics | `scripts/log-session.ts`; guard's `GITHUB_PROVENANCE_TOOLS` commit surface | Scope "What covers", See |
| Decision: deny messages are the teaching surface; `guards.md` lists them | live (why) / mechanics (list) | `formatGuardMessage` holds them | Why, See |
| Decision: "CLAUDE.md states the rule agents apply" | leftover | CLAUDE.md no longer mentions provenance (checked by grep); the summary rule carries it | Dropped |
| Decision: bot identity deferred (#124) | live | Same as Context | Rejected alternatives, When to revisit |
| Consequence: authorship recoverable from content | live | Is the Why | Why |
| Consequence: noisier threads | dropped | Obvious from "no exceptions"; cut to stay near 70 lines | Dropped |
| Consequence: nothing before 2026-07-07 backfilled | live, reframed | Its effect is the non-obvious part: readers must accept every old mark | Consequences |
| Consequence: login fields still show the owner, by design | live | Restates the premise | Summary |
| Consequence: low reversal cost (freeform text) | leftover, reversed | No longer true for readers: `hasAuthorshipMarker` and two pipelines depend on the shapes | Consequences (replaced) |
| (git history) Header replaced footer: it fought the tool's own footer; tool's footer left alone and counts as a mark | live | `HARNESS_FOOTER` in `provenance-header.ts` | Scope "Reading is wider", Rejected alternatives |
| (git history) Shape enforced, not just presence (PR #788) | live | Guard's `malformed` finding | Scope, Rejected alternatives |
| (git history) Inject instead of block: unverified | live (open) | Still nobody showed it works | Rejected alternatives, When to revisit |
| (git history) Not a build-gate check (#444) | live | Gate sees the repo only | Rejected alternatives |
| (git history) Residual fail-open: `pnpm exec tsx … \|\| true` | leftover | `scripts/guard-wrap.sh` (#1223) now synthesizes a deny when the guard crashes; `.claude/settings.json:80` wires the guard through it | Dropped; caller comment is stale (see 3) |
| (git history) Calls with no text (label-only, bare approval) pass | live | `required: () => false` rows in the guard | Scope "What covers" |
| (git history) `merge_pull_request` left out | mechanics | `merge-pr.ts` sends no message; guard registry | Not in ADR |

## 2. Callers

| # | Item | Outcome |
|---|---|---|
| 1 | How code tells an agent comment from a human's | answered (Scope "Reading is wider"); mechanics in `provenance-header.ts` (`hasAuthorshipMarker`) |
| 2 | Every write names the session, no exceptions, incl. log and API commits | answered |
| 3 | Owner's account, no bot; bot set aside (#124) | answered (Summary, Why, Rejected alternatives) |
| 4 | Exact commit trailer | mechanics: `scripts/provenance-footer.ts`, `scripts/git-helpers.ts` (`SESSION_TRAILER`), `scripts/session-trace.ts` (`formatModelId`) |
| 5 | Exact GitHub header, anchored to body start | mechanics: `scripts/provenance-header.ts` (`PROVENANCE_HEADER`) |
| 6 | Which write paths are checked, by what | mechanics: guard `GITHUB_PROVENANCE_TOOLS`, `.githooks/commit-msg`, `log-session.ts`; ADR names them in See |
| 7 | Mark names this session; never type an id; replace copied header | answered (Scope); id resolution is mechanics in the guard (`resolveGroundTruthSessionId`) and `github-integration.md` |
| 8 | Session can't be confirmed → blocked; residual gap accepted | answered (blocked); "residual gap accepted" is **fix the caller**: closed by `guard-wrap.sh` |
| 9 | Why header replaced footer; tool's own line stays and counts | answered (Scope, Rejected alternatives) |
| 10 | Old posts not rewritten; old footer read forever | answered (Scope, Consequences) |
| 11 | Commit hook never blocks; agents check the trailer | answered (Scope "Commits are repaired") |
| 12 | CONFLICT: checked by code or left to agents? | answered: the guard blocks. **fix the caller** ADR-0020:125 |
| 13 | CONFLICT: does the header alone disclose AI authorship? | policy question 1 |
| 14 | Fallback model name "Claude" | mechanics: `provenance-footer.ts` (`FALLBACK_MODEL`) |
| 15 | Session links in public content are fine (auth-gated) | not decided by this ADR; `docs/research/public-readiness-review.md:103` is a dated note, leave it |
| 16 | Outside agents use the same mark | mechanics: `docs/agents/guest-contributions.md:74` is the home of what we ask of outside agents; it points here, keep |
| 17 | A session's link | mechanics: `shared/session-url.ts` |

## 3. Follow-ups

### Summary rule: `.claude/rules/adr-0017.md`

```markdown
---
adr: <new hash>
---
# ADR-0017: Every agent write names the session that made it

Agents act on GitHub as the owner, so every agent write to GitHub, git or any
other outside system names this session, with no exceptions. Start each GitHub
body (issue, PR, comment, review) with
`🤖 [Claude](https://claude.ai/code/session_<id>)` as line one, using this
session's id; replace a header copied from another session.
`scripts/github-provenance-guard.ts` blocks a body without it.
`.githooks/commit-msg` adds the commit trailer; check that it landed. To tell
an agent's post from a human's, use `hasAuthorshipMarker`, never the login.

Read the full ADR before you change the mark, the guard or the hook:
docs/adr/0017-provenance-footer-on-agent-authored-content.md
```

### Caller edits

Repoint (dated amendments and quoted phrases):

- `scripts/github-provenance-guard.ts:8` "What it enforces — ADR-0017's requirement plus its 2026-08-01 amendment:" → "What it enforces (ADR-0017):".
- `scripts/github-provenance-guard.ts:26-28` "Format-agnosticism was justified while ADR-0017's footer competed … is gone." → "Any other shape is blocked; ADR-0017 says why."
- `scripts/github-provenance-guard.ts:31` "fail-CLOSED, per the 2026-08-01 amendment." → "fail-CLOSED (ADR-0017)."
- `scripts/github-provenance-guard.ts:63-66` drop the 3-line comment; `const REF = 'ADR-0017'`.
- `scripts/github-provenance-guard.ts:126-127` "(ADR-0017's 2026-07-20 amendment named the hole; #723's triage brief carved it out)" → "(issue #723)".
- `scripts/github-provenance-guard.ts:208` "Fail closed (ADR-0017, 2026-08-01):" → "Fail closed (ADR-0017):".
- `scripts/github-provenance-guard.ts:248` "fails CLOSED (ADR-0017, 2026-08-01)" → "fails CLOSED (ADR-0017)".
- `scripts/github-provenance-guard.ts:381-385` replace the "residual fail-open" paragraph with: "A crash before this runs is turned into a deny by `scripts/guard-wrap.sh`."
- `scripts/provenance-footer.ts:1-4` → "// The ADR-0017 commit-trailer backstop (issue #346): on cloud `git commit -m` the harness template does not reliably add the trailer."
- `scripts/provenance-footer.ts:16-18` "(ADR-0017: a regression degrades cleanly back to the manual-amend status quo, it is not a blocking gate)" → "(ADR-0017: commits are repaired, never blocked)".
- `scripts/provenance-header.ts:2-3` "Read ADR-0017's 2026-07-31 amendment for why the convention moved here from a trailing footer;" → "ADR-0017 says why it is a header, not a footer;".
- `scripts/provenance-header.ts:50-52` "carried by every agent-authored GitHub body posted before the 2026-07-31 amendment. Matched permanently … (ADR-0017's \"asymmetric history\")" → "carried by older agent-authored GitHub bodies. Matched permanently: old posts are never rewritten (ADR-0017)".
- `scripts/provenance-header.ts:57-58` "(ADR-0017 2026-07-31)" → "(ADR-0017)".
- `tests/unit/provenance-header.spec.ts:1` "(2026-07-31 amendment)" → delete the parenthetical.
- `tests/unit/github-provenance-guard.spec.ts:1` "the 2026-08-01 posture flip" → "the fail-closed posture (ADR-0017)".
- `docs/adr/0020-requester-trust-tiers.md:125-127` "Like ADR-0017's provenance footer, the *input screen* (rules 1–2) is a **behavioural convention**" → "The *input screen* (rules 1–2) is a **behavioural convention**" (ADR-0017's mark is guard-enforced, so the comparison is wrong). Apply in the ADR-0020 rewrite.
- `docs/adr/0023-guest-driven-demo-pipeline.md:131-132` already superseded by `rewrites/0023.md`, which drops "provenance is by footer". No edit.

Fix (restates or miscites):

- `scripts/github-provenance-guard.ts:359` "Blocked by the ADR-0017 provenance guard (#886):" → "Blocked by the provenance guard's angle-bracket check (#886):".
- `docs/diagrams/interactive-map/terrarium-overview.md:861` `guards` row: ADR column `ADR-0017` → `–` (the roster is `docs/agents/guards.md`; only the provenance guard and commit hook are ADR-0017's).
- `scripts/check-triage-drift.ts:16-19` "the ADR-0017 authorship marker every AI-authored comment carries — the provenance header today, the legacy two-line footer historically, or the harness's own footer (`hasAuthorshipMarker`, …)" → "the ADR-0017 authorship marker (`hasAuthorshipMarker` in `provenance-header.ts` decides which shapes count)".
- `.agents/skills/auto-triage/SKILL.md:33` replace the sentence from "Every agent-authored comment…" through "…same login." with: "Every agent comment carries an ADR-0017 mark, so its absence is the signal (`isAiAuthored`). Never use the author or `author_association`: agents post as the owner (ADR-0017)."
- `scripts/log-session.ts:333-334` "ADR-0017 has no exemption for \"the trace didn't say\" — the footer still needs a value." → "The trailer still needs a value (ADR-0017)."
- `scripts/log-session.ts:370-371` "per ADR-0017 (no exemptions: every agent-authored commit carries this footer) — a trailer" → "per ADR-0017 — a trailer".
- `scripts/provenance-footer.ts:64` "ADR-0017 has no \"the trace didn't say\" exemption; the footer still needs a value." → "The trailer still needs a value (ADR-0017)."
- `.agents/skills/guest-build/SKILL.md:107-108` and `.agents/skills/guest-intake/SKILL.md:39-41`: depend on policy question 1. If the header counts as the AI notice: "(a no-exemptions convention that already discloses AI authorship)" → "(ADR-0017; it is the AI notice)". `clear-backlog/SKILL.md:20` only points; keep.

### New homes

None needed. Every mechanic the old ADR named already has its home in code (checked). The "residual fail-open" note leaves with no replacement because the gap is closed.

### Other ADRs

- ADR-0009 (session-log commits carry the trailer): the rewrite says log commits are covered and points to `log-session.ts`; ADR-0009 agrees.
- ADR-0020: its line 125 calls the mark a behavioural convention; disagrees with code and this rewrite. Fix in its rewrite (above). Its line 175 "Same limit as ADR-0017 / #124" agrees.
- ADR-0023 (`rewrites/0023.md`): "Agents act on GitHub under the owner's account" in Consequences agrees.
- ADR-0022 (`rewrites/0022-report.md` policy question 1) relies on agent writes landing under the owner's account; agrees.

## 4. Policy questions

1. **Is the header alone the AI notice?** `guest-build` and `guest-intake` post only the header and say it discloses AI authorship; `/triage` (via `auto-triage`) also adds "*This was generated by AI during triage.*". Recommendation: the ADR stays silent; disclaimers are each Skill's choice. If the owner wants one rule, say in *Scope* "The header is the notice that an agent wrote the post," and let `/triage` drop its disclaimer.
2. **Should `gh api` writes be checked too?** The guard checks only `mcp__github__*`; `github-integration.md:30` tells agents to write through MCP. Recommendation: leave it as a named gap in *Consequences*; file an issue if agents use `gh api` for writes.

## 5. Split

The rewrite is about 76 lines, slightly over. No split is worth it: the two halves (GitHub header, commit trailer) share one reason. Could go further by cutting *When to revisit* to the bot-account line.

## 6. Prompt friction

- The prompt's "read the parts of `session-log-usage.md` about this ADR" gave little beyond "bot identity deferred" being the only full-text-only fact; it confirmed keeping that as a rejected alternative.
- Step 2 asks to trace each Decision bullet, but most of the live reasoning (header vs footer, fail-closed, inject) lived only in amendments pruned out by earlier prune-trials; it had to come from `git show 10399854^:…`. Worth saying that pruned amendments count as parts.
- The read-only command list excludes `gh`, so issue states (#124, #1689) could not be checked; the rewrite names #124 without claiming its state.
- `git-conventions.md` is required before `git log`, which the prompt does not mention; minor.

## 7. Lines

Old ADR: 77. New ADR: about 76. Summary rule: 10 → about 16.
