---
paths:
  - "app/components/**"
  - "app/pages/**"
  - "app/assets/**"
  - "app/error.vue"
  - "layers/*/app/components/**"
  - "layers/*/app/pages/**"
  - "layers/*/app/assets/**"
  - "scripts/ui/**"
---
# Verifying UI changes

**Before you say a UI change works, or take a screenshot:** read
`docs/agents/verifying-ui-changes.md`. A passing test or grepped HTML is not
proof that a page renders as intended.

**Before you build owner-facing UI:** grep the Tenant and Platform components
for an existing one before you build a new element. Agree the UI on a short
sample, shown with `scripts/ui/preview.ts start --dev` (no full build needed),
and confirm each screenshot with the owner. Show the owner the screenshot
first; run review and the gate and open the PR only after they confirm it. This
holds for a UI change the owner asked for directly, with no grilling round.
