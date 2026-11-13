# Path-based `area:` labels on PRs

## Origin

Issue #3243.

## Target

New file `.github/workflows/pr-area-label.yml`:

```yaml
# Issue #3243: labels a PR `area:<tenant>` for each Tenant whose layer it
# changes, so issues and PRs filter by the same labels. A PR touching no
# Tenant's paths gets none. Same-repo PRs only and plain `pull_request`, for
# the reasons in pr-authorassociation-label.yml (a fork gets a read-only token).

name: pr-area-label

on:
  pull_request:
    types: [opened, reopened, synchronize]

permissions:
  contents: read
  issues: write
  pull-requests: write

jobs:
  label:
    if: github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-latest
    steps:
      - name: 'Label by changed paths'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR: ${{ github.event.pull_request.number }}
          REPO: ${{ github.repository }}
        run: |
          gh pr diff "$PR" -R "$REPO" --name-only | while read -r f; do
            case "$f" in
              layers/*) echo "${f#layers/}" | cut -d/ -f1 ;;
              app/pages/index.vue|app/components/HomeShowcase.vue) echo homepage ;;
              app/*|shared/*|modules/*|scripts/*|nuxt.config.ts) echo platform ;;
            esac
          done | sort -u | while read -r area; do
            gh pr edit "$PR" -R "$REPO" --add-label "area:$area"
          done
```

The ten `area:*` labels must exist first (the orchestrator creates them).

## Rationale

Area labels on issues come from the `auto-triage` sweep; PRs get theirs from
their changed paths, so both filter the same way.

## Companion change

The PR that adds the `area:` rule to `auto-triage`, `triage-labels.md` and
`visitor-loop`. Harmless in either order, since a label that does not exist yet
only fails the workflow step.
