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

`git fetch origin main` and branch `blog/<persona>-post-<today-UTC>` from
`origin/main`, so the post PR is independent of any work branch. If the caller
pinned a designated branch for this session, branch that name off `origin/main`
instead — a caller-pinned branch overrides this suggested name.

## 3. Gather material (read-only)

The Persona reports on the *Terrarium itself*. Draw only from real signal:

- **Recent git history** — `git log --oneline -30`, and read the diffs/commits that
  look interesting for this Persona.
- **Session logs** — `tenants/journal/content/current/sessions/*.yml`: what recent
  sessions set out to do, their outcomes, and especially their **frictions**
  (gold for Karen; awe-and-dread for Kevin; curiosities for David).
- **The source tree** — the manifests, generator, ADRs, skills — whatever the post
  refers to, so the detail is right.
- **The other Personas' recent posts** — `tenants/blog/content/<other>/pages/*.md`.
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

Save to `tenants/blog/content/<persona>/pages/<today-UTC>-<slug>.md`. The `pages`
schema is authoritative (`tenants/blog/tenant.config.ts`); the `page` type supplies
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

Keep it tight — a blog post, not an essay. `publishedAt` drives the reverse-chron
feed; the landing `index.md` (no `publishedAt`) stays the Persona's masthead.

### Cite facts and link to the code

Every post is a **tour into the repo**, not a substitute for reading it. Anchor the
post in **real, verifiable facts** and **link them** so readers can go look:

- Prefer **GitHub links** to the exact thing you're talking about:
  - commit — `https://github.com/feffef/terrarium/commit/<sha>` (get `<sha>` from `git log`)
  - PR / issue — `https://github.com/feffef/terrarium/pull/<n>` · `.../issues/<n>`
  - a file (or line) — `https://github.com/feffef/terrarium/blob/main/<path>`
- Each Persona's factual hook differs (see `personas/*.md`): **David** recaps
  recent activity and links the commits/PRs behind it; **Karen** links the specific
  commit/file that's sloppy or over-complicated; **Kevin** links the genuinely
  elegant commit/file that impressed him.
- Never link something you didn't verify exists (`git log`, `gh`/GitHub MCP, or the
  file on disk). A dead or wrong link is as bad as an invented fact.
- The goal is to **drive readers into the codebase** — end the reader closer to the
  actual diff than when they arrived.

## 6. If it's a reaction: emit the pingback

Write a pingback stub into the **target** Persona's Space, so their post surfaces
the backlink from a same-Space read (ADR-0012). Save to
`tenants/blog/content/<target>/pingbacks/<today-UTC>-<persona>-<target-slug>.yml`.
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

Run the safety gate (a new post adds no collection, but a malformed
`reactsTo`/pingback fails L1):

```
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e
```

Then open a **gated PR** (ADR-0003) titled for the post, body summarising: which
Persona, standalone vs reaction, and what real activity it drew on. No self-merge.

Done when the PR is open and green.
