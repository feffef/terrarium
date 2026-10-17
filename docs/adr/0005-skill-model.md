# ADR-0005: Skills are Platform code, committed with the repo

Skills are part of what this project delivers, as much as the app's code. Each
one lives in the repo and changes through a gated PR, like any other code. A
workflow script a Skill runs is part of that Skill, and a schedule that runs a
Skill lives outside the repo.

## Scope

- **Where Skills live.** Each Skill is committed in `.agents/skills/<name>/`.
  `.claude/skills/` only links to it, so Claude Code finds it. A Skill's PR
  merges like any other (ADR-0004).
- **A Skill that changes the Platform works on any Tenant.** It reads and
  writes that Tenant's manifest and follows its schema. A Skill for one Tenant
  is fine only for a repeated workflow unique to that Tenant, such as writing
  its content.
- **Pack Skills stay as installed** (ADR-0015). A doc we copy from a pack
  template becomes ours: we edit it and never re-sync it, and the template
  stays generic.
- **Workflow scripts.** A Claude Code workflow script runs a fixed sequence of
  agent steps, so the model cannot skip or reorder them. It belongs to the one
  Skill that runs it, and that Skill names it. It is a real file in
  `.claude/workflows/<name>.js`, and the gate treats it as one of its Skill's
  files.
- **Schedules.** A scheduled run is a Skill plus a timer set outside the repo
  (a Routine). The Skill holds what the run does; the timer holds only when.

## Why

- Scheduled and cloud sessions start from a fresh clone. A Skill that is not
  in the repo is not there for them.
- A committed Skill is reviewed and versioned with the code it changes.
- One Skill that works through the manifest keeps conventions the same for
  every Tenant, as the manifest does: one mechanism, and each Tenant declares
  what it wants.
- Claude Code loads a workflow from `.claude/workflows/` by name and refuses
  to save one through a link, so a workflow cannot sit in its Skill's folder.
  The Skill naming it keeps the ownership clear.
- A schedule kept outside the Skill can change without a PR, and the same
  Skill can still run by hand.

## Rejected alternatives

- **Keep Skills in a user profile.** Cloud and scheduled sessions would not
  have them.
- **Give each Tenant its own copy of a Platform Skill.** The copies drift, and
  conventions with them.
- **Keep workflow scripts in the Skill's folder and link them into
  `.claude/workflows/`.** Saving a workflow refuses a link.
- **Separate our Skills from pack Skills by folder or name.** `skills-lock.json`
  already lists every pack Skill, and the Skill Inventory records each Skill's
  role.

## See

- `CLAUDE.md` (Repo layout): where Skills and workflows live.
- `scripts/gate/gate.ts` (`isSkillFile`, `isInert`): which steps a Skill-only
  change skips.
- `tests/unit/workflow-scripts.spec.ts`: checks workflow scripts, which ESLint
  skips.
- `.agents/skills/writing-for-agents/SKILL.md`: how to write a Skill.
