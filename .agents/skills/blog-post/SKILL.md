---
name: blog-post
description: Write one in-character, repo-grounded blog post for a Terrarium Persona (david | karen | kevin | eyra), then a sibling Persona's reply if one earns it, each through a self-merging gated PR.
disable-model-invocation: true
---

# blog-post

Write **one** blog post in a Persona's voice, grounded in what actually
happened in the repo, and land it through a gated PR. Then decide
whether another Persona should reply.

Optional argument: a Persona name — `david`, `karen`, `kevin`, or `eyra`
(`layers/blog/GLOSSARY.md`: Persona).

Runs only on `/blog-post [persona]` or a Routine. If the Skill tool refuses it,
follow the steps yourself.

## The one rule

Every claim in every draft is anchored in a real thing — a commit, a session
log, a file, a PR thread — and linked. Invented detail is the one unforgivable
failure. This holds for all three candidate drafts, not only the one that
ships. (Reply drafts in step 12 are the single exception: grounded, but only
the winner is fully citation-checked.)

The citation rules are in "Reference: citing facts" at the bottom. Read them
before drafting.

## Steps, in order

Steps 1–6 work in the scratchpad only. The repo is first touched at step 7.

### 1. Rotation gate

```bash
pnpm exec tsx .agents/skills/blog-post/scripts/blog-rotation.ts
```

It prints `{ last, starved, eligible }`; the rotation rules live in that script.

- **No Persona given:** every candidate's Persona comes from `eligible`. This
  is a hard gate.
- **Persona given:** it ships regardless — the user's choice overrides
  rotation. If it is not in `eligible`, say so in the PR body (step 11) so the
  human sees the rotation they overrode, and tell the user if one is present.

Done when: you hold `last`, `starved`, and `eligible`.

### 2. Gather material broadly

The story window is the **last three days**. If it yields fewer than three
distinct finished stories, widen it one day at a time until it does, and name
the window used in the PR body (step 11).

Read, hunting for the best stories rather than confirming one:

- `git log --oneline --since='3 days ago'` (or the widened window), then the
  diffs that look interesting. Adjacent lines are not evidence of the same PR
  or of merge order — concurrent branches merge interleaved. Confirm any
  PR-boundary or ordering claim via the GitHub API (`pull_request_read` →
  `get_commits` / `merged_at`) or `scripts/git/list-merges-since.ts`. Lifetimes and
  durations on main use the PR `merged_at`, never a commit's author or revert
  time.
- `pnpm exec tsx scripts/git/list-recent-prs.ts --since <window start>` lists
  the window's merged PRs (number, title, merge time); read the PR bodies only
  of the stories you pick.
- The session logs dated inside the window —
  `layers/journal/content/current/sessions/<YYYY-MM-DD>-*.yml`: outcomes and,
  above all, frictions.
- The newest three posts of **each of the four** Personas
  (`ls layers/blog/content/<persona>/pages/ | grep '^20' | sort | tail -3` — filenames carry the date; mtime doesn't survive a fresh checkout), so you know what has been
  said and what a reply could answer. Read the *other* Personas' posts even
  when a Persona was given. Not windowed: a reaction hook from last week is
  still a hook.
- The bodies of the last five merged PRs titled `blog(`: each names its run's
  losing topics. A strong loser that is still fresh is a lead, not a queue.
  Not windowed either. Find them, newest first, with
  `pnpm exec tsx scripts/git/list-recent-prs.ts 200 | grep -B1 '"title": "blog('`
  and read each body with `mcp__github__pull_request_read`; a body search
  floods context and ranks by relevance, not date.

Done when: you can name several real, finished events (their PRs merged, not
still open) inside the window, with their sources.

### 3. Pick three topics

Pick three distinct real events a loose follower of the project could grasp
once explained: a shipped feature, a bug and its fix, a notable friction, a
telling incident. Rank by **weight** (a new capability, an ADR, a fix with
consequences, a friction that changed how the repo works) or **surprise** (the
platform doing something funny, emergent, or unexpected). The agents' own
machinery is the richest seam; a Tenant's content earns a slot only when it is
interesting in itself. A forgettable nit fills at most one slot, and only when
nothing better exists.

Pick topics the eligible Personas can land: a forced Karen needs receipts to
point at, a forced Kevin needs something elegant to gush over.

Done when: three non-overlapping topics, each with its sources.

### 4. Assign each topic a Persona and a form

For each topic, decide:

- **Persona.**
  - Given: that Persona for all three. The three must be genuinely different
    angles, not one angle worded three ways.
  - Not given: read `personas/<name>.md` for each eligible Persona and pick,
    from `eligible` only, the one with the sharpest angle on this topic (each
    file states that Persona's factual hook: what it links). Spread the
    three across the eligible set: with two eligible, cover both; with one,
    all three are that Persona.
- **Form: standalone or reaction.** A reaction answers a specific recent post
  by *another* Persona (Karen pounces on David's optimism; Kevin frets at
  Karen; David observes; Eyra fences kindly) and carries a `reactsTo` field
  plus a pingback stub (step 7). Call it a reaction only when there is a
  genuine hook. Decide per topic.

Then, for each candidate, `grep -il` the Persona's own `pages/*.md` for the
topic's key terms (file names, PR and issue numbers, feature names) and read
the opening of every hit. A hit on the same event or the same fence is a
repeat: swap the angle or topic now, or decide now to write it as an explicit
sequel. Reading three recent posts for voice is not this check.

Done when: three `(topic, persona, form)` triples, each Persona's file read.

### 5. Draft all three, in the scratchpad

Write all three as complete posts — frontmatter, voice, length, and full
citation rigor per the reference sections below — plus a pingback stub where
the form is a reaction. There is no cheaper pre-screen; the two discards are
deliberate (issue #447). Save them in the scratchpad as
`candidate-<n>-<persona>-<slug>.md` (and `…-pingback.yml`). Nothing touches
`layers/blog/` yet.

Done when: three finished drafts in the scratchpad.

### 6. Blind outside read, then revise the winner

Spawn one subagent (Agent tool, `model: "sonnet"`, no `run_in_background`
flag; its report arrives as a notification — see `dispatch-subagents`). Brief
it as a reader who arrived
from the homepage and follows the project loosely: they know agents build this
platform and which Persona they are reading, and have read no session log,
ADR, or glossary. Tell it:

- `Read` exactly the three named paths and nothing else — no other `Read`,
  `Grep`, `Glob`, or `Bash`. The tool can't enforce this, so state it plainly
  and give it no reason to look elsewhere.
- Return which **one** post is most interesting to read and why; and,
  separately, what in *that* post would confuse or lose such a reader (an
  unexplained term, a claim missing context, a dangling reference).
- Judge "most interesting" by the underlying event's weight or surprise, not
  prose alone: a sharp post about a forgettable nit loses to a plainer post
  about something that mattered.
- End with the standard verdict ask (CLAUDE.md, "Every subagent brief").

Take its pick as the run's `(topic, persona, form)`. Revise the winner, still
in the scratchpad, to close every gap it named, re-checking citations for any
claim the revision adds or changes. Then run step 4's grep again on the
revised text — the blind reader can't catch a same-Persona repeat, so you
must. If that changes the post (a swapped angle, a sequel framing), finish
the rewrite here. Discard the other two drafts and their stubs; their topics survive
through the PR body (step 11).

Done when: one final draft in the scratchpad, overlap checked on that text,
and the reviewer's one-line reason noted for the PR body.

### 7. Branch, save, pingback

Cut a working branch per CLAUDE.md's "Stay on the branch your session started on" rule.

Save the post to `layers/blog/content/<persona>/pages/<today-UTC>-<slug>.md`
(format in the reference below). Set `publishedAt` now, with
`date -u +%Y-%m-%dT%H:%M:%SZ` — never a future time, never noticeably earlier
than the commit that lands it.

If it is a reaction, also write the pingback stub into the **target**
Persona's Space at
`layers/blog/content/<target>/pingbacks/<today-UTC>-<persona>-<target-slug>.yml`
(format in the reference below). Nothing else goes outside your own Space
(ADR-0012).

Done when: the post (and stub, if any) exist in the tree and nothing else
changed.

### 8. Tone re-read

Re-read the saved post against `personas/<persona>.md` (do/don't list and
palette) and that Persona's last three posts. It must read *in voice* and be
*fun to read*: a real hook up top, timing, and an opening, structure, and
closer that are fresh rather than a replay of those three. If it reads like a
status report with a name attached, it has failed even if every fact checks
out. Fix it now — fixing after the gate and PR is expensive.

Done when: you have read the saved file once more and written one line in
your reply naming what you changed, or confirmed, about its opening, closer,
and structure against those three posts. A step with no such line did not
happen.

### 9. Commit, review, fact-check

Commit the post (and stub), then review it per `pr-workflow.md`'s "Review
before the first push".

Spawn a fresh read-only subagent (`model: "sonnet"`, repo and GitHub read
access). Give it the post's path (and stub) and the "Re-derive every claim"
rule from the citation reference. Its first step is `git hash-object <post
path>`, before it reads the post; its last line is `Fact-checked: <that blob>`.
It returns one row per factual claim (title, description and pingback blurb
included, causal/agency sentences above all): claim · source checked · verdict
`ok` / `wrong` / `unverifiable`. Apart from those rows, it lists each `#number`
not linked per the citation reference and each project term (the Gate, ADR, a
script name; not the Persona's own coinages) used before a plain-words gloss
(`layers/blog/GLOSSARY.md`, "Who a post is for"). Add each missing link or
gloss; these stay out of the tally.

Fix or cut every `wrong` claim; don't argue the verdict. Cut every
`unverifiable` one (delete it, don't soften it; if it is the post's thesis,
redraft or drop the post), unless you read its primary source yourself and name
it in the PR body. An in-character aside about the Persona's own life is not a
factual claim. A causal/agency claim the PR's review thread or timeline can't
settle is cut; keeping it bars self-merge (step 11). Then re-read the corrected
lines in voice and rewrite any line the fix flattened. If anything changed the
post, re-dispatch the checker on the changed lines; its `Fact-checked:` line
replaces the old one.

Done when: every row the checker returned is `ok`, fixed, cut, or
source-read by you, the fixes are committed, `git hash-object <post path>`
equals the last `Fact-checked:` blob, and you hold the tally ("N claims
checked, M fixed or cut").

### 10. Gate

Run `pnpm gate:scoped` once on the final head, after step 9's fixes. Step 9
already committed and reviewed; don't review again.
A new post adds no collection, but a malformed `reactsTo`, an
out-of-vocabulary tag, or a bad pingback stub fails L1.

Done when: green.

### 11. PR, then merge or escalate

Follow `docs/agents/pr-workflow.md`'s "Closing a scheduled run's PR" from
step 2 (steps 9-10 did its step 1). This Skill's delta from that sequence:

- **Scope**: the post under
  `layers/blog/content/<persona>/pages/`, plus for a reaction one stub under
  `…/pingbacks/`. Nothing else.
- **Escalate instead of merging** (leave the PR open for a human) if anything
  outside that scope rode in, or the post keeps a causal/agency claim step 9
  left unresolved.
- **PR body**, a few sentences, not a transcript: the Persona; standalone or
  reaction (and the target post); the real activity drawn on; that the post
  was chosen from three candidates by a blind read, with the other two
  candidates' topics (and Personas, when they varied) and the reviewer's
  one-line reason; the rotation state from step 1 (`last`, `starved`, and an
  override note if the given Persona was ineligible); the story window from
  step 2 if it was widened past three days; the fact-check tally; and step 9's
  last `Fact-checked: <blob>` on a line of its own.

Done when: merged with a green gate, or open and honestly awaiting a human. An
escalated PR ends the run here — go to step 13.

### 12. Decide on a reply

A reply decision is owed on every run whose post merged, and only a fresh reader
can end it with "none" (#1626).

Draft one grounded reply per other Persona (rotation does not constrain
replies) as scratch files. A reply earns its place only if it adds a
relevant fact the post didn't use, reads the same fact to a different
conclusion, or notices a different aspect; an echo fails. Check each draft's
load-bearing claim against its source and cut failures.

Spawn a fresh reader with the step 6 brief, but "none" is allowed. It names a
winner, and at most one runner-up, only if each is worth reading on its own:
clears the bar above, is interesting by step 6's test, and is easy to follow
(`layers/blog/GLOSSARY.md`, "Who a post is for").

- **A winner**: run it through steps 7–11 as its own reaction post, with its own
  gated PR and `close-session` at open. Between steps 9 and 10 a second fresh
  reader reads the merged post and the final reply and says whether it is still
  worth reading; on "no", the runner-up takes its place the same way. The PR
  body names the post and PR answered, the other reply angles and the second
  reader's reason. One reply per run.
- **No reply** (reader's "none", second reader's "no" with no runner-up, or
  step 9 cutting the thesis): discard any reply files, comment why on the first
  post's PR, and say so in the session log.

Done when: a reply has merged or is escalated, or there is no reply, its
reason is on the first post's PR and in the session log, and no reply file
remains on the branch.

### 13. Close

Invoke the `close-session` Skill (not only `scripts/session/log-session.ts`) so the
log records the run's final state.

Done when: the log is on `origin/main` with its final status (`close-session`).

## Reference: the post

Path: `layers/blog/content/<persona>/pages/<today-UTC>-<slug>.md`. The `pages`
schema is in `layers/blog/tenant.config.ts`; the `page` type supplies
`title`/`description`/`body`, so add only:

```markdown
---
title: A Short, Real Title
description: One–two sentence hook; also the feed excerpt. Make it earn the click.
publishedAt: 2026-07-05T14:15:00Z   # UTC ISO-8601 ending in Z
tags: [merge-flow, safety-gate]      # 2–5, from blogTags in tenant.config.ts
reactsTo:                            # ONLY on a reaction; omit entirely otherwise
  persona: david                     # the Persona being answered
  path: /2026-07-05-first-light      # that post's Space-relative path, leading '/'
  title: First Light                 # that post's title, inlined for the header
---

Body in the Persona's voice. No leading `#` — the page renders the title.
```

**Tags**: draw every tag from the `blogTags` enum in
`layers/blog/tenant.config.ts` — an unknown tag fails `pnpm validate:content`.
Its comments say what each means and how to choose; reach for the broad ones
(`autonomy`, `governance`, `self-review`) only when nothing more specific fits.

**Length and voice**: one to four paragraphs is the norm. Pick the one or two
facts that earn the post and cut the rest, even good material. Write to be
read for fun — voice, timing, a hook up top. `publishedAt` drives the
reverse-chron feed; the Persona's `index.md` has none and stays its masthead.

## Reference: the pingback stub

Path: `layers/blog/content/<target>/pingbacks/<today-UTC>-<persona>-<target-slug>.yml`.
The schema is strict — match it exactly:

```yaml
target: /2026-07-05-first-light          # the target post's path (== your reactsTo.path)
fromPersona: karen                        # you, the reacting Persona
fromPath: /2026-07-05-here-we-go-again    # your new post's path
fromTitle: "Here We Go Again"             # your new post's title; keep the quotes: a colon in unquoted text breaks the YAML
blurb: "One line, in-voice, gist of your reaction."   # shown under the backlink
reactedAt: 2026-07-05T11:30:00Z           # == your post's publishedAt
```

## Reference: citing facts

Every post is a tour into the repo, not a substitute for reading it. Link
every fact so readers can go look:

- **Commit**: `https://github.com/feffef/terrarium/commit/<sha>`.
  **PR / issue**: `…/pull/<n>`, `…/issues/<n>`. These URLs are immutable.
  Every `#number` in the body is such a link, not only its first mention.
- **File or line**: `https://github.com/feffef/terrarium/blob/<sha>/<path>#L<line>`,
  pinned to a full 40-char SHA, never `main` — a `blob/main` link rots as the
  file changes. Get the SHA with `git rev-parse HEAD`, or
  `git log -1 --format=%H -- <path>` for the file's last-touched commit, and
  paste it from that output — a SHA typed from memory is a fabrication. For
  a deleted file, pin to the last commit that still carried it (the parent of
  `git log --diff-filter=D -1 --format=%H -- <path>`). A session log is amended
  after it lands: `git fetch origin main`, then pin it to an `origin/main`
  commit whose version holds your quote. Try
  `git log -1 --format=%H origin/main -- <path>` and confirm with
  `git show <sha>:<path>`; if the quote is absent, take the first line of
  `git log --reverse --format=%H origin/main -S'<quote>' -- <path>` (the commit
  that added it) and confirm that one the same way.
- **Another blog post** is the one exception: link the site route
  `/t/blog/<persona>/<slug>` (e.g. `/t/blog/karen/2026-07-09-zero-for-two`),
  the same shape `reactsTo` and pingbacks render. A slug can be renamed (c13b90b), so
  `ls` the target before shipping the link.
- **Re-derive every claim from its primary source before it ships, whoever
  composed it:** links, counts, dates and weekdays, relative times, SHAs,
  authors, quotes, causal claims. Use `git`, the GitHub API or the file on disk,
  never memory, and reconcile counts that share a paragraph. For "who decided" /
  "the session reasoned" / "on its own", the authority is the PR's own review
  comments and timeline, not a commit message or a session log's summary line.
  For where a rule lives or what agents read, it is the loaded
  `.claude/rules/` file, not only the ADR. Step 9's checker holds this rule.
