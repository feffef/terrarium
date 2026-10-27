# Glass Box quality bar

How to grade a guide page and how to raise one. A page is graded against its
shape in `layers/glassbox/GLOSSARY.md` (Lesson or Walkthrough), the rules in
[`EVERY-PAGE.md`](EVERY-PAGE.md) and `.claude/rules/glassbox-content.md`.
[`DECISIONS.md`](DECISIONS.md) holds rulings that are closed: a point it settles
is never a deficit.

## Criteria

Read the page as two readers: a developer new to the tool, and one who knows
the tool but not Terrarium.

- **Title.** It passes EVERY-PAGE's title rule.
- **Cut.** One concept, readable on its own (EVERY-PAGE's Stand alone), large
  enough to stand alone, and the only home of each fact it teaches: a sibling
  that teaches the same thing is an overlap on both pages.
- **Accuracy.** Every claim is true at the page's `revision`, every reason
  traces to the ADR or file it cites, and the lede holds for the edge cases
  the page itself names.
- **Examples.** Every Excerpt and code fence teaches (EVERY-PAGE's Excerpts
  teach).
- **Contract.** The page has its shape, and keeps EVERY-PAGE's Write rules and
  the glassbox-content rule.
- **Value.** The newcomer learns the concept; the experienced reader learns how
  and why Terrarium applies it.

## Grades

- **A**: meets the bar, even if another wording is imaginable.
- **B**: one noticeable deficit.
- **C**: several deficits, a failed cut, or a false claim.

Each deficit names its criterion, quotes the page and says the fix. Anything
short of a deficit goes under **Optional**; an Optional item never drives an
edit.

## Raising a page

- **Fix the named deficits and keep the rest.** An A section stays as it is.
- **Research before a rewrite.** Gather the facts and Excerpt candidates from
  the Terrarium source and `node_modules` first.
- **Retitle only a title that fails the rule.** A better title being
  imaginable is Optional.
- **Never undo an earlier change** unless it made the page false; a
  disagreement goes to the owner as a proposed `DECISIONS.md` line.
- **Re-cut by moving, not rewriting.** For two concepts on one page, or one
  concept across two, move each fact to its one home and link to it from the
  other page.
- **Promote a draft** by raising it to A, then moving it into the guide's
  Subject folder and dropping its links to drafts (GLOSSARY.md, Two Spaces).
- **Share every correction.** A wrong fact a review finds goes into the brief
  of every agent writing in the same run.
