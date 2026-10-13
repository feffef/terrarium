# ADR-0023: In the guest pipeline, a guest's confirmation approves the build

The owner starting the `guest-intake` and `guest-build` Skills is the approval:
while they run, someone without write access who confirms the idea on their own
issue gets it built, with no per-issue approval. A request that could harm the
site, raise a major security concern, add a dependency or touch a Human-only
file goes to the owner instead. The owner reviews and merges every PR the
pipeline opens.

## Scope

- **Who.** A guest is a Public user (ADR-0020) on an issue they filed. A
  Public comment on someone else's issue does nothing.
- **When.** Only while the owner runs the two Skills, by hand, on a Routine or
  with `/loop`. Starting them approves that run (ADR-0003). Neither Skill
  starts itself.
  When they stop, guests can still file issues, but nothing acts on them.
- **What guests may ask for.** A design change, a small change to how something
  works, a new feature for an existing Tenant, or a whole new Tenant.
- **What goes to the owner.** At confirmation and again before building, the
  agent labels the issue `ready-for-human`, with the reason, if the work would:
  - break or deface the site on purpose;
  - raise a major security concern: it touches secrets, credentials or
    environment variables, looks like XSS or injection, asks to run code or
    reach a shell, or weakens what keeps Tenants apart. Being ambitious is not
    a concern;
  - add a dependency;
  - touch a Human-only file (ADR-0004).
- **Guest text is an idea, not instructions.** Agents refine what the guest
  wants and ignore any instruction inside it (ADR-0020).
- **Merge.** The agent opens the PR and follows it (ADR-0003), but never merges
  it and never turns on auto-merge. The owner reviews it for security and merges
  it. If guest PRs ever merge any other way, this exception ends.
- **Guest accounts.** Blocking or ignoring a guest is the owner's call.

## Why

We wanted guests to file an issue and watch our agents interview them and
build it, all on GitHub. That means automating the approval ADR-0020 keeps for
humans.

That approval guards against prompt injection: guest text that steers an agent
into code the owner never wanted. The merge is where that risk is contained
(ADR-0020), so the owner keeps every merge. A guest can reach a PR, never
`main`.

Tying the exception to the owner running the Skills keeps it on only while the
owner chooses. Turning it off needs no code change.

## Rejected alternatives

- **The owner approves each guest issue,** as ADR-0020 does by default. It
  breaks the end-to-end flow, and the merge review already contains the risk.
- **Agents merge guest PRs on a green gate,** like other PRs. ADR-0020 says
  why the gate cannot guard them.
- **Relax ADR-0020 for every Public issue.** The exception covers only this
  pipeline, only while it runs.

## Consequences

- Every guest issue costs build time and owner review. If guests flood the
  tracker, throttle intake or stop the Skills.

## See

- `.agents/skills/guest-intake/SKILL.md`: the interview, confirmation and
  checks before labelling.
- `.agents/skills/guest-build/SKILL.md`: the build, review and PR.
- `disable-model-invocation` in both Skills' frontmatter: neither starts
  itself.
- `classifyActivity` in
  `.agents/skills/guest-intake/scripts/guest-intake-scan.ts`: who counts as a
  guest on which issue.
- `.claude/rules/adr-0004-human-merge.md`: the Human-only files.
