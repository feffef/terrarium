---
title: A newcomer's first hour
description: How a developer new to Terrarium finds their way in, from the home page through the Journal's short tour to the files every agent session reads first.
revision: '8fecf8b4e1b32da82557e42f42b2045bd12a05bb'
revisionDate: '2026-10-15'
---

A developer has just heard of Terrarium and has an hour to spare. This Walkthrough follows them from the home page, through the Journal's short tour of how the place works, into the repository, where they read the same files every agent session reads first. It ends where the Lessons here take over.

## 1. The home page points to the Journal

The home page says what Terrarium is in a few lines, links the repository's issues and pull requests, and offers one button: "Enter the Journal". The Journal is the :term[Tenant] that documents the Platform itself; the other sites are listed further down.

::stop-links
[One app, many sites: Nuxt layers](/t/glassbox/guide/nuxt-vue/layers) · [The Journal](/t/journal/current) · :file[app/pages/index.vue] · :file[app/utils/sites.ts]
::

## 2. "New here?" offers a short tour

The Journal's landing page opens with "New here? Start with the short version", a row of cards, each a door to one explainer page. No list of those pages exists in code. A page joins the tour through its own frontmatter: `onramp` holds its place in the order, `onrampLabel` and `onrampBlurb` the card's text. The fields are optional parts of the Journal's `pages` schema, so an ordinary page leaves them out. The landing page reads every page of its :term[Space], keeps those that set `onramp` and a label, sorts them by it and draws a card for each, then adds one card of its own for the :term[Friction Ledger], a Vue page with no frontmatter to set.

::stop-links
[Collections expanded from one manifest](/t/glassbox/guide/nuxt-content/manifest-collections) · [Schemas give column types, not validation](/t/glassbox/drafts/zod/schemas-column-types) · :file[layers/journal/tenant.config.ts] · :file[layers/journal/app/utils/onramp.ts]
::

## 3. Each tour page leads to the next

An explainer page that sets `onramp` ends in a footer: "Start here", its place in the tour, a link back and a link to the next page. The Journal's own page for its Documents builds the footer: it asks Nuxt Content for just the tour fields of every page with an `onramp` value, and sorts them the same way the landing page does. The last page's footer leads back to the Journal. On the way, the newcomer reads how the Platform is built and deployed and how humans and agents work on it.

::stop-links
[queryCollection patterns](/t/glassbox/drafts/nuxt-content/query-collection-patterns) · [File routing: catch-all, Tenant overrides, root pages](/t/glassbox/guide/nuxt-vue/file-routing) · [Architecture & Deployment](/t/journal/current/architecture) · [How Humans & Agents Work](/t/journal/current/how-it-works) · :file[layers/journal/app/components/journal/OnrampTour.vue]
::

## 4. One tour page sorts real from invented

Some sites here record the real build and some are fiction, and a newcomer can't tell which from the outside. One tour page sorts them into the sites that are about the real build, each in its own way, and the practice grounds and demos that claim nothing about it. The repository keeps the same distinction in its glossary map, which says how each Tenant relates to reality.

::stop-links
[Several glossaries](/t/glassbox/drafts/terrarium-practice/glossaries) · [What's Real, What's Invented](/t/journal/current/real-and-invented)
::

## 5. In the repository, CLAUDE.md comes first

The tour links the repository's issues and pull requests, and from there the newcomer opens the code. A good first file is the one every agent session reads first: `CLAUDE.md`. It is short, sets the house style and names the doc to read before each kind of action, rather than copying the docs in. Instructions about particular files live in rules, which load when an agent reads or edits those files.

::stop-links
[CLAUDE.md as the every-session contract](/t/glassbox/guide/claude-code/claude-md) · [Path-scoped rules](/t/glassbox/guide/claude-code/path-scoped-rules)
::

## 6. The words before the code

`CLAUDE.md` sends every session to the glossaries before anything else: the glossary map, which points to a Tenant's own glossary, then the Platform glossary, with words such as Tenant, Space and Friction. A newcomer who reads them in that order learns the words the docs, the code and the agents all use. The decisions behind the words are ADRs, one decision each, and each ADR's summary reaches agents as a rule.

::stop-links
[Several glossaries](/t/glassbox/drafts/terrarium-practice/glossaries) · [ADRs: one decision, no history](/t/glassbox/guide/terrarium-practice/adrs)
::

## A real case

On 28 September 2026 a `visitor-loop` run sent three first-time-visitor agents, with no knowledge of the repository, through the home page. All three, separately, proposed some kind of place to start that says what is real and what is invented. The run built it as PR #1475: one new Journal page whose frontmatter made it the fifth "New here?" card, with no line of code changed.

## Where next

- [CLAUDE.md as the every-session contract](/t/glassbox/guide/claude-code/claude-md)
- [Several glossaries](/t/glassbox/drafts/terrarium-practice/glossaries)
- [queryCollection patterns](/t/glassbox/drafts/nuxt-content/query-collection-patterns)
- [Opening a page](/t/glassbox/guide/walkthroughs/opening-a-page)
- [What's Real, What's Invented](/t/journal/current/real-and-invented)
