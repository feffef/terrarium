# 8. The self-documentation Tenant is a Journal

Date: 2026-07-04
Status: Accepted

## Context

The Platform hosts one Tenant that documents itself. ADR-0003 called it the
"living-documentation Tenant / status report" and framed its content as **derived
from repo ground truth** by the `sync` job — a current-state readout (inventory,
CI/drift health, the Skill catalogue).

Designing the next content types for it changed that picture. The most valuable
content is a per-session **self-report**: what a session discussed and
implemented, which docs it read, which Skills it used, and — most importantly —
where it hit friction or wasted effort. Add research write-ups and nascent ideas,
and the shared shape is clear: this is **primary, append-only, agent-authored**
content that accumulates over time. That is the opposite of a derived,
overwritten status snapshot. "Status" mislabels what is really a logbook.

## Decision

Name this Tenant **`journal`** (retiring the "Living Documentation" term). It
holds two kinds of content:

- **Inventories** — curated/derived current-state readouts (the Skill catalogue
  today; the Tenant/Space inventory and CI/drift health later, via `sync`).
- **Journal entries** — primary, append-only records the agents author
  themselves: session logs, research, and ideas (forthcoming).

The journal entries are honest self-reports and the primary signal the
self-improvement jobs (`consolidate`, `codify`) mine for recurring friction — the
mechanism by which the Platform improves itself. The slug, generated collection
keys (`journal_<space>_<collection>`), and routes (`/t/journal/…`) follow the
name. Spaces remain `current` / `archived`.

The `sessions` schema, the authoring mechanism (a `log-session` platform-operation
Skill, later backed by a `Stop` hook), and the open question of *how a session
commits its own log* are deferred to a follow-up issue and PR.

## Consequences

- `CONTEXT.md`'s glossary entry becomes **Journal**. Historical ADRs keep their
  original "living-documentation" wording as the record of the time; this ADR
  supersedes that framing.
- The "derived from repo ground truth" description (ADR-0003) is no longer the
  whole story. The Agent Authorship distinction between *authored* and *derived*
  content now maps directly onto journal entries vs. inventories.
- Introducing primary self-authored content is what makes the self-improvement
  loop possible, but it also means not all of this Tenant's content can be
  regenerated — session logs are ground truth, not a projection of it.
- The rename touches generated keys and routes; cheap now, stickier once external
  links exist.
