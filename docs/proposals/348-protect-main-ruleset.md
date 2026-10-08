# Repository ruleset `protect-main` (stage 1 of protecting `main`)

## Origin

#348 (research: `docs/research/github-branch-protection-vs-autonomous-log-commits.md`).
Stage 2, a GitHub App identity for the session-log lander so this ruleset can
drop its admin bypass, is #1689. The owner chose both stages and asked for the
ruleset to be applied from session `session_01CF4k9jXS9wLrcPVsGduZmn`; the
agent proxy refused the write (`docs/agents/environment-caveats.md`), so it is
a Proposal.

## Target

Not a file: the repository's rulesets (GitHub → Settings → Rules → Rulesets).
Apply from a local shell as the owner (one call, idempotent only in the sense
that a second call creates a duplicate; check `gh api repos/feffef/terrarium/rulesets` first):

```sh
gh api -X POST repos/feffef/terrarium/rulesets --input - <<'JSON'
{
  "name": "protect-main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "bypass_actors": [
    { "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "always" }
  ],
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false,
        "allowed_merge_methods": ["merge", "squash", "rebase"] } },
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": false,
        "do_not_enforce_on_create": false,
        "required_status_checks": [ { "context": "gate", "integration_id": 15368 } ] } }
  ]
}
JSON
```

Same thing in the UI: New ruleset → New branch ruleset, name `protect-main`,
enforcement Active, target "Default branch"; bypass list: Repository admin,
"Always allow"; rules: Restrict deletions, Block force pushes, Require a pull
request before merging (0 approvals, all merge methods), Require status checks
to pass with the check `gate` from GitHub Actions and "Require branches to be
up to date" **off**.

Verify with `gh api repos/feffef/terrarium/rules/branches/main`.

## Rationale

- **Session logs keep landing unchanged.** The lander pushes with the owner's
  own credential (every direct push to `main` is actor `feffef`), and the
  Repository-admin bypass set to "Always" lets that push through (ADR-0009).
  A bypass can name only a role, team or App, so until #1689 the bypass cannot
  be narrower than the owner. This makes the ruleset a guardrail: it restores
  what #348 asked for (the gate shows as required, the merge button waits for
  green, auto-merge has a condition to wait on, force pushes and deleting
  `main` are blocked) without blocking anything the owner identity does.
- **Rules left off on purpose, each would break the workflow:** required
  approvals above 0 (the owner identity authors every PR and GitHub refuses
  self-approval), "require branches to be up to date" (`main` moves many
  times a day with session logs, so every PR would need a refresh before
  merging), "require linear history" (`scripts/merge-pr.ts` and humans use
  merge commits), "require signed commits" (session-log commits land unsigned).
- **`integration_id` 15368** is the GitHub Actions app, so only the real
  `safety-gate` workflow's `gate` job can satisfy the check.
- Chartered Skills' self-merges, human merges, and the proposed Dependabot
  workflow (`1633-dependabot-automerge.md`) all merge green PRs and need no
  bypass. Its rationale's "`main` has no branch protection" line becomes
  stale once this applies; the workflow still works, since it merges only on
  a green gate.
- Not verified from GitHub's docs: whether an "Always" bypass actor's REST
  merge goes through on a red check without an explicit bypass. The merge
  script polls for green first, so this is a safety-net question only.

## Companion change

None. After applying: delete this file and update the status paragraph at the
end of `docs/research/github-branch-protection-vs-autonomous-log-commits.md`.
