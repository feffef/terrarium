---
paths:
  - "shared/schemas/**"
  - "shared/kinds.ts"
  - "layers/*/tenant.config.ts"
  - "layers/*/schemas.ts"
---
# Stored data shapes

Before you add or change a stored field, settle its shape with a Trusted user
(for example, per run or a mean). Interactive session: ask and wait. Scheduled
or other autonomous session: don't build it; file a `needs-triage` issue naming
the shape question. Subagent or workflow agent: hand the question back to your
caller.

Exception: a minor change that unblocks work (for example, a red gate on
`main`). Minor adds or removes no stored field and changes no existing field's
meaning (fixing a type, loosening a validation the data already breaks, making
a field optional). The PR names the exception and why it applied.
