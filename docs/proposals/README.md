# Workflow-change proposals

## Purpose

This directory is the handoff for a `.github/workflows/*` change an agent
can't push itself — CLAUDE.md's "Working conventions" holds the rule that
routes agents here and the reason they can't push (ADR-0004), plus the
companion-change discipline for when a proposal must land alongside a specific
agent PR. Without a defined handoff, such a change would sit as unstructured
prose in a PR or issue body, with no consistent place for a human to find
"what workflow edit is pending." An agent writes the intended change here
instead; a human reads it and applies it by hand.

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
