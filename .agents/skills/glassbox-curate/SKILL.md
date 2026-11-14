---
name: glassbox-curate
description: Make the Glass Box guide easier to learn from, then fill gaps; one focus and one PR per run, and another run while the budget lasts (its Remit says which PRs wait for the owner's merge). It runs autonomously, or interactively with a person.
disable-model-invocation: true
---

# glassbox-curate

**Goals.** Make the guide easier to learn from, page by page and as a whole.
Second, fill gaps: a technology or process Terrarium relies on that no Lesson
teaches. Third, every run leaves the memory page shorter (State). You lead and choose the
steps; improvise.

**Shape.** A session works through foci, one run each: a run takes one focus (a
Subject, a structural question or a gap), from the instructions you were given
or the memory page, and opens one PR; then the next run takes the next focus.
There is always another, so only the budget ends a session. The budget, for the
whole session, is $25 of spend or 500k tokens of context in the main session,
whichever comes first; Loop, the last step, says how to read it and what it
decides. Several runs a day must work.

**Modes.** *Autonomous*: your first message carries a system-reminder
`Fired by routine "/glassbox-curate"`; decide everything, ask nothing, and say
in the run entry why you chose the focus. *Interactive*: a person typed the
first message, with no such reminder; if no focus was given, ask for one;
settle every decision with them via `grilling`. If they answer "autonomous",
the run is autonomous from then on and its entry says so.

**Hard rules.** Never make a page false. Never undo an earlier change without
new evidence. `owner-decisions.md` lines are hard rules: never go against one.
One PR per run, within the remit.

**Remit.** Edit `layers/glassbox/content/guide/`, the diagram SVGs you
re-render, your own workshop files, and a moved page's name in
`checks/update.yml`. Build, in any mode and never as an issue: a new Lesson, a
new Subject with its `layers/glassbox/app/utils/subjects.ts` entry, a split or
a move between Subjects, and a change to this Skill, the `glassbox-lesson` docs
or the page checks. A PR holding any of these waits for the owner's merge: its
body says so, and you don't merge it.

**Read first, in full.** `layers/glassbox/GLOSSARY.md`,
[`../glassbox-lesson/writing-pages.md`](../glassbox-lesson/writing-pages.md),
[`../glassbox-lesson/owner-decisions.md`](../glassbox-lesson/owner-decisions.md),
`.claude/rules/glassbox-content.md`,
`.agents/skills/dispatch-subagents/SKILL.md`, and, since every run fetches and
opens a PR, `docs/agents/git-conventions.md`, `docs/agents/github-integration.md`
and `docs/agents/pr-workflow.md`.
Subagents read committed files at the base with `git show <base>:<path>`,
which can't follow the `.claude/skills/<name>` link, so write every Skill path
in a brief as `.agents/skills/...`.

## How a run goes

**Know the guide before you change it.** Glass Box is one textbook, not a
set of separate pages. A reader meets a concept once, in one Lesson, and
follows Where next and Walkthroughs to the rest. An edit made without knowing
the other pages breaks that: it repeats what a sibling page already teaches,
contradicts it, adds a page that exists under another title, or cuts the only
place a fact was taught. Runs that read only the page they changed repeated a
sibling page (#2943) and cut the only place a fact was taught (#2927). So
every run reads at two depths before it edits: every page's entry in the
guide index, to know what the whole guide teaches, and every page of its
Subject in full, to know exactly what its neighbours say. The first depth is
only as good as each page's `teaches` and bold lead-ins (Fix says how a run
keeps them so).

- **Orient.** This is the orientation step: run
  `pnpm exec tsx .agents/skills/glassbox-curate/scripts/orient.ts`, with no flag
  (`--index` is for `glassbox-lesson`), and read its
  output whole, never through `head`; if the tool saves it to a file, read that
  file whole. It gives where to write the run entry, open PRs, memory, recent
  runs and warnings, and names the guide index files it wrote: read each
  whole too, one Read per file. The index is the whole-guide depth above; its first
  lines say how to read an entry. Leave alone every page an open PR touches. While a
  `glassbox-update` PR is open, wait for it: subscribe to its activity, end
  your turn, and orient again once it merges or closes. An autonomous run stops
  without a PR once that PR has been open 20 hours; an interactive run keeps
  waiting.
- **Scout.** Right after orienting, start a background sonnet subagent; choosing
  the Subject and focus doesn't wait for it. Give it the guide index files the
  orientation wrote (it must not run `orient.ts` itself: that rewrites them) and
  the time of the newest run entry before yours (the last 30 commits when there
  is none). It reads every commit to `origin/main` since then, all paths, and
  returns each new topic worth documenting that the index shows no page
  teaching, with its commits and the nearest page.
- **Subject.** From the orientation, pick the Subject to work in (the
  Walkthroughs count as one): from memory leads, the owner's review notes,
  page-check warnings, problems the orientation shows, or gaps; when nothing
  is pressing, from pages no fresh reader has seen lately (`pagesRead`). For a
  gap, it is the Subject the new Lesson would join; for a new Subject, the one
  it takes pages from or sits beside.
  Before you take any lead from the memory page, check it still stands and that
  no earlier step (settled titles, a pending Subject move) should come first;
  grep the guide for its key terms.
- **Read.** The full depth above. Run `orient.ts --subject <folder>` and read
  its output whole; it ends with the `pagesRead` lines to paste. Also read in
  full every page outside the Subject that a change would edit, link or
  overlap. Done when every page of the Subject is read in full, plus every
  outside page a change would edit, link or overlap.
- **Choose.** Pick this run's focus from the instructions you were given, else
  from what you read, preferring concrete memory items you can solve completely
  within the budget that is left. Fix every reader finding the run can fix; only what State allows goes on the memory page. The
  run entry says why you chose the focus.
- **Owner's questions.** Build the option you'd recommend. A question only the
  owner can answer (where a topic belongs, whether a practice is recorded)
  goes in the PR body, with each move or retitle and its effect on URLs and
  links, and on the memory page if it outlives the PR.
- **Gaps.** Compare what Terrarium relies on (`package.json`, the ADRs, the
  Skills, `scripts/`) with what the Lessons teach. Gaps the run does not
  fill go on the memory page as State allows. Fix what makes pages hard to learn
  from first; take a gap when no page problem outweighs it.
- **Run entry.** Right after choosing, write it from the orientation's
  skeleton, keeping `focus` quoted, and push the run branch.
- **Diagnose.** Fresh readers (sonnet, no repo access) get each page as the
  plain text that `.agents/skills/glassbox-curate/scripts/plain.ts <stem>`
  prints. They report where a newcomer gets lost. For a gap, read
  the sources the new Lesson would cite. For a Subject focus, check each Why
  bullet against its cited ADR or file.
- **Churn guard.** Before a structural step or a retitle, read
  `git log --oneline origin/main -- <page>` and the run entries that name the
  page. Never reverse a change from the last 5 runs unless it made the page
  false.
- **Fix.** An opus writer writes every sentence that states a fact, however
  small the change, and quotes the `path:line` behind each one. Give it the
  caps and link rules `layers/glassbox/page-checks.ts` enforces: title,
  description and Why bullet lengths, and a capitalised link's text
  being its target's title, and a glossary term lowercase mid-sentence (the check
  warns). Each `The cost:` clause needs a source that states that
  cost, and the writer runs a command sequence before it says what it does.
  A page read in full whose `teaches`, `description` or bold lead-ins fall
  short of writing-pages.md's Pin rule gets a rewrite in the same Fix, which
  doesn't count as a second focus.
  A new Lesson follows `.agents/skills/glassbox-lesson/SKILL.md` step by step:
  give the writer its path and the guide index files the orientation wrote,
  and have it report each step's Done.
- **Check.** A separate sonnet claim checker checks the changed sentences;
  `glassbox-update` owns the claim check of unchanged text, so leave that to
  it. Run writing-pages.md's Check on the changed pages, and a fresh reader
  re-reads them. One retry, then drop the change. A reader finding the run cannot
  fix goes on the memory page only as State allows.
- **Removal.** A change that only removes text or a page skips the writer, the
  claim checker and the fresh reader. Still run the page checks, grep for
  links, slugs and terms that pointed at what you removed, and re-read each
  sentence next to a cut: it may now point at nothing. Grep the guide for each
  fact you cut; one no other page teaches is either cut on purpose or taught on
  the page that fits, as a normal Fix. The run entry's `changes` says what
  you skipped.
- **Move.** A page moved or renamed keeps its check: rename its `page` in
  `checks/update.yml` and keep its date.
- **Land.** Merge `origin/main` and keep the newer pin. Two runs on one day can
  both rewrite the memory page: the later one keeps both runs' leads. Rewrite
  the memory page so it is shorter than you found it (the orientation prints its
  word count against the cap; Scout lines count), complete the run entry, get the run's cost (Loop says how) for the PR
  body, and open one PR
  (`docs/agents/pr-workflow.md`), self-merged unless the Remit says it waits.
  Wait for the Scout now; a topic of its that this run does not write goes on the
  memory page as State allows. Give `code-review`
  the Lesson contract, writing-pages.md, owner-decisions.md and the glassbox-content
  rule as its standards, without the code-smell baseline, and say the page
  checks already ran. Its Spec reviewer also judges which pages the change
  needed read (the ones it edits, links or overlaps), and names each one missing
  from `pagesRead`. Read those, recheck the change against them, and add them
  to `pagesRead` before you land. Done when the PR is open, its body gives the
  run's cost (without `get_session`: "unreported" and the token estimate), and the
  memory page and run entry are current. Then Loop.
- **Loop.** Every run that opened a PR ends here, whether it merged or waits for
  the owner; finishing a focus is not the end of the session, and closing it
  straight after Land skips this step. First read the budget. Call
  `get_session` with no session id: `external_metadata.usage.cost_usd` (it
  appears only partway into a run) and
  `external_metadata.context_usage.used_tokens`. If `get_session` is not among
  your tools, estimate the context instead: every tool result, subagent report
  and turn so far (about 4 characters a token, rounding up when unsure) plus
  about 25k for the system prompt and tools. Past runs reached $25 at about 450k
  tokens, so the estimate decides, and every figure you report says it is an
  estimate. A run adds up to about 100k tokens of context. When the budget leaves
  room for that, start the next run as a full one: orient again, its own focus,
  run entry, branch from a fresh `origin/main` and PR; in an interactive session,
  settle that focus with the person first. Take the next focus from the
  instructions you were given, then the memory page's leads, page-check
  warnings, Scout topics and gaps, and last pages no fresh reader has seen
  lately. Stop only when the budget is spent, and say in your last message and
  the session log what it was, measured or estimated. Hand over to a new session
  only when the invocation says so: create it with `source_url:
  https://github.com/feffef/terrarium` and the same prompt.

## Lenses

What to read a page for, as two readers: a developer new to the tool, and one
who knows the tool but not Terrarium. A page's rules are in writing-pages.md and
its shape in the glossary; an `owner-decisions.md` line is never a deficit.

- **Clarity.** The order, plain words, each term introduced before use, a title
  that passes the title rule.
- **Reasoning.** Each Why gives a reason, its cost and the alternative, and
  traces to the ADR or file it cites. `n/a` on a Walkthrough.
- **Placement.** One concept per page, no fact taught on another page too (an
  overlap counts on both), the right Subject, useful Where next links.
- **Evidence.** The In Terrarium examples and Excerpts are the best place in the
  repo to see the concept, and each teaches. Name a better Excerpt by file and
  line.
- **Transfer.** The page teaches the general concept beyond Terrarium and says
  when it is the wrong choice. `n/a` on a Walkthrough.
- **Relevance.** The concept deserves its own page. A low result leads to a
  merge, section or cut, never a rewrite.

Correctness is not a lens: a claim the source contradicts at the page's
`revision` is a false claim, fixed with the smallest correction once confirmed
in the source.

## State

All in `layers/glassbox/content/workshop/`:

- `pages/index.md`, the memory page: the guide's current weak spots, the
  owner's direction and the open ideas. Write it in simple, plain words, so a
  person reads it easily and later runs don't copy needlessly complex wording.
  State a count only after counting its items in their source.
  Each run leaves it shorter: it solves concrete items completely and deletes
  them, never marking one done. It adds only what a later run cannot do itself:
  an owner question, a one-line gap you could not fill within the budget
  (a gap left uncovered on purpose too), or a decision a later run would
  otherwise redo or reverse. A fact the next run still needs stays as a plain
  current fact under a heading that fits. What a run did goes in its run entry,
  not here. The word cap in
  `layers/glassbox/tests/unit/workshop.spec.ts` is a ceiling, not a target. If
  the run still hits it, never shorten what is there: squeezed wording makes
  passages hard to read. Cut whole items instead, the ones not worth pursuing,
  judged by what you know of the rest of the guide and by git history (`git log
  -S` or `git blame` on the item): one that has stood a long time and that no
  run ever took up goes first; items parked in the last few runs go last.
  **Soft decisions** (its heading) are decisions you, a reviewer or a claim
  checker made that pass that test: write each there as it is made, with what
  decided it, and skip the rest. They are
  not rules. Overrule or delete one when you have evidence against it or when
  changed content makes it obsolete. Never put one in `owner-decisions.md`.
- `../glassbox-lesson/owner-decisions.md` holds the owner's hard rules. Add a
  line only when the owner says to, in an interactive session, never in a
  scheduled run. If your change would go against a line, don't make it: log a
  Friction if that seriously hurts the quality or outcome of your task, or an
  idea if you have a good content proposal that clashes with it.
- `runs/<YYYY-MM-DDTHHMM>.yml`: one entry per run, named by the UTC time the
  orientation printed.
  Its shape is the `runs` Collection in `layers/glassbox/tenant.config.ts`. A
  `changes` entry is `page | what changed | why`, `page` being the guide page's
  stem (its path under `layers/glassbox/content/guide/pages/` without `.md`,
  `index` for the overview).
- `checks/update.yml` belongs to `glassbox-update`; write it only to rename a
  page you moved.
