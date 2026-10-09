# Interactive map of Terrarium

The goal: one interactive diagram that shows a newcomer where Terrarium's
parts live and how agents and people keep improving it.

- **The brief:** [`terrarium-overview.md`](./terrarium-overview.md).
  - Part 1 explains Terrarium in plain words.
  - Part 2 specifies the diagram.
- **The current diagram:** <https://claude.ai/artifact/E9spdeUp54KzsmXZjSJZ8L>.
  It is an experiment: a first build of Part 2, made with heavy use of
  agents. The unified diagram turned out too ambitious to render easily, and
  would need a lot more work to finish, so the build stops here for now.

## How we got here

It took four rounds, from 2026-10-08 to 2026-10-09.

1. **Compare two diagram tools.**
   - The maintainer gave Archify and Claude's artifact-diagramming skill the
     same prompt. It asked for two diagrams, the Nuxt app architecture and
     the improvement loop, and included a large research phase.
   - Two sessions ran in parallel. Each sent Explore agents through the
     repo before drawing.
   - Because each tool did its own research, the two results could differ in
     content as well as in drawing. That made the comparison unfair.
2. **Separate the brief from the drawing.**
   - The new idea: do the exploration and the clean-up of concepts and
     language once, in a brief, then hand that brief to any diagram
     generator.
   - A session wrote two briefs, one per diagram, and put them through three
     subagent review rounds: completeness, plain language and project terms.
   - Two sessions then drew from those briefs, one with Claude artifacts and
     one with Archify. The artifact results were the
     [architecture diagram](https://claude.ai/artifact/Y1N8NvYWrfeVmyLXZxQob5)
     (a floor plan) and the [improvement loop](https://claude.ai/artifact/DtdeqjvrDRtPgdNHf4E7VQ).
     The maintainer judged that neither attempt worked, and both were
     abandoned.
   - Lessons:
     - The reviews polished the briefs' framing but never questioned it.
       The diagrams missed the basic fact that everything lives in one
       repository, which becomes a database at build time.
     - Each diagram was still hard to understand without the other.
3. **One plain-language overview for one unified diagram.**
   - The brief's author replaced both briefs with one overview, grouped by
     where things live: people, Claude, GitHub, the Docker host and the
     browser.
   - It went through a grilling with the maintainer, the maintainer's own
     review, and a review by four agents on two models plus a fact-finder.
   - Part 1 became the plain-language explanation. Part 2 collected ideas
     for the interaction.
   - The session slipped from writing a brief into designing the diagram's
     rendering in detail. That design work was then split off into its own
     round.
4. **Stress-test and specify Part 2.** A cloud session ran these steps:
   - three cold readers on three models, which saw only `CLAUDE.md` and the
     overview;
   - three agents that explored the repo for interaction ideas;
   - ten Opus agents, one per open topic, each writing a proposal checked
     against the code;
   - a full rewrite of Part 2, with Part 1 facts corrected;
   - three cold checkers on three models.

   The maintainer then decided what to cut and keep. A Fable agent built the
   diagram from the final spec as an artifact.

Along the way the research found three problems outside the diagram:
[#1701](https://github.com/feffef/terrarium/issues/1701),
[#1702](https://github.com/feffef/terrarium/issues/1702) and
[#1703](https://github.com/feffef/terrarium/issues/1703).

## Session logs

Every link is pinned to `main` at `67cc614`, so a later move of a log to the
archive won't break it.

| Round | Session | What it did | Status |
|---|---|---|---|
| 1 | [df390af0](https://github.com/feffef/terrarium/blob/67cc6145971586272f21b84089f248d091607271/layers/journal/content/current/sessions/2026-10-08-df390af0-11a7-4415-9bb9-b24cea702246.yml) | two diagrams with Archify, straight from the code | completed |
| 1 | [1a527758](https://github.com/feffef/terrarium/blob/67cc6145971586272f21b84089f248d091607271/layers/journal/content/current/sessions/2026-10-08-1a527758-724c-4cf0-8160-6440f5099ee6.yml) | the same two diagrams as an [artifact](https://claude.ai/artifact/HDgKuN7NhUBeWwMJxNR8vT) | completed |
| 2, 3 | [1f97b613](https://github.com/feffef/terrarium/blob/67cc6145971586272f21b84089f248d091607271/layers/journal/content/current/sessions/2026-10-08-1f97b613-f529-4487-a7e9-1115a44b84c7.yml) | wrote and reviewed the two briefs, then the plain-language overview | in review |
| 2 | [355d2d64](https://github.com/feffef/terrarium/blob/67cc6145971586272f21b84089f248d091607271/layers/journal/content/current/sessions/2026-10-08-355d2d64-55fc-4515-81c1-e831f8b84601.yml) | artifacts drawn from the two briefs: [architecture](https://claude.ai/artifact/Y1N8NvYWrfeVmyLXZxQob5), [improvement loop](https://claude.ai/artifact/DtdeqjvrDRtPgdNHf4E7VQ) | abandoned |
| 2 | [49f1fea0](https://github.com/feffef/terrarium/blob/67cc6145971586272f21b84089f248d091607271/layers/journal/content/current/sessions/2026-10-08-49f1fea0-270e-4851-9cc7-3dbf8cc8609a.yml) | Archify diagrams drawn from the two briefs | abandoned |
| 4 | [session_01S1Wwkp](https://github.com/feffef/terrarium/blob/67cc6145971586272f21b84089f248d091607271/layers/journal/content/current/sessions/2026-10-08-session_01S1WwkpNHDfbvKAf5T1afKq.yml) | stress-tested and rewrote Part 2, then had the diagram built | in review |

## Every version of the briefs

Each brief link opens the file exactly as it was at that commit. Each commit
link opens the commit message, which says what changed. "What was asked"
below says what the maintainer asked for before each commit.

| Commit | What changed | Briefs at that commit |
|---|---|---|
| [`9444481`](https://github.com/feffef/terrarium/commit/94444811504dc7f7d8fb65d51dd6ea76a19d9662) | first two briefs | [improvement loop](https://github.com/feffef/terrarium/blob/94444811504dc7f7d8fb65d51dd6ea76a19d9662/docs/research/diagram-brief-improvement-loop.md), [Nuxt architecture](https://github.com/feffef/terrarium/blob/94444811504dc7f7d8fb65d51dd6ea76a19d9662/docs/research/diagram-brief-nuxt-architecture.md) |
| [`f49c205`](https://github.com/feffef/terrarium/commit/f49c205c5b08e96cb004d8f336aa5072c31bf714) | review round 1: what's missing, what's clutter | [improvement loop](https://github.com/feffef/terrarium/blob/f49c205c5b08e96cb004d8f336aa5072c31bf714/docs/research/diagram-brief-improvement-loop.md), [Nuxt architecture](https://github.com/feffef/terrarium/blob/f49c205c5b08e96cb004d8f336aa5072c31bf714/docs/research/diagram-brief-nuxt-architecture.md) |
| [`a930e11`](https://github.com/feffef/terrarium/commit/a930e11687bcd511c42bebbd06a69bf551bdb583) | review round 2: plain language | [improvement loop](https://github.com/feffef/terrarium/blob/a930e11687bcd511c42bebbd06a69bf551bdb583/docs/research/diagram-brief-improvement-loop.md), [Nuxt architecture](https://github.com/feffef/terrarium/blob/a930e11687bcd511c42bebbd06a69bf551bdb583/docs/research/diagram-brief-nuxt-architecture.md) |
| [`2bff5d1`](https://github.com/feffef/terrarium/commit/2bff5d1312d4c556dda95e6f7118fa4d4174a8b9) | review round 3: project terms; moved to `docs/diagrams/` | [improvement loop](https://github.com/feffef/terrarium/blob/2bff5d1312d4c556dda95e6f7118fa4d4174a8b9/docs/diagrams/improvement-loop.md), [Nuxt architecture](https://github.com/feffef/terrarium/blob/2bff5d1312d4c556dda95e6f7118fa4d4174a8b9/docs/diagrams/nuxt-architecture.md) |
| [`b488881`](https://github.com/feffef/terrarium/commit/b488881f9a6f84849e6588f1cced8775a3f07d49) | one plain-language overview replaces both briefs | [overview](https://github.com/feffef/terrarium/blob/b488881f9a6f84849e6588f1cced8775a3f07d49/docs/diagrams/terrarium-overview.md) |
| [`b90b6ae`](https://github.com/feffef/terrarium/commit/b90b6ae4503ccd548507c5c9af5561755aa7c712) | the maintainer's review | [overview](https://github.com/feffef/terrarium/blob/b90b6ae4503ccd548507c5c9af5561755aa7c712/docs/diagrams/terrarium-overview.md) |
| [`8486535`](https://github.com/feffef/terrarium/commit/8486535e3d53580eb396bdab4c99294faf4e1b5e) | review by four agents on two models, plus a fact-finder | [overview](https://github.com/feffef/terrarium/blob/8486535e3d53580eb396bdab4c99294faf4e1b5e/docs/diagrams/terrarium-overview.md) |
| [`a8c0400`](https://github.com/feffef/terrarium/commit/a8c040081ec0e1bbabd3337b328a41a2a8d8e120) | Part 2 rewritten as a spec; Part 1 facts corrected | [overview](https://github.com/feffef/terrarium/blob/a8c040081ec0e1bbabd3337b328a41a2a8d8e120/docs/diagrams/terrarium-overview.md) |
| [`e22557f`](https://github.com/feffef/terrarium/commit/e22557f3b65da71a0bc9813f4c06a8e12a3eff85) | cold-check fixes and the maintainer's decisions | [overview](https://github.com/feffef/terrarium/blob/e22557f3b65da71a0bc9813f4c06a8e12a3eff85/docs/diagrams/terrarium-overview.md) |

### What was asked

The maintainer's prompts behind each commit, summarised. Commits up to
`8486535` come from the session on the maintainer's laptop, summarised from
its transcript. The later ones come from the cloud session.

- **Before `9444481`.** The maintainer asked for research groundwork, so that
  another session could draw two interactive diagrams:
  - the Nuxt app's architecture;
  - how people, agent sessions and GitHub work together to improve the
    platform, with the routines and session logs at the centre.

  Explore agents were to take the time needed to be factually complete,
  while keeping two easy-to-read Markdown briefs with pointers to real files.
- **Before `f49c205`.** Subagents reviewed both briefs with two questions:
  does each cover every key component, actor and process of a global
  overview, and does any topic get more explanation than a high-level view
  needs? The maintainer approved applying the findings.
- **Before `a930e11`.** A second review round looked for more problems of the
  same kind, this time with an outside visitor in mind:
  - correct facts, without over-weighting minor things;
  - text that reads well, in simple language rather than project jargon;
  - structured items that turn easily into diagram elements.

  The maintainer also dropped the notes about staying consistent with the
  Journal's pages.
- **Before `2bff5d1`.** The simple language had drifted so far from the
  project's own terms that readers could no longer map the diagrams back to
  the repo. A third round:
  - re-anchored the briefs on those terms;
  - searched uncovered parts of the repo for missing concepts;
  - flagged minor things that sounded too important;
  - compared the two briefs, carrying over whatever one did better.

  Further instructions from the maintainer:
  - skill files beat the Journal's explainer pages;
  - the briefs move to `docs/diagrams/`, apart from research notes;
  - the just-merged `main` ruleset (#1690) must be reflected.
- **Before `b488881`.** The diagrams built from the briefs didn't work. The
  maintainer named why:
  - project jargon such as "Trusted human";
  - too much room for build internals (manifest expansion, the routing map,
    the Catalog, all 48 tables);
  - human-only markings that didn't matter here;
  - no diagram showed that skills, instructions, session logs, content and
    code all live in one repository, which Nuxt Content turns into a
    database at build time.

  The new approach was one high-level brief, grouped by where things live.
  It would research how the server renders pages and how the browser uses
  `_payload.json`, and keep the earlier artifact's highlighted stories,
  extended to builds and updates. A grilling then settled the vocabulary and
  the shape:
  - "agent guidance";
  - session logs and the skill inventory as special site content;
  - tenants, spaces and collections without listing them all;
  - stories on components instead of buttons;
  - lower-case terms;
  - prose first, visualisation ideas second.
- **Before `b90b6ae`.** The maintainer's review of the overview:
  - only decision records, agent how-tos, skills, scripts, the app code and
    the Journal's logs and inventory count as ground truth;
  - agent guidance includes skills, hooks and the helper scripts;
  - tenants differ in purpose and data, not only design;
  - research how Nitro, Vue, Nuxt and Nuxt Content relate;
  - add the code-review step;
  - read what `audit-docs` really checks;
  - guards explain, they don't only block.
- **Before `8486535`.** A review from two angles, important things missing
  and things that only clutter, each on Fable and on Opus, plus an Explore
  agent to answer open questions. The maintainer also set the goal for
  Part 2: the diagram need not be grasped in a minute, but it should stay a
  simple interactive design that highlights each story's important parts,
  grouping nodes and opening them only where a story needs it.
- **Before `a8c0400`.** The maintainer asked for a fix of the overview,
  built up in steps:
  1. Three agents (Sonnet, Opus, Fable) read only `CLAUDE.md` and the
     overview. Each explained what it understood and where it struggled.
  2. Three more agents on the same models explored the repo. They proposed
     how the clickable stories could work, for example by zooming into a
     component and its neighbours.
  3. The open topics were cut into ten buckets. One Opus agent per bucket
     wrote a proposal.
  4. Part 2 was rewritten completely, with minor fixes to Part 1.
  5. Cold checkers on different models, with no other context, checked
     whether the new spec was sound.
  6. Improvements were proposed for the maintainer to decide.
- **Before `e22557f`.** The maintainer answered those decisions:
  - fix every clear bug the checkers found;
  - cut real-run cards, chaining, browser back and most branches;
  - make `container` and `browser` close-ups only;
  - let Part 2 hold more detail than Part 1;
  - a close-up shows a component's details plus the components it works
    with directly;
  - file three issues found along the way.
- **After `e22557f`.** The maintainer asked for a Fable agent to build the
  diagram as an artifact. Seeing how much work it would still need, they
  stopped there and asked for this folder and README.

The current version is [`terrarium-overview.md`](./terrarium-overview.md) in
this folder.
