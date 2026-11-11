# Glass Box quality bar

How to grade a guide page and how to raise one. A page is graded against its
shape in `layers/glassbox/GLOSSARY.md` (Lesson or Walkthrough), the rules in
[`EVERY-PAGE.md`](EVERY-PAGE.md) and `.claude/rules/glassbox-content.md`.
[`DECISIONS.md`](DECISIONS.md) holds rulings that are closed: a point it settles
is never a deficit.

## Lenses

Read the page as two readers: a developer new to the tool, and one who knows
the tool but not Terrarium. Each lens is graded on its own.

- **Clarity.** A newcomer can follow the page: its order, plain words, each
  term introduced before use (EVERY-PAGE's Stand alone), a title that passes
  EVERY-PAGE's title rule, and the page's shape with EVERY-PAGE's Write rules
  and the glassbox-content rule.
- **Reasoning.** Each Why gives a reason, its cost and the alternative, and
  traces to the ADR or file it cites (for an ADR, its Why, Rejected
  alternatives and When to revisit all count). `n/a` on a Walkthrough.
- **Placement** (single home and placement). One concept per page, no fact
  taught on another page too (an overlap counts on both), the right Subject,
  and useful Where next links.
- **Evidence.** The In Terrarium examples and Excerpts are the best place in
  the repo to see the concept, and each teaches (EVERY-PAGE's Excerpts teach).
  A finding names the better Excerpt by file and line.
- **Transfer.** The page teaches the general concept beyond Terrarium, and
  says when it is the wrong choice. `n/a` on a Walkthrough.
- **Relevance.** The concept deserves its own page. A low grade leads to a
  merge, section or cut, never a rewrite.

Correctness is not a lens. A claim the source contradicts at the page's
`revision`, or a lede that fails an edge case the page itself names, is a
false claim: it is fixed with the smallest correction once confirmed in the
source.

## Grades

- **A**: best in class on that lens. Several pages of a Subject may hold it;
  Relevance has none. No Skill awards it now: `glassbox-curate` reads the Lenses
  only and does not grade pages.
- **B**: meets the bar, even if another wording is imaginable.
- **C**: a noticeable deficit.
- **D**: several deficits.

Each deficit names its lens, quotes the page and says the fix. A B may have
**gaps to A**: a section where a page holding A on that lens does the same job
better, named with that page and what to take from it. A gap never lowers a
grade. Anything short of a deficit or gap goes under **Optional**; an Optional
item never drives an edit.

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
- **Share every correction.** A wrong fact a review finds goes into the brief
  of every agent writing in the same run.
