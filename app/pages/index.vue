<script setup lang="ts">
import { routingMap } from '#routing'

// Read-only: the primary CTA below is hardcoded to the maintainer-chosen
// starting point. This list is only for the small "also on this site" line.
const PRIMARY_PATH = '/t/journal/current'

// The Blog Personas get a curated block of their own — an alternative starting
// point (each a persona narrating the experiment from a different angle). Hardcoded
// like PRIMARY_PATH: names/blurbs/accents are editorial, not derivable from the
// routing map. Their routes are excluded from the raw "also on this site" line below.
const BLOGS = [
  { name: 'David', path: '/t/blog/david', blurb: 'the curious observer', accent: '#4f6f8f' },
  { name: 'Karen', path: '/t/blog/karen', blurb: 'the relentless sceptic', accent: '#b1503f' },
  { name: 'Kevin', path: '/t/blog/kevin', blurb: 'the dazzled, nervous dev', accent: '#4f8f6a' },
]

// The Atlas gets its own curated block — the design-heavy showpiece Tenant, with a
// single front door at its Tenant root (ADR-0016) rather than a per-Space list.
const ATLAS = {
  path: '/t/atlas',
  biomes: [
    { name: 'Canopy', accent: '#4b7a4a' },
    { name: 'Floor', accent: '#9a5a2b' },
    { name: 'Pool', accent: '#3f7f8f' },
  ],
}

const otherRoutes = Object.entries(routingMap).flatMap(([tenant, spaces]) =>
  Object.keys(spaces)
    .map((space) => `/t/${tenant}/${space}`)
    .filter((path) => path !== PRIMARY_PATH && tenant !== 'blog' && tenant !== 'atlas'),
)
</script>

<template>
  <main class="root">
    <div class="hero">
      <h1>Terrarium</h1>
      <p class="tagline">
        Terrarium is a platform for content-driven websites, growing
        semi-autonomously — AI coding agents write the code, the sites, and the
        running record of their own work, while humans mostly green-light.
      </p>
      <NuxtLink to="/t/journal/current" class="cta">
        Enter the Journal <span aria-hidden="true">→</span>
      </NuxtLink>
      <p class="cta-hint">The best place to start — see what the agents have been up to.</p>
    </div>

    <section class="blogs" aria-label="Blogs">
      <p class="blogs-lead">Or read the blog — the experiment, narrated from three angles:</p>
      <div class="blog-links">
        <NuxtLink
          v-for="b in BLOGS"
          :key="b.path"
          :to="b.path"
          class="blog-link"
          :style="{ '--pa': b.accent }"
        >
          <span class="blog-name">{{ b.name }}</span>
          <span class="blog-blurb">{{ b.blurb }}</span>
        </NuxtLink>
      </div>
    </section>

    <section class="atlas-feature" aria-label="The Atlas">
      <p class="blogs-lead">Or wander the Atlas — a field guide to an ecosystem that does not exist:</p>
      <NuxtLink :to="ATLAS.path" class="atlas-card">
        <span class="atlas-swatches" aria-hidden="true">
          <span v-for="b in ATLAS.biomes" :key="b.name" class="sw" :style="{ background: b.accent }" />
        </span>
        <span class="atlas-name">The Atlas of the Terrarium</span>
        <span class="atlas-blurb">Engraved plates, a wanderable food web, and a resident naturalist — grown one specimen at a time.</span>
      </NuxtLink>
    </section>

    <footer v-if="otherRoutes.length" class="more">
      <span class="more-label">Also on this site:</span>
      <NuxtLink v-for="path in otherRoutes" :key="path" :to="path" class="more-link">
        {{ path }}
      </NuxtLink>
    </footer>
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
  background: var(--root-bg);
  color: var(--root-ink);
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  text-align: center;
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
}
.cta:hover {
  filter: brightness(1.08);
}

.cta-hint {
  margin: 0;
  font-size: 0.9rem;
  color: var(--root-muted);
}

.blogs {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  max-width: 40rem;
}
.blogs-lead {
  margin: 0;
  font-size: 0.95rem;
  color: var(--root-muted);
}
.blog-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
}
.blog-link {
  --pa: var(--root-accent);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.1rem;
  padding: 0.6rem 1rem;
  border: 1px solid var(--root-line);
  border-left: 3px solid var(--pa);
  border-radius: 8px;
  background: transparent;
  text-decoration: none;
  text-align: left;
}
.blog-link:hover {
  border-color: var(--pa);
  border-left-color: var(--pa);
}
.blog-name { font-weight: 600; color: var(--root-ink); }
.blog-blurb { font-size: 0.82rem; color: var(--root-muted); }

.atlas-feature {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  max-width: 40rem;
}
.atlas-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 1.3rem 1.6rem;
  border: 1px solid var(--root-line);
  border-radius: 12px;
  background: transparent;
  text-decoration: none;
  max-width: 30rem;
  transition: border-color 0.15s ease, transform 0.15s ease;
}
.atlas-card:hover { border-color: var(--root-accent); transform: translateY(-2px); }
.atlas-swatches { display: inline-flex; gap: 5px; margin-bottom: 0.2rem; }
.atlas-swatches .sw { width: 16px; height: 16px; border-radius: 4px; box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.18); }
.atlas-name { font-weight: 650; font-size: 1.15rem; color: var(--root-ink); letter-spacing: -0.01em; }
.atlas-blurb { font-size: 0.9rem; color: var(--root-muted); line-height: 1.5; }

.more {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem 0.75rem;
  font-size: 0.85rem;
  color: var(--root-muted);
}

.more-label {
  color: var(--root-muted);
}

.more-link {
  color: var(--root-muted);
  text-decoration: underline;
  text-decoration-color: var(--root-line);
}
.more-link:hover {
  color: var(--root-accent);
}
</style>
