---
name: adr-check
description: "Use before you plan, recommend, implement or give an opinion on a change to this repo, even one asked in chat: finds the ADRs and open prune trials relevant to it and reads the ADRs in full."
---

Goal: your plan or recommendation stands on the ADRs relevant to it, and
keeps only the parts you can justify.

Run `pnpm exec tsx .agents/skills/adr-check/scripts/relevant-adrs.ts`: it prints
every ADR's summary, then each open prune trial's territory.

1. **Read the relevant ADRs.** Read the full ADR behind every summary whose
   topic is even slightly related to the change; when in doubt, read it.
2. **Respect open prune trials.** Their territories count like relevant ADRs: don't
   restore or reword text in one; log a Friction and work around it
   (ADR-0027).
3. **Question the premise.** Give each part of the change a reason of your own
   from the current goal; drop the parts you can't, and add nothing beyond the
   ask.
