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
  "Opening a page" Walkthrough, experts use the Subject directory.
- **One Space, `guide`**, at `/t/glassbox/guide`; `/t/glassbox` redirects there.
  Walkthroughs sit in `walkthroughs/`. A two-digit filename prefix
  orders Lessons inside a folder; Subject order and names come from
  `glassboxSubjects` in `app/utils/subjects.ts`.
- **Soft launch.** Online, but nothing on the Platform links to it yet, and
  `pages` has no Collection kind, so it stays out of the Catalog.

## Glossary

### Lesson
A page about one concept. It opens with a short general summary that links the
official docs, then shows how and why Terrarium uses the concept.

Its body follows one contract, which the page frames like design 1b
(`app/utils/lesson.ts`):

- a lede paragraph, then a skip line that links `[In Terrarium](#in-terrarium)`;
- `## The concept`, whose last paragraph is `Full reference: [label](url)`
  (Terrarium practice Lessons have none);
- `## In Terrarium`, with `### Why it's built this way` and
  `### What to watch for`;
- `## Try it in your project`;
- `## Where next`, a list of links to Lessons.

### Walkthrough
A page that follows one story across several Lessons and links to them instead
of repeating them.

### Subject
The tool a Lesson belongs to: the one whose official docs its *The concept*
section links. Terrarium's own patterns with no official doc form the
**Terrarium practice** Subject. Each Subject is a folder.

### Excerpt
Real Terrarium code copied into a page inside an `::excerpt` block, and checked
word for word against the file at the page's `revision`. A code fence outside
`::excerpt` is an example, not an Excerpt. A line that is only a comment
holding `…` (`// …`) marks code left out; the check allows a gap there.

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
