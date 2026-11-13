# Design notes: a single-site template

Nine notes on one idea: a GitHub template for one content website that agents
build and one owner steers, taking from Terrarium only what earned its place.
**None of them decides anything.** Each is a proposal or a reference, written
by an agent session at the owner's request on 2026-11-13.

The number in a file name is the order in which the note was first written.
Read `09` for the design as it stands and `08` for the evidence and reasons
behind it; read the others for how the work got there.

## The notes, in order

Times are UTC. For `01` to `06` they come from the commit that first added the
file. `07` and `08` were first committed together with this README, so their
times come from the session that wrote it (the last one in the table): when
it received `07`, and when it exchanged `08` with the session that wrote
`07`. Git cannot confirm them. Each
session's log is in the Journal under
`layers/journal/content/current/sessions/`, named by its id, except for the
session that wrote `07`, which had none when this README was written.

| File | What it is | First written | Session | PR |
|---|---|---|---|---|
| [`01-single-site-template-breakdown.md`](./01-single-site-template-breakdown.md) | What Terrarium does at build time, at runtime, in sessions and in Routines, each with a keep, simplify or drop verdict. | 00:59 | [session_013zxzeQ4cuLLoFfdaf5sE2d](https://claude.ai/code/session_013zxzeQ4cuLLoFfdaf5sE2d) | #3232 |
| [`02-single-site-template-requirements.md`](./02-single-site-template-requirements.md) | Requirements for the template, with Terrarium's recorded evidence, and where `01` was too shallow. | 12:13 | [session_013zxzeRbcVWW7Upv1bSok39](https://claude.ai/code/session_013zxzeRbcVWW7Upv1bSok39) | #3269 |
| [`03-single-site-template-design-draft.md`](./03-single-site-template-design-draft.md) | The first design draft, answering `02`. | 12:18 | the same session | #3269 |
| [`04-single-site-template-design-second-draft.md`](./04-single-site-template-design-second-draft.md) | A second design draft, written without reading `03`. | 13:11 | [session_013zxzeNmq54AMia53quaCHn](https://claude.ai/code/session_013zxzeNmq54AMia53quaCHn) | #3270 |
| [`05-platform-requirements-neutral.md`](./05-platform-requirements-neutral.md) | The requirements with every technology, file name and Terrarium term removed, so an outside designer can work from them. | 13:54 | [session_013zxzeSvCUWdcpBdHi4sdX2](https://claude.ai/code/session_013zxzeSvCUWdcpBdHi4sdX2) | #3272 |
| [`06-single-site-template-design-combined-draft.md`](./06-single-site-template-design-combined-draft.md) | One draft that takes the best of `03` and `04`: the **insider draft**. | 13:56 | [session_013zxzeQ9FTpQjBywTHWkdXF](https://claude.ai/code/session_013zxzeQ9FTpQjBywTHWkdXF) | #3271 |
| [`07-platform-design-draft.md`](./07-platform-design-draft.md) | A design written from `05` alone, with no access to Terrarium: the **outsider draft**. | after `05`, by about 16:10 | [session_013zxzePjcu3uX5URNR4fiue](https://claude.ai/code/session_013zxzePjcu3uX5URNR4fiue) | with this README |
| [`08-converged-decisions.md`](./08-converged-decisions.md) | Where `06` and `07` now agree, each decision with the recorded problem behind it, and what is left for the owner. | 16:36 to 18:00 | the session above and [session_013zxzeP357BagrJREfWSJ6U](https://claude.ai/code/session_013zxzeP357BagrJREfWSJ6U) | with this README |
| [`09-final-design-draft.md`](./09-final-design-draft.md) | One standalone design in the 14-section shape, meant as the baseline; working title "Samara". It cites `05` for requirements and `08` for evidence. | about 22:20 | [session_013zxzePjcu3uX5URNR4fiue](https://claude.ai/code/session_013zxzePjcu3uX5URNR4fiue) | added after the README |

## How each note came about

**01, the breakdown.** The owner asked for an overview of the repo and for
proposals on what a spin-off template should keep. After three rounds of
questions the owner set the task: break down everything Terrarium does and
recommend, per part, what to take. The session read Glass Box lessons and sent
agents through the source, the Routines and the session logs. Two agents
studied the stack, one of them by building the same small site in Astro and in
Nuxt Content; the note itself says those test projects were not kept. It was
first committed under `docs/research/`.

**02, the requirements, and 03, the first design draft.** The owner asked for
a deeper dig into Skills, scripts, session logs and issue history to find
where `01` was shallow, and for a requirements-only document, then a separate
design draft. The session ran three rounds of agents and wrote both. Many
follow-ups from the owner shaped the wording: plain lowercase terms, verb
commands, cheap checks before a mechanism per failure. That session also moved
`01`, `02` and `03` from `docs/research/` to `docs/design/`.

**04, the second design draft.** The owner asked a fresh session to read `01`
and `02`, to leave `03` unread, and to write its own draft in a given
14-section structure. The owner told it that every sweep ships, that a
separate agent identity is only an option, and that Terrarium's ADRs do not
bind the template.

**05, the neutral requirements.** The owner asked a session to read every file
in this folder and distil the requirements into one technology-neutral file
that could be handed to a design agent with nothing else from this repo. The
session asked four scoping questions first, removed repo and product names,
and had the file reviewed twice.

**06, the combined draft (insider).** The owner asked a session to read the
four notes then in the folder, list where `03` and `04` differ, and write one
draft from the best of both. Two rounds of owner questions settled thirteen
points. The owner required the note to stand alone and cite none of the
others. It was written at the same time as `05`, which was committed two
minutes earlier; each of the two sessions read only the four notes then in
the folder.

**07, the outsider draft.** The owner gave `05`, and nothing else, to a
session with no access to this repo and asked for a design. That session did
not commit the file here and had no session log in the Journal when this
README was written. The copy in this folder is the one the owner handed to
the last session at about 16:10; the only change is the file name it cites
for `05`.

**08, the converged decisions.** The owner asked the session with repo access
to find where `07` beats `06`, then had the two sessions exchange messages
until the designs converged. The outsider session said the owner had given it
the role of arguing for the simplest design. The session with repo access
sent read-only agents through the merge script, session logging, the gate,
preview and deploy loop, the guards and hints, backlog steering, the Routines,
git, cost reading and the site's runtime, and answered each question with the
recorded problem and its count. The outsider session wrote the list; the other
checked it line by line and sent three sets of amendments. It then proposed
seven last corrections, which the owner confirmed and which are applied in
this copy. Counts marked "(sub)" in the note come from an agent and were not
re-checked. The same evening the owner objected to its owner-area decision
and asked that a site be free to choose its framework; the two sessions
worked that through with the owner, and the session with repo access revised
the note: a separate owner app, a contract between platform and site, content
checks owned by the site, and the stack chosen for least own code.

**09, the final design draft.** The owner found that `08` summarises the
discussion well but names no baseline: it leans on `06` for the glossary,
dashboard and setup, and `06` is now wrong in many places. The owner asked
the outsider session for one standalone draft and settled more points with
it first. That session reports these as the owner's decisions: the watcher
uses a model again, guided by a short watch list in each skill; a sixth
sweep merges Dependabot's minor and patch updates; the working name is
"Samara"; the container is the default deploy. The owner uploaded the file
to the session with repo access at about 22:20, which checked its counts
against `08` and its paths against this repo, reported the differences to the
owner, and committed it with the file name it cites for `05` corrected. The
owner then ruled on those differences and that session applied them: the
repo shape is marked provisional, the Dependabot config and the watch lists
are protected, the question of public or private is dropped, how `merge`
recognises a Dependabot pull request is left to an experiment, and four
smaller points became open questions. Its time, like those of `07` and `08`,
is not a commit time.

## Names used across the notes

- `08` cites sections of "the insider draft" (`06`) for the dashboard views,
  setup, identity and the glossary; those stand as written there.
- Requirement ids such as `MRG-3` or `REC-11` are defined in `05`.

The files had no number in their names before this README was added; older
commits, PRs and session logs name them without the prefix.
