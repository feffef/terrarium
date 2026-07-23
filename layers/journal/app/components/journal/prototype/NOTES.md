# Prototype: marking external sessions

**Question:** how should a session log with `external: true` (shared/schemas/session.ts)
be visually marked in the journal's "Recent activity" overview, so it's clearly
distinguishable from our own internal Claude Code sessions?

**Variants**, all on `/t/journal/current?variant=A|B|C`:

- **A — inline tag.** A small outlined "external" tag next to the goal title,
  same visual language as `SkillInventory.vue`'s `.po` "platform-op" tag.
  Lightest touch; chronological order/grouping untouched.
- **B — card treatment.** Accent-tinted left border + a corner ribbon badge on
  the whole card. Scannable without reading text; still chronological.
- **C — grouped section.** Splits "Recent activity" into "Our sessions" /
  "External sessions" subsections. Structurally different: breaks strict
  chronological interleaving in exchange for a harder boundary.

**Status:** awaiting a verdict. Fill in below once one is picked (or elements
are combined), then delete this whole `prototype/` folder and fold the winner
into `SessionCard.vue` + `dashboard.ts`'s `sessionCardViews()` + `journal.ts`'s
`SessionCardView` (currently drops the `external` field — see the real gap).

**Verdict:** _TBD_
