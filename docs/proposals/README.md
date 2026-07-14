# Workflow-change proposals

## Purpose

Agent sessions cannot push `.github/workflows/*` files — they lack the
`workflow` OAuth scope (ADR-0004). Without a defined handoff, an agent hitting
a needed workflow-file change either leaves it as unstructured prose in a PR
or issue body, or tries to push it and fails. Neither gives a human a
consistent place to look for "what workflow edit is pending."

This directory is that handoff. When an agent's work implies a change to a
workflow file, it writes the intended change here instead — a human reads the
proposal and applies it by hand. See CLAUDE.md's "Working conventions" for
the rule directing agents here, including the companion-change discipline for
when a proposal must land alongside a specific agent PR.

## File format

One file per proposed workflow change: `docs/proposals/NNN-short-slug.md`,
where `NNN` is the originating issue or PR number and `short-slug` is a brief
kebab-case description (e.g. `323-l1-content-validation-step.md`).

Each proposal file must contain:

1. **Origin** — a pointer back to the originating PR/issue (`#NNN`).
2. **Target** — the exact workflow file path the change applies to (e.g.
   `.github/workflows/gate.yml`), plus the proposed diff or full new content.
3. **Rationale** — why the change is needed.
4. **Companion change** — which agent PR (if any) this workflow edit must be
   applied *alongside*, so the human applying it merges both in the same
   sitting rather than landing one and leaving the other pending. State
   "none" if the proposal stands alone.

A human applies the proposal by hand-editing the target workflow file and,
once landed, deletes (or marks resolved) the proposal file in the same
commit — this directory tracks *pending* proposals, not a permanent archive.
