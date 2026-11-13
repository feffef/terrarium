# Path-based `area:` labels on PRs (#3243)

Install as `.github/workflows/pr-area-label.yml`, create the ten `area:*`
labels first, then delete this file, then update `docs/agents/triage-labels.md`
to say a workflow labels PRs.

```yaml
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
    # Same-repo only: a fork's token is read-only.
    if: github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-latest
    steps:
      - env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR: ${{ github.event.pull_request.number }}
          REPO: ${{ github.repository }}
        run: |
          gh pr diff "$PR" -R "$REPO" --name-only | while read -r f; do
            case "$f" in
              layers/journal/*|layers/blog/*|layers/atlas/*|layers/midden/*|layers/marquee/*|layers/tinkerfund/*|layers/glassbox/*|layers/commons/*)
                echo "${f#layers/}" | cut -d/ -f1 ;;
              app/pages/index.vue|app/components/HomeShowcase.vue) echo homepage ;;
              app/*|shared/*|modules/*|scripts/*|nuxt.config.ts) echo platform ;;
            esac
          done | sort -u | while read -r area; do
            gh pr edit "$PR" -R "$REPO" --add-label "area:$area"
          done
```
