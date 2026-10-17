# Repoint two comments in gate.yml to scripts/gate/gate.ts

## Origin

#2187 (split `scripts/` into area folders).

## Target

`.github/workflows/gate.yml`, lines 24 and 26 (comments only). Change both
mentions of `scripts/gate.ts` to `scripts/gate/gate.ts`:

```diff
-          # merge-base. A shallow checkout has neither, and scripts/gate.ts then
+          # merge-base. A shallow checkout has neither, and scripts/gate/gate.ts then
           # refuses to classify at all — which costs a full gate, not a wrong
-          # one (`scripts/gate.ts`).
+          # one (`scripts/gate/gate.ts`).
```

## Rationale

The script moved; the comments now name a path that no longer exists. A cloud
session cannot push `.github/workflows/` (`docs/agents/environment-caveats.md`).

## Companion change

PR #2189 (moves `scripts/gate.ts` to `scripts/gate/gate.ts`). The
comments are inert, so either order works; delete this file when applied.
