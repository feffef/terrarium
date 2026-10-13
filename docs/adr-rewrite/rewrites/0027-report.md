# ADR-0027 rewrite report

## 1. Parts

| # | Old part | Outcome | Reason | Where it went |
|---|---|---|---|---|
| 1 | Header note: green-lit in a `/grill-with-docs` session; ADR is the Decision half, Skill the mechanism | leftover | History; the Skill pointer survives in *See* | dropped; *See* |
| 2 | Context: instructions grow, nothing has removal as its job; `audit-docs` reconciles but doesn't shrink | live | Still the reason for the Skill | *Why* ¶3; *Rejected alternatives* 1 |
| 3 | Context: prose isn't enforcement (#772, #1018); mechanical rules held | live | Still true; guards.md opens with the same premise | *Why* ¶1 (no issue numbers) |
| 4 | Context: 40 of 41 logs autonomous, mostly Sonnet | split | The count is history. "Mostly scheduled runs that skim" still holds (session-log-usage: ~2/3 self-maintenance) | *Why* ¶2 |
| 5 | Context: adding is safe, removing feels risky; settle empirically | live | Core reason | *Why* ¶3 |
| 6 | Decision: necessity shown by removing and observing; one trial per run | live | Core decision | Summary; *Scope* |
| 7 | Decision: "three days" | mechanics | Home `scripts/prune-trial-window.ts` (`WINDOW_MS`, checked line 40) | *See*; value not repeated |
| 8 | Decision: `major`/`blocker` restores one goal-shaped line; less means the cut holds | live | The verdict rule; the full grading (`moderate` = judgement) is Skill §1 | *Scope* "The verdict" |
| 9 | Decision: ledger `.agents/prune-trials.yml`, each entry carries its check | mechanics | Home: the ledger file, validated by `scripts/validate-prune-trials.ts` (checked) | *See*; the check idea in *Consequences* |
| 10 | Bullet: scope is the rulebook, ADRs excepted; pack Skills unreachable | live | Matches e32f617b and Skill Bounds (checked) | *Scope* "may change" / "may not change" |
| 11 | Bullet: merge authority via ADR-0003's ledger row; landing per pr-workflow | leftover | Ledger goes whole (decisions.md); every agent merges its own PR now | *Scope* "Merging" points to ADR-0004 |
| 12 | Bullet: a trial files a hook issue, never writes a hook (#1526) | live | Skill §3 still says so; a scheduled run can't wire `.claude/settings.json` | *Scope*; *Rejected alternatives* 3 |
| 13 | Bullet: the hook, once built, warns and exits 0 | policy question | Reason (an unattended run writing a hook must not wedge the repo) is gone since trials don't write hooks; guards are fail-closed by design | dropped; see Policy Q1 |
| 14 | Bullet: other sessions detect, `prune-trial` decides; standing note in the always-loaded rule | live | Still needed or no clean verdict; audit-docs, frictions-to-fixes, issue-tracker all apply it | *Scope* "Every other session"; *Why* ¶4; summary rule |
| 15 | Bullet: capability removal not trialable; retiring a Skill/Routine is an issue for a human | live | Reason holds (nothing fails when a Skill stops) | *Scope*; *Why* ¶4 |
| 16 | Consequence: rules leave one at a time with evidence; a damaging prune is the best case for a hook | live | Reason for the hook issue | *Why* ¶3 |
| 17 | Consequence: verdict blind to unnoticed failure; check and Sonnet probe narrow it; reverting is normal | live | Non-obvious effect | *Consequences* |
| 18 | Consequence: growth engine not capped; friction fixes may re-legislate | leftover | Overtaken: `CLAUDE.md:8` and frictions-to-fixes:194 now say to cut the causing instruction first, and frictions-to-fixes:99 drops on-trial fixes | replaced by *Scope* "When one of our instructions causes a problem" |
| 19 | Amendment: three days is a floor, one-hour grace, landing = reached `main` | split | Values are mechanics (`WINDOW_MS`, `GRACE_MS` in `scripts/prune-trial-window.ts`, checked lines 40, 46, 110). "Judged only after the window since landing on main" is live | *Scope* "The verdict"; *See* |
| 20 | (Implied, Skill §5) a trial is bounded by reversibility: prose anywhere, script comments included, never what runs | live | Skill pointed to ADR-0003's ledger row for it, which is going | *Scope* "may change"/"may not change" |

## 2. Callers

| Item | Outcome |
|---|---|
| C1 What is a trial | answered (Summary, *Scope*) |
| C2 Window length and start | mechanics: `scripts/prune-trial-window.ts`. Start ("landed on `main`") and "only after" are in *Scope*. Fix the callers `prune-trial-window.ts:40`, `prune-trials.yml:1-4` |
| C3 Other sessions while a trial stands | answered (*Scope* "Every other session"). Fix the callers frictions-to-fixes:99-101, issue-tracker:31 to point, not restate the reason |
| C4 How judged; silence is not evidence | answered (*Scope* "The verdict"). Fix the caller `prune-trial-window.ts:93` (quotes) |
| C5 Ledger | mechanics: `.agents/prune-trials.yml`, `scripts/validate-prune-trials.ts` |
| C6 Must a hook fail open | policy question (Q1). Recommended: ADR-0027 does not own it. Fix the callers `skill-rules-hint.ts:6`, `stale-info-hint.ts:5`, prune-trial SKILL:119-120 |
| C7 Who merges | answered (*Scope* "Merging", ADR-0004). Fix the caller `tests/unit/merge-pr.spec.ts:308` (test name cites ADR-0027 for a flag that no longer exists) |
| C8 May a trial change ADRs | answered: no (*Scope*, *Rejected alternatives* 2). Fix the caller ADR-0017:6-8 |
| C9 May a trial write a hook | answered |
| C10 Retiring a Skill/Routine | answered |
| C11 Cut before you add | added: stated only by `CLAUDE.md:8` (and frictions-to-fixes:194), still true. *Scope* bullet |
| ADR-0003:24, :77-81 | fix the caller: the row and amendment go with ADR-0003's rewrite (decisions.md). The row's live bound moves to prune-trial SKILL:145 (below) |
| CONTEXT.md:308-314, `layers/journal/tenant.config.ts:71`, overview.md:856, CLAUDE.md:8, pr-workflow.md:75 | answered; they point, no edit needed |

## 3. Follow-ups

### Summary rule (`.claude/rules/adr-0027.md`)

```markdown
---
adr: <re-stamp>
---
# ADR-0027: Test an instruction by removing it

The `prune-trial` Skill cuts one problem's instructions to their goal, or
rewrites one Skill or doc plainly, and lets later sessions' Frictions judge
the cut. If an open trial (`.agents/prune-trials.yml`) covers text you would
change, don't restore or reword it: log a Friction and work around it. When one
of our instructions causes a problem, cut or simplify it before adding one.

Read the full ADR before you change trial scope, verdicts or who may retire a
Skill: docs/adr/0027-prune-trials.md
```

### Caller edits

- `scripts/prune-trial-window.ts:40` → `const WINDOW_MS = 3 * 24 * 60 * 60 * 1000 // the trial window (ADR-0027); this constant is its home`
- `scripts/prune-trial-window.ts:92-94` → `…the failure mode is a \`-S\` miss, i.e. "NOT FOUND", which leaves the trial unjudged: missing evidence never counts as a pass (ADR-0027). */`
- `scripts/prune-trial-window.ts:18` → keep the logic, replace `direction (ADR-0027)` with `direction (a trial is judged only after its window)`.
- `.agents/prune-trials.yml:1-4` → `# Open Prune Trials (ADR-0027). One entry per pruned problem. The window runs from when the prune lands on \`main\`, not from \`opened:\`; \`pnpm exec tsx scripts/prune-trial-window.ts\` gives it.` (drop "about three days … a floor, not a deadline"; the script header holds that).
- `.agents/skills/frictions-to-fixes/SKILL.md:99-101` → `**Next, drop what is on trial:** a candidate whose fix would restore prose inside an open **Prune Trial**'s territory (\`.agents/prune-trials.yml\`) is the trial's evidence, not a fix (ADR-0027).` Keep the rest of the paragraph.
- `docs/agents/issue-tracker.md:30-32` → `Check that its territory doesn't overlap an open Prune Trial (\`.agents/prune-trials.yml\`, ADR-0027).`
- `scripts/skill-rules-hint.ts:6-7` → `Fails open: any error adds nothing, since a hint must never block a session (docs/agents/guards.md).`
- `scripts/stale-info-hint.ts:4-5` → `…and fails open: any error writes nothing, since a hint must never block a session.`
- `.agents/skills/prune-trial/SKILL.md:119-120` → drop `The hook must warn and exit 0, even when it crashes (ADR-0027).` (Q1).
- `.agents/skills/prune-trial/SKILL.md:144-147` → `Your bound is **reversibility, not file** (ADR-0027): prose anywhere, a script's comments included. Changing what runs unattended is not a prune: escalate that.`
- `tests/unit/merge-pr.spec.ts:308` → `it('refuses an ADR change even alongside a Prune Trial ledger entry (ADR-0004)', …`
- `docs/adr/0017-provenance-footer-on-agent-authored-content.md:6-8` → `> Amended 2026-07-13 through 2026-08-01 (issues #346, #710, #723, #737, #784), then rewritten whole with the decision unchanged. Git history holds the earlier wording.` (the whole banner goes when ADR-0017 is rewritten).
- `docs/adr/0003-…md:24, :77-81` → removed with ADR-0003's ledger and amendments.

### New homes

- The "bounded by reversibility" limit that ADR-0003's row held: ADR-0027 *Scope* plus prune-trial SKILL:145 (edit above).
- Hint fail-open: already stated per hint in `docs/agents/guards.md:29-32` and each header. Optional line under guards.md's conventions: `A hint never blocks: on any error it adds nothing and exits 0.`

### Other ADRs

- ADR-0004 (rewrite): ADRs and rules on the Human-only list; agents merge their own PRs otherwise. Agrees.
- ADR-0015 (rewrite): pack Skills never edited, gate checks. Agrees.
- ADR-0030: ADR rewrites are human-led. Agrees.
- ADR-0003 (not yet rewritten): its prune-trial ledger row and amendment go; nothing in the rewrite depends on them.
- ADR-0017: its "under ADR-0027" banner conflicts; fixed above.
- ADR-0009: Frictions recorded honestly; this ADR relies on it, agrees.

## 4. Policy questions

**Q1. Should a hook proposed by a trial be required to warn and exit 0?** The
rule began when a trial could write a hook in an unattended run; since #1526 a
human-attended session builds it, and guards elsewhere are fail-closed by
design. Recommendation: drop it from ADR-0027 and the Skill; the session that
builds the hook chooses warn or deny under `docs/agents/guards.md`. If the owner
keeps it, add to *Scope*: "A hook a trial proposes warns and never blocks."

## 5. Split

Not needed (about 70 lines).

## 6. Prompt friction

- The checklist's C6 and C8 were real conflicts the prompt anticipated well;
  C11 ("cut before adding") had no clear outcome bucket: it is a live rule
  stated only by a caller, but it overtakes one of the ADR's own consequences.
  I used "added" and marked the consequence a leftover.
- Skill §5 relied on ADR-0003's ledger row for its bound; the prompt's
  ledger example covered this case exactly.
- ADR-0003 has no rewrite yet, so "state its facts as the rewrite does" could
  only use decisions.md.

## 7. Lines

Old: 101. New: about 70.
