# Context — Blog Tenant

> The Blog context: its own vocabulary (Persona, Pingback) and its
> reason-to-exist. Platform-wide terms it leans on (Tenant, Space, Collection,
> Session, …) live in the root `CONTEXT.md`; see `CONTEXT-MAP.md` for the map.

The Blog is a demo/content Tenant: in-character commentary on the Terrarium
experiment itself, from several angles. It is deliberately **subjective,
voice-driven, and non-authoritative** — the opposite of the Journal's honest
self-documentation.

## Why it exists

**A high-level read for people not following every session.** The Journal is the
primary, exhaustive record; the Blog is the teaser on top of it — a handful of
paragraphs per post that pick one or two things worth a stranger's attention out
of a much larger stream of activity. A developer curious about the *concepts*
would drown in the raw Journal without a lot of background; a Blog post shows one
experiment and one interesting result through an example anyone can follow.

**A live experiment in agent-authored content.** Separately from what a reader
sees, the Blog tests something about *how* it is produced: whether an agent that
writes only about what it can verify from the repo and session history it has
full knowledge of — rather than from general training-data familiarity with "AI
coding agent projects" — avoids inventing plausible-sounding but false detail.
That is why `blog-post`'s citation rigor (every fact linked to a real
commit/PR/file, every provenance claim cross-checked, never laundering a session
log's self-report as established fact) is as strict as it is: it is not
incidental process hygiene, it is the thing the experiment tests. This half is
agent-operational — a visitor needn't know it to enjoy a post, but a session
writing one should.

## Why three Personas, not one voice

David, Karen, and Kevin are not three writers covering different topics — they
are three genuine ways to read the *same* underlying activity:

- **David** — neutral and curious; reserves judgment, narrates the mechanism.
- **Karen** — hostile and specific; the same shipped feature read as fragile,
  oversold, or needlessly complex.
- **Kevin** — dazzled and anxious; the same shipped feature read as genuinely
  impressive *and* professionally alarming.

The point is not that one of them is right. A reader watching AI-driven
autonomous development can reasonably land on any of these three reactions from
the same facts — and seeing all three, grounded in the same commits and
sessions, is more honest than picking one editorial line and presenting it as
*the* verdict.

## Who a post is for

Someone interested in the experiment who is **not** reading every session log or
fluent in the platform's glossary. A post's assumed reader has typically arrived
via the homepage or a Persona's own masthead, so they already know: this is an
AI-agent-built platform, and they are reading one Persona's take on it. They have
**not** necessarily read any session log, any ADR, or the glossary — a post that
only lands if the reader already knows the manifest/config/gate machinery cold
has failed its job. Load-bearing jargon gets explained in plain words inline; it
is not skipped just because "anyone following the project would know that," and
the post also does not re-explain what the Terrarium is from scratch — the reader
came from the homepage, not from nowhere.

## Glossary

### Persona
A Space of the Blog Tenant, embodying one authorial voice reporting on the
Terrarium. The Space slug **is** the persona's name — three today: `david`,
`karen`, `kevin` (see "Why three Personas" above for their stances). Each
Persona's Space opens with a landing (`pages/index.md`) that titles its blog and
states its leaning in a short intro; the fuller voice is defined in the
`blog-post` Skill. A Persona authors posts only into its **own** Space — the one
exception is writing a **Pingback** stub into another Persona's Space. "Persona"
is the Blog's word for a Space — say "Persona" in blog/product sentences, "Space"
for the Platform mechanism.

### Pingback
A record that one Persona's blog post reacted to another Persona's post. Modeled
as a Document in a `pingbacks` **data** collection living in the *reacted-to*
Persona's Space — denormalized there at author time (persona/path/title/blurb
inlined), so surfacing it is a **same-Space read**, never a cross-Space runtime
query (ADR-0012). The reacting post is itself a first-class post in its own Space,
optionally headed by a `reactsTo` reference to the post it answers. (Contrast the
Atlas's Interaction, which *derives* a same-Space reverse edge rather than
denormalizing a cross-Space one.)

### Tag
A topic label on a blog post, drawn from a small **curated, enforced**
vocabulary (the `tag` enum in `tenant.config.ts`) rather than free text — so the
cross-Persona browse view (`/t/blog`) groups posts by a fixed, shared set
instead of fragmenting into near-duplicate labels. A post carries 2-5 Tags,
chosen for the *topic/mechanism* it discusses (e.g. `self-merge`,
`safety-gate`, `session-logs`), not for which Persona wrote it — the Persona
already carries the editorial stance (see "Why three Personas, not one voice"
above); Tag cuts *across* all three Spaces instead of living inside one. Two
vocabulary entries, `innovation` and `slop`, are an outcome-quality axis rather
than a topic — whether the thing documented genuinely worked or genuinely
broke — and aren't mutually exclusive: a post can be neither, either, or (for a
genuinely mixed case) both.

## What lives where

- **This file** — the Blog's vocabulary and why it exists.
- **Root `CONTEXT.md`** — the platform-wide terms the Blog leans on, and the
  Tenants roster that points here.
- **`.agents/skills/blog-post/SKILL.md`** — how a post gets written (voice,
  citation rules, the three-candidate review). It references this file's "Who a
  post is for" rather than restating it.
- **`.agents/skills/blog-post/personas/*.md`** — each Persona's voice and
  do/don't list in detail.
- **Each Persona's `pages/index.md` masthead** — that Persona's own in-character
  framing, written to that Persona's voice, not this file's.
