# Switching a repo from Private to Public: what to review first

Research reference for anyone (human or agent) about to flip a GitHub
repository's visibility from Private to Public. Every claim below is sourced
from GitHub's own docs (`docs.github.com`) — fetched from the primary content
in the `github/docs` repository, which is what renders those pages — cited
inline. Where a canonical `docs.github.com` URL is given but the underlying
page content was retrieved via its `github/docs` source file (because
`docs.github.com` blocked the fetch), that's noted.

**This repo's own posture**: per `CLAUDE.md` and ADR-0001, Terrarium is one
repo, one container, with human-only merge gates on CI/routing/isolation
files (ADR-0004) and a `pnpm gate` safety gate — this document doesn't change
any of that. This is the generic-mechanics grounding that fed the repo's actual
flip to public on 2026-07-11 (see `public-readiness-review.md` for the
repo-specific findings and decisions from that review) — kept here as
reference for anyone reasoning about a repo's visibility, not a live proposal.

---

## 1. What becomes visible when a repo goes public

The canonical page is **[Setting repository visibility](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)**. Key facts, quoted/paraphrased from that page's source:

- **Code and full history**: "The code will be visible to everyone who can
  visit [GitHub]." This includes the entire Git history — **all commits, on
  all branches**, not just the current default-branch tip. There is no way to
  make only *some* history public; a switch to Public exposes the whole
  repository object graph that Git can reach.
- **Activity**: "Your changes will be published as activity."
- **Actions history and logs**: "Actions history and logs will be visible to
  everyone" — i.e., past and future workflow run logs become world-readable,
  not just the code. Reusable/required workflows shared from other
  repositories will display the workflow file path and repository name in
  those logs. Confirmed separately by **[Using workflow run logs](https://docs.github.com/actions/managing-workflow-runs/using-workflow-run-logs)**: a viewer must be logged in to GitHub to see run logs, but for a public repo no repo-specific permission is required beyond that — anyone with a GitHub account can view them (and the REST API can serve public workflow-run data with no auth at all).
- **Forks**: "Anyone can fork your repository," and (separately) **all forks
  of a public repository are public** — see §4 below.
- **Stars/watchers**: interestingly, this is a private→public *warning*
  in reverse — the docs warn that watchers/stars are erased when going
  *private*, implying they're preserved/visible normally while public.
- **Push rulesets**: "All push rulesets will be disabled" on the flip to
  public (see §3 for what to re-enable).
- **GHAS-family features**: "The repository will automatically gain access to
  GitHub Advanced Security features" (i.e., secret scanning / push protection
  / code scanning become available for free on the newly-public repo — see §2).

**Not explicitly itemized on that page** (the docs repo has an open gap here,
tracked as [github/docs#38012](https://github.com/github/docs/issues/38012),
"what happens to... Commits, Pull requests, Discussions and Wiki"), but
confirmed by GitHub's actual behavior and adjacent docs / long-standing
product behavior:

- **Issues, Pull Requests, and PR review comments**: become visible in full —
  every issue, PR, and every inline/top-level review comment on them,
  including on closed/merged PRs, becomes readable by anyone. (There is no
  GitHub visibility-change doc that says otherwise, and this matches the
  "code will be visible to everyone" framing — Issues/PRs live in the same
  repository visibility scope as code.)
- **Releases**: become publicly downloadable, same visibility scope as code.
- **Wiki**: follows the repository's visibility — a public repo's wiki is
  public too (there is no independent wiki-visibility toggle).
- **Deleted-but-in-history content**: anything ever committed — even if later
  deleted in a subsequent commit — remains fully recoverable from Git history
  once the repo is public, because Git history itself becomes visible (see
  above). This is the same fact that makes "just delete the secret in a new
  commit" not a real fix — see §4.
- **Contributor emails in commits**: each commit's author/committer email is
  part of the commit object and becomes visible with the rest of the history.
  GitHub's own mitigation is account-level, not repo-level: **[Setting your
  commit email address](https://docs.github.com/en/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address)**
  lets a user select **"Keep my email addresses private,"** which gives them
  a `noreply@users.noreply.github.com`-style address for *future* web-based
  Git operations (and can also **"Block command line pushes that expose my
  email"**, per **[Email addresses reference](https://docs.github.com/en/account-and-profile/reference/email-addresses-reference)**). This does **not**
  retroactively scrub emails already baked into existing commit history —
  those remain in the public history exactly as committed (again, §4's
  history-rewrite caveats apply if you want to try to remove them).

**Practical read**: before flipping to Public, assume *everything* — every
commit ever made (including on deleted branches still reachable via refs,
forks, or PRs), every issue/PR/comment, every Actions log, every release —
becomes world-readable simultaneously. Audit history for secrets (§2) and for
anything (internal URLs, employee names in old commit messages, unreleased
roadmap discussion in issues, etc.) that was written assuming a private
audience, before the switch, not after.

---

## 2. Secret scanning + push protection for public repos

Primary source: **[Secret scanning](https://docs.github.com/code-security/secret-scanning/about-secret-scanning)** and **[Push protection](https://docs.github.com/en/code-security/concepts/secret-security/push-protection)**.

### What's free/automatic on public repos

> "Secret scanning is available for the following repository types: **Public
> repositories: Secret scanning runs automatically for free.**
> Organization-owned private/internal repositories: requires GitHub Secret
> Protection (paid, part of GHAS). User-owned repositories: requires GHEC
> with EMUs, or GHES with Secret Protection enabled."
> — reusable snippet embedded in the secret-scanning docs (`data/reusables/gated-features/secret-scanning.md` in `github/docs`, rendered into the "Secret scanning" and quickstart pages above).

Two distinct layers exist for public repos, and it's easy to conflate them:

1. **Automatic, no-setup partner scanning** — GitHub always scans public
   repos for secrets matching known **service-provider partner patterns**
   (AWS keys, Stripe keys, etc.). When one is found, GitHub notifies the
   *partner* directly so they can revoke/rotate it; per the docs, "Partner
   secrets are reported directly to the provider and aren't displayed in your
   repository alerts" — i.e., this layer runs with **zero configuration**,
   but you as the repo owner may never see an alert for it in your own
   Security tab.
2. **Repo-level secret scanning alerts** ("user alerts") — the feature that
   populates the repo's own **Security → Secret scanning** tab with alerts
   you can triage. Per **[Enabling secret scanning for your repository](https://docs.github.com/en/code-security/how-tos/secure-your-secrets/detect-secret-leaks/enabling-secret-scanning-for-your-repository)**:
   > "Secret scanning alerts can be enabled on any free public repository
   > that you own." It's enabled by turning on **GitHub Secret Protection**
   > for the repo (Settings → Advanced Security → Secret protection → Enable
   > → Enable secret scanning), which on a public repo is free.

**Scope of scanning**: per the "Secret scanning" concepts page — "Secret
scanning scans your **entire Git history on all branches** of your repository
for hardcoded credentials... GitHub also periodically rescans repositories
when new secret types are added." This matters directly for the pre-publish
audit: once enabled, it will surface historical leaks too, not just new ones.

### Push protection

Per **[Push protection](https://docs.github.com/en/code-security/concepts/secret-security/push-protection)** (`content/code-security/concepts/secret-security/push-protection.md`):

- **Push protection for repositories**: blocks a push containing a detected
  secret *before* it lands, across CLI pushes, web UI commits, file uploads,
  the REST API, and the GitHub MCP server (public repos only). It **requires
  GitHub Secret Protection to be enabled** and is **off by default** — a
  repo admin, org owner, security manager, or enterprise owner must turn it
  on. Enable at **Settings → Advanced Security → Secret protection → Enable
  push protection**, or via **[Enabling push protection for your repository](https://docs.github.com/en/code-security/how-tos/secure-your-secrets/prevent-future-leaks/enabling-push-protection-for-your-repository)**.
- **Push protection for users** is a separate, account-level layer: "enabled
  by default," "stops you from pushing secrets to public repositories on
  GitHub" regardless of whether the target repo has repo-level push
  protection on — but it "does not generate alerts when you bypass... unless
  push protection is also enabled at the repository level." So a lone
  contributor gets some baseline protection even without the repo admin
  turning anything on, but repo-level enablement is what gives *visibility*
  into bypasses.
- **Bypass**: by default anyone with write access can bypass push protection
  by giving a reason; bypasses generate alerts under the Security tab so they
  can be reviewed after the fact. Delegated-bypass controls exist to
  restrict who can bypass and require approval.

### Reviewing alerts before/after publishing

Recommended sequence, synthesized from the docs above and the **[Quickstart
for securing your repository](https://docs.github.com/en/code-security/getting-started/quickstart-for-securing-your-repository)**:

1. **Before flipping visibility** (while still private): enabling secret
   protection on a private repo requires GHAS/paid tier — but you don't need
   to enable GitHub's *hosted* alerting to do a pre-publish self-audit; run a
   local/offline secret scanner (e.g. `gitleaks`, `trufflehog`) or
   `git log -p` review across full history first, since the repo-hosted free
   tier doesn't kick in until it's already public.
2. **Immediately on/after making public**: enable GitHub Secret Protection
   (secret scanning alerts) and push protection — both free once public —
   and let the initial full-history scan complete; triage every alert it
   raises (rotate the credential per §4 — do not just dismiss the alert).
3. **Ongoing**: keep push protection on to catch new leaks before they land;
   review the "Security & quality" tab periodically for partner-scanning
   bypass alerts.

---

## 3. Recommended security settings for a public repo

### Branch protection / rulesets

Primary source: **[About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)** and **[About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)**.

- **Availability on public repos, free tier**: "Rulesets are available in
  public repositories with GitHub Free and GitHub Free for organizations, and
  in public and private repositories with GitHub Pro, GitHub Team, and GitHub
  Enterprise Cloud" (`data/reusables/gated-features/repo-rules.md`). So a
  public repo gets ruleset support on the **free** plan even though a private
  repo would need a paid plan for the same feature — a direct incentive/side
  effect of going public.
- **Rulesets vs. classic branch protection rules**: rulesets **layer** with
  protection rules — "if multiple rulesets target the same branch... the
  rules... are aggregated," and "where multiple different versions of the
  same rule exist, the most restrictive version applies." Rulesets also add:
  visibility ("anyone with read access... can view the active rulesets"),
  enforcement statuses (disable without deleting), and metadata rules (commit
  message / author-email restrictions) that classic branch protection
  doesn't have.
- **Important note specific to going public**: per §1, "**all push rulesets
  will be disabled**" the moment a repo is switched to public — so if push
  rulesets were relied on beforehand, they must be **re-enabled explicitly
  after** the switch, not assumed to carry over.
- Recommended baseline for the default branch of a public repo: require PRs
  before merging (no direct pushes), require reviews, require status checks
  (the safety-gate CI) to pass, block force-pushes, and — per this repo's own
  ADR-0004 — keep the CI/routing/isolation files themselves human-only to
  merge regardless of who owns other rule categories.

### Actions settings

Primary source: **[Managing GitHub Actions settings for a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository)**.

- **"Allow Actions" scope**: Settings → Actions → General → "Actions
  permissions" — choose between disabling Actions entirely, allowing all
  actions, or restricting to a specific allow-list of actions/reusable
  workflows. No visibility-specific default is documented; review this
  explicitly for a newly-public repo since it now accepts fork PRs from
  anyone.
- **Fork-PR approval requirement** ("Controlling changes from forks to
  workflows in public repositories," same page): "workflows on pull requests
  to public repositories from some outside contributors will not run
  automatically and may need approval first," governed by the setting
  **"Approval for running fork pull request workflows from contributors"**
  with three levels — require approval for (a) first-time contributors new to
  GitHub, (b) all first-time contributors (**this is the default**: "By
  default, all first-time contributors require approval to run workflows" —
  `data/reusables/actions/workflow-run-approve-public-fork.md`), or (c) all
  external contributors. Note the carve-out: **`pull_request_target`-triggered
  workflows always run regardless of this setting**, because they execute in
  the trusted base-branch context — this is exactly why `pull_request_target`
  needs its own hardening (see below).
- **Default `GITHUB_TOKEN` permissions**: per the same page ("Setting the
  permissions of the GITHUB_TOKEN for your repository") — **"By default, when
  you create a new repository in your personal account, `GITHUB_TOKEN` only
  has read access for the `contents` and `packages` scopes."** This read-only
  default was rolled out platform-wide; see the **[GitHub changelog, Feb 2 2023](https://github.blog/changelog/2023-02-02-github-actions-updating-the-default-github_token-permissions-to-read-only/)**
  for the history, and **[Controlling permissions for GITHUB_TOKEN](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/controlling-permissions-for-github_token)**
  for how to grant broader write access to specific jobs when actually
  needed, scoped as narrowly as possible (principle of least privilege).
  Verify this is still set to the restrictive default before/after
  publishing, since org-level settings can override the repo default.
- **`pull_request_target` injection risk**: this is the single riskiest
  Actions surface for a public repo, covered in depth by **[Securely using pull_request_target](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target)**
  and **[Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)**:
  - `pull_request_target` runs with the **base repo's `GITHUB_TOKEN` and
    secrets**, and (unlike `pull_request`) runs the **workflow file from the
    default branch**, not from the PR — that's what makes it safe *by
    default*. The vulnerability ("pwn request") is introduced when a workflow
    author then explicitly checks out the **fork's head commit** (e.g. `ref:
    ${{ github.event.pull_request.head.sha }}`) and **executes** it (a build
    step, `make test`, `npm install`, etc.) — that's attacker-controlled code
    running with the base repo's privileged token/secrets.
  - As of **`actions/checkout` v7** (per the doc and the **[June 18 2026 GitHub changelog](https://github.blog/changelog/2026-06-18-safer-pull_request_target-defaults-for-github-actions-checkout/)**), checkout **refuses to check out a fork PR head ref by default** under `pull_request_target`/`workflow_run`; opting back in requires explicitly setting `allow-unsafe-pr-checkout: true` (an intentionally conspicuous flag for code review).
  - Guidance: **use plain `pull_request` instead if you don't need secrets**;
    if you do need `pull_request_target`, never execute checked-out fork
    code, restrict `GITHUB_TOKEN` permissions to the minimum, understand that
    these workflows get **read-only** cache access (can't poison the shared
    cache), and treat `workflow_run` the same way (it also runs privileged
    and can be fed attacker-controlled artifacts).
  - Also relevant: **pin third-party Actions to a full commit SHA** (not just
    a tag) to guard against a compromised or re-tagged action — "Pinning an
    action to a full-length commit SHA is currently the only way to use an
    action as an immutable release" (Secure use reference).

### Dependabot / advisories / SECURITY.md

Primary sources: the **[Quickstart for securing your repository](https://docs.github.com/en/code-security/getting-started/quickstart-for-securing-your-repository)** and **[Privately reporting a security vulnerability](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/privately-reporting-a-security-vulnerability)**.

- **Dependabot alerts**: "You can enable Dependabot alerts for any
  repository" (free public repos included) via Settings → Advanced Security
  → enable Dependabot alerts; generated whenever the dependency graph finds a
  dependency with a known vulnerability.
- **Dependabot security updates**: once alerts are on, enable security
  updates separately to have Dependabot open PRs with the minimum patched
  version automatically.
- **SECURITY.md**: "it's good practice to specify a security policy... by
  creating a file named `SECURITY.md`," viewable from the repo's **Security**
  tab under "Reporting → Security policy." This is purely informational —
  instructions for how to responsibly report vulnerabilities to you.
- **Private vulnerability reporting**: a *separate* feature from SECURITY.md
  — per the docs, "The ability to privately report a vulnerability in a
  repository is not related to the presence of a SECURITY.md file... If the
  repository doesn't have private vulnerability reporting enabled, [a
  reporter] need[s] to follow the instructions in the security policy... or
  create an issue asking maintainers for a security contact." Enable it under
  Settings → Advanced Security so external researchers get a structured,
  private path (a repository security advisory / temporary private fork)
  instead of having to file a public issue that discloses the vulnerability
  before it's fixed.
- **Repository security advisories**: repo admins/security-permission users
  can draft one directly (no need to wait for an external report) to
  privately coordinate a fix, then publish it to notify downstream consumers
  and populate the GitHub Advisory Database.

---

## 4. Forks, and whether removing a secret after publishing helps

Primary source: **[What happens to forks when a repository is deleted or changes visibility?](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/what-happens-to-forks-when-a-repository-is-deleted-or-changes-visibility)**

- **Private → Public**: "When a private repository is made public, **all the
  commits in that repository, including any commits previously pushed to
  private forks of that repository, will be migrated to a new public
  repository network and become visible to everyone.**" Existing private
  forks stay private but are **disconnected** — each becomes its own
  standalone private repo/network, no longer synced with the now-public
  original.
- **Public → Private (the reverse, for context)**: "If a public repository is
  made private, its public forks are split off into a new [public] network"
  — forks stay public even if the upstream goes private, specifically so
  fork owners aren't suddenly locked out. This means visibility changes are
  **not symmetric/reversible**: going public and then back private does not
  undo the public exposure that already happened, and any fork made while
  public remains a permanently public copy.
- **All forks of a public repo are public**, full stop — per "About forks"
  and the fork-network model description on the same doc, a fork inherits
  public visibility and cannot be made private on its own.

### Does deleting a secret after publishing actually help?

**No — not on its own.** Primary source: **[Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)**.

- The doc's own leading guidance: **"if the sensitive data you need to remove
  is a secret (e.g. password/token/credential)... as a first step you need to
  revoke and/or rotate that secret. Once the secret is revoked or rotated, it
  can no longer be used for access, and that may be sufficient to solve your
  problem. Going through the extra steps to rewrite the history and remove
  the secret may not be warranted."** — i.e., **rotation is the fix that
  actually matters**; history-scrubbing is a secondary, largely cosmetic
  cleanup once rotation has already neutralized the exposure.
- **Why a plain new commit that deletes the file doesn't help**: the old
  commit with the secret is still fully present and fetchable in Git history
  (§1) — anyone who already has, or later clones, the repo can check out the
  earlier commit and read the secret. A public repo is scanned/mirrored/cached
  by many third parties essentially immediately, so "nobody's looked yet" is
  not a safe assumption.
- **Why rewriting history is not a complete fix either** — the doc lists
  concrete, unavoidable limitations:
  - **High risk of recontamination**: "it is unfortunately easy to re-push
    the sensitive data... If a fellow developer has a clone from before your
    rewrite, and after your rewrite simply runs `git pull` followed by `git
    push`, the sensitive data will return."
  - **Forks keep the data regardless**: "If the commit that introduced the
    sensitive data exists in any forks, it will continue to be accessible
    there... You will need to coordinate with the owners of the forks... to
    remove the sensitive data or delete the fork entirely" — and GitHub
    explicitly **will not** give you contact info for those fork owners on
    GitHub.com/GHEC.
  - **Cached/indexed copies persist on GitHub itself**: even after a
    force-pushed history rewrite, the commit "may still be accessible... via
    their SHA-1 hashes in cached views on GitHub" and "through any pull
    requests that reference them" — this requires **contacting GitHub
    Support** directly to purge, and even then: **"GitHub Support won't
    remove non-sensitive data, and will only assist in the removal of
    sensitive data in cases where we determine that the risk can't be
    mitigated by rotating affected credentials"** — i.e., GitHub's own
    support policy is built around the assumption that rotation is the real
    remedy and history-purging is a last resort they'll only help with when
    rotation genuinely isn't enough.
  - Rewriting history also breaks commit hashes, invalidates signatures,
    breaks PR diff views, and requires temporarily disabling any
    force-push-blocking branch protection — all real operational cost for a
    cleanup that, per GitHub's own framing, is often unnecessary once the
    credential is rotated.
- **Practical conclusion for this question**: when a secret is discovered in
  a history that's about to go (or already went) public, the response order
  is **(1) rotate/revoke the credential immediately — this is what actually
  closes the exposure — (2) only then consider whether a history rewrite is
  still worth the coordination cost, primarily to reduce noise/liability, not
  because it removes real risk retroactively.**

---

## 5. Official GitHub checklists / hardening references

No single GitHub doc is titled exactly "Making a repository public
checklist," but these are the canonical, GitHub-authored entry points that
compose into one:

- **[Setting repository visibility](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)**
  — the visibility-change mechanics and consequences (§1 above); the actual
  UI flow requires clicking through "I have read and understand these
  effects" before GitHub lets the change proceed.
- **[Quickstart for securing your repository](https://docs.github.com/en/code-security/getting-started/quickstart-for-securing-your-repository)**
  — GitHub's own step-by-step for wiring up visibility/access review,
  dependency graph, Dependabot alerts, dependency review, code scanning,
  secret protection (scanning + push protection), and SECURITY.md, all from
  one page, in that order. This is the closest thing to an official
  "securing a repo" checklist and is the best single starting point.
- **[Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)**
  (Actions-specific hardening: secrets handling, script-injection mitigation,
  third-party action pinning, self-hosted-runner hardening — **"self-hosted
  runners should almost never be used for public repositories... because any
  user can open pull requests against the repository and compromise the
  environment"** — OIDC for cloud auth, CODEOWNERS on workflow files,
  OpenSSF Scorecard).
- **[Securely using pull_request_target](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target)**
  — the deep dive on the single riskiest public-repo Actions trigger (§3).
- **[Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)**
  — the incident-response doc for a secret already in history (§4).
- **[What happens to forks when a repository is deleted or changes visibility?](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/what-happens-to-forks-when-a-repository-is-deleted-or-changes-visibility)**
  — the fork-network mechanics (§4).

### Condensed action checklist (synthesized from the above, not a separate GitHub source)

1. Audit full Git history (all branches/refs) and Issues/PRs for secrets and
   anything written assuming a private audience — before flipping.
2. Flip visibility (Settings → Danger Zone → Change visibility) — expect push
   rulesets to be disabled as a side effect.
3. Immediately re-enable/verify: branch protection or rulesets on the default
   branch; push rulesets specifically (were auto-disabled by the flip).
4. Enable GitHub Secret Protection (secret scanning alerts + push
   protection) — free on public repos — and triage the initial full-history
   scan.
5. Enable Dependabot alerts + security updates.
6. Review Actions settings: Allow-Actions scope, fork-PR-workflow-approval
   policy, confirm `GITHUB_TOKEN` default is read-only, audit any
   `pull_request_target`/`workflow_run` workflows for unsafe fork checkout,
   pin third-party actions to commit SHAs.
7. Add `SECURITY.md` and enable private vulnerability reporting.
8. For any secret found in history: rotate it first; only pursue a
   `git-filter-repo` history rewrite + GitHub Support cache purge as a
   secondary step, understanding it can't reach existing forks or clones.
