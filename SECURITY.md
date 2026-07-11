# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security vulnerabilities.

Report privately through GitHub's **[private vulnerability reporting](https://github.com/feffef/terrarium/security/advisories/new)**
(the repository's **Security** tab → **Report a vulnerability**). This opens a
private advisory visible only to the maintainers, so a fix can be coordinated
before any public disclosure.

If private reporting is unavailable to you, open a minimal issue asking a
maintainer for a security contact — **without** including exploit details.

## Scope

Terrarium is a self-hosted, agent-developed content platform (see `CLAUDE.md`
and `docs/adr/`). Reports of particular interest:

- Content **isolation** escapes — a query scoped to one `(Tenant, Space)`
  returning another's Documents (ADR-0004 L3 / ADR-0006).
- The **agent governance** boundary — an untrusted request (issue, PR, or
  comment body) steering an autonomous agent into a change it shouldn't make,
  or clearing the safety gate with hostile intent (ADR-0003 / ADR-0004; see
  the open governance discussion in the issue tracker).
- The **PoC deploy** path — the self-updating container that tracks `main`
  (ADR-0011): anything that lets untrusted code reach a build/run step.

## What to expect

We'll acknowledge a valid report, work a fix on a private advisory, and credit
you on disclosure unless you'd prefer otherwise.
