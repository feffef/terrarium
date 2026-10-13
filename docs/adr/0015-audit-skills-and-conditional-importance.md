# ADR-0015: Pack Skills stay as installed; audit-skills grades every Skill by need

We never edit a Skill installed from the outside pack, and the gate checks each
one that has a Skill Inventory entry. The Skill Inventory records each Skill's
role and importance to this project, and is where a pack Skill gets our notes.
The `audit-skills` Skill checks that our own Skills fire and do their job, and
keeps the Inventory in line with that evidence; it edits only Inventory entries
and issues.

## Scope

- **Pack Skills.** A Skill named in `skills-lock.json` comes from the outside
  pack. Nobody here edits its files. Its Inventory entry pins a hash of its
  installed `SKILL.md`, which the gate compares. Notes on how it fits this
  project, and problems with its text, go in that entry, never in an issue.
- **The Inventory covers every Skill in use,** ours and the pack's. A Skill
  gets an entry when it is first seen in use, not when it is installed.
- **Importance is how much a Skill matters when its kind of work comes up,**
  never how often it runs. A rare Skill that is the tool for its job keeps a
  high grade. Disuse alone never lowers a grade. Sessions of its kind going
  without it can lower a pack Skill's grade, since we can't fix its trigger;
  for our own Skill, that is a trigger problem to report. A grade moves only
  on cited session evidence. One grade, `routine`, instead marks a Skill that
  scheduled runs drive. `CONTEXT.md` defines the grades.
- **`role` is plain prose for the site's readers:** what the Skill does for
  this project, not a copy of its own description, with no PR, issue or
  session ids. Those go in `observations`, the audit's own record, which the
  site does not show and which keeps only recent history.
- **What `audit-skills` may change:** Inventory entries, and issues it files
  or comments on. It never edits a Skill. A finding about one of our Skills
  becomes an issue when it matters enough, and otherwise an observation, so a
  later run sees it repeat. Such an issue goes through ordinary triage, and
  its fix merges like any PR. Ideas for a new, split or retired Skill are only
  recorded.
- **A script gathers the facts; the session makes every judgement.**

## Why

- Reinstalling the pack overwrites any local edit, so the edit is lost without
  notice. The gate turns that into a visible failure.
- Grading by frequency punishes the Skills we most want to keep: rare work
  with one right tool.
- Frictions miss two failures: a Skill that runs quietly but doesn't deliver
  what it promises, and one that should have fired and didn't. The owner made
  these the audit's main job.
- Changing a Skill's text is a judgement call, so the audit hands it on as an
  issue. Grades and notes are data that the next run can correct, so the audit
  edits them itself.
- Ids in `role` turned it into an audit log and crowded out the prose readers
  need.

## Rejected alternatives

- **Grade by frictions per use.** Hard sessions use more Skills and log more
  frictions, so the signal is confounded.
- **Watch for regressions through frictions.** It found almost nothing and
  can't see a failure that leaves no friction.
- **Pin pack Skills with `skills-lock.json`'s own hash.** That file belongs to
  the installer, and its hash is of the upstream source, which can't be
  checked offline.

## Consequences

- The gate checks only pack Skills that have an Inventory entry. One that is
  installed but not yet used goes unchecked until the audit adds its entry.
- A legitimate pack update re-pins in the same PR, or the gate fails.

## See

- `scripts/verify-skills-lock.ts`: the pack check and how to re-pin.
- `.agents/skills/audit-skills/SKILL.md`: the audit's steps and limits.
- `scripts/audit-skills.ts`: the scorecard and which Skills get checked.
- `layers/journal/tenant.config.ts`: the Inventory schema.
