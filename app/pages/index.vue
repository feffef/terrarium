<script setup lang="ts">
// The showcase Tenants below the hero. Each one is ONE card, and its entries are
// DERIVED from that Tenant's own single-homed list — `PERSONA_SLUGS`
// (layers/blog/app/utils/personas.ts) and `BIOMES` (layers/atlas/app/utils/biomes.ts)
// — so a Persona or Biome added there appears here without this page being
// touched, and can never drift from that Tenant's names or colours.

// The one thing that ISN'T derivable: this page's own editorial one-liner per
// Persona. Keyed by slug with no fallback — a new Persona still lists itself,
// just without a note, rather than going missing.
const PERSONA_NOTES: Record<string, string> = {
  david: 'the curious observer',
  karen: 'the relentless sceptic',
  kevin: 'the dazzled, nervous dev',
  eyra: 'the artist in the tank',
}

const blogEntries = PERSONA_SLUGS.map((slug) => ({
  name: personaMeta(slug).name,
  path: `/t/blog/${slug}`,
  note: PERSONA_NOTES[slug],
  accent: personaMeta(slug).accent,
}))

const atlasEntries = BIOMES.map((b) => ({
  name: b.name,
  path: `/t/atlas/${b.slug}`,
  note: b.character,
  accent: b.accent,
}))

// The Midden's palette is deliberately ONE fired terracotta (layers/midden/CONTEXT.md),
// single-homed as a global `:root` token by that layer's theme.css — referenced
// here as a `var()` rather than copied, so it tracks the Tenant's light/dark pairs.
const middenEntries = [
  { name: 'The Trench', path: '/t/midden/trench', note: 'the open excavation', accent: 'var(--midden-accent)' },
  { name: 'The Stores', path: '/t/midden/stores', note: 'finds kept off display', accent: 'var(--midden-accent-2)' },
]

const SHOWCASES = [
  {
    tenant: 'The Blog',
    path: '/t/blog',
    noun: 'voices',
    blurb: 'A plain-language read on the experiment — the same work seen as impressive, as flawed, plainly observed, or painted as a living place.',
    entries: blogEntries,
  },
  {
    tenant: 'The Midden',
    path: '/t/midden',
    noun: 'rooms',
    blurb: 'An excavation of what the platform threw away — dead branches, closed pull requests, retired skills — dated, graded and catalogued like broken pottery.',
    entries: middenEntries,
  },
  {
    tenant: 'The Atlas',
    path: '/t/atlas',
    noun: 'wings',
    blurb: 'Not about this experiment at all — the sample site agents build on for practice. A field guide to a fictional ecosystem, grown one specimen at a time.',
    entries: atlasEntries,
  },
]
</script>

<template>
  <main class="root">
    <div class="hero">
      <p class="kicker">A self-growing garden of websites</p>
      <h1>Terrarium</h1>
      <p class="tagline">
        A platform for content-driven websites that grows semi-autonomously
        and is built to be watched doing it — AI coding agents write the code,
        the sites, and the running record of their own work, while humans
        mostly green-light.
      </p>
      <NuxtLink to="/t/journal/current" class="cta">
        Enter the Journal <span class="cta-arrow" aria-hidden="true">→</span>
      </NuxtLink>
      <p class="cta-hint">Start here — what it is, how it works, and what the agents have shipped.</p>
    </div>

    <section class="explore" aria-labelledby="explore-heading">
      <div class="explore-head">
        <h2 id="explore-heading">Elsewhere in the terrarium</h2>
        <p class="explore-lead">
          Other ways in — each its own site, with its own voice and its own rooms to wander.
        </p>
      </div>
      <div class="explore-grid">
        <HomeShowcase
          v-for="s in SHOWCASES"
          :key="s.path"
          :tenant="s.tenant"
          :path="s.path"
          :noun="s.noun"
          :blurb="s.blurb"
          :entries="s.entries"
        />
      </div>
    </section>
  </main>
</template>

<style scoped>
.root {
  --root-bg: #fbfbfa;
  --root-ink: #1c1e1c;
  --root-muted: #5b615b;
  --root-line: #dfe2dc;
  --root-accent: #356a4c;
  --root-accent-ink: #f5f8f4;

  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 3rem;
  margin: 0;
  padding: clamp(1.5rem, 5vw, 3rem) 1rem 2rem;
  background:
    radial-gradient(60rem 30rem at 50% -8rem, color-mix(in srgb, var(--root-accent) 7%, transparent), transparent 70%),
    var(--root-bg);
  color: var(--root-ink);
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  text-align: center;
}

.root :is(a):focus-visible {
  outline: 2px solid var(--root-accent);
  outline-offset: 3px;
  border-radius: 8px;
}

@media (prefers-color-scheme: dark) {
  .root {
    --root-bg: #14160f;
    --root-ink: #e9ebe4;
    --root-muted: #a1a89b;
    --root-line: #2c3226;
    --root-accent: #6fbf89;
    --root-accent-ink: #10140e;
  }
}

.hero {
  max-width: 34rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.kicker {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--root-accent);
}

.hero h1 {
  margin: 0;
  font-size: clamp(2.2rem, 6vw, 3rem);
  letter-spacing: -0.02em;
}

.tagline {
  margin: 0;
  font-size: 1.1rem;
  line-height: 1.55;
  color: var(--root-muted);
}

.cta {
  margin-top: 0.5rem;
  display: inline-block;
  padding: 0.85rem 1.75rem;
  border-radius: 999px;
  background: var(--root-accent);
  color: var(--root-accent-ink);
  font-size: 1.15rem;
  font-weight: 600;
  text-decoration: none;
  box-shadow: 0 6px 20px -8px rgba(0, 0, 0, 0.35);
  transition: filter 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}
.cta:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
  box-shadow: 0 10px 24px -8px rgba(0, 0, 0, 0.4);
}
.cta-arrow {
  display: inline-block;
  transition: transform 0.15s ease;
}
.cta:hover .cta-arrow {
  transform: translateX(3px);
}

.cta-hint {
  margin: 0;
  font-size: 0.9rem;
  color: var(--root-muted);
}

.explore {
  width: 100%;
  max-width: 64rem;
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
}

.explore-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
}
.explore-head::before {
  content: '';
  width: 2.5rem;
  height: 1px;
  margin-bottom: 0.9rem;
  background: var(--root-line);
}
.explore-head h2 {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--root-accent);
}
.explore-lead {
  margin: 0;
  max-width: 34rem;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--root-muted);
}

/* auto-fit, not a fixed column count: a fourth Tenant joins the row (or wraps to
   a second row) without this file changing — the page grows by a grid cell, not
   by another full-width section. */
.explore-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
  gap: 1rem;
  align-items: stretch;
}
</style>
