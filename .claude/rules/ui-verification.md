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
for an existing one. Agree the UI on a short sample
(`scripts/ui/preview.ts start --dev`, no full build) and have the owner confirm
each screenshot. Run review and the gate and open the PR only after they
confirm, even for a UI change the owner asked for directly.
