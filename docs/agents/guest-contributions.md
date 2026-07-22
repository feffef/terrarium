# Guest & external contributions

How the Platform handles contributions that originate **outside our own Claude
Code toolchain** — from non-collaborators (**Public** authors, ADR-0020) and
from external *agents* running on a different harness / model / environment.
This page is an **index + house rules**; the substance lives in the ADRs it
links, not here (single-home rule).

## Two distinct modes — don't conflate them

1. **Guest-driven demo pipeline (ADR-0023).** Invited Public users *file an
   issue*, and **our own** agents (`guest-intake` → `guest-build`) refine and
   build it into a gated PR. A demo-scoped, bounded exception to ADR-0020/0022,
   live only while the owner runs the loops. The guest never runs an agent — we
   do.
2. **External-agent fork PR.** An external contributor's *own* agent — a
   different harness/model (the first, on PR #631, ran on Grok via a "Hermes"
   harness) — does the work on a fork and opens a PR. The house rules below are
   about this mode.

## Trust (ADR-0020)

A fork PR from a non-collaborator is **Public** — the absence of the `trusted`
label. Public input is an untrusted, prompt-injection-capable surface, so the
**code-execution boundary stays at merge, which is human-only** (ADR-0020,
ADR-0011). CI on a first-time contributor's fork PR does not run until the owner
approves the workflow run.

## House rules for an external-agent fork PR

- **The session log rides *in the PR*.** An external session cannot use our
  direct-to-`main` session-log path (no `Stop` hook, no `main` push access —
  ADR-0009), so it commits its session log as an ordinary file in the feature
  PR — `layers/journal/content/current/sessions/<date>-session_<id>.yml` — which
  lands when the PR merges. This is the one sanctioned case of a session log
  travelling a PR (ADR-0009's 2026-07-22 amendment).
- **Mark it `external: true`.** The session log's `external` flag (ADR-0009
  amendment) declares a foreign toolchain. Absent ⇒ internal; our own sessions
  leave it absent.
- **Self-improvement mining ignores it; ideas still surface.**
  `frictions-to-fixes` and `audit-skills` exclude external sessions — their
  frictions and skill-usage reflect a toolchain our fixes can't touch — while
  the Sparks feed still surfaces their `ideas` and drops their `learnings`
  (ADR-0009 amendment). External sessions stay visible in the Timeline/dashboard
  record; only the mining excludes them.
- **Provenance footer (ADR-0017)** on every agent-authored GitHub interaction,
  the same two lines we use.
- **Merge is human-only.** A fork PR is Public; the owner reviews and merges by
  hand — no auto-merge (ADR-0020, ADR-0003, ADR-0004).

## See also

- **ADR-0020** — requester-trust tiers (Trusted / Public).
- **ADR-0009** — session logs: direct-to-`main` for our own sessions; the
  2026-07-22 amendment for external marking, mining-exclusion, and in-PR
  delivery.
- **ADR-0023** — guest-driven demo pipeline; the `guest-intake` / `guest-build`
  Skills.
- **ADR-0017** — provenance footer on agent-authored content.
- `docs/agents/issue-tracker.md` — how external PRs enter the triage queue
  (`authorAssociation` mechanics).
