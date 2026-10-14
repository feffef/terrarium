---
# PROTOTYPE (ticket #1968). Order A: the concept first, then Terrarium.
title: Path-scoped rules
summary: Instructions that reach an agent only when it works on the files they are about.
type: lesson
subject: claude-code            # the Space, if Glass Box gets one Space per subject (#1970)
officialDocs:
  - label: Claude Code docs, "Path-specific rules"
    url: https://code.claude.com/docs/en/memory#path-specific-rules
inTerrarium:                    # real paths this page points at; a layer test checks each exists
  - .claude/rules/
  - CLAUDE.md
  - docs/adr/0029-instructions-load-with-the-files-they-govern.md
  - scripts/validate-adr-rules.ts
prerequisites: [claude-md]      # Lessons a newcomer should read first (slugs)
related: [adr-summary-rules, guards]
---

# Path-scoped rules

An agent can't follow an instruction it never sees. Path-scoped rules put an
instruction in front of the agent at the moment it touches the files the
instruction is about.

> **Already use path-specific rules?** Skip to [In Terrarium](#in-terrarium).

## The concept

Claude Code loads `CLAUDE.md` into every session. A **rule** is a Markdown file
in `.claude/rules/`. A rule with no `paths` loads at session start, like
`CLAUDE.md`. A rule with `paths` in its frontmatter loads only when the agent
reads or edits a file that matches one of its globs.

```markdown
---
paths:
  - "src/api/**/*.ts"
---
# API handlers

- Validate input at the boundary; never trust a request body.
```

The rule is added to the agent's context *after* the read or edit that matched.

→ Full reference: [Claude Code docs, "Path-specific rules"](https://code.claude.com/docs/en/memory#path-specific-rules)

## In Terrarium

Terrarium keeps instructions in two homes, and the choice is mechanical:

- **An instruction about certain files** goes in a rule whose `paths` match
  those files. For example, `.claude/rules/tenant-layers.md` matches every
  Tenant's `nuxt.config.ts`, `tenant.config.ts` and `app/` folder, so an agent
  editing a Tenant layer learns that a layer's CSS loads on every page.
- **An instruction for every session, or for an action** (a commit, a push, a
  PR) stays in `CLAUDE.md`. No glob can match an action.

Every ADR also has a **summary rule**, `adr-NNNN.md`, which says when to read
the full ADR. Its `paths` are the files the ADR governs, so the decision
arrives when an agent is about to change something it binds. One rule holds a
fact itself rather than an instruction: the human-merge rule's `paths` *are*
the Human-only list.

The gate keeps the summaries honest: each summary records a hash of its ADR,
and when the ADR changes the gate fails until someone re-checks the summary
(`scripts/validate-adr-rules.ts`).

### Why it's built this way

Sessions skipped prose pointers like "before you edit X, read Y". A rule
doesn't depend on the agent remembering to look; it arrives by itself. The
reasoning and the rejected alternatives are in
[ADR-0029](../../docs/adr/0029-instructions-load-with-the-files-they-govern.md).

### What to watch for

- **A rule arrives late.** It loads after the matching read, so it can't tell
  the agent to do something *before* that read. Those steps stay in `CLAUDE.md`.
- **Only some reads load rules.** The Read tool always does. A file read with
  `cat` in a shell is not a Read, so Terrarium adds a hook that loads rules for
  most shell reads, as a backstop.
- **Keep rules short.** Then a broad glob costs little. A long instruction stays
  in its doc, and the rule states the goal and points there.

## Try it in your project

Find one line in your `CLAUDE.md` that says "when you edit X…". Move it into
`.claude/rules/x.md` with `paths` matching X, and delete it from `CLAUDE.md`.

## Where next

- Walkthrough: [A friction becomes a fix](./walkthrough-friction-to-fix.md),
  where moving a line into a rule is one of the fixes.
- Lesson: ADR summary rules (not drafted)
- Lesson: Guards: when prose stops working (not drafted)
