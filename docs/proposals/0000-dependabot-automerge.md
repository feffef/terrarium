# Dependabot auto-merge workflow

## Origin

This PR (Dependabot config + ADR-0003 ledger row `dependabot`), requested by the
repo owner in session `session_01QrvPXx1uquc4vvjJXhz1MU`.

## Target

New file `.github/workflows/dependabot-automerge.yml`:

```yaml
# Merges a Dependabot npm minor/patch PR once safety-gate is green on its head
# (ADR-0003 ledger row `dependabot`). workflow_run runs this file from main and
# never checks out PR code, so the ADR-0020 fork-approval concern does not
# apply: the PR author must be dependabot[bot] on a same-repo branch.
name: dependabot-automerge

on:
  workflow_run:
    workflows: [safety-gate]
    types: [completed]

permissions:
  contents: write
  pull-requests: write

jobs:
  merge:
    if: >-
      github.event.workflow_run.conclusion == 'success' &&
      github.event.workflow_run.event == 'pull_request' &&
      github.event.workflow_run.head_repository.full_name == github.repository &&
      startsWith(github.event.workflow_run.head_branch, 'dependabot/npm_and_yarn/')
    runs-on: ubuntu-latest
    steps:
      - name: Merge if eligible
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          REPO: ${{ github.repository }}
          HEAD_SHA: ${{ github.event.workflow_run.head_sha }}
          HEAD_BRANCH: ${{ github.event.workflow_run.head_branch }}
        run: |
          set -euo pipefail
          skip() { echo "skip: $1"; exit 0; }

          pr=$(gh api "repos/$REPO/pulls?state=open&head=${REPO%%/*}:$HEAD_BRANCH" \
            --jq ".[] | select(.user.login == \"dependabot[bot]\" and .head.sha == \"$HEAD_SHA\") | .number")
          [ -n "$pr" ] || skip "no open Dependabot PR at $HEAD_SHA"

          [ -z "$(gh api "repos/$REPO/pulls/$pr/commits" --paginate \
            --jq '.[] | select(.author.login != "dependabot[bot]") | .sha')" ] \
            || skip "#$pr has non-Dependabot commits"

          [ -z "$(gh api "repos/$REPO/pulls/$pr/files" --paginate --jq '.[].filename' \
            | grep -vxE 'package\.json|pnpm-lock\.yaml' || true)" ] \
            || skip "#$pr touches files beyond package.json/pnpm-lock.yaml"

          types=$(gh api "repos/$REPO/pulls/$pr/commits" --paginate --jq '.[].commit.message' \
            | grep -oE 'update-type: version-update:semver-[a-z]+' | sort -u)
          [ -n "$types" ] || skip "#$pr has no update-type metadata"
          ! grep -qvE 'semver-(minor|patch)$' <<<"$types" || skip "#$pr is not minor/patch only"

          gh api -X PUT "repos/$REPO/pulls/$pr/merge" -f merge_method=merge -f sha="$HEAD_SHA"
```

## Rationale

`main` has no branch protection, so GitHub's native auto-merge cannot wait for
the gate. Triggering on `safety-gate`'s completion lets the merge happen only on
a green gate for that exact head SHA. The checks mirror the ledger row's scope:
author, commit authorship, files touched, and the `update-type` metadata
Dependabot writes into each commit message (the same source
`dependabot/fetch-metadata` parses). The 3-day minimum age comes from
`cooldown` in `.github/dependabot.yml`; security updates skip cooldown by design.

A merge made with `GITHUB_TOKEN` does not trigger `safety-gate`'s `push` run on
`main`. The PR's own gate run already covered the merged head.

## Companion change

The PR that adds `.github/dependabot.yml` and the ADR-0003 ledger row. Apply
both in the same sitting: without this workflow, Dependabot PRs just wait for a
human.
