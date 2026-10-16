# Proposals

## Purpose

The handoff for a change an agent can't apply itself: a `.github/workflows/*`
edit, or a repository setting such as a ruleset (why:
`docs/agents/environment-caveats.md`). An agent writes the intended change here;
a human applies it by hand.

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
4. **Companion change** — the agent PR (if any) this change must be
   applied *alongside* (see below); otherwise "none".

## Companion-change discipline

When a change needs both an agent-authored edit and a companion workflow edit,
the two are applied **together**: the human applies the workflow half and
merges the agent's PR in the same sitting, never the agent half first. ADR-0026 records the cost of drifting apart: CI ran a stale subset of `pnpm gate`.

A human applies the proposal by hand (editing the workflow file, or making the setting) and, once landed, deletes the proposal file in the same commit; this directory tracks only *pending* proposals.

## Superseding a pending proposal

A superseded proposal must say so on its own file, or readers miss the contradiction (issue #890). The PR that adds the superseding proposal also adds, as the **first line** of the superseded file's body, a banner naming the replacement:

```
> **Superseded by [`docs/proposals/NNN-new-slug.md`](./NNN-new-slug.md).**
```

The superseded file otherwise stays as-is until a human applies or deletes it.
