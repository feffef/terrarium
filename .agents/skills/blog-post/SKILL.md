---
name: blog-post
description: Write one in-character blog post for a Terrarium Persona (david | karen | kevin) — drawn from recent repo activity — and open a gated PR. Optionally reacts to another Persona's post, emitting a pingback.
disable-model-invocation: true
---

# blog-post

Write **one** blog post for a Blog Persona, in that Persona's voice, grounded in
what has actually been happening in the repo. Takes a single argument: the persona
name — `david`, `karen`, or `kevin` (CONTEXT.md: Persona). The post lands through
an ordinary **gated PR** (ADR-0003), like `digest` — never the direct-to-`main`
`log-session` path.

> **Invoked manually — follow the steps.** User-invoked
> (`disable-model-invocation: true`) so it never self-fires; run it when asked
> (`/blog-post karen`). If the Skill tool refuses it, that's by design — execute
> the steps yourself.

The post must be **honest and grounded** — every observation, jab, or gush is
anchored in a real thing the agents did (a commit, a session log, a file). Invented
detail is the one unforgivable failure: it breaks each Persona differently (David
loses credibility, Karen loses her receipts, Kevin loses his informed fear).

## 1. Load the Persona

Read `personas/<persona>.md` (next to this file) — the stance, voice, and the
do/don't list. Write the whole post *as that Persona*. The three:

- **david** — neutral, curious observer; enjoys the experiment, reserves judgment.
- **karen** — hostile sceptic; snarky, funny, seizes on what failed — but specific
  and true.
- **kevin** — dazzled, anxious dev; amazed and job-scared in the same paragraph.

## 2. Branch off `origin/main`

Branch `blog/<persona>-post-<today-UTC>` off `origin/main` (CLAUDE.md's
chartered-job branch convention — a caller-pinned designated branch overrides
this default name), so the post PR is independent of any work branch.

## 3. Gather material (read-only)

The Persona reports on the *Terrarium itself*. Draw only from real signal:

- **Recent git history** — `git log --oneline -30`, and read the diffs/commits that
  look interesting for this Persona.
- **Session logs** — `layers/journal/content/current/sessions/*.yml`: what recent
  sessions set out to do, their outcomes, and especially their **frictions**
  (gold for Karen; awe-and-dread for Kevin; curiosities for David).
- **The source tree** — the manifests, generator, ADRs, skills — whatever the post
  refers to, so the detail is right.
- **The other Personas' recent posts** — `layers/blog/content/<other>/pages/*.md`.
  This is how you decide whether to react (step 4).

## 4. Decide: standalone or reaction (opportunistic)

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

## 7. Clear the gate, then open the PR

**Before opening the PR, re-read the draft against `personas/<persona>.md`'s
do/don't list.** Confirm it actually reads *in that Persona's voice* and is
*interesting* — not a generic point-by-point rebuttal — and fix it now if it
isn't. Catching a tone-fit miss here is cheap; catching it after the gate,
screenshot, and an opened PR is not.

Run the safety gate — see CLAUDE.md's **Self-verification** section for the
exact, cheapest-first commands (a new post adds no collection, but a malformed
`reactsTo`/pingback fails L1).

Then open a **gated PR** (ADR-0003) titled for the post, body summarising: which
Persona, standalone vs reaction, and what real activity it drew on. No self-merge.

Done when the PR is open and green.
