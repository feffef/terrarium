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

Each link opens the file exactly as it was at that commit.

| Commit | What changed | Briefs at that commit |
|---|---|---|
| `9444481` | first two briefs | [improvement loop](https://github.com/feffef/terrarium/blob/94444811504dc7f7d8fb65d51dd6ea76a19d9662/docs/research/diagram-brief-improvement-loop.md), [Nuxt architecture](https://github.com/feffef/terrarium/blob/94444811504dc7f7d8fb65d51dd6ea76a19d9662/docs/research/diagram-brief-nuxt-architecture.md) |
| `f49c205` | review round 1: what's missing, what's clutter | [improvement loop](https://github.com/feffef/terrarium/blob/f49c205c5b08e96cb004d8f336aa5072c31bf714/docs/research/diagram-brief-improvement-loop.md), [Nuxt architecture](https://github.com/feffef/terrarium/blob/f49c205c5b08e96cb004d8f336aa5072c31bf714/docs/research/diagram-brief-nuxt-architecture.md) |
| `a930e11` | review round 2: plain language | [improvement loop](https://github.com/feffef/terrarium/blob/a930e11687bcd511c42bebbd06a69bf551bdb583/docs/research/diagram-brief-improvement-loop.md), [Nuxt architecture](https://github.com/feffef/terrarium/blob/a930e11687bcd511c42bebbd06a69bf551bdb583/docs/research/diagram-brief-nuxt-architecture.md) |
| `2bff5d1` | review round 3: project terms; moved to `docs/diagrams/` | [improvement loop](https://github.com/feffef/terrarium/blob/2bff5d1312d4c556dda95e6f7118fa4d4174a8b9/docs/diagrams/improvement-loop.md), [Nuxt architecture](https://github.com/feffef/terrarium/blob/2bff5d1312d4c556dda95e6f7118fa4d4174a8b9/docs/diagrams/nuxt-architecture.md) |
| `b488881` | one plain-language overview replaces both briefs | [overview](https://github.com/feffef/terrarium/blob/b488881f9a6f84849e6588f1cced8775a3f07d49/docs/diagrams/terrarium-overview.md) |
| `b90b6ae` | the maintainer's review | [overview](https://github.com/feffef/terrarium/blob/b90b6ae4503ccd548507c5c9af5561755aa7c712/docs/diagrams/terrarium-overview.md) |
| `8486535` | review by four agents on two models, plus a fact-finder | [overview](https://github.com/feffef/terrarium/blob/8486535e3d53580eb396bdab4c99294faf4e1b5e/docs/diagrams/terrarium-overview.md) |
| `a8c0400` | Part 2 rewritten as a spec; Part 1 facts corrected | [overview](https://github.com/feffef/terrarium/blob/a8c040081ec0e1bbabd3337b328a41a2a8d8e120/docs/diagrams/terrarium-overview.md) |
| `e22557f` | cold-check fixes and the maintainer's decisions | [overview](https://github.com/feffef/terrarium/blob/e22557f3b65da71a0bc9813f4c06a8e12a3eff85/docs/diagrams/terrarium-overview.md) |

The current version is [`terrarium-overview.md`](./terrarium-overview.md) in
this folder.
