# Proposals

## Purpose

The handoff for a change an agent can't apply itself: a `.github/workflows/*`
edit, or a repository setting such as a ruleset (why:
`docs/agents/environment-caveats.md`). An agent writes the intended change here;
a human applies it by hand. This README owns the format and discipline below.

## File format

One file per proposed change: `docs/proposals/NNN-short-slug.md`,
where `NNN` is the originating issue or PR number and `short-slug` is a brief
kebab-case description (e.g. `323-l1-content-validation-step.md`).

Each proposal file must contain:

1. **Origin** — a pointer back to the originating PR/issue (`#NNN`).
2. **Target** — the exact workflow file path the change applies to (e.g.
   `.github/workflows/gate.yml`), plus the proposed diff or full new content;
   for a repository setting, the settings page and the exact API call.
3. **Rationale** — why the change is needed.
4. **Companion change** — which agent PR (if any) this change must be
   applied *alongside* (see the discipline below). State "none" if the
   proposal stands alone.

## Companion-change discipline

When a change needs both an agent-authored edit and a companion workflow edit,
the two are applied **together** — the human applies the workflow half and
merges the agent's PR in the same sitting, not the agent half first and the
workflow half later. ADR-0004 records the cost of drifting apart: the `validate:content` step reached `package.json` by agent PR before its `gate.yml` step landed, so CI ran a stale subset of `pnpm gate` meanwhile.

A human applies the proposal by hand (editing the workflow file, or making
the setting) and,
once landed, deletes (or marks resolved) the proposal file in the same
commit — this directory tracks *pending* proposals, not a permanent archive.

## Superseding a pending proposal

A proposal that a later proposal replaces must say so on its own file, not rely on readers noticing the contradiction — three pending proposals once silently disagreed, one still telling a human to do what a later one would undo (issue #890). Whoever adds the superseding proposal adds, in the same PR, a banner as the **first line** of the superseded file's body naming the replacement:

```
> **Superseded by [`docs/proposals/NNN-new-slug.md`](./NNN-new-slug.md).**
```

The superseded file otherwise stays as-is — this is an announcement, not a
rewrite of its historical content — until a human applies or deletes it.
