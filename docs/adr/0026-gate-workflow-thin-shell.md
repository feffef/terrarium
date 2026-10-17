# ADR-0026: CI's gate steps live in an action that agents can push

The gate's CI steps live in the composite action
`.github/actions/gate/action.yml`, which agents can edit and push. The workflow
file `.github/workflows/gate.yml` only starts it. A test keeps the action's
steps equal to the gate scripts that run locally, and a human still merges any
change to either file.

## Scope

- **The action holds every step:** setup, install, deciding which steps may
  skip, the checks themselves, and the comment that tells a waiting session CI
  is green.
- **The workflow file holds only what cannot move:** triggers, permissions, the
  runner, the checkout, and the token the comment step needs. It changes only
  when triggers or permissions do. A cloud session cannot push it, so from
  there such a change goes to a human as a Proposal.
- **One step list, three copies, one test.** `package.json`'s `gate` script,
  `scripts/gate/gate.ts` and the action must run the same steps in the same order,
  with the same skip conditions. `tests/unit/gate-parity.spec.ts` fails when
  they differ. Change all three together.

## Why

Cloud sessions cannot push `.github/workflows/`: their token lacks GitHub's
`workflow` permission. A local session pushes with the owner's key, which has
it. The fence covers that folder only; `.github/actions/` is pushable. With
the steps in the workflow file, every gate change waited for a human to copy
YAML by hand.

The real cost was drift. A new check landed in `package.json` while its CI step
waited, so CI checked less than the local gate claimed. Nothing could detect
it, because the two halves sat on opposite sides of the push barrier. With
both halves pushable, the parity test can catch it.

Moving the steps opens no new hole. What CI runs was always defined by files
agents could push: `package.json` decides what `pnpm typecheck` means, and
`scripts/gate/gate.ts` decides which steps skip. CI also runs the PR's own copy of
every file. What protects the gate is a human reviewing the merge, and that
stays.

## Rejected alternatives

- **One CI step running `pnpm gate:scoped`.** The run summary would no longer
  name the check that failed. Its local habits are wrong in CI: it may run a
  plain `pnpm install` instead of a frozen one, and it finds its base by
  comparing with `main`, which is wrong for a PR into another branch.
- **Give cloud-session tokens the `workflow` permission.** It is not ours to
  grant. Nor is it needed: a human merging the workflow file is the control,
  and that holds for a local session too.
- **Keep setup and install in the workflow file.** Every Node, pnpm or install
  change would then need a human to apply it again.

## When to revisit

- A failing skip-decision or comment step ever turns the gate red, or skips a
  check. Both rely on `continue-on-error` working inside a composite action;
  re-test that first.
- A second workflow needs the same split.

## Consequences

- The parity test checks which steps run, not what they do. A `package.json`
  script emptied of its work still passes; catching that is the merge
  reviewer's job.

## See

- `scripts/gate/gate.ts`: the step lists and the skip decision CI asks for.
- `docs/agents/environment-caveats.md` and `scripts/hooks/workflow-edit-guard.ts`:
  why and how a cloud session's workflow edit is stopped before it is
  committed.
- `docs/proposals/README.md`: how to hand a workflow change to a human.
