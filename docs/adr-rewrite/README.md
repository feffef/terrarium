# ADR rewrite: working files

Temporary review folder for the ADR rewrite (ADR-0030). It never lands on
`main`; the deliverable is PR #1898. Nothing here is an instruction for agents.

| Path | What it is |
|---|---|
| `HANDOFF.md` | Start here: where both branches stand, what happened, next steps. |
| `decisions.md` | The owner's answers; the rewrites follow them. |
| `adr-rewrite-prompt.md` | The rewrite prompt (v7). |
| `expectations-prompt.md` | The prompt for the blind "what do callers need" agents. |
| `refs/NNNN.md` | Every live reference to each ADR, with context; `find_refs.py.txt` regenerates them. |
| `expectations/NNNN.md`, `.yml` | Blind checklists of what callers need from each ADR. |
| `rewrites/NNNN.md`, `-report.md` | Each agent's draft (superseded by #1898's text) and its report: per-part reasons, policy questions, drafted caller edits and summary rule. |
| `comparison/SUMMARY.md` | v1's policy questions and prompt lessons. |
| `background/` | Pre-ADR-0030 survey and the session-log usage study. |
| `session-log-data/` | Data and scripts behind `session-log-usage.md`. |
