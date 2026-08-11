---
name: midden-survey
description: Sweep the Platform's recent history for Midden candidates — deleted files, dropped dependencies, closed-unmerged PRs, dormant branches — apply the two-gate inclusion test, and file one survey-report issue for the curator to grade. Discovery only; it never authors artifacts or grades condition.
disable-model-invocation: true
---

# Midden Survey

The field-walk that precedes an excavation: find what the Platform has
discarded since the last survey, screen it against the Midden's **inclusion
bar** (the two-gate test — `layers/midden/CONTEXT.md` is its single home), and
hand the survivors to the curator as **one survey-report issue**. This Skill
mechanizes *discovery only*. Grading `condition`, naming a `stratum`, writing
the `catalogNote`, and deciding what actually enters the trench are
curator work and stay out of scope here — cataloguing happens in a separate,
green-lit session (ADR-0003), not in this one.

Run it when asked (frontmatter deliberately disables self-invocation — if you
notice the trench falling behind mid-session, propose a run rather than
firing one).

## 1. Ground yourself, then run the mechanical sweep

- Read `layers/midden/CONTEXT.md` first — especially **The inclusion bar**
  (Gate A: terminal disposition; Gate B: no living successor) and **Artifact**
  (what a candidate would become).
- The sweep needs full history: if `git rev-parse --is-shallow-repository`
  says `true`, run `git fetch --unshallow origin main` first. The script below
  refuses to run shallow rather than silently under-reporting.
- Run the mechanical half:

  ```
  pnpm exec tsx scripts/midden-survey.ts [--since YYYY-MM-DD]
  ```

  It enumerates **deleted files** and **dropped dependencies** on
  `origin/main`, already screened for noise paths, relocations (a file that
  moved rather than died — git's own rename records, followed forward across
  commits so a move made *later* than the deletion still counts, plus exact
  content standing at another path today), regrown paths / re-added
  deps (the mechanical slice of Gate B), and candidates the trench or the stores already
  catalogue — by provenance identity, or by a declared path, which screens a
  whole subtree when it names a directory, and which, on a commit-kind artifact,
  screens only the deletion that artifact's own commit performed (a commit-kind
  path records what the commit *touched*, so a later death of that path is still
  an uncatalogued find). The dependency sweep reads `package.json`
  history, deliberately not the lockfile — transitive lockfile churn is not
  discarded *work*, only a direct dependency someone chose and then dropped is. Bound the sweep with `--since` (e.g. the
  previous survey's date, from the last survey-report issue) rather than
  re-walking all history every run.

## 2. Sweep what git can't see — PRs and branches, via the GitHub MCP tools

Load schemas via `ToolSearch` before the first call (fully-qualified
`mcp__github__*` names; see `docs/agents/github-integration.md` for
pagination/overflow guidance).

- **Closed-unmerged PRs**: `mcp__github__search_pull_requests` with
  `repo:feffef/terrarium is:pr is:closed is:unmerged` (bounded by
  `closed:>=<since>`). A PR **superseded by another PR that carried the same
  change in** fails Gate B — note the successor and drop it. These PRs' head
  refs are also the only place a **deleted branch** still surfaces —
  `list_branches` sees live refs only — so a dead branch candidate usually
  arrives here, wearing its PR.
- **Dormant branches**: `mcp__github__list_branches`, screening out `main` and
  any branch with an **open** PR. Gate A for a branch additionally needs the
  inclusion bar's **dormancy floor** — `layers/midden/CONTEXT.md` owns the
  figure — checked against the branch's last-commit date
  (`mcp__github__list_commits` on the branch). A briefly quiet branch is not
  yet a corpse.
- **Dedupe** both kinds against the trench *and* the stores yourself: grep
  `layers/midden/content/trench/artifacts/` and
  `layers/midden/content/stores/artifacts/` for the PR number or branch name,
  and count only a hit inside an artifact's `provenance` block (a bare
  `name:`/number match elsewhere — an inscription, a catalog note — is not
  prior cataloguing). The script's dedupe covers only the file/dep candidates
  it generates.

## 3. Judge the candidates — both gates, curatorial signal over bulk

For each remaining candidate, apply the two-gate test (`layers/midden/CONTEXT.md`'s
inclusion bar owns Gate A/Gate B's definitions) honestly and keep only what
passes **both** gates:

- **Gate A** — a file deleted mid-refactor whose purpose obviously moved
  elsewhere is not terminal.
- **Gate B** — the script rules out same-path regrowth, same-name re-adds,
  and files that merely moved mechanically; **successor-under-a-new-shape is
  your judgment call** — a file rewritten into a successor git never paired as
  a rename is invisible to the script by design, so check where the deleting
  commit's siblings moved the behavior before concluding nothing did. A
  candidate that *fails* Gate B because something renamed or superseded it in
  place is out of the Midden's scope — record it as a Gate-B exclusion rather
  than silently dropping it. The report's `screenedOut.relocations` are already
  exactly that: exclusions the machine could decide, carry them into the issue's
  list alongside your own.
- **Cluster, don't enumerate**: a batch of files deleted by one commit for one
  reason (a prototype swept away, a component family retired together) is
  **one** candidate with several paths, not N candidates. The Midden
  catalogues *things the Platform stopped doing*, and dig reports narrate
  clusters — mirror that shape here.

## 4. File one survey-report issue — the deliverable

File a single issue per run (search the tracker first so a still-open earlier
survey gets a comment, not a duplicate). For each surviving candidate:

- what it was, and its **evidence**: the deleting/dropping commit or the
  PR/branch, dates, and links;
- a **draft `provenance` block** in the artifact schema's shape
  (`layers/midden/tenant.config.ts`), including a `continuityCheck` line
  recording exactly which Gate-B check ran and what it found — plus a draft
  `removedIn` where the terminal event is a commit (the script already reports
  the deleting/dropping hash per candidate); `remains` stays out of the draft —
  it is curator-curated by definition (CONTEXT.md's Artifact term);
- one line on why it passes both gates.

State plainly in the issue that `condition`, `stratum`, `site`, and the
`catalogNote` are the curator's to author — never proposed here (the
CONTEXT.md Condition term's "100% curator-authored" rule). Label the issue
`needs-triage`, list any Gate-B exclusions from §3 at the end, and
carry the ADR-0017 provenance header. Filing the issue is where this Skill
stops — implementing any accepted candidate is a later, separately green-lit
session's work.
