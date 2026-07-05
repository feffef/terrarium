# 12. Cross-persona pingbacks via author-time denormalization

Date: 2026-07-05
Status: Accepted

## Context

The Blog Tenant models each **Persona** as a **Space** (`david`, `karen`,
`kevin`), so a Persona's posts are a physically isolated `pages` collection —
`blog_<persona>_pages`. A **pingback** must show, on a post, that *another*
Persona reacted to it (wrote a post replying to it). That relationship inherently
spans two Spaces, which collides head-on with the isolation invariant (ADR-0004
L3): `resolveSpaceRoute` deliberately reads only `map[tenant][space]` so a request
can never name another Space's collection, and that resolver is human-only
surface (ADR-0006). A naive pingback — "at render time, query every sibling Space
for posts that reference me" — would be exactly the cross-Space read the isolation
model exists to forbid, and would force a change to the human-only resolver.

Alternatives considered:

- **Runtime cross-Space read** — the post page queries sibling Spaces for
  reactions. Rejected: breaks the single-Space read guarantee and edits the
  isolation-critical resolver for a presentational feature.
- **Build-time generated reverse index** — the generator scans all posts'
  outbound `reactsTo` fields and emits a committed pingback map (à la
  `routing.generated.ts`, ADR-0002/0007). Sound and drift-checkable, but adds a
  new generated artifact and generator logic for a first, deliberately simple
  blog — heavier than warranted now.

## Decision

Record a pingback as a **Document authored into the *reacted-to* Persona's Space**,
not derived at read time. Each Space gets a second collection, `pingbacks` (a
strict `data` collection). When Persona A reacts to a post by Persona B, the
`blog-post` Skill writes, in one gated PR:

1. the reaction as a first-class post in **A's** `pages` collection, optionally
   carrying `reactsTo: { persona, path }` for its own "in reply to" header; and
2. a small pingback stub into **B's** `pingbacks` collection, holding B's target
   path plus A's persona/path/title/blurb **inlined**.

At render time everything is a **same-Space read**: B's post page reads
`blog_B_pages` (the post) and `blog_B_pingbacks` (its inbound reactions), filters
the stubs by target path, and renders each as a backlink to `/t/blog/A/<path>`.
`resolveSpaceRoute` is reused verbatim — the routed collection stays named `pages`
(ADR-0006) and `pingbacks` rides along as one of its `dataCollections`. No
routing, generator, or isolation code changes.

The only boundary crossing is therefore an **author-time filesystem write** into
another Space's content directory — ordinary agent authorship (Agent Authorship
invariant), fully visible and reviewed in the PR diff, and validated by the strict
`pingbacks` schema at the L1 gate.

## Consequences

- Isolation's *runtime* guarantee is untouched — reads never leave a Space, and
  the human-only resolver is not modified. The crossing moves to a reviewable
  write, where the safety gate already lives.
- The pingback is **denormalized**: A's persona/title/blurb are copied into B's
  stub, so B renders the backlink with zero cross-Space query. The cost is
  staleness — renaming or deleting A's reaction post leaves an orphaned stub in
  B's Space. Accepted for v1; caught by review, not by machinery. A future
  drift-check or a generated reverse index (the rejected alternative) could
  reconcile this once the pain is real.
- A Persona's Skill run writes into *two* Spaces. That is intentional and bounded
  to the `pingbacks` collection of the target — a Persona never writes another
  Persona's `pages`. Reviewers should expect and check exactly this shape.
- `pingbacks` is inert `data`, but blog posts are rendered pages, so the whole
  change lands as a normal **gated PR** (ADR-0003), never the direct-to-main
  `log-session` path.
- `pingbacks` is append-only and strict, so evolving its schema follows the
  **Schema evolution policy** in [ADR-0009](0009-session-logs-commit-directly-to-main.md#schema-evolution-policy)
  (its single home): no `schemaVersion` field is needed until the first breaking
  change, since today's records are all v1 by the absence of the key.
