# 4. Objective safety gate for agent PRs

Date: 2026-07-04
Status: Accepted

> **Amended (2026-07-06).** The high-risk (always human-only) set is extended
> beyond the path-based blast-radius to two axes a path classifier can't see: a PR
> that **introduces a new dependency**, or that **changes untested/untestable
> runtime behaviour** (no gate layer can vouch for it). An agent reviewer
> (ADR-0003) escalates these to a human even when the gate is green and the
> surface is otherwise low-risk.

> **Amended (2026-07-10).** The Decision's "generator" terminology below is
> stale: [ADR-0013](0013-dynamic-content-config-committed-routing-map.md) made
> `content.config.ts` an ordinary, hand-editable module (no generator produces
> it), and [ADR-0014](0014-build-time-virtual-routing-module.md) deleted
> `scripts/generate.ts` entirely — no "generator" exists anymore. Read the L0
> bullet's "the generator produces `content.config.ts`", the Auto-merge
> eligibility "generator, routing" phrase, and the Consequences' "generator
> bug"/"generator/routing/isolation/CI" mentions below as historical framing
> from before that split. The current human-only surface is named explicitly
> in CLAUDE.md's Ground rules: `content.config.ts`, `shared/expand.ts`,
> `modules/routing.ts`, `shared/routing.ts`, isolation logic, CI, and
> governance/ADRs.

> **Amended (2026-07-07).** *Where the gate's tests live, as the Platform grows.*
> A test is **homed with the code it exercises**: a Tenant-specific test lives in
> that layer under `layers/<tenant>/tests/`; a Platform test (exercising
> `shared/`, `scripts/`, `modules/`, routing, isolation) lives in the root
> `tests/`. This keeps "which tests are this Tenant's vs. global" legible and lets
> the suite grow additively with each spawned Tenant.
>
> **L2 (smoke render) stays a SINGLE Nuxt build regardless of Tenant count.** The
> `@nuxt/test-utils` `setup()` that L2 needs performs a full `nuxt build`, and
> vitest isolates each *spec file* into its own worker — so every additional e2e
> `*.spec.ts` re-runs `setup()` and pays for another build, multiplying the gate's
> slowest step per Tenant. Therefore the L2 gate is **one** platform smoke spec
> (`tests/e2e/smoke.spec.ts`, owner of the sole `setup()`), and each Tenant's
> L2 assertions are contributed as an imported `register…()` **module**
> (`layers/<tenant>/tests/e2e/*.e2e.ts`, not a `.spec.ts`) that the smoke spec
> invokes inside its single `describe`. This is the surprising, deliberately
> not-to-be-"cleaned-up" shape: splitting tenant assertions back into sibling
> spec files is the exact regression this records against. (The cross-Tenant
> entry-route sweep, derived from the manifests per ADR-0014, stays in the
> platform spec and covers every Tenant uniformly.) L0/L1/L3 tests have no such
> per-file build cost and are simply homed per the rule above.

> **Amended (2026-07-11).** The L1 bullet's premise below — "free with Nuxt
> Content Zod schemas — invalid frontmatter fails the build" — is false. Verified
> against the installed `@nuxt/content` source (see
> `docs/research/nuxt-content-review-grounding.md` §2): Nuxt Content 3 never
> calls `safeParse` (or any schema validation) in its parse/insert pipeline;
> Collection schemas only derive SQL column types, wrong-typed frontmatter is
> coerced, and an unparseable file is warn-skipped, not build-failed. `pnpm
> build` therefore validates nothing. L1 is instead enforced by
> `scripts/validate-content.ts` (`pnpm validate:content`), the only thing that
> runs Documents through the Collection Zod schemas via `.safeParse()`. It is
> now wired into both the `gate` script in `package.json` and
> `.github/workflows/gate.yml` (a dedicated `'L1 · content validation'` step),
> and the workflow's former `'L0/L1 · build + content validation'` step is
> renamed `'L0 · build'` to match. The Decision that an L1 layer exists is
> unchanged — only the mechanism note above is corrected.

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
