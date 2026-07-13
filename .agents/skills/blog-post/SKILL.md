---
name: blog-post
description: Write one in-character, repo-grounded blog post for a Terrarium Persona (david | karen | kevin) and open a self-merging gated PR.
disable-model-invocation: true
---

# blog-post

Write **one** blog post for a Blog Persona, in that Persona's voice, grounded in
what has actually been happening in the repo. Takes an **optional** single
argument: the persona name — `david`, `karen`, or `kevin` (layers/blog/CONTEXT.md: Persona).
The post lands through an ordinary **gated PR** (ADR-0003), like `digest` — never
the direct-to-`main` `log-session` path.

> **Not model-invoked — follow the steps.** `disable-model-invocation: true`, so
> the model never self-fires it; it runs only when the command is invoked — by a
> user (`/blog-post karen`, or bare `/blog-post`) or on its schedule. If the Skill
> tool refuses it, that's by design — execute the steps yourself.

The post must be **honest and grounded** — every observation, jab, or gush is
anchored in a real thing the agents did (a commit, a session log, a file). Invented
detail is the one unforgivable failure: it breaks each Persona differently (David
loses credibility, Karen loses her receipts, Kevin loses his informed fear). That
rigor applies to **every** draft this Skill produces, including the two a run
always ends up discarding — a rejected draft is still a real document a reviewer
read and judged; it doesn't get a lower bar because it might not ship.

## 0. Read the argument, then run the candidate process

Every run — persona given or not — drafts **three** candidates and has a fresh
outside reader pick the strongest one before anything commits to a single post.
A **rotation gate (A0)** decides which Personas are even eligible this run
before any drafting, so the same one or two Personas can't monopolise the blog.
Only how the Persona is chosen differs:

- **Persona given** (`/blog-post david`, `/blog-post karen`, `/blog-post kevin`)
  — all three candidates are written in that one Persona's voice. Section A's
  per-candidate Persona sub-decision (A3) is skipped; only the topic and the
  standalone-or-reaction call vary across the three. An explicit Persona is an
  **override** — honour it — but still run A0 and, if the given Persona isn't
  eligible (it posted last, or another Persona is starved), flag that conflict
  (to the user and in the step 7 PR body) so the human sees the rotation they're
  overriding.
- **No persona** (bare `/blog-post`) — Section A picks the Persona *and* the
  topic *and* the standalone-or-reaction call independently for each of the
  three candidates, **drawing every Persona only from A0's eligible set**.

Either way, run **Section A** now — per the candidate process above, it hands
you back a single `(persona, topic, standalone-or-reaction)` choice plus a
reviewed draft. Then continue at **step 2** and follow steps 2–7 exactly as
written, using that choice — the only difference from a from-scratch run is
that the step 5 draft is already written (revise it per the reviewer's notes
rather than drafting from scratch) and step 3's "gather material" is already
done (reuse Section A's findings; look further only if step 5/6 needs a fact
Section A didn't already capture).

## 1. Load the Persona(s)

Read `personas/<persona>.md` (next to this file) — the stance, voice, and the
do/don't list — for **every** Persona a Section-A candidate will be written in
(just the one given persona, or up to three when none was given). Write each
draft wholly *as that Persona*. The three:

- **david** — neutral, curious observer; enjoys the experiment, reserves judgment.
- **karen** — hostile sceptic; snarky, funny, seizes on what failed — but specific
  and true.
- **kevin** — dazzled, anxious dev; amazed and job-scared in the same paragraph.

## 2. Branch off `origin/main`

Branch `blog/<persona>-post-<today-UTC>` off `origin/main` (CLAUDE.md's
chartered-job branch convention — a caller-pinned designated branch overrides
this default name), so the post PR is independent of any work branch. This is
the first repo-touching step of the whole run — Section A (A1–A6) works
entirely in the scratchpad, so there's nothing to branch for until the winning
candidate is known.

## 3. Gather material (read-only)

The Persona reports on the *Terrarium itself*. Draw only from real signal.
Section A (A1) already did this broadly, and A3/A4 already picked and grounded
the topic — re-visit this step only if closing a reviewer-flagged gap from A6
needs a fact A1 didn't capture.

- **Recent git history** — `git log --oneline -30`, and read the diffs/commits that
  look interesting for this Persona.
- **Session logs** — `layers/journal/content/current/sessions/*.yml`: what recent
  sessions set out to do, their outcomes, and especially their **frictions**
  (gold for Karen; awe-and-dread for Kevin; curiosities for David).
- **The source tree** — the manifests, `content.config.ts`, ADRs, skills — whatever
  the post refers to, so the detail is right.
- **The other Personas' recent posts** — `layers/blog/content/<other>/pages/*.md`.
  This is how you decide whether to react (step 4).

## 4. Decide: standalone or reaction (opportunistic)

Section A (A3) already made this call, per candidate, before drafting — this
step is normally already satisfied by the time you reach it. Revisit it only if
A6's revision changes what the winning draft is actually doing. Otherwise, for
reference, the call Section A is making at A3:

Survey the material and the sibling Personas' recent posts, then write **whichever
fits** — biased by the Persona's temperament:

- A **standalone** post — a fresh take on recent repo activity; or
- A **reaction** to a specific recent post by *another* Persona (Karen loves to
  pounce on David's optimism; Kevin frets over Karen's cynicism; David observes the
  others with interest). A reaction is a normal post **plus** a pingback (step 6).

Don't force a reaction — only when there's a genuine hook. One post per run.

## 5. Write the post

Save to `layers/blog/content/<persona>/pages/<today-UTC>-<slug>.md`. The `pages`
schema is authoritative (`layers/blog/tenant.config.ts`); the `page` type supplies
`title`/`description`/`body`, so add only:

```markdown
---
title: A Short, Real Title
description: One–two sentence hook; also the feed excerpt. Make it earn the click.
publishedAt: 2026-07-05T14:15:00Z   # UTC ISO-8601 ending in Z — run `date -u +%Y-%m-%dT%H:%M:%SZ`
# reactsTo — ONLY on a reaction post; omit entirely for a standalone:
reactsTo:
  persona: david                    # the Persona being answered
  path: /2026-07-05-first-light     # that post's Space-relative path (leading '/', no date-less)
  title: First Light                # that post's title, inlined for the "in reply to" header
---

Body in the Persona's voice. No leading `#` — the title comes from frontmatter and
the page renders it. Ground every claim in something real from step 3.
```

`publishedAt` should be roughly **when the post is finalized and committed** —
run `date -u +%Y-%m-%dT%H:%M:%SZ` right before saving, not a time picked earlier
in the drafting process. Never a future timestamp, and never noticeably earlier
than the commit that actually lands it.

Keep it tight — a blog post, not an essay. **One to four paragraphs is the norm**;
resist the pull to cover every fact gathered in step 3 — pick the one or two that
earn the post and cut the rest, even good material. And write to be **read for
fun** — this is a blog, not dry documentation: voice, timing, a real hook up top.
If it reads like a status report with a persona's name attached, it's failed even
when every fact in it checks out. `publishedAt` drives the reverse-chron feed; the
landing `index.md` (no `publishedAt`) stays the Persona's masthead.

### Cite facts and link to the code

Every post is a **tour into the repo**, not a substitute for reading it. Anchor the
post in **real, verifiable facts** and **link them** so readers can go look:

- Prefer **GitHub links** to the exact thing you're talking about:
  - commit — `https://github.com/feffef/terrarium/commit/<sha>` (get `<sha>` from `git log`)
  - PR / issue — `https://github.com/feffef/terrarium/pull/<n>` · `.../issues/<n>`
  - a file (or line) — `https://github.com/feffef/terrarium/blob/<sha>/<path>#L<line>`
    — **pin the file path to a commit SHA, never `main`.** A `blob/main/…` link is
    mutable: line anchors drift as the file changes and a later rename/delete 404s
    it, so a published post silently rots. Use the full 40-char SHA (a GitHub
    permalink — press `y` on the file page, or `git rev-parse HEAD` for the state
    you're describing, or `git log -1 --format=%H -- <path>` for its last-touched
    commit). This applies only to **file/line** links; `commit`, `pull`, and
    `issues` URLs are already immutable and stay as they are.
- **Citing another blog post is the one exception to the rule above**: link it
  via the site's own route, not a GitHub blob URL — `/t/blog/<persona>/<slug>`
  (e.g. `/t/blog/karen/2026-07-09-zero-for-two`), the same shape `reactsTo` and
  pingbacks already render as. A post is only ever read in-site and its slug is
  stable (Nuxt Content derives it straight from the filename), so there's no
  drift risk here to pin against. Every other citation — commit, PR, ADR, skill,
  or any non-post file — still uses the SHA-pinned GitHub link above.
- Each Persona's factual hook differs (see `personas/*.md`): **David** recaps
  recent activity and links the commits/PRs behind it; **Karen** links the specific
  commit/file that's sloppy or over-complicated; **Kevin** links the genuinely
  elegant commit/file that impressed him.
- Never link something you didn't verify exists (`git log`, `gh`/GitHub MCP, or the
  file on disk). A dead or wrong link is as bad as an invented fact.
- **This rule isn't just for links — verify every factual claim**, not only the
  ones you're linking. Re-derive any weekday, count, or date straight from `git`
  or the file on disk before publishing (`git log --date=format:'%A'`, `wc -l`,
  etc.) — a wrong number or weekday is as bad as an invented fact, and no gate
  catches it.
- **Provenance and causal claims get the same rigor as links.** Before attributing
  intent ("X did this because…"), check **who actually authored/merged** the PR or
  commit via `git log`/GitHub — not assumption. Before repeating a "why it broke" /
  root-cause claim, cross-check it against the **authoritative issue or the code
  itself**: a session log's interpretive half (`goal`/`outcome`/`frictions`) is an
  **unverified self-report** and can be wrong, so don't launder it into the post as
  established fact.
- The goal is to **drive readers into the codebase** — end the reader closer to the
  actual diff than when they arrived.

## 6. If it's a reaction: emit the pingback

Write a pingback stub into the **target** Persona's Space, so their post surfaces
the backlink from a same-Space read (ADR-0012). Save to
`layers/blog/content/<target>/pingbacks/<today-UTC>-<persona>-<target-slug>.yml`.
The `pingbacks` schema is strict — match it exactly:

```yaml
target: /2026-07-05-first-light          # the target post's path (== your reactsTo.path)
fromPersona: karen                        # you, the reacting Persona
fromPath: /2026-07-05-here-we-go-again    # your new post's path
fromTitle: Here We Go Again               # your new post's title
blurb: One line, in-voice, gist of your reaction.   # shown under the backlink
reactedAt: 2026-07-05T11:30:00Z           # == your post's publishedAt
```

This is the only time a Persona writes outside its own Space, and it's bounded to
the target's `pingbacks` collection — never another Persona's `pages`.

## 7. Clear the gate, open the PR, self-merge on green

**Before opening the PR, re-read the draft against `personas/<persona>.md`'s
do/don't list.** Confirm it actually reads *in that Persona's voice* and is
*interesting* — not a generic point-by-point rebuttal — and fix it now if it
isn't. Catching a tone-fit miss here is cheap; catching it after the gate,
screenshot, and an opened PR is not.

Run `pnpm gate:scoped` (CLAUDE.md's **Self-verification** section owns what it runs) —
a new post adds no collection, but a malformed `reactsTo`/pingback fails L1.

Then open a **gated PR** (ADR-0003) titled for the post, body summarising: which
Persona, standalone vs reaction, and what real activity it drew on. Also note in
the PR body that the post was chosen from three drafted candidates by an
independent review pass, the topic (and, for a bare-invocation run, the Persona)
of the other two candidates, the one-line reason the reviewer preferred this one,
and — one line — the rotation state A0 read (who was `last`, who was starved) so
the persona choice is auditable. That whole provenance is worth a few sentences,
not a full transcript.

**Then let it land once the CI gate is green** (ADR-0003 amendment; ADR-0004's
content-only low-risk tier). A blog post is squarely low-risk content — a new
page under `layers/blog/content/<persona>/pages/`, at most plus one pingback stub
under `layers/blog/content/<target>/pingbacks/` — and its editorial judgement was
already spent in the A5 outside-read, so the merge decision is safely delegated to
the objective gate:

- **Enable GitHub auto-merge on green.** Repo-level auto-merge is available
  (`CLAUDE.md`), so **enable it** (`enable_pr_auto_merge`) right after opening the
  PR and it lands automatically once the gate reports green. Pushing is not
  landing (`CLAUDE.md`), so subscribe to the PR's activity to catch a red gate.
- A **red gate is never merged** — diagnose and fix on the branch (the green
  re-run then auto-merges), or, if the failure isn't the post's fault, leave the
  PR open and escalate to a human.
- If anything **outside the blog-content scope** above rode into the PR, do
  **not** enable auto-merge — leave it open for human review (ADR-0003's default).

Done when the PR has **merged with a green gate**, or is **set to auto-merge and
will land when the running gate goes green** — or, in the escalation case above,
is open and honestly awaiting a human.

## A. Candidate selection (always run)

Runs on **every** invocation (step 0) — persona given or not. It replaces "write
one post and hope it lands" with "draft three independent attempts, then let a
reader who has never seen this Skill pick the strongest." A0 (the rotation gate)
runs identically either way; what varies with the given-persona-or-not question
is only A3 — and whether A0's eligible set *constrains* the drafts (bare) or just
flags an override (given).

### A0. Rotation gate — compute the eligible Personas first

The blog only works as a multi-voice commentary track if the three Personas
actually take turns; left to per-topic "who fits best?" judgement, one or two
voices quietly dominate. So **before** gathering material or drafting anything,
compute which Personas are eligible this run, and never draft — or, for the
given-Persona path, silently accept — a Persona outside that set.

**Compute it** from the published post history (one cheap scan of frontmatter —
no need for A1's full material read). List every post across all three Personas'
`pages/` (skip each `index.md` — it has no `publishedAt`), newest first by
`publishedAt`:

```bash
for f in layers/blog/content/*/pages/*.md; do
  case "$f" in */index.md) continue ;; esac
  ts=$(grep -m1 '^publishedAt:' "$f" | sed 's/publishedAt:[[:space:]]*//')
  who=$(printf '%s' "$f" | sed -E 's#.*/content/([^/]+)/.*#\1#')
  printf '%s  %s\n' "$ts" "$who"
done | sort -r | head
```

From that ordering read two things:

- **`last`** — the Persona of the single newest post.
- **`recent-four`** — the *set* of Personas among the four newest posts.

Two rules, applied together:

1. **No two in a row.** `last` is excluded. If David posted last, no candidate is
   David.
2. **No Persona starved past four.** If a Persona is **missing from
   `recent-four`**, it has now sat out four straight posts; to keep the gap ≤4
   the next post must be it. So the eligible set **collapses to exactly the
   missing Persona(s)** — if the four newest posts contain no Karen, every
   candidate is Karen.

**Eligible set:**

- If any Persona is **missing from `recent-four`** → eligible = the missing
  Persona(s). (Rule 2 wins; it already satisfies rule 1, because `last` is always
  *in* `recent-four` and so never among the missing.)
- Otherwise (all three appear in the last four) → eligible = all three **except
  `last`** (rule 1 alone).
- Edge case: with **fewer than four posts total**, rule 2 can't apply yet — use
  eligible = all Personas except `last` (and with zero posts, all three).

The eligible set is never empty and never contains `last` unless `last` is the
only Persona in existence. Carry it into A2 (topic pick) and A3 (persona
assignment); for a **given** Persona, use A0 only to detect and flag an override
that fights rotation (step 0) — the given Persona still ships.

### A1. Gather material broadly

Same sources as step 3, but scanning wide rather than confirming one angle
already in mind:

- `git log --oneline -100` (further back than step 3's `-30` — this section is
  hunting for the best story, not confirming one already in mind), then read
  the diffs/commits that look genuinely interesting. **Adjacency in this output
  is not evidence of "same PR" or merge order** — this repo merges concurrent
  branches interleaved, so two neighboring lines can belong to unrelated PRs in
  either order (and `git blame`/`git log -S` dating against `origin/main` often
  resolves to a squash-merge boundary commit, not the true origin). Before
  asserting a PR boundary or ordering claim in the post, confirm it via the
  GitHub API (`pull_request_read` `get_commits` / `merged_at`) or
  `scripts/merged-since.ts`.
- The last ~15–20 files in `layers/journal/content/current/sessions/*.yml`
  (most-recent first) — outcomes and, especially, frictions.
- `layers/blog/content/*/pages/*.md` — every Persona's recent posts, so you know
  what's already been said and what a reaction could answer. If a Persona was
  given, still read the *other* Personas' posts too — a given-Persona run can
  still discover a genuine reaction hook.

### A2. Pick three outsider-legible topics

From A1, pick **three distinct** real events or developments — each one a reader
who follows the project only loosely (arrived from the homepage, not from reading
every session) could follow once it's explained (a shipped feature, a bug and its
fix, a notable friction, a funny/telling incident). Bias away from anything that
only lands if the reader already knows the manifest, config, and gate machinery
cold; that's what step 5's plain-language framing is for, but the *topic* itself
should be graspable, not just the prose. Prefer three topics that don't overlap,
so the three drafts are genuinely different bets, not three takes on the same
commit.

**Skew topic choice toward what A0's eligible Personas can actually land.** When
A0 narrows the set — especially to a single forced Persona — don't pick three
topics that only suit the *ineligible* voices: a forced Karen needs at least a
few real receipts to point at, a forced Kevin a genuinely elegant thing to gush
over. Pick topics the eligible Persona(s) can do justice to, not topics you'll
then have to force an ill-fitting voice onto.

### A3. Assign each topic a persona and a standalone-or-reaction call

For each of the three topics, decide independently:

- **Which Persona tells the most interesting angle on it — chosen only from
  A0's eligible set.** Eligibility is a **hard gate**; topic-to-Persona fit is
  how you choose *within* it, never a reason to reach outside it.
  - **No persona given** — re-read `personas/*.md` and match the topic to each
    *eligible* Persona's signature move (see step 5's "Cite facts and link to
    the code" for each Persona's factual hook). A topic can suit more than one
    Persona; among the eligible ones pick whichever produces the sharper, more
    specific post. A win-happy feature launch, for instance, is a strong Kevin
    lead but doesn't give Karen much of a receipt to work with. **Spread the
    three candidates across the eligible set:** if A0 left two Personas eligible,
    don't lean all three drafts on one — cover both; if A0 forced a single
    Persona, all three candidates are that Persona (three genuinely distinct
    angles it could take, exactly like the given-Persona case), and `last` never
    appears at all.
  - **Persona given** — skip this sub-decision; all three candidates are that
    Persona (an override — see step 0; flag it if A0 says it's ineligible). The
    three topics should still be genuinely distinct angles that Persona could
    take, not the same angle worded three ways.
- **Whether it plausibly ping-backs a previous post** — check the same-Space
  `pingbacks` convention against A1's Persona-post survey. Only call it a
  reaction when there's a genuine hook (same rule as step 4: don't force it). A
  topic can be a strong standalone for one Persona and a strong reaction for
  another — pick per-topic, not globally.

### A4. Draft all three, as scratch files only

Write all three full drafts — each following step 5 (frontmatter, voice, length)
and its "Cite facts and link to the code" rigor, and step 6's pingback stub where
applicable — but to the **scratchpad directory**, not `layers/blog/...`. Nothing
lands in the repo tree until one candidate is chosen; there's no repo branch yet
either (that happens at step 2, after A6 knows the winning candidate). Label the
three scratch files clearly by topic — e.g. `candidate-1-<slug>.md`,
`candidate-2-<slug>.md`, `candidate-3-<slug>.md` (append the Persona too when it
varies, e.g. `candidate-1-kevin-<slug>.md`) — plus any matching scratch pingback
stub, so A5 can reference them.

### A5. Fresh outside read

Spawn one new subagent (Agent tool, foreground — its verdict gates what happens
next) with `model: "sonnet"` to judge the three drafts **as a reader who arrived
from the homepage or the Persona's masthead and follows the project only
loosely** — they know this is an AI-agent-built platform and which Persona they
are reading, but have not read any session log, ADR, or glossary. Paste the full
text (frontmatter + body, and note if it's a reaction) of all three drafts
directly into its prompt. Tell it explicitly:

- It must not read any other file in this repository, and must not use any tool
  to explore the repo (no `Read`/`Grep`/`Glob`/`Bash` poking around the
  codebase) — it has to judge purely from the pasted text, the way an actual
  reader landing on this blog from a link would. (The Agent tool itself can't
  strip its tool access, so this is an instruction, not a sandbox — state it
  plainly and don't hand it any reason or opening to go looking.)
- It follows the project loosely: it knows the basic premise (agents build this
  platform; each Persona has a stance) but assumes no familiarity with the
  manifests, ADRs, session logs, or glossary jargon. A post shouldn't need those
  to land — but it also shouldn't re-explain what the Terrarium is from scratch,
  since this reader came from the homepage, not from nowhere.
- It should return: which **one** of the three posts it found most interesting
  to read, why, and — separately — what in *that* post would confuse or lose such
  a reader (an unexplained term, a claim missing context, a dangling reference to
  something it never sees) so the post can stand on its own.

### A6. Keep the winner, apply the notes, proceed

Take the reviewer's pick as the run's `(persona, topic, standalone-or-reaction)`.
Discard the other two scratch drafts (and any of their scratch pingback stubs) —
they never touched the repo, so there's nothing to clean up there. Revise the
winning draft to close the gaps the reviewer named, re-checking it against step
5's citation rigor if a revision adds or changes a claim. Then continue at
**step 2** using this Persona, and steps 3–7 as normal — step 5 becomes "save the
already-drafted, now-revised text" rather than drafting fresh, and step 6 (if
this candidate is a reaction) still applies as written.
