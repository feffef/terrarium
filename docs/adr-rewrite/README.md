# ADR rewrite: working files

Temporary review folder for the ADR rewrite (ADR-0030). Pruned from history
before the work lands; nothing here is an instruction for agents.

| Path | What it is |
|---|---|
| `adr-rewrite-prompt.md` | The prompt given to each rewrite agent (current version). |
| `expectations-prompt.md` | The prompt for the blind "what do callers expect" agents. |
| `background/adr-survey.md` | Survey of all 29 ADRs, plus restructuring options. Written before ADR-0030. |
| `background/session-log-usage.md` | How sessions used rule summaries and full ADRs, from session logs. |
| `rewrites/NNNN.md` | Test rewrites of 10 ADRs in ADR-0030's format (decision unchanged, no splits or merges). |
| `rewrites/NNNN-report.md` | Each rewrite agent's report: rule inventory, what was dropped, rule check, format friction. |
| `rewrites-v2/NNNN.md`, `-report.md` | Second run with prompt v2 (callers mapped), for 0004 and 0022. |
| `rewrites-v3/NNNN.md`, `-report.md` | Third run with prompt v3 (plain language first), for 0004 and 0022. |
| `rewrites-v4/NNNN.md`, `-report.md` | Fourth run with prompt v4 (shorter, natural language, current rules), for 0004 and 0022. |
| `refs/NNNN.md` | Every live reference to each ADR (code and docs; session logs and blog posts skipped), with its enclosing block as context. 1,170 in all; `find_refs.py.txt` regenerates them. |
| `expectations/NNNN.md`, `.yml` | Blind checklists of what live callers need from each ADR: every reference classified by role, items tagged with their template section, and keep / repoint / fix lists. |
| `comparison/NNNN.md`, `comparison/SUMMARY.md` | Each rewrite checked against its checklist; decisions needed and prompt fixes. |
| `session-log-data/` | Extracted session-log data and the analysis scripts behind `session-log-usage.md`. |
