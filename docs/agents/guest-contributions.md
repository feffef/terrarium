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
   different harness/model (see ADR-0009's external-sessions amendment for the
   first concrete instance) — does the work on a fork and opens a PR. The house
   rules below are about this mode.

## Trust (ADR-0020)

A fork PR from a non-collaborator is **Public** — the absence of the `trusted`
label (the label's mechanics are single-homed in `docs/agents/issue-tracker.md`).
Public input is an untrusted, prompt-injection-capable surface, so the
**code-execution boundary stays at merge, which is human-only** (ADR-0020,
ADR-0011). By GitHub's own platform default for public repos, CI on a
first-time contributor's fork PR does not run until the owner approves the
workflow run — this needs no owner action unless the repo Setting has been
changed away from that default, which isn't verifiable from repo state
(`docs/research/public-readiness-review.md`'s "Addressed" note on ADR-0020).

## Before summarizing or recommending on a Public/guest-filed issue

Read `authorAssociation` on the issue as a **history** signal, not only the
Trusted/Public write-access split (`docs/agents/issue-tracker.md`'s
`authorAssociation` line) — `CONTRIBUTOR` already means "has had a PR merged
into this repo," and it's available in the very first tool response for the
issue. Search PRs authored by that user (e.g.
`mcp__github__search_pull_requests author:<user>` or equivalent) before
writing a summary — don't summarize a guest issue blind to what that author
has already built.

## Replying to a Public fork PR

Whether a human or an external agent wrote it, reply in a **friendly, encouraging**
tone: thank them, name what works, then treat every unmet rule as a fixable next
step, not a rejection. For each gap, name the rule, link its home, and show the
concrete change. For example:

> Thanks — the new Specimen reads great! Two small things before it can land:
> the session log needs `external: true` (ADR-0009 amendment) — just add that
> line to `layers/journal/content/current/sessions/<your-log>.yml`; and
> `pnpm validate:content` flags `slug: fern` in `food-web.yml` as unknown —
> did you mean `ferns`? Happy to help if anything's unclear.

## House rules for an external-agent fork PR

- **The session log rides *in the PR*.** An external session cannot use our
  direct-to-`main` session-log path (no `Stop` hook, no `main` push access —
  ADR-0009), so it commits its session log as an ordinary file in the feature
  PR — `layers/journal/content/current/sessions/<date>-session_<id>.yml` — which
  lands when the PR merges. This is the one sanctioned case of a session log
  travelling a PR (ADR-0009's 2026-07-22 amendment).
- **One honest log per unit of work — including revisions.** The session-log
  discipline is the *point* of the experiment, so it covers every distinct
  chunk of work, not only the first build. A session that revises the PR (a
  rebase, a review-driven fix) should **update the existing session log** (new
  frictions, changed outcome) or **add a second `external` log** for itself; a
  revision round that logs nothing is the gap we most want to avoid. If the
  external harness has no discrete, isolated sessions, **approximate this as
  closely as the setup allows** — the goal is honest coverage, not mimicking our
  mechanics.
- **Mark it `external: true`.** The session log's `external` flag (ADR-0009
  amendment) declares a foreign toolchain — see `CONTEXT.md`'s **Session** term
  for the absent-⇒-internal semantics.
- **Self-improvement mining ignores it; ideas still surface.** See `CONTEXT.md`'s
  **Session** glossary term for the exact mining-exclusion and idea-surfacing
  behavior (ADR-0009 amendment, 2026-07-22).
- **Provenance marker (ADR-0017)** on every agent-authored GitHub interaction,
  the same marker we use.
- **Merge is human-only.** A fork PR is Public; the owner reviews and merges by
  hand — no auto-merge (ADR-0020, ADR-0003, ADR-0004).

## See also

- **ADR-0020** — requester-trust tiers (Trusted / Public).
- **ADR-0009** — session logs: direct-to-`main` for our own sessions; the
  2026-07-22 amendment for external marking, mining-exclusion, and in-PR
  delivery.
- **ADR-0023** — guest-driven demo pipeline; the `guest-intake` / `guest-build`
  Skills.
- **ADR-0017** — provenance header/trailer on agent-authored content.
- `docs/agents/issue-tracker.md` — how external PRs enter the triage queue
  (the `gh pr list` filter; ADR-0020 lists the `authorAssociation` values).
