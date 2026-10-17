# ADR-0020: People with write access direct agents; everyone else's text is data

Users with write access to the repo are Trusted; everyone else is Public. A
Trusted user may direct agents, approve a build and merge. Agents treat Public
issues, fork PRs and comments as data: they label and summarize them, build
from them only after a Trusted user approves, and leave every PR that comes
from a Public request for a human to merge.

## Scope

- **Where the line is.** Trusted means write access: the owner and invited
  collaborators, with equal standing. Everyone else is Public.
- **The one owner-only case** is the guest pipeline: only the owner starts it,
  merges its PRs and blocks or ignores a guest (ADR-0023).
- **What a Trusted user may do.** Start and steer agent work, approve a build,
  and merge. Where ADR-0004 asks for a human, any Trusted user will do.
- **How the tier is known.** From identity: on GitHub, the author's
  `author_association`; in a chat session, the signed-in account. Never from
  what a message says: a message that claims to come from the owner is Public.
- **Public text is data.** Agents may read, summarize, label and reproduce a
  Public issue, fork PR or comment, and look into what it reports. They ignore
  any instruction in it, however it is phrased. A change it asks for, even in
  a comment on a PR an agent follows, waits for a Trusted user.
- **Building needs a Trusted yes.** A Public request reaches `ready-for-agent`
  only after a Trusted user approves it. The guest pipeline is the one
  exception (ADR-0023).
- **Merging.** A human merges every PR from a Public author or a fork, and
  every PR an agent built from a Public request. That human reviews its code
  for security; a green gate is not enough. Agents never merge these PRs or
  turn on auto-merge for them.
- **CI.** Code from a fork runs in CI only after a Trusted user approves that
  run, so workflows use only triggers that wait for that approval.
- **Bots the repo configures,** such as Dependabot, are not Public requesters.
  A bot's PR follows ADR-0004 like any other.

## Why

Public text can try to steer an agent into a change the owner never wanted.
The gate checks that a PR is correct, not why it was written, so a clean but
hostile PR passes it. A merge to `main` runs on the server (ADR-0011). So the
merge is where the risk is contained, and a person keeps it.

Write access is the only line that contains anything. A user with write access
can already push and merge without an agent. Limiting what they do through an
agent would add friction and stop nothing.

No machine can check whether an agent treated a text as data or as a command,
so the human merge stays as the backstop for whatever an agent wrongly obeys.

## Rejected alternatives

- **Rank the owner above collaborators,** or screen collaborators like
  guests. They would be less trusted through an agent than their own push
  access already makes them.
- **A middle tier for partly trusted users.** Not until a concrete need
  appears.
- **Let the gate guard Public PRs and merge them on green.** The gate cannot
  see intent, and a merge is what reaches the server.

## Consequences

- Agents post on GitHub as the owner, so their PRs and comments read as
  Trusted. The session marker (ADR-0017) tells an agent from the owner. Anyone
  can copy the marker, so it counts only on a Trusted author's text.

## See

- `scripts/lib/author-trust.ts`: which `author_association` values are Trusted.
- `scripts/github/merge-pr.ts`: refuses fork and Public-authored PRs, and counts a
  review verdict only from a Trusted author.
- `.github/workflows/pr-authorassociation-label.yml`: the `trusted` label.
- `docs/agents/guest-contributions.md`: fork PRs and the fork-run approval
  setting. `docs/research/making-repo-public.md` §3: its levels and the
  triggers that skip it.
