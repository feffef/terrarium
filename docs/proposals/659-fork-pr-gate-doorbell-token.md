# Stop the green-comment doorbell step from red-flagging fork PRs

## Origin

`#659` — first seen on `#631`, the first real external-contributor **fork**
PR (the Eyra blog persona). The `gate` check went red even though the gate
itself fully passed.

## Target

`.github/workflows/gate.yml`

The current final step (the "doorbell" comment added for issue #278):

```yaml
      - name: 'Doorbell · comment on green so a subscribed session wakes'
        if: success() && github.event_name == 'pull_request'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh pr comment ${{ github.event.pull_request.number }} \
            -R ${{ github.repository }} \
            --body "✅ safety-gate green on ${{ github.sha }}"
```

### Recommended change (options 1 + 2, they compose)

Add `continue-on-error: true` so a failed courtesy comment can never red the
gate, and narrow the `if:` so the step only attempts a comment on same-repo
PRs (forks have a read-only token and would fail anyway):

```yaml
      - name: 'Doorbell · comment on green so a subscribed session wakes'
        if: >-
          success() && github.event_name == 'pull_request'
          && github.event.pull_request.head.repo.full_name == github.repository
        continue-on-error: true
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh pr comment ${{ github.event.pull_request.number }} \
            -R ${{ github.repository }} \
            --body "✅ safety-gate green on ${{ github.sha }}"
```

Either half alone fixes the red gate:

- **Option 1 — `continue-on-error: true` only** (simplest): a failed comment
  step no longer fails the job. Forks silently get no green comment, but the
  gate reflects the real result. Keeps the step attempting on every PR.
- **Option 2 — fork skip only** (`if:` guard): forks skip the step entirely,
  so nothing can fail; same-repo PRs keep the comment. Cleaner logs (no failed
  step at all) but doesn't protect against any *other* future failure of the
  comment call.

Applying **both** is belt-and-suspenders: forks skip cleanly, and any residual
comment failure on a same-repo PR still can't red the gate.

## Rationale

GitHub gives PRs opened from a **fork** a **read-only `GITHUB_TOKEN`**. The
doorbell step's `gh pr comment` therefore can't write a comment on a fork PR —
GraphQL returns `Resource not accessible by integration (addComment)` — and
that failing step takes the whole `gate` job down with it. The result is a
**false-negative red `gate` check on every external fork PR**, even when the
code is perfectly green.

Verified from the #631 job logs: build, lint, typecheck, `validate:content`,
and the full 66/66 L2 e2e suite (including `hydrates /t/blog/eyra`) all passed;
the job went red only on this final step:

```
Run: gh pr comment 631 --body "✅ safety-gate green on cbe64761…"
GraphQL: Resource not accessible by integration (addComment)
##[error]Process completed with exit code 1.
```

The identical step succeeds on same-repo PRs (e.g. #644 and #646 both received
the green bot comment), which is exactly the fork/same-repo token split.

- Failing run: https://github.com/feffef/terrarium/actions/runs/30030351004
  (job 89293200709)

This directly breaks the external-contribution pipeline the repo just built
(ADR-0009 external-session support, `docs/agents/guest-contributions.md`): a
green fork PR shows a red gate, so a human can't distinguish a genuinely
failing contribution from a passing one.

### Alternative (option 3) — forks still get the comment

Move the comment to a separate `pull_request_target` or `workflow_run` job that
runs with the **base-repo** token, which *can* write to the PR. Forks would
then still receive the green comment. Honest cost: this adds a privileged-token
surface (`pull_request_target`/`workflow_run` run with write access in the base
repo's context, a well-known injection footgun if it ever consumes untrusted PR
content), plus the complexity of a second job wired to the first's completion.
Not recommended unless the green comment on fork PRs is genuinely needed — the
doorbell only exists to wake a *subscribed same-repo session*, which a fork
contribution isn't.

## Companion change

None — this proposal stands alone. It's a pure workflow-file edit; there is no
agent-authored code change that must land in the same sitting. The originating
issue (#659) and this proposal are the whole handoff. When a human applies the
`gate.yml` edit, delete this file in the same commit (per this directory's
README — it tracks *pending* proposals, not an archive).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_014kKFh1mgSURqypUxKGNZRz
