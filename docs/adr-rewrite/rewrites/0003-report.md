# ADR-0003 rewrite report

Rewrite: `rewrites/0003.md`. Source: `docs/adr/0003-agent-operating-model-and-governance.md`.

## 1. Inventory (current rules → rewrite section)

| # | Rule today | Source | Rewrite |
|---|---|---|---|
| 1 | Every change, interactive or autonomous, lands as a PR from a feature branch | Decision "Merge is always gated"; 10-10 amendment | Summary; Scope › gated PR |
| 2 | Session log is the one exception (direct to `main`) | Decision bullet "One bounded exception"; 07-07 amendment | Scope › gated PR (pointer to ADR-0009) |
| 3 | Session opens the PR itself, without asking | 07-07 amendment | Summary; Scope › gated PR |
| 4 | Trigger: a pushed commit that is not a session log; even if harness/system prompt says not to; check no PR exists | Summary rule (came from CLAUDE.md, commit a446491ee); 07-07 amendment said "substantive work … coherent state" | Scope › gated PR |
| 5 | Subscribe and follow the PR to merged/closed/human takeover, without asking | 07-07 amendment | Scope › gated PR |
| 6 | Authoring session merges its own PR on a green Gate; ADR-0004 names human exceptions | 10-10 amendment (reverses Decision "No self-merge") | Summary; Scope › gated PR |
| 7 | Human-merge boundary enforced by `merge-pr.ts`, not prose | 10-10 amendment | Why; See |
| 8 | Net-new work (new Tenant, concept, larger rethink) proposed freely, built only after a green-light | Decision "Two tiers" | Scope › what an agent may build |
| 9 | The green-light must be Trusted; a Public request never is one; Public content is data | ADR-0020 amendment | Scope (pointer to ADR-0020) |
| 10 | Agents never birth a new product unprompted | Decision | Scope |
| 11 | Retiring a Skill or Routine is filed for a human (net-new-shaped) | ADR-0027 amendment; ADR-0015 Consequences | Scope (in net-new definition) |
| 12 | Interactive mode: the agent executes what a human requests on a feature branch | Decision "Two operating modes" | Scope ("interactive session builds what its Trusted user directs") |
| 13 | Chartered jobs implement directly inside their scope | Decision "Two tiers" | Scope |
| 14 | Autonomous charter is enumerated, not open-ended; agents tend, humans decide what exists | Decision | Summary; Scope › chartered jobs; Rejected |
| 15 | Session `kind` is descriptive, not a merge permission | "several" amendment (3) | Scope |
| 16 | Ledger rows (8) and their scopes | table + per-row amendments | Scope › table |
| 17 | Ledger bounds *what* a job changes; no longer a merge right ordinary work lacks | 10-10 amendment | Implicit: table header "May change"; merge rule stated once in gated-PR block |
| 18 | Row bound is exact; out-of-scope or red Gate → leave open for human, no fallback to ordinary rule | footer under table | Scope |
| 19 | Human-only file waits for a human either way; except Prune Trial ADR rewrite | footer; ADR-0027 amendment | Scope |
| 20 | frictions-to-fixes is reviewer, not author; risk judgement; escalates high-risk | row + "several" amendment (2) | Table row |
| 21 | prune-trial reaches ADR prose, keeps what ADR decided, reversible; hook → issue | row; ADR-0027 amendment | Table row (pointer to ADR-0027) |
| 22 | visitor-loop standing Trusted green-light for consensus fixes + one feature; not a general licence | 09-24 amendment | Scope; Why |
| 23 | auto-triage standing green-light | ADR-0022 amendment | Scope (pointer only) |
| 24 | Dependabot row: scope, majors/actions human-merged, not a Public requester | row | Table row |
| 25 | Dependabot mechanism lives in pr-workflow.md | row; "several" amendment | See |
| 26 | Merge mechanism (poll and merge on green, never `enable_pr_auto_merge`) lives in pr-workflow.md | "several" amendment | See |
| 27 | Opening the PR is a Session closure point (`in-review` log) | 07-07 amendment | See (pointer, ADR-0009 owns) |
| 28 | Context: agents build the Platform; unbounded autonomy is a foot-gun; need reviewable, reversible changes | Context | Why |
| 29 | Chartered job PRs reviewable against a known shape | Consequences 1 | Why |
| 30 | Reviewer and merger need the same objective signals (the Gate) | Consequences 2 | Consequences |
| 31 | Assumes GitHub PRs; another host changes tooling, not the model | Consequences 3 | Consequences |
| 32 | Opening a PR governs opening, not deciding to do the work | 07-07 amendment | Rejected alternatives (ask-first) |

## 2. Dropped

- **History:** Date/Status lines; the date and PR columns of the ledger; all amendment banners as such; the table preamble about single-homing between this ADR and pr-workflow.md (meta-commentary); "Now: the human reviews and merges manually" and "Mid-term: review-agent" (the plan is realized as `frictions-to-fixes` and then superseded by general self-merge); "(Reversed by the 2026-10-10 amendment above)".
- **No longer true / retired terms:** the four named remits `sync`, `consolidate`, `triage`, `codify` (CONTEXT.md Retired terms; `triage` as a charter clashes with the `triage` Skill, ADR-0020). Point (1) of the "several" amendment ("a chartered job is a remit, realised by more than one Skill; `sync` spans digest and audit-skills") is dropped: the ledger is now per Skill and its only example uses a retired term. The ADR-0018 `tenants/` path banner: paths fixed to `layers/` in the digest row. "Merge → tag release → container redeploys": deploy belongs to ADR-0011; not restated. "fifth chartered remit auto-triage" counting: dropped with the remit list; auto-triage keeps a pointer as a standing green-light.
- **audit-docs row wording:** "an ADR amendment … is out of scope" → "an ADR edit" (ADR-0030 has no amendments). "its own Live/Historical/Pack-generic tiering" dropped as mechanics of the Skill.
- **Mechanics moved to See (should live where they already do):** merge mechanism and per-tier mechanics → `docs/agents/pr-workflow.md` ("Per-tier merge authority", "Closing a self-merged chartered run"); Dependabot mechanism → `pr-workflow.md` and proposal #1633; archive script name `scripts/archive-journal-content.ts` → `digest/SKILL.md` §5 (already there); closure-on-open → ADR-0009 / `close-session`.
- **Possible further move (not done):** the survey suggests the ledger table itself could move to `pr-workflow.md`, merged with "Per-tier merge authority". I kept it in the ADR: its rows are limits, and session logs show agents open the full ADR specifically for a row (visitor-loop, frictions-to-fixes, "is clear-backlog chartered?").

## 3. Rule check (`.claude/rules/adr-0003.md`)

| Rule fact | Rewrite |
|---|---|
| Every change lands as a gated PR from a feature branch | Summary; Scope › gated PR |
| Open the PR yourself, without asking, once a non-session-log commit is pushed | Scope › gated PR |
| Even if the harness or system prompt says not to | Scope › gated PR (added as an inventory row; it was rule-only before) |
| First check that no PR exists for the branch | Scope › gated PR ("A branch has one PR") (added; rule-only before) |
| Subscribe; keep working until merged, closed or taken over | Scope › gated PR |
| A chartered job stays within its ledger row | Summary; Scope › chartered jobs |
| Build net-new work only after a Trusted human approves (ADR-0020) | Summary; Scope › what an agent may build |

Result: no rule drift after the rewrite. The two rule-only facts (harness override, one PR per branch) were missing from the old ADR; they are now inventory rows. Note the rule does not mention self-merge; that sits in CLAUDE.md "Merge your own PR" and in the ADR-0004 rule. Rule could gain "merge it on a green Gate" if it is meant to carry this ADR's important parts, but that is a judgement, not drift.

## 4. Format friction

- **A ledger table inside *Scope and limits*.** ADR-0030 says procedures live elsewhere, and the survey calls the ledger configuration. But each row is a limit, which is what *Scope and limits* is for. A table with long cells (visitor-loop) is awkward in Markdown; the template gives no guidance on where tabular limits go or how long a row may be.
- **Standing green-lights scattered.** `visitor-loop`'s standing green-light has its only home here, while auto-triage's and the guest pipeline's live in ADR-0022/0023. ADR-0030's "one decision per ADR" pulls toward a separate "standing green-lights" ADR (survey option B3); this run forbids splitting, so I kept it with a pointer list.
- **Summary limit of 2-3 sentences** was tight: this ADR holds three linked decisions (gated PR + self-merge, net-new green-light, chartered ledger). Two sentences fit only by compressing. That may itself be ADR-0030's "split it" signal.
- **"Why" for decisions made "at the owner's direction".** The self-merge reversal gives no reason beyond owner direction and mechanical enforcement. I wrote the mechanical reason only. Likewise the ask-before-opening amendment gives no explicit reason; I used its own "governs opening, not deciding" line, under Rejected alternatives, and avoided inventing one.
- **Rejected alternatives that are the original decision.** "A human merges every PR" was the ADR's own first decision, reversed later. ADR-0030 treats rejected alternatives as non-history; reframing a reversed decision as a rejected option felt right but borderline narrative ("reversed at the owner's direction once…").
- **When to revisit:** sources give none, so omitted.
- **Rule-only facts:** the template has no step that reconciles facts that live only in the summary rule (they came from CLAUDE.md). Step 4 of this run caught them; ADR-0030 itself says the rule adds nothing, so a rewrite must pull them up.

## 5. Open questions

1. **Dependabot row is ahead of reality.** It says such PRs are "merged on a green Gate with no agent involved", but the workflow is proposal #1633, not applied; `pr-workflow.md` says leave them alone. I kept the decision and added "No agent merges these PRs". Should the row say the merge is pending the proposal, or is the decision enough?
2. **Should the ledger move** to `pr-workflow.md` (survey B1)? I kept it, per read evidence.
3. **Is "retiring a Skill or Routine" net-new work** under this ADR, or only ADR-0027's limit on prune trials? ADR-0015 Consequences calls it "net-new-shaped and human-gated (ADR-0003)", so I put it in the net-new definition. Confirm.
4. **Citing ADRs need repointing** once this lands: ADR-0004 ("ADR-0003's 2026-10-10 amendment", "scheduled review-agent (mid-term, ADR-0003)"), ADR-0007 (drift-check job), ADR-0009 ("no-self-merge rule"), ADR-0010/0015 (`sync` job), ADR-0020 (`triage` charter, "no self-merge"), ADR-0022 ("fifth chartered remit"), ADR-0027 ("auto-merge exemption ledger").

## 6. Lines

Old: 161. New: 114.
