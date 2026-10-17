# Guest & external contributions

How the Platform handles contributions from **outside our Claude Code
toolchain**: non-collaborators (**Public** authors, ADR-0020) and external
*agents* on a different harness, model or environment. This page is an **index
plus house rules**; the substance lives in the ADRs it links.

## Two distinct modes — don't conflate them

1. **Guest pipeline (ADR-0023).** A Public user files an issue, and **our
   own** agents (`guest-intake` → `guest-build`) refine and build it into a PR
   the owner merges. The guest never runs an agent; we do.
2. **External-agent fork PR.** An external contributor's *own* agent (a
   different harness or model, ADR-0009) does the work on a fork and opens a PR.
   The house rules below are about this mode.

## Trust (ADR-0020)

A fork PR from a non-collaborator is **Public**, decided by `authorAssociation`
(`scripts/lib/author-trust.ts`), not by label: a fork PR never gets `trusted`
(`docs/agents/issue-tracker.md` has the label's mechanics).
Public input is untrusted and can carry prompt injection. A merge is
where its code reaches the server (ADR-0011), so the **code-execution boundary
stays at merge, which is human-only** (ADR-0020). The Actions fork-PR approval
setting should be "all external contributors"; GitHub's default and the other levels are in
`docs/research/making-repo-public.md` §3. Whether the owner turned it on is open
(`docs/research/public-readiness-review.md`).

## Before summarizing or recommending on a Public/guest-filed issue

An issue's `authorAssociation` (already in its first tool response) shows
**history**, not only the Trusted/Public write-access split in
`scripts/lib/author-trust.ts`: `CONTRIBUTOR` means the user has had a PR merged here.
Before writing a summary, search this repo's PRs by that user
(`mcp__github__search_pull_requests` with `owner`/`repo`, `author:<user>` and
`fields`; `docs/agents/github-integration.md` covers the scoping and 403
traps), so the summary covers what they already built.

## Replying to a Public fork PR

Whether a human or an external agent wrote it, reply in a **friendly, encouraging**
tone: thank them, name what works, then treat every unmet rule as a fixable next
step, not a rejection. For each gap, name the rule, link its home, and show the
concrete change. For example:

> Thanks — the new Specimen reads great! Two small things before it can land:
> the session log needs `external: true` (ADR-0009) — just add that
> line to `layers/journal/content/current/sessions/<your-log>.yml`; and
> `pnpm validate:content` flags `slug: fern` in `food-web.yml` as unknown —
> did you mean `ferns`? Happy to help if anything's unclear.

## House rules for an external-agent fork PR

- **The session log rides *in the PR*.** An external session has no `Stop` hook
  or `main` push access, so it commits its log as an ordinary file in the
  feature PR (`layers/journal/content/current/sessions/<date>-session_<id>.yml`),
  which lands when the PR merges: the one sanctioned case of a session log
  travelling a PR (ADR-0009).
- **One honest log per unit of work, revisions included.** A session that revises the PR (a rebase, a
  review-driven fix) **updates the existing log** (new frictions, changed
  outcome) or **adds a second `external` log**: an unlogged revision round is
  the gap we most want to avoid. A harness without discrete, isolated sessions
  gets as close as it can: the goal is honest coverage, not copying our
  mechanics.
- **Mark it `external: true`** to declare a foreign toolchain; ADR-0009 says
  what that changes.
- **Provenance marker (ADR-0017)** on every agent-authored GitHub interaction,
  the same marker we use.
- **Merge is human-only** (ADR-0020, ADR-0004): a Trusted user reviews and
  merges by hand, no auto-merge.

## See also

- `docs/agents/issue-tracker.md` — how external PRs enter the triage queue.
