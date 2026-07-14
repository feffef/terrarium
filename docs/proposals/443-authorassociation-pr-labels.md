# Proposal: label every PR `trusted`/`public` by `author_association`

## Origin

`#443`. Relates to ADR-0020 (`docs/adr/0020-requester-trust-tiers.md`), which
lists this exact CI job as a *"possible future mechanical aid (not required by
this ADR)"* — a check that "auto-labels each PR by `authorAssociation`, making
the Trusted/Public split visible on every PR rather than convention-only."
Also relates to the public-readiness gap tracked in `#213`.

## Target

A new workflow file: **`.github/workflows/pr-authorassociation-label.yml`**.

**Why a new file, not a job added to `gate.yml`**: `gate.yml` is the safety
gate — a single required check that must go green to merge (ADR-0004). This
labeling job is informational, not a merge gate, has a different trigger
shape (`pull_request` `opened`/`reopened` vs. `gate.yml`'s every-push/PR
trigger), and a failure in it (e.g. the `trusted`/`public` labels don't exist
yet — see Companion change) should never block or muddy the safety gate's own
pass/fail signal. Keeping it a separate, non-required workflow follows
`gate.yml`'s own precedent of a narrowly-scoped, single-purpose job (its
"Doorbell" step already shows the house style of shelling out to `gh`
directly rather than reaching for a marketplace action).

### Trigger: `pull_request`, not `pull_request_target` — and why

ADR-0020 is explicit and non-negotiable on this point:

> **Require approval to run fork-PR workflows** for all outside contributors
> (Actions setting) — so untrusted code never executes in CI without a
> Trusted user's click. (Note `pull_request_target`/`workflow_run` bypass
> this — the repo must keep using plain `pull_request`; see
> `docs/research/making-repo-public.md`.)

`pull_request_target` always runs — regardless of the "require approval for
fork PR workflows" Actions setting — because it executes in the trusted
base-branch context rather than the PR's own context. That is precisely the
property ADR-0020 rejects for this repo: it wants **every** fork-PR-triggered
workflow run, this one included, to require a maintainer's one-time
approval-click before it runs at all, not just workflows that check out and
execute fork code. `docs/research/making-repo-public.md` §3 independently
confirms this is GitHub's own documented "pwn request" risk category, and its
own guidance is "use plain `pull_request` instead if you don't need secrets."

This job doesn't need secrets or fork code — it only reads
`github.event.pull_request.author_association` (part of the trigger payload,
available on `pull_request` exactly as on `pull_request_target`) and writes a
label via `gh pr edit`. So there is no capability this job would gain from
`pull_request_target` that it actually needs; the only thing `pull_request_target`
would buy is bypassing the approval gate ADR-0020 specifically wants kept in
place. `pull_request` is therefore the correct trigger, not a compromise.

**Known consequence of that choice, to flag for the human, not to silently
paper over**: GitHub hardcodes the `GITHUB_TOKEN` to **read-only** for
`pull_request` runs triggered by a fork PR, regardless of the `permissions:`
block below — a repo-level opt-in ("Send write tokens to workflows from fork
pull requests," Settings → Actions → General → Workflow permissions) is
required before this job can actually write a label on a fork-originated
(Public) PR. That setting has its own risk: because `pull_request` sources
the *workflow file itself* from the PR branch, a malicious fork author could
edit this very file to abuse a granted write token. Two things bound that
risk if the human chooses to enable it: (1) the fork-PR-approval gate ADR-0020
already requires stays in front of every run, including a run of a
fork-modified copy of this file, so a maintainer reviews before anything
executes; (2) this job is deliberately minimal — one `gh pr edit` call, no
external actions, nothing that touches secrets beyond `GITHUB_TOKEN` itself —
so a modified copy is easy to eyeball at approval time. Today the repo is
still private (per `docs/research/public-readiness-review.md`'s framing), so
every PR is same-repo-branch and the token is write-capable out of the box;
this only becomes live once the repo goes public and forks appear. The human
applying this proposal should decide the write-token setting deliberately at
that point rather than have this proposal decide it for them.

### Enum → Trusted/Public mapping

Verified directly against **ADR-0020**'s Decision section as it reads on
`main` as of this proposal: *"the signal is `authorAssociation`: `OWNER`,
`MEMBER`, and `COLLABORATOR` are Trusted; `CONTRIBUTOR`,
`FIRST_TIME_CONTRIBUTOR`, `FIRST_TIMER`, `MANNEQUIN`, and `NONE` are
Public."* That is the complete 8-value `author_association` enum GitHub
exposes, fully partitioned between the two tiers — ADR-0020 was amended to
add `FIRST_TIMER`/`MANNEQUIN` to the Public list in PR `#437`, merged just
before this proposal was authored (confirmed by reading the live file, not
by memory or by `docs/agents/issue-tracker.md`'s own note, which still
describes that widening as "pending an ADR-0020 amendment" — that note is
now stale relative to `#437` having landed, but fixing it is outside this
proposal's scope).

The workflow below doesn't need to enumerate the Public side at all: it
matches only the **Trusted** set (`OWNER`, `MEMBER`, `COLLABORATOR`) and
defaults every other value to Public via a catch-all case. That already
covers `FIRST_TIME_CONTRIBUTOR`, `FIRST_TIMER`, `MANNEQUIN`, `CONTRIBUTOR`,
`NONE`, and any future `author_association` value GitHub might add, with no
enumeration to keep in sync as the enum evolves.

### Full proposed workflow YAML

```yaml
# ADR-0020 mechanical aid: labels each PR `trusted` or `public` from
# GitHub's own `author_association`, making the write-access split visible
# without reading it off collaborator settings by hand. See issue #443 /
# #213 and ADR-0020's "possible future mechanical aid" note.
#
# Trigger is plain `pull_request`, never `pull_request_target` — ADR-0020
# requires `pull_request` for fork-PR workflows specifically because
# `pull_request_target` bypasses the "require approval to run fork PR
# workflows" Actions setting (it always runs, unlike `pull_request`); see
# docs/research/making-repo-public.md §3. This job never checks out PR
# code, so it needs none of `pull_request_target`'s privileged base-branch
# execution context — see docs/proposals/443-authorassociation-pr-labels.md
# for the full trade-off this trigger choice implies for fork PRs.

name: pr-authorassociation-label

on:
  pull_request:
    types: [opened, reopened]

permissions:
  contents: read
  issues: write
  pull-requests: write

jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - name: 'Label trusted/public by author_association'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          ASSOCIATION: ${{ github.event.pull_request.author_association }}
          PR: ${{ github.event.pull_request.number }}
          REPO: ${{ github.repository }}
        run: |
          # Trusted: OWNER, MEMBER, COLLABORATOR (write access — ADR-0020).
          # Everything else (CONTRIBUTOR, FIRST_TIME_CONTRIBUTOR,
          # FIRST_TIMER, MANNEQUIN, NONE, ...) defaults to public — see
          # docs/agents/issue-tracker.md and ADR-0020's pending amendment.
          case "$ASSOCIATION" in
            OWNER|MEMBER|COLLABORATOR)
              add=trusted; remove=public ;;
            *)
              add=public; remove=trusted ;;
          esac
          gh pr edit "$PR" -R "$REPO" --add-label "$add" --remove-label "$remove"
```

**`permissions:` rationale**: labels on a PR are mutated through GitHub's
Issues API surface even though the target is a pull request (a PR *is* an
issue under the hood for labeling purposes), so both `issues: write` and
`pull-requests: write` are requested — the former is what the labels
endpoint's own permission table names, the latter is what `gh pr edit`'s
other PR-editing capability needs generically. `contents: read` is the
workflow-default floor, included explicitly rather than left implicit.

**Why `opened`/`reopened` only, not `synchronize`**: `author_association` is
fixed at PR-creation time in the overwhelming common case (it only shifts if
someone's collaborator status changes mid-PR, which is rare and already
forces a `reopened`-style re-look in practice). Triggering on every push
(`synchronize`) would run this on every commit for no benefit; `opened` +
`reopened` covers the cases where the label can actually change. A
`workflow_dispatch` trigger could be added later as a manual re-run escape
hatch if staleness ever becomes a real problem — omitted here to keep the
proposal minimal.

## Rationale

ADR-0020 draws a hard behavioral line between Trusted and Public PR authors —
human-only merge for Public-originated PRs, no auto-merge, genuine security
review of executable code — but today that line is enforced entirely by
convention: an agent (or a human reviewer) has to remember to check
`author_association` by hand before applying it. ADR-0020 names exactly this
job as a way to make the split "visible on every PR rather than
convention-only," and `#213` is the broader public-readiness tracker this
falls under. A visible `trusted`/`public` label on every PR turns an easy-to-
skip mental check into something any reviewer (or another workflow) can read
at a glance, and gives a durable, queryable record of which tier a PR landed
in, without changing any of ADR-0020's actual policy.

## Companion change

None — this proposal stands alone; no other agent PR needs to land alongside
it.

Two things a human must do by hand when applying this proposal, since
neither is itself a code change this repo can gate:

1. **Create the two labels** this job applies — `trusted` and `public` — in
   the repository's label settings before (or in the same sitting as) merging
   the workflow file. `gh pr edit --add-label` errors on a label name that
   doesn't exist as a repo label yet, so the job will fail on every PR until
   these exist. Colors/descriptions are a human call; this proposal doesn't
   prescribe them.
2. **Apply the workflow file itself by hand.** `.github/workflows/*` is a
   human-only surface — agent sessions have no `workflow` OAuth scope
   (ADR-0004) and cannot push it, which is why this is a proposal file and
   not a pushed change. Once applied, delete (or mark resolved) this file in
   the same commit per `docs/proposals/README.md`'s discipline — this
   directory tracks pending proposals, not a permanent archive.
