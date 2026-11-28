---
name: glassbox-curate
description: Improve and extend the Glass Box guide by clearing its memory page's backlog, one reviewed PR per focus; with an instruction, build it with the person instead.
disable-model-invocation: true
---

# glassbox-curate

**Goal.** Make the Glass Box guide easier to learn from, and make it cover
every technology and practice Terrarium relies on, by clearing the backlog on
the memory page. Each Loop session leaves the memory page with fewer items than
it found.

**Words.**
- *Memory page*: `layers/glassbox/content/workshop/pages/index.md`, its Agent
  notes: what is weak, what the owner wants, what is missing.
- *Focus*: one goal that improves the guide, taken from the memory page or the
  person's instruction. Any size.
- *Run*: one focus and its PR: steps 3 to 7. One run, one
  branch, one PR, one run entry.
- *Run entry*: the record of one run, in
  `layers/glassbox/content/workshop/runs/`.

## Pick the mode

The only thing that decides the mode is whether the invocation has an argument.

- **No argument: Loop.** Whoever started it (the Routine or a person), you
  decide everything and ask nothing; a person who is there can interrupt you.
  Do step 1 once, then steps 2 to 8 for each run. Step 8 decides whether the
  next run starts. The run entry's `mode` is `autonomous`.
- **An argument: Instruction.** You ask the person questions only in I2. Do
  steps 1, I1 and I2. Then, for each PR in the outline (each PR is one run), do
  *Merging your PRs* and steps 3 to 7, without waiting for the person. Then do
  I3. If your context is full when a run has ended (as step 8 says), go to
  I3. The run entry's `mode` is
  `interactive`.

## Rules for every run

1. Never make a page false. A claim the source contradicts at the page's
   `revision` is fixed with the smallest correction, once confirmed in the
   source. If you can't fix it in this run (an open PR touches the page), add
   it to the memory page's *Claims to check*.
2. Never go against a line of
   [`../glassbox-lesson/owner-decisions.md`](../glassbox-lesson/owner-decisions.md).
3. Leave alone every guide page an open PR touches: the ones step 1's
   orientation lists, and your own unmerged PRs.
4. Before a structural change or a retitle, run
   `git log --oneline origin/main -- <page>` and read the run entries that name
   the page. Never reverse a change from the last 5 runs unless it made the
   page false.
5. Edit only `layers/glassbox/content/guide/`,
   `layers/glassbox/content/drafts/`, the diagram SVGs you re-render,
   the memory page, your run entries, a moved page's name in
   `layers/glassbox/content/workshop/checks/update.yml` (step 5; that file
   is otherwise `glassbox-update`'s), and, in a PR that waits for the owner
   (rule 6), `layers/glassbox/app/utils/subjects.ts`, this Skill, the
   `glassbox-lesson` docs and the page checks.
6. A PR that holds any of these waits for the owner's merge: a new Lesson (in
   drafts if it isn't central), a new Subject (with its `layers/glassbox/app/utils/subjects.ts` entry), a split
   or a move between Subjects, a change to this Skill, the `glassbox-lesson`
   docs or the page checks. Build it, say in the PR body that it waits for the
   owner, and don't merge it. The same goes for any PR `merge-pr.ts` refuses.
7. Every run does every step that applies to its change. No step is skipped
   because the change is small.

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
per file. It prints the run entry's skeleton, the open PRs, the memory page,
the recent runs and the page-check warnings.

The guide index read is essential, not waste: you need the whole guide in view
to decide what to link, update or avoid duplicating, so never skip or shorten it
to save context.

**Done when** every file above is read in full, and you know the open PRs and
the memory page's items.

### 2. Choose the focus (Loop only)

1. **Your open PRs.** Do *Merging your PRs*.
2. **Pick.** Take the most important item on the memory page whose pages no
   open PR touches, in this order:
   1. the owner's direction;
   2. gaps: topics no page teaches yet (*Stale or missing*, if the page has it);
   3. lessons that are too long (*Too long*), split as proposed, or cut or
      trimmed where there is no logical split;
   4. weak spots;
   5. everything else: open ideas, wording problems, claims to check and other
      topics.

   An item is a bullet or numbered entry under the memory page's *Agent
   notes*; *Soft decisions* and *Waiting for owner decision* are not items.

   Within a group, take the first item on the page. Skip an item that carries
   a line saying an earlier run failed on it. Take an item that needs a new
   Lesson: rule 6 leaves its PR for the owner's merge. Check that it still
   stands: grep the guide for its key terms and read where they appear. If it
   no longer stands, does not suit a guide page (a Skill-detail gap, say), or
   its only open part is a question for the owner, note it and take the next
   one; step 7 deletes or moves it.
3. **Nothing to pick.**
   - If items are left but open PRs block all of them, and one of those PRs is
     yours with its checks still running, or is a `glassbox-update` PR (it
     touches every page), subscribe to that PR's activity and end your turn.
     This is a pause, not a stop: the PR's activity (its checks, the gate's
     comment, its merge) wakes you. Then start this step again.
   - Otherwise stop the session (step 8) and say in your final message which
     items are left and which PR blocks each.

**Done when** you hold one focus.

### 3. Start the run and read

Each run, the first too, cuts a new branch from a fresh `origin/main`.
This Skill is the explicit permission to push those branches; never use
the session's harness-assigned branch. Write the run entry from the
orientation's skeleton, named by the current UTC time
(`date -u +%Y-%m-%dT%H%M`), with `focus` quoted and why you chose it.
Commit it and push the branch.

Run `pnpm exec tsx .agents/skills/glassbox-curate/scripts/orient.ts --subject <folder>`
for the focus's Subject (the Walkthroughs count as one Subject). Read each part
file it names whole, one Read per file. Also read in full every page outside
the Subject that the change will edit, link or overlap. Copy the `pagesRead`
lines it prints into the run entry, plus the outside pages. Skip a page you
already read in full this session and that has not changed on `origin/main`
since, unless your context was compacted after you read it.

**Done when** the run entry is pushed on the run's branch, and every page of
the Subject and every outside page the change edits, links or overlaps is read
in full and listed in `pagesRead`.

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

An opus writer subagent writes every sentence that states a fact and quotes the `path:line` behind each one. Give it:
- the focus, the reports from step 4 and the pages it will edit;
- the limits `layers/glassbox/page-checks.ts` enforces: title, description and
  Why bullet lengths; a capitalised link's text is its target's title; a
  glossary term is lowercase mid-sentence;
- the rule that each `The cost:` clause needs a source that states that cost;
- the rule that it runs a command before it says what the command does.

Fix every reader finding you can in this PR. A finding you can't fix goes on
the memory page only as State allows; otherwise drop it.

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
   source, and a promoted draft's whole page. Unchanged text is `glassbox-update`'s job.
2. Run writing-pages.md's Check on every changed page.
3. A fresh reader re-reads every changed page, as in step 4.
4. If the change cuts text or a page: grep the guide for links, slugs and terms
   that pointed at it, and re-read each sentence next to a cut, since it may now
   point at nothing. For each fact you cut, grep the guide: if no other page
   teaches it, either cut it on purpose (say so in the run entry) or teach it on
   the page where it fits, back through step 5.

Fix what the checks find, back through step 5. One retry; if it still fails,
drop that change. If every change of the run is dropped, keep the memory page
item, add one line to it saying what failed, and land only the memory page and
run entry.

**Done when** the claim checker, the page checks and the fresh reader pass on
every changed page.

### 7. Land

1. Merge `origin/main` into the branch and keep the newer pin. If `main`
   changed the memory page, keep every item from both versions except those
   either side deleted.
2. Update the memory page (State): delete every item this run solved or step 2
   found no longer stands, and move the rest step 2 noted to *Waiting for
   owner decision*. Add only what State allows.
3. Complete the run entry: `changes` and `pagesRead`.
4. Follow every step of `docs/agents/pr-workflow.md`, "Review before opening
   the PR", always with the `code-review` call, never the own read of a simple
   change. For its `code-review` call, add as standards the Lesson contract,
   writing-pages.md, owner-decisions.md and the glassbox-content rule, without
   the code-smell baseline, and say the page checks already ran. Its Spec
   reviewer names each page the change needed read that is missing from
   `pagesRead`: read it, recheck the change against it, add it.
5. Open one PR, subscribe to its activity and invoke `close-session`. Don't
   wait for its checks: *Merging your PRs* merges it once they are green.

**Done when** the PR is open on a reviewed, gated head and the memory page and
run entry are current.

### 8. Next (Loop only)

Each run ends at step 7. This step only decides what comes next: go back to
step 2 at once, without waiting for CI or a merge.

The session stops only when:
- a run has ended and your context is full: it holds more than 500k tokens,
  or it has been compacted. No tool shows the token count: estimate it from
  what you have read, written and received this session; if you are unsure,
  go on. A compaction always counts; or
- step 2 finds nothing to pick and says so.

Anything else is not a reason to stop: a PR waiting for CI or the owner, a
finished `close-session`, a small or done-looking memory page, or a belief that
the next scheduled run will do it.

**To stop:** do *Merging your PRs* until none of your PRs has checks still
running (between passes, end your turn; the PR's activity wakes you). Then
invoke `close-session`, and in your final message say why you stopped and
name each PR left open.

**Done when** you have started step 2 again, or stopped for one of the two
reasons above.

## Merging your PRs

Go through each PR you opened in this session that is still open:
- **Checks green:** merge it with `pr-workflow.md`'s recipe. If rule 6 says it
  waits for the owner, leave it open for a human merge.
- **Checks red:** if the cause is in your change, fix it on its branch, review
  the fix (`pr-workflow.md`, "Review before opening the PR", step 4) and push.
  If the cause isn't yours, leave it open for a human and name it in your final
  message.
- **No checks appear:** it likely has a merge conflict. Merge `origin/main` into
  its branch, resolve it and push.
- **Checks still running:** leave it for the next pass.

**Done when** each of your PRs is merged, left for a human merge, or has its
checks still running.

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

**Done when** the person has confirmed the outline.

### I3. Finish

After the last PR of the outline, do step 8's **To stop**: merge your PRs,
invoke `close-session`, and report what landed and what is left open. If the
person later sends a new instruction, start again at I1.

**Done when** each of your PRs is merged or named as left open, and
`close-session` has run.

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
  your focus, and, under *Waiting for owner decision*, a question only the
  owner can answer. Add only what you can't fix now and what clearly
  matters.
- A fact the next run still needs stays as a plain current fact under a heading
  that fits. What a run did goes in its run entry, not here.
- The word cap (`glassboxWorkshopWordCap` in `layers/glassbox/app/utils/workshop.ts`) is a ceiling,
  not a target. If you hit it, never squeeze the wording: cut whole items not
  worth pursuing. An item that has stood a long time and that no run took up
  goes first (`git log -S` on it); items added in the last few runs go last.
- **Soft decisions** (its heading): decisions you, a reviewer or a claim checker
  made that a later run would otherwise redo or reverse. Write each as it is
  made, with what decided it. They are not rules: overrule or delete one with
  evidence, or when changed content makes it obsolete. Never put one in
  `owner-decisions.md`.

**`../glassbox-lesson/owner-decisions.md`** holds the owner's hard rules. Add a
line only when the owner says so. If your change
would go against a line, don't make it: log a Friction if that seriously hurts
the outcome, or an idea if you have a good proposal that clashes with it.

**Run entries** (`runs/<YYYY-MM-DDTHHMM>.yml`, UTC): one per run. Their shape is
the `runs` Collection in `layers/glassbox/tenant.config.ts`. A `changes` entry
is `page | what changed | why`, where `page` is the guide page's stem: its path
under `layers/glassbox/content/guide/pages/` without `.md`, or `index` for the
overview. Quote a `changes` line that holds a colon followed by a space.
