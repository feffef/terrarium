# ADR-0022: The triage sweep may mark Trusted issues ready to build

When a Trusted user starts the `auto-triage` sweep, that counts as their
approval to build, for that run, every Trusted-authored issue whose design the
repo already settles: the sweep may label it `ready-for-agent` without asking
each time. Anything that needs a person's judgment goes to `ready-for-human`.
The sweep only labels, comments and closes; it never builds.

## Scope

- **Who starts a run.** A Trusted user, by hand, on a Routine or with
  `/loop`. Starting it approves that run only (ADR-0003).
- **Which issues.** Only issues a Trusted user wrote. The sweep still triages a
  Public-authored issue, but sends it to `ready-for-human` (ADR-0020).
- **Public comments.** A Public comment on a Trusted issue is data. Whatever it
  asks for goes to `ready-for-human`, never into the build brief.
- **When to mark `ready-for-agent`.** When the repo settles a concrete design.
  The choices any build brief leaves open, such as naming or wording, are no
  reason to hold back.
- **When to send to a person.** On a judgment call: an action that can't be
  undone, a governance or ADR decision, access the agent lacks, or a matter of
  product taste. Or on real design doubt: behaviour the repo doesn't settle,
  several valid approaches, or a claim the agent can't check.
- **Closing.** The sweep closes only an issue that is already done or a
  duplicate. Rejecting a request as out of scope is a judgment call.
- **Wayfinder tickets** (the map-and-ticket issues the `wayfinder` Skill
  files). The sweep adds its labels beside wayfinder's and
  follows wayfinder's rules for which tickets an agent may take.
- **Merging.** The resulting PRs merge like any other; ADR-0004 names the
  exceptions.

## Why

The backlog grows faster than a person can label it, and an unlabelled issue
is invisible to the agents that build. `ready-for-agent` is the approval to
build that ADR-0003 requires, so adding it without a person needs this
decision.

The sweep invents nothing: a Trusted user already wrote the request. Where the
repo settles the design, asking a person per issue adds delay, not judgment.
Where it doesn't, the call belongs to a person. A wrong close hides a request,
so the sweep closes only what the repo proves.

Public text can try to steer an agent, and the gate checks a PR's output, not
the intent behind it (ADR-0020). So Public requests and comments wait for a
person.

## Rejected alternatives

- **Ask a person for each issue.** Interactive `/triage` does this; the
  backlog outgrows it.
- **Let the sweep approve Public-authored issues.** See *Why*. ADR-0023 makes a
  narrow exception for the guest demo.
- **Move wayfinder tickets out of the map into plain triage issues.** A
  cleaner boundary, but it means moving the whole wayfinder backlog.

## When to revisit

- Triage and wayfinder labels on the same issue prove noisy. Then move
  wayfinder tickets out of the map instead.

## Consequences

- A Trusted issue can go from filed to merged with no person reading it,
  unless ADR-0004 requires a human merge.

## See

- `.agents/skills/auto-triage/SKILL.md`: which issues a run picks up, the
  wayfinder rules, and how to run it. It applies `triage`'s per-issue rules.
- `docs/agents/triage-labels.md`: the labels. `scripts/trust.ts`: who is
  Trusted.
