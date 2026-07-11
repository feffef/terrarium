# Public-readiness review — before flipping `feffef/terrarium` to public

A one-time review of what must be addressed before this repository's visibility
is switched from **private** to **public read**. The generic GitHub mechanics
(what becomes visible, which settings to enable, fork/secret-scanning behaviour)
are single-homed in **[`making-repo-public.md`](./making-repo-public.md)** — this
doc is the **repo-specific** findings and the owner decisions still open.

_Review date: 2026-07-11. Scope: full working tree + all git history (92
commits), CI, deploy, issues/PRs, and the ADR/skill agent workflow._

## Headline

**No secret/credential blocker.** The full tree and entire history are clean — no
API keys, tokens, private keys, or `.env` files were ever committed (pickaxe
across all refs; the only `github_pat_` match anywhere is the literal
`github_pat_xxxx` placeholder in `deploy/README.md`). The site content is already
public (deployed at `terrarium.feffef.de`) and a write collaborator already
exists, so going public newly exposes four surfaces: **git history, issues/PRs,
Actions logs, and the agent workflow's attack surface.**

## Addressed in this change

- **`deploy/README.md` infra disclosure** — genericized the concrete Docker
  operator account and removed the co-located sibling-project name (a neighbor
  host the repo doesn't own). Replaced with `<deploy-user>` / a generic
  "other project on the host".
- **`SECURITY.md`** — added; routes reporting through GitHub private
  vulnerability reporting (no personal email exposed).

## Decisions for the owner (status noted inline; #2 still open)

1. **LICENSE.** ~~There is none.~~ **Resolved** — MIT `LICENSE` added (© 2026
   Steffen Sauder), granting read/reuse rights.
2. **Personal email in history.** `steffen.sauder@gmail.com` is baked into ~21
   commits' author/committer metadata and becomes permanently harvestable.
   History rewrite **cannot** fully undo this (forks + cached views persist —
   see `making-repo-public.md` §4). Realistic options: accept it, or move
   *future* commits to a GitHub `noreply` address and enable *"Block command
   line pushes that expose my email."*
3. **Governance / prompt-injection (the sharpest workflow risk).** The ADR
   governance model assumes a **single trusted human** (ADR-0003, CONTEXT.md);
   issue #213 already documents this breaking and is explicitly *"do NOT
   implement until the owner finalizes."* Going public makes it a prerequisite:
   - ADR-0004's gate checks a PR's **output** mechanically but never the
     **intent of the input** that produced it.
   - Autonomous agents (triage, `frictions-to-fixes`, the `subscribe_pr_activity`
     autofix loop) **read and act on attacker-controlled** issue/PR/comment
     bodies once anyone can file them — a prompt-injection surface.
   - **Merge-to-`main` is remote code execution on the VPS** via the ADR-0011
     self-updating deploy container (`git reset --hard` → `pnpm install` runs
     lifecycle scripts → `pnpm build` → execute). The human-only merge gate is
     therefore also the RCE boundary and must stay strict; consider
     `pnpm install --frozen-lockfile --ignore-scripts` in the deploy path.

   → **Addressed** — **ADR-0020** (accepted) draws the trust line at write
   access: Trusted (write access) vs. Public (read-only), whose
   issues/PRs agents treat as untrusted input — never implemented without a
   Trusted green-light, never auto-merged. The mechanical half (fork-PR workflow
   approval + human-only merge for Public PRs) still needs enabling at the flip.
   The deploy-path `--ignore-scripts` hardening remains a separate open item.

## GitHub settings to configure at/after the flip

Detail and citations in [`making-repo-public.md`](./making-repo-public.md) §3.
Repo-specific priorities:

- Re-enable push rulesets (the flip auto-disables them) and branch protection on
  `main` (require PR + review + green gate, block force-push) — this is the RCE
  boundary.
- Enable **secret scanning + push protection** (free on public repos, off by
  default).
- Set Actions fork-PR approval to **require approval for all outside
  collaborators** — CI runs `pnpm install` + `pnpm build` on fork code.
- Confirm `GITHUB_TOKEN` default stays **read-only**.
- Enable Dependabot alerts + updates; enable private vulnerability reporting.

## Verified clean / low-risk (no action)

- No secrets in tree or history; `.env` never committed; no key/cert files ever;
  `.gitignore` covers `.env` / `.data` / `.claude/settings.local.json` /
  `.session-logs/`.
- `.claude/settings.json` and `nuxt.config.ts` hold no secrets.
- `.github/workflows/gate.yml` uses `pull_request` (not `pull_request_target`),
  has no script-injection vector (only `github.sha` / `.number` / `.repository`
  reach `run:`), and pins actions to major tags. *Minor:* the doorbell
  `gh pr comment` step needs `pull-requests: write`, which a fork PR's read-only
  token lacks — it will fail on outside PRs (cosmetic). Consider pinning actions
  to full commit SHAs for supply-chain hardening.
- Session logs / ADRs are professional; nothing embarrassing.
- `Claude-Session:` URLs in commits/issues are auth-gated (opaque to the public)
  — fine to keep per ADR-0017.
