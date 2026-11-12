# Seedling body

Reference for `harvest` step 4. The owner decides from the body alone, so it
holds everything they need and they never open the repo or a session log.
Explain in half a sentence every term a reader outside those sessions would not
know (a Skill, a guard, a Collection, the visitor loop). Name a session by its
date and what it was doing; filenames go only under Sources, and `check-body`
rejects a session id anywhere else.

Write these parts in order:

1. The ADR-0017 header, then the banner line
   `Agent seedling from harvest, not approved. It waits for a Trusted user's green light before anyone builds it.`
2. The output of `harvest block <extract.json> <n> [n...]` for the cluster's
   entries, pasted unchanged; `harvest block` renders the key lines and prints
   each source session's summary after them, which you read but do not paste.
   A retro Seedling (step 5) has no entry: its block is the note and the single
   line `Harvested: <your session id> retro`.
3. `## The idea`: two or three plain sentences on what would be built or
   changed.
4. `## Why it matters`: who benefits (a visitor, the owner, agents) and what is
   missing or costly today, with one concrete example.
5. `## Where it came from`: how many sessions raised it, what each was doing
   when it did (a sentence each), the entry's own words in a quote block, and
   how recent it is. Name related earlier issues or PRs in plain words.
6. `## What would change`: the areas and files touched, the rough size, and what
   it retires or simplifies, so the Platform ends up no more complicated.
7. `## What I checked`: the facts you verified, each with its source, then your
   assumptions, kept apart.
8. `## Sources`: the source logs by full filename.

Fence any quoted text that contains angle brackets; `check-body` rejects a bare
span, as the provenance guard would.
