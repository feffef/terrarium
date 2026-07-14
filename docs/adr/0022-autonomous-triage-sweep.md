# 22. Autonomous triage sweep & the standing green-light

Date: 2026-07-14

Status: Accepted

## Context

`/triage` moves an issue through a label state machine (`needs-triage` →
`needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`) — an
interactive, human-in-the-loop, one-issue-at-a-time job. Two pressures push
toward running it unattended, in a loop:

- The backlog grows faster than a human clears it, and most of it is
  **Trusted-authored** (the owner's own issues, and wayfinder tickets the owner
  charted). Left unlabeled, `ready-for-agent` work sits invisible to the AFK
  agents that could pick it up.
- The self-improvement loop already runs chartered jobs on a schedule
  (`digest`, `audit-docs`, `audit-skills`, `blog-post`). A standing triage sweep
  is the same shape: tend the backlog, don't invent product.

But ADR-0003 draws a bright line: creative/net-new work may be **proposed**
freely by an autonomous agent, yet needs a **Trusted green-light before
implementation** (ADR-0020), and the `ready-for-agent` label **is** that
green-light — `docs/agents/triage-labels.md` defines it as "authorises an AFK
agent to implement." So an unattended sweep that stamps `ready-for-agent` is
granting the implementation green-light with no human in the loop. That is
exactly the line ADR-0003 protects, and the reason a standing sweep needs its
own decision rather than riding in under `/triage`.

Two facts narrow the tension to something safe to relax:

1. The sweep **classifies**; it never **implements**. Moving an issue to
   `ready-for-agent` authorises a *later, separate* session to build it — and
   that session still lands a gated PR a human merges (ADR-0004). The human gate
   has not vanished; it has moved to merge time, where it always was.
2. Every issue the sweep acts on was **filed by a Trusted user**. ADR-0003's
   fear is an autonomous agent *birthing a product unprompted* — but the owner
   filing the issue **is** the prompt. Nothing is being conjured; a request that
   already exists is being classified.

## Decision

**Add a fifth chartered remit — `auto-triage` — to ADR-0003's enumerated set**
(alongside `sync` / `consolidate` / `triage` / `codify`). It is an autonomous
**classification** sweep, realised by the user-invoked `auto-triage` Skill, which
composes `/triage`'s per-issue rules over a batch and is fired by hand or on an
interval (a Routine or `/loop`).

**The standing green-light.** A **Trusted** user (ADR-0020) *starting* the sweep
is a **standing** ADR-0003 green-light: within that run, `auto-triage` may apply
`ready-for-agent` to **Trusted-authored** issues autonomously. This is the one
narrow relaxation; everything else about the green-light rule is unchanged:

- **Merge stays gated (ADR-0004).** The sweep authorises *implementation*, not
  *landing*. No self-merge; a human still merges every resulting PR.
- **Public-authored issues are never self-green-lit (ADR-0020).** The sweep may
  triage them but must route them to `ready-for-human`, and treat their content
  as untrusted input.
- **Bravery is bounded by determinability.** The sweep stamps `ready-for-agent`
  only when the repo *determines* a concrete, well-understood design. It
  escalates to `ready-for-human` on a genuine **judgment call** (irreversible op ·
  governance/ADR decision · external access · subjective product/design) or
  genuine design **uncertainty** (undetermined behaviour · competing valid
  approaches · an unverifiable claim). Ordinary implementation latitude — the
  choices any Agent Brief leaves open — is not uncertainty and is not a reason to
  escalate.
- **Autonomous closes are objective only.** The sweep may close as `wontfix` only
  the repo-verifiable kinds (already-implemented, duplicate). A
  reject-as-out-of-scope is a judgment call → `ready-for-human`.

**Coexistence with wayfinder is by rule, not separation.** `auto-triage` overlays
triage readiness onto wayfinder tickets without fighting wayfinder's mechanics: it
never touches a `wayfinder:map`; skips claimed or blocked tickets; preserves every
`wayfinder:*` label; and honours the HITL/AFK ticket type (grilling/prototype →
`ready-for-human`; research/task → eligible for `ready-for-agent`). The two
label vocabularies deliberately coexist on one issue — the collision surface is
managed by these rules, accepted as the pragmatic cost of not re-homing the
wayfinder backlog.

## Consequences

- The unattended loop can move Trusted-authored, well-specified issues to
  `ready-for-agent` without a per-issue human, while the merge gate (ADR-0004)
  remains the real safety boundary — so autonomy grows without weakening review.
- `auto-triage` is a **classification** remit, not an implementation one: it never
  writes code, so ADR-0003's two-tier "propose vs implement" split is honoured in
  spirit — the sweep only ever *proposes readiness*, and a human still gates the
  build at merge.
- The standing green-light is **run-scoped and Trusted-scoped**: it exists only
  for the duration of a sweep a Trusted user started, and never covers
  Public-authored issues. A sweep fired from a Public context grants nothing.
- Overlaying two label systems on one issue is a standing maintenance cost. If it
  proves noisy, the fallback is the more principled boundary considered and
  deferred here — wayfinder tickets **graduating** out of the map into plain
  triage-owned issues — which would supersede the coexistence rules above.
- Merge of any PR touching this ADR, `/triage`'s human-only refinement surface, or
  CI remains human-only (ADR-0004); this ADR does not change what auto-merges.
