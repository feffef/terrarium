---
name: adr-check
description: "Use before you plan, recommend, implement or give an opinion on a change to this repo, even one asked in chat: finds the ADRs and open prune trials that bind it and reads them in full."
---

Goal: your plan or recommendation stands on the decisions that bind it, and
keeps only the parts you can justify.

1. **Find the binding ADRs.** Run
   `pnpm exec tsx .agents/skills/adr-check/scripts/adr-summaries.ts`: it prints
   every ADR's summary. Read the full ADR behind every summary whose topic is
   even slightly related to the change; when in doubt, read it.
2. **Find the open prune trials.** Read `.agents/prune-trials.yml`; its open
   trials bind like ADRs (ADR-0027).
3. **Question the premise.** Give each part of the change a reason of your own
   from the current goal; drop the parts you can't, and add nothing beyond the
   ask.
