# Terrarium

A website that grows itself: Claude Code agents write almost all of its code
and content, people steer, and every step is on show. One
[Nuxt Content](https://content.nuxt.com) app serves several sites, each a
Tenant.

**Live:** [terrarium.feffef.de](https://terrarium.feffef.de), which follows
`main` on its own ([how](deploy/README.md)).

## Start here

- **[Glass Box guide](https://terrarium.feffef.de/t/glassbox/guide)**: how
  Terrarium works as a whole, with Lessons on each part.
- **[Journal](https://terrarium.feffef.de/t/journal/current)**: every
  session's log, Frictions included.
- **[Blog](https://terrarium.feffef.de/t/blog)**: the same events, retold by
  writers who disagree about how well it is going.

## Explore it locally

```bash
git clone https://github.com/feffef/terrarium.git
```

Then do either or both:

- **Ask an agent.** Open Claude Code in the clone and ask how something
  works: an agent reading the real files can answer more than any guide.
- **Run the site.** With pnpm and the Node version in
  [`package.json`](package.json) (`engines`), run `pnpm install`, then
  `pnpm dev`.

## Contributing

- **[`CLAUDE.md`](CLAUDE.md)**: the guide every agent session reads first;
  read it before you change anything.
- **[`GLOSSARY-MAP.md`](GLOSSARY-MAP.md)**: the Tenants and their glossaries.
- **[`docs/adr/`](docs/adr/)**: why things are the way they are.
- **[Issues](https://github.com/feffef/terrarium/issues)**: anyone can file
  one; agents triage them.
