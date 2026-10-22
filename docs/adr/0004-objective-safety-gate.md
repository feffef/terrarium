# ADR-0004: Every PR passes an objective gate; a human merges the risky few

Every change passes the gate: a fixed set of machine checks that must be green
before a PR merges. With a green gate and a review, an agent merges its own PR.
A human merges the few PRs whose risk the gate cannot see.

## Scope

- **What the gate checks.** Four kinds of check, cheapest first: the code and
  every Tenant manifest are valid and the app builds (L0); every Document
  matches its Collection's schema (L1); every entry route renders in a real
  browser without errors (L2); a query for one Tenant and Space never returns
  another's Documents (L3). Code and tests cite these labels.
- **Skipping steps.** The gate may skip a step only when it proves no changed
  file can affect that step. Without proof, it runs everything.
- **Before the first push,** the branch passes the gate locally and gets a code
  review. CI's run of the gate decides the merge. A simple change, and a simple
  follow-up commit, gets the author's own read of its full diff instead; a
  larger follow-up gets a review of its own diff, not the whole branch.
- **Who merges.** The agent that wrote the PR, once CI's gate is green and it
  has posted its verdict on the PR, unless an exception below applies.
- **A human merges a PR that:**
  - changes a file on the Human-only list;
  - adds a dependency, moves one to a new major version, or patches its code;
  - changes behaviour no test or gate step can observe, such as a hook or
    script that runs unattended, timing-dependent logic, or an outside side
    effect. Touching unfamiliar code that has tests does not count;
  - adds logic that decides which Tenant's data a request can reach. Calling
    the catalog's read functions (ADR-0025) is not such logic;
  - comes from a Public author, a fork or the guest pipeline, or was built
    from a Public request (ADR-0020, ADR-0023).

  An agent may still merge a minor or patch bump that Dependabot opens from
  this repo, though it changes `package.json`.
- **The Human-only list** holds the files where a bad change escapes the gate
  or weakens the merge check itself. The list is the `paths` of the
  human-merge rule.
  `scripts/github/merge-pr.ts` reads it from `main`, so a PR cannot shrink it for
  itself.
- **Merging, not editing.** Agents may edit Human-only files; only the merge
  waits for a human.
- **"A human"** is any Trusted user, with one exception (ADR-0020).

## Why

Agents change a system that includes their own tools. Automatic checks are what
make that autonomy safe, so the gate is the one place we never cut for
simplicity.

The gate asks only questions a machine can answer, so it can be trusted without
trusting the author. For the same reason it is blind to intent: a clean build
can still do harm at runtime. The exceptions are the changes where that
blindness matters, so a person reads them before they land.

## Rejected alternatives

- **Sort every PR into risk tiers by the paths it touches,** and merge only the
  low tier on green. Merging on green by default and listing the few
  exceptions is simpler, and the list fails safe.
- **Make every exception a path, so a script enforces all of them.** A new
  dependency, untested behaviour, new isolation logic or an untrusted author
  has no path to match.
- **Enforce the first-push review with a push hook matching the reviewed
  sha.** The fix and the gate come after the review, so the reviewed sha
  rarely equals the pushed head, and `merge-pr.ts` already wants a verdict
  naming the head.
- **Skip review for prose-only changes.** Skills, rules and agent docs steer
  every later session, so a mistake in them costs as much as a code bug.
- **Rely on human review without a gate.** Review misses mechanical breakage,
  and agents open more PRs than a person can check.

## Consequences

- `scripts/github/merge-pr.ts` sees a PR's author, not the request behind it, and
  enforces the path list, Public or fork authors, and the `guest-pipeline`
  label `guest-build` puts on its PRs. The other exceptions rest on the agent
  recognising them, including any other PR built from a Public request: it
  looks Trusted because an agent opens it.

## See

- `.claude/rules/adr-0004-human-merge.md`: the Human-only list.
- `scripts/github/merge-pr.ts`: the merge refusals.
- `scripts/gate/gate.ts`, `.github/actions/gate/action.yml` and `package.json`'s
  `gate`: the steps, their labels and when they skip (ADR-0026).
- `docs/agents/pr-workflow.md`: running the gate, the review and the merge,
  and what counts as a simple change.
- `tests/README.md`: where tests live and how the e2e reuses one build.
