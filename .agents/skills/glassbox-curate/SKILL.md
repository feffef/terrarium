---
name: glassbox-curate
description: Clear the Glass Box memory page's backlog. With no argument, loop focus by focus, one reviewed and merged PR each, until 500k tokens or nothing is left. With an instruction, research it, grill the person, then build it with them.
disable-model-invocation: true
---

# glassbox-curate

**Goal.** Make the Glass Box guide easier to learn from by clearing the backlog
on the memory page. You solve items; you don't collect them. Each session leaves
the memory page with fewer items than it found.

**Words.**
- *Memory page*: `layers/glassbox/content/workshop/pages/index.md`, its Agent
  notes: what is weak, what the owner wants, what is missing.
- *Focus*: one goal that improves the guide, taken from the memory page or the
  person's instruction. Any size.
- *Run*: one focus, from choosing it to its PR. One run, one PR.
- *Run entry*: the record of one run, in
  `layers/glassbox/content/workshop/runs/`.

## Pick the mode

The only thing that decides the mode is whether the invocation has an argument.

- **No argument: Loop.** Whoever started it (the Routine or a person), you
  decide everything and ask nothing. Do steps 1 to 8, then repeat 2 to 8.
  The run entry's `mode` is `autonomous`.
- **An argument: Instruction.** Always interactive. Do steps 1, I1 and I2, then
  steps 3 to 7 for each PR, then I3. The run entry's `mode` is `interactive`.

## Rules for every run

1. Never make a page false. A claim the source contradicts at the page's
   `revision` is fixed with the smallest correction, once confirmed in the
   source.
2. Never go against a line of
   [`../glassbox-lesson/owner-decisions.md`](../glassbox-lesson/owner-decisions.md).
3. Leave alone every page an open PR touches, your own PRs included.
4. Before a structural change or a retitle, run
   `git log --oneline origin/main -- <page>` and read the run entries that name
   the page. Never reverse a change from the last 5 runs unless it made the
   page false.
5. Edit only `layers/glassbox/content/guide/`, the diagram SVGs you re-render,
   the memory page, your run entries, and a moved page's name in
   `layers/glassbox/content/workshop/checks/update.yml` (step 5).
6. A PR that holds any of these waits for the owner's merge: a new Lesson, a
   new Subject (with its `layers/glassbox/app/utils/subjects.ts` entry), a split
   or a move between Subjects, a change to this Skill, the `glassbox-lesson`
   docs or the page checks. Build it, say in the PR body that it waits for the
   owner, and don't merge it.
7. Every run does every step. No step is skipped because the change is small.

## Steps

### 1. Prepare (once per session)

Read these in full:
- `layers/glassbox/GLOSSARY.md`;
- [`../glassbox-lesson/writing-pages.md`](../glassbox-lesson/writing-pages.md);
- [`../glassbox-lesson/owner-decisions.md`](../glassbox-lesson/owner-decisions.md);
- `.claude/rules/glassbox-content.md`;
- `docs/agents/git-conventions.md`, `docs/agents/github-integration.md` and
  `docs/agents/pr-workflow.md`;
- the `dispatch-subagents` Skill;
- the Lenses and State sections at the end of this file.

Then run `pnpm exec tsx .agents/skills/glassbox-curate/scripts/orient.ts` (no
flag). Read its output whole, never through `head`; if the tool saves it to a
file, read that file whole. Read each guide index file it names whole, one Read
per file. It prints where to write the run entry, the open PRs, the memory
page, the recent runs and the page-check warnings.

**Done when** every file above is read in full and you hold the orientation.

### 2. Choose the focus (Loop only)

Before each later focus, merge your PRs whose checks are green (step 7's
recipe), then run `pnpm exec tsx .agents/skills/glassbox-curate/scripts/orient.ts --index`
and read only its open PR list.

Take the most important item on the memory page that no open PR's pages block,
in this order:
1. the owner's direction;
2. weak spots;
3. everything else: gaps, open ideas, wording problems, claims to check and
   other topics.

Within a group, take the first item on the page. Check that the item still
stands: grep the guide for its key terms. If it no longer stands, delete it
from the memory page and take the next one.

If no item is left that you can work on, say so in your final message and stop
the session.

Write the run entry now from the orientation's skeleton (`focus` quoted, with
why you chose it). For a later focus, name the file by the current UTC time,
`date -u +%Y-%m-%dT%H%M`. Branch from a fresh `origin/main`, commit the run
entry and push the branch.

**Done when** the run entry names one focus and is pushed on a new branch.

### 3. Read

Run `pnpm exec tsx .agents/skills/glassbox-curate/scripts/orient.ts --subject <folder>`
for the focus's Subject (the Walkthroughs count as one Subject). Read each part
file it names whole, one Read per file. Also read in full every page outside
the Subject that the change will edit, link or overlap. Copy the `pagesRead`
lines it prints into the run entry, plus the outside pages. Skip a page you
already read in full this session and that has not changed on `origin/main`
since.

**Done when** every page of the Subject, and every outside page the change
edits, links or overlaps, is read in full and listed in `pagesRead`.

### 4. Diagnose

Give each page the focus touches to a fresh reader: a sonnet subagent with no
repo access, given only the text that
`pnpm exec tsx .agents/skills/glassbox-curate/scripts/plain.ts <stem>` prints
and the Lenses. It reports where a newcomer gets lost. Check each Why bullet
against the ADR or file it cites. For a new Lesson, read the sources it will
cite.

**Done when** every touched page has a fresh reader's report and every Why
bullet is checked.

### 5. Write

An opus writer subagent writes every sentence that states a fact, however
small the change, and quotes the `path:line` behind each one. Give it:
- the focus, the reports from step 4 and the pages it will edit;
- the limits `layers/glassbox/page-checks.ts` enforces: title, description and
  Why bullet lengths; a capitalised link's text is its target's title; a
  glossary term is lowercase mid-sentence;
- the rule that each `The cost:` clause needs a source that states that cost;
- the rule that it runs a command before it says what the command does.

Fix every reader finding you can in this PR. Drop the rest: write a finding to
the memory page only if it is a question only the owner can answer.

If a page you edit has a `teaches`, `description` or bold lead-ins that fall
short of writing-pages.md's Pin rule, rewrite them in the same change. A new
Lesson follows `.agents/skills/glassbox-lesson/SKILL.md` step by step: give the
writer its path and the guide index files, and have it report each step's Done.

When a page moves or is renamed, rename its `page` in
`layers/glassbox/content/workshop/checks/update.yml` and keep its date.

When a question only the owner can answer comes up (where a topic belongs,
whether a practice is recorded), build the option you recommend and put the
question in the PR body, with each move or retitle and its effect on URLs and
links.

**Done when** every changed sentence was written by the writer with its source.

### 6. Check

1. A separate sonnet claim checker checks every changed sentence against its
   source. Unchanged text is `glassbox-update`'s job.
2. Run writing-pages.md's Check on every changed page.
3. A fresh reader re-reads every changed page, as in step 4.
4. If the change cuts text or a page: grep the guide for links, slugs and terms
   that pointed at it, and re-read each sentence next to a cut, since it may now
   point at nothing. For each fact you cut, grep the guide: if no other page
   teaches it, either cut it on purpose (say so in the run entry) or teach it on
   the page where it fits, back through step 5.

Fix what the checks find, back through step 5. One retry; if it still fails,
drop that change.

**Done when** the claim checker, the page checks and the fresh reader pass on
every changed page.

### 7. Land

1. Merge `origin/main` into the branch and keep the newer pin. If `main`
   changed the memory page, keep both versions' items.
2. Update the memory page (State): delete every item this run solved; add only
   what State allows.
3. Complete the run entry: `changes` and `pagesRead`.
4. Commit, then run `pnpm exec tsx scripts/github/verdict-line.ts --review-call`
   and make the `code-review` call it prints. Add as its standards the Lesson
   contract, writing-pages.md, owner-decisions.md and the glassbox-content
   rule, without the code-smell baseline, and say the page checks already ran.
   Its Spec reviewer names each page the change needed read that is missing
   from `pagesRead`: read it, recheck the change against it, add it.
5. Fix the findings and review each fix (`pr-workflow.md`, "Review before
   opening the PR", step 4). Run `pnpm gate:scoped` on the final head and push
   it.
6. Open one PR and subscribe to its activity. Unless rule 6 says it waits for
   the owner, merge it with `pr-workflow.md`'s recipe once its checks are
   green: post your verdict, then run `scripts/github/merge-pr.ts`.

**Done when** the PR is open on a reviewed, gated head and the memory page and
run entry are current.

### 8. Next (Loop only)

Go back to step 2 at once. Do not wait for CI or a merge first: step 2 merges
the PRs that turned green.

The session stops only when:
- your context window holds more than 500k tokens; or
- step 2 finds no item left that you can work on.

Anything else is not a reason to stop: a PR waiting for CI or the owner, a
finished `close-session`, a small or done-looking memory page, or a belief that
the next scheduled run will do it. When you stop, merge every PR that is green,
then invoke `close-session`.

**Done when** the session stops for one of the two reasons above.

## Instruction steps

### I1. Research

Read the guide pages the instruction touches (find them in the guide index
files), the repo sources behind them, and, for a third-party tool, its official
docs.

**Done when** you can name every page the instruction affects and what its
sources say.

### I2. Grill

Run the `grilling` Skill with the person. Ask until you understand exactly what
they want, then outline what this session will do: the changes and the PRs. Ask
them to confirm the outline.

**Done when** the person has confirmed the outline. Then do steps 3 to 7 for
each PR in it, writing the run entry at the start of step 3.

### I3. Report and wait

After each PR, tell the person what landed and what is open, and wait for their
next instruction. A new instruction starts again at I1.

**Done when** the person says the session is finished, or your context window
holds more than 500k tokens. Then invoke `close-session`.

## Lenses

What a fresh reader reads a page for, as two readers: a developer new to the
tool, and one who knows the tool but not Terrarium. A page's rules are in
writing-pages.md and its shape in the glossary; an `owner-decisions.md` line is
never a deficit.

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
  merge, a section or a cut, never a rewrite.

## State

All in `layers/glassbox/content/workshop/`.

**The memory page** (`pages/index.md`) is the backlog. Write it in simple,
plain words. State a count only after counting its items in their source.
- Delete an item once it is solved. Never mark one done.
- While you work, you may add a weak spot, a gap or an idea you find outside
  your focus, and a question only the owner can answer. Add only what you can't
  fix now and what clearly matters. Each session leaves fewer items than it
  found.
- A fact the next run still needs stays as a plain current fact under a heading
  that fits. What a run did goes in its run entry, not here.
- The word cap in `layers/glassbox/tests/unit/workshop.spec.ts` is a ceiling,
  not a target. If you hit it, never squeeze the wording: cut whole items not
  worth pursuing. An item that has stood a long time and that no run took up
  goes first (`git log -S` on it); items added in the last few runs go last.
- **Soft decisions** (its heading): decisions you, a reviewer or a claim checker
  made that a later run would otherwise redo or reverse. Write each as it is
  made, with what decided it. They are not rules: overrule or delete one with
  evidence, or when changed content makes it obsolete. Never put one in
  `owner-decisions.md`.

**`../glassbox-lesson/owner-decisions.md`** holds the owner's hard rules. Add a
line only when the owner says so, in an Instruction session. If your change
would go against a line, don't make it: log a Friction if that seriously hurts
the outcome, or an idea if you have a good proposal that clashes with it.

**Run entries** (`runs/<YYYY-MM-DDTHHMM>.yml`, UTC): one per run. Their shape is
the `runs` Collection in `layers/glassbox/tenant.config.ts`. A `changes` entry
is `page | what changed | why`, where `page` is the guide page's stem: its path
under `layers/glassbox/content/guide/pages/` without `.md`, or `index` for the
overview. Quote a `changes` line that holds a colon followed by a space.

**`checks/update.yml`** belongs to `glassbox-update`; write it only to rename a
page you moved.
