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

## Every version of the brief, and what led to it

Each version below has three parts:
- **Asked:** what the maintainer asked for, summarised from the prompts;
- **Agents:** what the agents did;
- **Result:** the brief exactly as it was at that commit, with a link to
  the commit message.

Versions 1–7 come from the session on the maintainer's laptop. Versions 8–9
come from the cloud session.

### 1. First two briefs

- **Asked:** research groundwork, so that another session could draw two
  interactive diagrams:
  - the Nuxt app's architecture;
  - how people, agent sessions and GitHub improve the platform, with the
    routines and session logs at the centre.

  Be factually complete, but keep two easy-to-read Markdown briefs with
  pointers to real files.
- **Agents:** Explore agents mapped the app and the process; each claim was
  checked against the repo.
- **Result:** [improvement loop](https://github.com/feffef/terrarium/blob/94444811504dc7f7d8fb65d51dd6ea76a19d9662/docs/research/diagram-brief-improvement-loop.md), [Nuxt architecture](https://github.com/feffef/terrarium/blob/94444811504dc7f7d8fb65d51dd6ea76a19d9662/docs/research/diagram-brief-nuxt-architecture.md) · [`9444481`](https://github.com/feffef/terrarium/commit/94444811504dc7f7d8fb65d51dd6ea76a19d9662)

### 2. Review round 1: what's missing, what's clutter

- **Asked:** do the briefs cover every key component, actor and process of a
  global overview? Does any topic get more explanation than a high-level
  view needs? Then: apply the findings.
- **Agents:** two reviewers. They added the missing high-level pieces and cut
  signatures, script names, times and PR numbers.
- **Result:** [improvement loop](https://github.com/feffef/terrarium/blob/f49c205c5b08e96cb004d8f336aa5072c31bf714/docs/research/diagram-brief-improvement-loop.md), [Nuxt architecture](https://github.com/feffef/terrarium/blob/f49c205c5b08e96cb004d8f336aa5072c31bf714/docs/research/diagram-brief-nuxt-architecture.md) · [`f49c205`](https://github.com/feffef/terrarium/commit/f49c205c5b08e96cb004d8f336aa5072c31bf714)

### 3. Review round 2: plain language

- **Asked:** look again for problems of the same kind, with an outside
  visitor in mind:
  - correct facts, without over-weighting minor things;
  - simple language rather than project jargon;
  - structured items that turn easily into diagram elements.

  Also: drop the notes about staying consistent with the Journal's pages.
- **Agents:** reviewers rewrote both briefs in plain words, with node and
  edge tables per zoom level.
- **Result:** [improvement loop](https://github.com/feffef/terrarium/blob/a930e11687bcd511c42bebbd06a69bf551bdb583/docs/research/diagram-brief-improvement-loop.md), [Nuxt architecture](https://github.com/feffef/terrarium/blob/a930e11687bcd511c42bebbd06a69bf551bdb583/docs/research/diagram-brief-nuxt-architecture.md) · [`a930e11`](https://github.com/feffef/terrarium/commit/a930e11687bcd511c42bebbd06a69bf551bdb583)

### 4. Review round 3: back to the project's terms

- **Asked:** the plain language had drifted so far from the project's terms
  that readers couldn't map the diagrams back to the repo. Re-anchor on those
  terms, search uncovered parts of the repo, and flag minor things that sound
  too important. During the round, the maintainer added four instructions:
  - compare the two briefs and carry over what one does better;
  - skill files beat the Journal's explainer pages;
  - move the briefs to `docs/diagrams/`;
  - reflect the just-merged `main` ruleset (#1690).
- **Agents:** two terminology reviewers, a sweep for missed concepts, and a
  side-by-side comparison. The result gave both briefs one shared structure.
- **Result:** [improvement loop](https://github.com/feffef/terrarium/blob/2bff5d1312d4c556dda95e6f7118fa4d4174a8b9/docs/diagrams/improvement-loop.md), [Nuxt architecture](https://github.com/feffef/terrarium/blob/2bff5d1312d4c556dda95e6f7118fa4d4174a8b9/docs/diagrams/nuxt-architecture.md) · [`2bff5d1`](https://github.com/feffef/terrarium/commit/2bff5d1312d4c556dda95e6f7118fa4d4174a8b9)

Two sessions then drew diagrams from these briefs (round 2 in "How we got
here"). The artifact results were the
[architecture floor plan](https://claude.ai/artifact/Y1N8NvYWrfeVmyLXZxQob5)
and the [improvement loop](https://claude.ai/artifact/DtdeqjvrDRtPgdNHf4E7VQ).
Both attempts were abandoned.

### 5. One plain-language overview replaces both briefs

- **Asked:** the diagrams built from the briefs didn't work.
  - Project jargon such as "Trusted human" was a mistake.
  - Build internals (manifest expansion, the routing map, the Catalog, all
    48 tables) took too much room.
  - Human-only markings didn't matter here.
  - No diagram showed that everything lives in one repository, which Nuxt
    Content turns into a database at build time.

  Write one high-level brief, grouped by where things live. Research how the
  server renders pages and how the browser uses `_payload.json`. Keep the
  highlighted stories from the earlier artifact.
- **Agents:** research in the installed Nuxt packages, then a grilling with
  the maintainer that settled the vocabulary and the shape:
  - "agent guidance";
  - session logs and the skill inventory as special site content;
  - tenants, spaces and collections;
  - stories on components instead of buttons;
  - lower-case terms;
  - prose first, ideas for the diagram second.
- **Result:** [overview](https://github.com/feffef/terrarium/blob/b488881f9a6f84849e6588f1cced8775a3f07d49/docs/diagrams/terrarium-overview.md) · [`b488881`](https://github.com/feffef/terrarium/commit/b488881f9a6f84849e6588f1cced8775a3f07d49)

### 6. The maintainer's review

- **Asked:**
  - only decision records, agent how-tos, skills, scripts, the app code and
    the Journal's logs and inventory count as ground truth;
  - agent guidance includes skills, hooks and helper scripts;
  - tenants differ in purpose and data, not only design;
  - research how Nitro, Vue, Nuxt and Nuxt Content relate;
  - add the code-review step;
  - read what `audit-docs` really checks;
  - guards explain, they don't only block.
- **Agents:** checked each point in the repo and the installed packages.
- **Result:** [overview](https://github.com/feffef/terrarium/blob/b90b6ae4503ccd548507c5c9af5561755aa7c712/docs/diagrams/terrarium-overview.md) · [`b90b6ae`](https://github.com/feffef/terrarium/commit/b90b6ae4503ccd548507c5c9af5561755aa7c712)

### 7. Review from two angles

- **Asked:** find what's missing and what only clutters, each on Fable and on
  Opus, plus an Explore agent for open questions. The maintainer also set the
  goal: the diagram need not be grasped in a minute, but it should stay simple
  and open groups only where a story needs them.
- **Agents:** four reviewers and a fact-finder; their findings were checked
  against the repo.
- **Result:** [overview](https://github.com/feffef/terrarium/blob/8486535e3d53580eb396bdab4c99294faf4e1b5e/docs/diagrams/terrarium-overview.md) · [`8486535`](https://github.com/feffef/terrarium/commit/8486535e3d53580eb396bdab4c99294faf4e1b5e)

### 8. Part 2 rewritten as a spec

- **Asked:** stress-test Part 2 with many agents, rewrite it, and propose
  improvements for the maintainer to decide.
- **Agents:**
  1. Three cold readers on Sonnet, Opus and Fable read only `CLAUDE.md` and
     the overview, and said where they struggled.
  2. Three agents on the same models explored the repo for ideas on clickable
     stories and zoom.
  3. Ten Opus agents each wrote a proposal for one open topic, checked
     against the code. They also corrected facts in Part 1.
  4. Part 2 was rewritten from those proposals.
  5. Three cold checkers on three models reviewed the rewrite.
- **Result:** [overview](https://github.com/feffef/terrarium/blob/a8c040081ec0e1bbabd3337b328a41a2a8d8e120/docs/diagrams/terrarium-overview.md) · [`a8c0400`](https://github.com/feffef/terrarium/commit/a8c040081ec0e1bbabd3337b328a41a2a8d8e120)

### 9. Fixes and the maintainer's decisions

- **Asked:**
  - fix every clear bug the checkers found;
  - cut real-run cards, links between stories, browser back, and branches
    outside stories 1, 2, 3 and 5;
  - make `container` and `browser` close-ups only;
  - let a close-up show a component's details plus the components it works
    with directly;
  - "the maintainer merges, or tells the session to merge";
  - the maintainer is the repo's owner;
  - Part 2 may hold more detail than Part 1.
- **Agents:** none; the session applied the decisions itself.
- **Result:** [overview](https://github.com/feffef/terrarium/blob/e22557f3b65da71a0bc9813f4c06a8e12a3eff85/docs/diagrams/terrarium-overview.md) · [`e22557f`](https://github.com/feffef/terrarium/commit/e22557f3b65da71a0bc9813f4c06a8e12a3eff85)

After this, a Fable agent built the diagram from version 9 as an
[artifact](https://claude.ai/artifact/E9spdeUp54KzsmXZjSJZ8L), and the brief
moved to this folder. The current version is
[`terrarium-overview.md`](./terrarium-overview.md).
