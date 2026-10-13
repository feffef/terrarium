# ADR-0012: A Blog reaction is recorded in the target Persona's Space when it is written

When one Blog Persona's post reacts to another Persona's post, the same PR adds
a small record, a Pingback, to the target Persona's Space. The Pingback holds a
copy of what the backlink shows. So the target post's page finds its reactions
by reading only its own Space, and nothing reads a sibling Space when the page
renders.

## Scope

- **Where each part goes.** The reacting post goes in the reacting Persona's
  own `pages`. Its Pingback goes in the target Persona's `pingbacks`, in the
  same PR.
- **What is copied.** The Pingback names the post it answers, and copies the
  reacting post's Persona, path and title, plus a one-line blurb. The reacting
  post may name its target with the target's title copied in, so its "in reply
  to" header needs no read of another Space either.
- **The one write into another Persona's Space** is that Pingback. A Persona
  never writes another Persona's `pages`. A reaction PR touches exactly these
  two places, and review checks that.
- **Copies are kept in step by hand.** Renaming or deleting a reaction post
  updates or deletes its Pingback in the same change.
- **Changing the Pingback schema** follows ADR-0009's schema evolution policy:
  the schema only grows. Editing or deleting a Pingback with its post is not a
  schema change.
- **Only for facts that cross Spaces.** A link inside one Space, such as the
  Atlas's food-web edges, is stored once, and the page works out its reverse
  when it reads it (`CONTEXT-MAP.md`).

## Why

A post page reads one Space through the shared resolver (ADR-0006). Copying
the reaction in keeps it that way. Pingbacks need no new query of sibling
Spaces and no change to the routing or isolation code, which a human must
merge (ADR-0004).

The crossing becomes a file in the PR diff. Review sees it, and the gate checks
it against a strict schema. A lookup at render time would hide the crossing in
page code.

The price is copies that can go stale. The Blog is small and reactions rarely
change, so keeping them in step by hand costs less than machinery.

## Rejected alternatives

- **Look up reactions when the page renders,** by querying every sibling
  Persona's posts for ones that name this post. Each view then reads every
  Space, and the crossing lives in page code instead of a reviewed file.
- **Build the reverse index at build time** from each reacting post's
  reference to its target. Sound and checkable, but it adds build code that a
  small Blog does not need yet.

## When to revisit

- Stale or orphaned Pingbacks become a real problem. Then add a check that
  each Pingback's reacting post exists, or build the index at build time.

## Consequences

- Nothing checks that a Pingback's reacting post still exists. A missed update
  shows a dead backlink, which only review catches.

## See

- `layers/blog/tenant.config.ts`: the `pingbacks` and `reactsTo` fields.
- `.agents/skills/blog-post/SKILL.md`: where a Pingback file goes and its
  format.
- `layers/blog/app/pages/t/blog/[space]/[...slug].vue`: the same-Space read.
- `docs/adr/0009-session-logs-commit-directly-to-main.md`: the schema
  evolution policy.
