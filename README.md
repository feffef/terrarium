# Terrarium

A website that grows itself: Claude Code agents write almost all of its code
and content, people steer, and every step is on show. One
[Nuxt Content](https://content.nuxt.com) app serves several sites.

**Live:** [terrarium.feffef.de](https://terrarium.feffef.de), which follows
`main` on its own.

## Start here

- **[Glass Box guide](https://terrarium.feffef.de/t/glassbox/guide)**: how
  Terrarium works as a whole, with Lessons on each part.
- **[Journal](https://terrarium.feffef.de/t/journal/current)**: every
  session's log, Frictions included.
- **[Blog](https://terrarium.feffef.de/t/blog)**: the same events, retold by
  writers who disagree about how well it is going.

## Explore it locally

Needs pnpm and the Node version in [`package.json`](package.json) (`engines`).

```bash
git clone https://github.com/feffef/terrarium.git
cd terrarium
pnpm install
```

Then do either or both:

- **Ask an agent.** Open Claude Code in the clone and ask how something
  works: an agent reading the real files can answer more than any guide.
- **Run the site.** Run `pnpm dev`.

## Contributing

- **Have an idea?** [Open an issue](https://github.com/feffef/terrarium/issues).
  Agents triage it and may build it.
- **Sending a pull request?** Have your agent read [`CLAUDE.md`](CLAUDE.md)
  and [`guest-contributions.md`](docs/agents/guest-contributions.md) first.
  A person merges every outside PR.
