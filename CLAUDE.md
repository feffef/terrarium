# CLAUDE.md

Guidance for Claude Code agents working in this repo. Terrarium is developed
**mostly by agents** — you are a first-class contributor here, not a bystander.

## Read these first

- **`CONTEXT.md`** — the domain model and ubiquitous language. Use these exact
  terms (Platform, Tenant, Space, Collection, Document, Skill, …). If you catch
  yourself using a word that conflicts with the glossary, stop and reconcile it.
- **`docs/adr/`** — Architecture Decision Records. Every structural decision and
  its rationale lives here. **Read the relevant ADR before changing anything
  structural**, and add a new ADR when you make a decision that is hard to
  reverse, surprising without context, and the result of a real trade-off.

## Ground rules (from the ADRs)

- One repo, one container, build-time-baked; nothing is created at runtime
  (ADR-0001).
- Agents edit a Tenant's **manifest** (declarative intent); a generator produces
  `content.config.ts`. Don't hand-write the keyed collection cross-product
  (ADR-0002).
- Every change lands as a **gated PR** on a feature branch — no self-merge.
  Autonomy may *propose* freely but *implements* net-new only on human
  green-light (ADR-0003).
- All work must clear the **safety gate** (build/validate/isolation, ADR-0004).
  The generator, routing, isolation logic, and CI are **human-only** — never
  auto-merge changes touching them.
- **Skills** are generic, repo-committed, and first-class (ADR-0005).

## Status

Milestone 1 (foundation) exists: manifest → generator → gated-render pipeline for
one Tenant (`status`) with two Spaces and two Collections; full safety gate green
(see README "Layout"/"Commands", and ADR-0006/0007). Still deferred: more Tenants,
Skills, and the autonomous jobs. Consult the ADRs for what is decided vs.
deliberately left open before building.
