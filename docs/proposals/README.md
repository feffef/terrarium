# Workflow-change proposals

## Purpose

This directory is the handoff for a `.github/workflows/*` change an agent
can't push itself: agent sessions lack the `workflow` OAuth scope (ADR-0004),
so they cannot push workflow files directly. Without a defined handoff, such a
change would sit as unstructured prose in a PR or issue body, with no
consistent place for a human to find "what workflow edit is pending." An agent
writes the intended change here instead; a human reads it and applies it by
hand. (CLAUDE.md's "Working conventions" carries the one-line rule that routes
agents here; this README is the home for the format and the discipline below.)

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
   applied *alongside* (see the discipline below). State "none" if the
   proposal stands alone.

## Companion-change discipline

When a change needs both an agent-authored edit and a companion workflow edit,
the two are applied **together** — the human applies the workflow half and
merges the agent's PR in the same sitting, not the agent half first and the
workflow half later. ADR-0004 records what drifting apart costs: the L1
`validate:content` step landed in `package.json` via an agent PR while the
matching `gate.yml` step needed a separate human edit, so CI ran a stale
subset of `pnpm gate` in the interim.

A human applies the proposal by hand-editing the target workflow file and,
once landed, deletes (or marks resolved) the proposal file in the same
commit — this directory tracks *pending* proposals, not a permanent archive.

## Superseding a pending proposal

A proposal that a later proposal replaces must say so on its own file, not
rely on a reader noticing the contradiction — three pending proposals once
silently disagreed with each other, with an earlier one still instructing a
human to do the thing the later one would undo (issue #890). Whoever adds the
superseding proposal adds, in the same PR, a banner as the **first line** of
the superseded file's body naming the replacement:

```
> **Superseded by [`docs/proposals/NNN-new-slug.md`](./NNN-new-slug.md).**
```

The superseded file otherwise stays as-is — this is an announcement, not a
rewrite of its historical content — until a human applies or deletes it.
