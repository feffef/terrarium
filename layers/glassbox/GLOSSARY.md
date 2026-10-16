# Glossary — Glass Box Tenant

> The Glass Box glossary: its own vocabulary (Lesson, Walkthrough, Subject,
> Excerpt, Term) and its reason to exist. Platform terms it leans on (Tenant,
> Space, Collection, …) live in the root `GLOSSARY.md`; see `GLOSSARY-MAP.md`.
> The spec, with its history, is
> [issue #1985](https://github.com/feffef/terrarium/issues/1985).

Glass Box teaches the concepts Terrarium is built on: Claude Code, the outside
Skill pack, Nuxt and Vue, Nuxt Content, Zod, TypeScript, testing, deploy, Git
and GitHub, and Terrarium's own practices, with Terrarium as the worked example
throughout. The name is the opposite of a black box: the terrarium is a glass
box, and the site shows its inside.

## Why it exists

To explain how Terrarium works in more depth than the Journal's onramp pages,
and to teach the general concepts so readers can apply them to their own
projects.

## Who it's for

Developers new to these tools, and developers who know them but want to see how
Terrarium applies them without reading the source.

## Product decisions

- **A curated textbook, not a live record.** What is happening now is the
  Journal's job. Glass Box links to Journal pages and ADRs as evidence and never
  repeats them. Each page is pinned to one `main` commit (`revision`, with its
  date in `revisionDate`), so it reads like a dated edition.
- **A reference, not a course.** No global reading order: newcomers start at the
  "From file to browser" Walkthrough, experts use the Subject directory.
- **Two Spaces.** `guide`, at `/t/glassbox/guide`, holds only polished pages
  central to Terrarium; `/t/glassbox` redirects there. `drafts` holds the pages
  that failed the guide's bar on their first attempt; each may be improved and
  moved to the guide. A guide page never links to a draft; a draft may link to
  the guide. Walkthroughs sit in `walkthroughs/`. A two-digit filename prefix
  orders Lessons inside a folder; Subject order and names come from
  `glassboxSubjects` in `app/utils/subjects.ts`.
- **Shown in progress.** The Platform homepage gives Glass Box its own band
  under the hero, guide and drafts both, labelled the newest experiment and
  work in progress; when it's finished, the label changes and the band stays.
  Its `pages` are in the Catalog, and reach the Commons Timeline only when they
  teach something new (`publishedAt`: EVERY-PAGE.md's Pin).

## Glossary

### Lesson
A page about one concept. It opens with a short general summary that links the
official docs, then shows how and why Terrarium uses the concept.

Its body follows one contract, which the page frames like design 1b
(`app/utils/lesson.ts`):

- a lede paragraph, then a skip line that links `[In Terrarium](#in-terrarium)`;
- `## The concept`, whose last paragraph is `Full reference: [label](url)`
  (House rules Lessons have none);
- `## In Terrarium`, with `### Why it's built this way` and
  `### What to watch for`. Why it's built this way gives each reason one
  short bullet a newcomer can follow, with no unexplained jargon. The bullet
  opens with a bold lead-in naming the reason, then says the problem, what
  Terrarium chose, and what that costs, if anything. It may end
  with the ADR that records the decision, as `ADR-NNNN (:file[…])`, or, when
  no ADR does, with the file that holds the reason, as `:file[…]`; never a
  loosely related ADR. What to watch for warns
  about consequences for the reader, and links an ADR rather than restating
  its Scope or Consequences;
- `## Try it in your project`;
- `## Where next`, a list of bare links to at most the 5 closest pages:
  related Lessons first, then optionally one Journal page as evidence. A
  Lesson with no related Lesson yet lists only that Journal page.

### Walkthrough
A page that follows one story across several Lessons and links to them instead
of repeating them.

Its body, in `walkthroughs/`, follows one contract, which the page draws like
design 1b (`app/utils/walkthrough.ts`):

- a lede paragraph, then at most one diagram;
- at least one numbered **stop**, each `## 1. Title`: 2–4 sentences of this
  story's part, ending in exactly one `::stop-links` block of chips separated
  by `·`. A chip is a link (a Lesson where one exists, a Journal page), a
  `:file` or a `:term`; each block holds at least one link or `:file`, since a
  `:term` alone doesn't count. A stop holds at most 5 chips, Lessons first;
  drop a `:file` or ADR a linked Lesson already cites;
- optionally `## A real case`: one dated story;
- `## Where next`, a list of bare links to at most the 5 closest pages:
  Lessons first, then Walkthroughs, then optionally one Journal page as
  evidence.

Link a Lesson by its full `/t/glassbox/guide/…` path. A Lesson lists, after
its Where next, every Walkthrough whose stops or A real case link it that way;
nobody writes that list.

### Subject
The tool a Lesson belongs to: the one whose official docs its *The concept*
section links. Terrarium's own patterns with no official doc form the
**House rules** Subject, in the folder `terrarium-practice/`. Each Subject is a
folder.

### Excerpt
Real Terrarium code copied into a page inside an `::excerpt` block, and checked
word for word against the file at the page's `revision`. A code fence outside
`::excerpt` is an example, not an Excerpt. A line that is only a comment
holding `…` (`// …`) marks code left out; the check allows a gap there.
Its `lines` range starts on the Excerpt's first line and ends on its last. With
more than one gap, `lines` gives one range per run, comma-separated
(`lines="3,5-6,9"`), and each run must be exactly its range; the page numbers
each run from its own.

A page cites code only this way or through `:file`, never with a hand-written
`github.com/…/blob/…` or `/tree/…` link, and every `ADR-NNNN` it names exists
at its `revision`. `page-checks.ts` checks every page in `pnpm test`.

### Term
A word a page expands inline, defined in Glass Box's own words. Definitions live
in the `terms` Collection, each with an optional `source` glossary. A
`:term[…]` finds its entry by its `id` attribute, else by its text lowercased,
stripped of everything but letters, digits, hyphens and spaces, with spaces
turned into hyphens: `:term[Nuxt & Vue]` reads `nuxt-vue.yml`,
`:term[ADR-0004]` reads `adr-0004.yml`, and
`:term[Spaces]{id="space"}` reads `space.yml`.
