# 4. Objective safety gate for agent PRs

Date: 2026-07-04
Status: Accepted

> **Amended (2026-07-06).** The high-risk (always human-only) set is extended
> beyond the path-based blast-radius to two axes a path classifier can't see: a PR
> that **introduces a new dependency**, or that **changes untested/untestable
> runtime behaviour** (no gate layer can vouch for it). An agent reviewer
> (ADR-0003) escalates these to a human even when the gate is green and the
> surface is otherwise low-risk.

## Context

Both the human reviewer (now) and the scheduled review-agent (mid-term, ADR-0003)
need the *same* objective signals to trust an agent-authored PR. Autonomous
agents modifying a self-modifying system make automated verification
non-optional — it is the net that makes autonomy tolerable. (This is the one
place the project deliberately does **not** apply "KISS/skip it": everything else
may be minimal, CI may not.)

## Decision

**Layered gate, cheapest-first. Every PR must clear it.**
- **L0 — Manifest valid + generates + builds.** Every `tenant.config.ts`
  validates against the manifest schema; the generator produces
  `content.config.ts`; `nuxt build` succeeds; typecheck + lint pass.
- **L1 — Content validates against Collection schemas.** Invalid frontmatter
  fails the build (free with Nuxt Content Zod schemas — schemas should be
  strict).
- **L2 — Smoke render.** Every `(Tenant, Space)` entry route returns 200 with no
  console errors (Playwright).
- **L3 — Isolation invariant.** A query scoped to `(tenant=A, space=S)` never
  returns another Tenant's or Space's Documents; generated collection keys are
  unique and correctly scoped. Guards the core promise of the Platform.

**Rollout:** L0 + L1 + L3 from day one (L0/L1 nearly free; L3 guards the core
invariant against subtle generator bugs agents may introduce). L2 as soon as
there is anything to render.

**Auto-merge eligibility (mid-term review-agent) = green gate AND blast-radius
policy.** Risk is a function of *what the PR touches*, not judgement:
- **Low-risk (auto-mergeable when green):** content only, or a single Tenant's
  layer/manifest.
- **High-risk (human-only, always):** the generator, routing, isolation logic,
  CI itself, or governance/ADRs.

## Consequences

- Strict Collection schemas do double duty: content contract + free L1
  validation. Worth the up-front rigor.
- The isolation test (L3) is bespoke and must exist before autonomous
  consolidation runs, because a generator bug could silently cross-wire Spaces.
- The blast-radius policy needs a reliable path-based classifier (which globs are
  "generator/routing/isolation/CI"). That classification is itself high-risk and
  human-owned.
