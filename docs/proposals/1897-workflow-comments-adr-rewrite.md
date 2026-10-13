# Repoint two workflow comments to the rewritten ADRs

- **Origin:** #1897, from the ADR rewrite PR (branch `claude/adr-rewrite`).
- **Target:** `.github/workflows/gate.yml` and
  `.github/workflows/pr-authorassociation-label.yml`, comments only:

```diff
diff --git a/.github/workflows/gate.yml b/.github/workflows/gate.yml
index 0b85f4a2..9eb64d67 100644
--- a/.github/workflows/gate.yml
+++ b/.github/workflows/gate.yml
@@ -2,7 +2,7 @@
 # .github/actions/gate/action.yml, where agents can push them (ADR-0026) — the
 # `workflow` OAuth scope is fenced at .github/workflows/ only. This file is the
 # shell: triggers, permissions, checkout, and the doorbell token. Both files are
-# human-only to merge (ADR-0004's high-risk set).
+# Human-only to merge (ADR-0004).
 
 name: safety-gate
 
@@ -22,8 +22,8 @@ jobs:
         with:
           # The composite's Scope step needs the PR's base commit and a real
           # merge-base. A shallow checkout has neither, and scripts/gate.ts then
-          # refuses to classify at all — which costs a Full gate, not a wrong
-          # one. See ADR-0026.
+          # refuses to classify at all — which costs a full gate, not a wrong
+          # one (`scripts/gate.ts`).
           fetch-depth: 0
 
       # Everything the Gate actually does. `secrets` is unreachable inside a
diff --git a/.github/workflows/pr-authorassociation-label.yml b/.github/workflows/pr-authorassociation-label.yml
index f625faf7..7489e99f 100644
--- a/.github/workflows/pr-authorassociation-label.yml
+++ b/.github/workflows/pr-authorassociation-label.yml
@@ -13,9 +13,9 @@
 # same-repo PRs lets us apply `trusted` safely and never needs a token on a
 # fork; the untrusted case is simply the unlabeled default.
 #
-# Trigger is plain `pull_request`, never `pull_request_target`/`workflow_run`:
-# ADR-0020 requires it because those bypass the "require approval to run fork
-# PR workflows" Actions setting. See docs/research/making-repo-public.md §3.
+# Trigger is plain `pull_request`: fork code must not run in CI before a Trusted
+# user approves the run (ADR-0020), and `pull_request_target`/`workflow_run` skip
+# that approval when they check out PR code. See docs/research/making-repo-public.md §3.
 
 name: pr-authorassociation-label
 
```

- **Rationale:** ADR-0004 no longer has a "high-risk set"; the full-history
  checkout reason lives in `scripts/gate.ts`; ADR-0020 states the rule the
  label trigger follows rather than naming the trigger.
- **Companion change:** none. Apply any time after the ADR rewrite PR merges.
