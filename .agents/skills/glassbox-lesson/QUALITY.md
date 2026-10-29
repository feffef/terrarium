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
- **Cut.** One concept, enough of it to teach, readable on its own
  (EVERY-PAGE's Stand alone) with each Terrarium word explained at first use,
  and the only home of each fact it teaches: a sibling that teaches the same
  thing is an overlap on both pages.
- **Accuracy.** Every claim is true at the page's `revision`, every reason
  traces to the ADR or file it cites (for an ADR, its Why, Rejected
  alternatives and When to revisit all count), and the lede holds for the
  edge cases the page itself names.
- **Examples.** Every Excerpt and code fence teaches (EVERY-PAGE's Excerpts
  teach).
- **Contract.** The page has its shape, and keeps EVERY-PAGE's Write rules and
  the glassbox-content rule.
- **Value.** The newcomer learns the concept; the experienced reader learns how
  and why Terrarium applies it.

## Grades

- **A**: best in class. At most 10 guide Lessons and 1 Walkthrough hold it,
  elected from the raters' top lists by `glassbox-improve`
  (`elect` in its `scripts/grades.ts`); no rater or writer awards it.
- **B**: meets the bar, even if another wording is imaginable.
- **C**: a noticeable deficit.
- **D**: several deficits, a failed cut, or a failed accuracy check.

In a PR from before `glassbox-improve`'s `grades.yml` existed, A meant today's
B, B today's C and C today's D.

Each deficit names its criterion, quotes the page and says the fix. A B page
may have **gaps to A**: a section where an A page does the same job better,
named with that page and what to take from it. A gap never lowers a grade.
Anything short of a deficit or gap goes under **Optional**; an Optional item
never drives an edit.

## Raising a page

- **Fix the named deficits and gaps, and keep the rest.** A section nobody
  faulted stays as it is.
- **Research before a rewrite.** Gather the facts and Excerpt candidates from
  the Terrarium source and `node_modules` first.
- **Retitle only a title that fails the rule.** A better title being
  imaginable is Optional.
- **Never undo an earlier change** unless it made the page false; a
  disagreement goes to the owner as a proposed `DECISIONS.md` line.
- **Re-cut by moving, not rewriting.** For two concepts on one page, or one
  concept across two, move each fact to its one home and link to it from the
  other page.
- **Promote a draft** by raising it to B, then moving it into the guide's
  Subject folder and dropping its links to drafts (GLOSSARY.md, Two Spaces).
- **Share every correction.** A wrong fact a review finds goes into the brief
  of every agent writing in the same run.
