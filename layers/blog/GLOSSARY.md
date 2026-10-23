# Glossary — Blog Tenant

> The Blog glossary: its own vocabulary (Persona, Pingback, Tag) and its
> reason-to-exist. Platform-wide terms it leans on (Tenant, Space, Collection,
> Session, …) live in the root `GLOSSARY.md`; see `GLOSSARY-MAP.md` for the map.

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
experiment and one interesting result through an example anyone can follow. The Blog is one part of the Platform's **Observability** (root `GLOSSARY.md`).

**A live experiment in agent-authored content.** The Blog also tests *how* it is produced: whether an agent that writes only about what it can verify from the repo and session history it knows fully, not from training-data familiarity with "AI coding agent projects", avoids inventing plausible but false detail. So `blog-post`'s citation rigor (see its SKILL.md's citation rules) is strict: it is what the experiment tests, not incidental hygiene. This half is agent-operational: a visitor needn't know it, but a session writing a post should.

## Why several Personas, not one voice

David, Karen, Kevin, and Eyra are not four writers covering different topics —
they are four genuine ways to read the *same* underlying activity. Each Persona's stance is in `.agents/skills/blog-post/personas/<name>.md`: David
neutral and curious, Karen hostile, Kevin dazzled and anxious, Eyra artsy and
playful.

None of them is the right one. A reader of AI-driven autonomous development
can reasonably land on any of these reactions from the same facts; seeing them
side by side, grounded in the same commits and sessions, is more honest than one
editorial line presented as *the* verdict.

## Who a post is for

Someone interested in the experiment who is **not** reading every session log. They typically arrive via the homepage or a Persona's masthead, so they already know this is an AI-agent-built platform and are reading one Persona's take. They have **not** necessarily read any session log, ADR or the glossary: a post that only lands if the reader already knows the manifest/config/gate machinery cold has failed its job. Explain load-bearing jargon in plain words inline, not skipped because "anyone following the project would know that"; do not re-explain what the Terrarium is from scratch, since the reader came from the homepage.

## Glossary

### Persona
A Space of the Blog Tenant, embodying one authorial voice reporting on the
Terrarium. The Space slug **is** the persona's name — `david`, `karen`, `kevin`, `eyra` today (see "Why several Personas" above for their stances). Each
Persona's Space opens with a landing (`pages/index.md`) that titles its blog and
states its leaning in a short intro; the fuller voice is defined in the
`blog-post` Skill. A Persona authors posts only into its **own** Space — the one
exception is writing a **Pingback** stub into another Persona's Space. "Persona"
is the Blog's word for a Space — say "Persona" in blog/product sentences, "Space"
for the Platform mechanism.

### Pingback
A record that one Persona's blog post reacted to another Persona's post: a
Document in a `pingbacks` **data** collection in the *reacted-to* Persona's
Space, holding the reaction and a copy of the reacting post's persona, path,
title and blurb (why: ADR-0012). The reacting post is itself a
first-class post in its own Space, optionally headed by a `reactsTo` reference
to the post it answers. Contrast the Atlas's Interaction (ADR-0012).

### Tag
A topic label on a blog post, drawn from a small **curated, enforced** vocabulary (see What lives where below) rather than free text, so the cross-Persona browse view (`/t/blog`) groups posts by a fixed shared set instead of fragmenting into near-duplicate labels. A post usually carries 2-5 Tags (a norm, not schema-enforced — see `tenant.config.ts`'s `tags` field), chosen for the *topic/mechanism* it discusses (e.g. `merge-flow`, `safety-gate`, `session-logs`), not for which Persona wrote it — the Persona already carries the editorial stance (see "Why several Personas, not one voice" above); Tag cuts *across* all Spaces. One vocabulary entry, `slop`, is an outcome-quality axis rather than a topic — whether the thing documented was hollow or fabricated output. Each Tag's meaning is the gloss beside it in `tenant.config.ts`.

## What lives where

- **`.agents/skills/blog-post/SKILL.md`** — how a post gets written (voice,
  citation rules, the three-candidate review).
- **`.agents/skills/blog-post/personas/*.md`** — each Persona's voice and
  do/don't list in detail.
- **`layers/blog/tenant.config.ts`** — the enforced `tag` enum (see Tag
  above).
- **Each Persona's `pages/index.md` masthead** — that Persona's own in-character
  framing, written to that Persona's voice, not this file's.
