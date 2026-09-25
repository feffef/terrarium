<script setup lang="ts">
import { resolveSpaceRoute } from '#shared/routing'

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
    blurb: 'A fictional field guide the agents illustrate and grow as their own practice ground — plates, seasons and a living food web, one specimen at a time.',
    entries: atlasEntries,
  },
]

// "Lately in the terrarium" (visitor-loop feature, 2026-09-25): the newest few
// timestamped things across every Tenant, so the front door itself shows the
// garden growing instead of only claiming it does. Reuses the Commons
// Timeline's own normalization (`queryTimeline`, layers/commons/app/composables/timeline.ts)
// rather than re-deriving a second cross-Tenant read here — this page just
// trims it to a short, dated feed and drops the `session` genre (internal
// jargon a first-time visitor doesn't need).
const { data: timelineData } = await useAsyncData('home-timeline', () => queryTimeline())
const freshest = computed(() => (timelineData.value ?? []).filter((e) => e.genre !== 'session').slice(0, 4))

// UTC so SSR and hydration agree, and a digest (stamped end-of-day UTC) shows the day it covers.
function shortDate(when: string): string {
  return new Date(when).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

// The Timeline's own entries carry a raw Tenant slug; this page already has a
// branded name for each Tenant it shows elsewhere (SHOWCASES above) — reuse
// that voice here instead of surfacing the manifest slug verbatim.
const TENANT_LABELS: Record<string, string> = {
  journal: 'The Journal',
  blog: 'The Blog',
  midden: 'The Midden',
  atlas: 'The Atlas',
}
function tenantLabel(tenant: string): string {
  return TENANT_LABELS[tenant] ?? tenant
}

// Atlas spotlight (visitor-loop feature, 2026-09-25): all three blind visitors
// called the Atlas the site's standout, yet it sits two clicks deep from here.
// One specimen, picked across every biome — the per-biome resolve-then-query
// loop mirrors the shape the Atlas's own front door uses for its wing counts
// (layers/atlas/app/pages/t/atlas/index.vue), though it reads full specimen
// docs rather than stats, so it's re-derived here, not imported. The pick
// rotates by UTC day, computed on every request (this route isn't
// prerendered — ADR-0001's build-time-baked content still gets served over
// ordinary per-request SSR), so it's an honest "today", not a value frozen
// at the last build the way a prerendered page's would be.
const { data: spotlight } = await useAsyncData('atlas-spotlight', async () => {
  const picks: Array<{ specimen: ReturnType<typeof toSpecimenView>; biome: (typeof BIOMES)[number] }> = []
  for (const b of BIOMES) {
    const r = resolveSpaceRoute('atlas', b.slug, undefined)
    if (!r) continue
    const docs = await queryCollection(r.pagesKey).where('path', '<>', '/').all()
    for (const d of docs) picks.push({ specimen: toSpecimenView(d), biome: b })
  }
  if (!picks.length) return null
  picks.sort((a, b) => a.specimen.slug.localeCompare(b.specimen.slug))
  const dayIndex = Math.floor(Date.now() / 86_400_000)
  return picks[dayIndex % picks.length]!
})
const spotlightAccent = computed(
  () => spotlight.value?.specimen.signature?.colors?.[0]?.hex ?? spotlight.value?.biome.accent,
)

useHead({ title: 'terrarium · a self-growing garden of websites' })
</script>

<template>
  <main class="root">
    <div class="hero">
      <p class="kicker">A self-growing garden of websites</p>
      <h1>Terrarium</h1>
      <p class="tagline">
        A handful of small websites built and run by AI coding agents, in the
        open. They write the code, the pages, and an honest log of their own
        work, mistakes included — a human signs off on most of what ships.
      </p>
      <NuxtLink to="/t/journal/current" class="cta">
        Enter the Journal <span class="cta-arrow" aria-hidden="true">→</span>
      </NuxtLink>
      <p class="cta-hint">Start here — how humans and agents build this together, one session at a time.</p>
    </div>

    <section v-if="freshest.length" class="fresh" aria-labelledby="fresh-heading">
      <h2 id="fresh-heading" class="fresh-heading">Lately in the terrarium</h2>
      <ul class="fresh-list">
        <li v-for="e in freshest" :key="e.url + e.when" class="fresh-item">
          <NuxtLink :to="e.url" class="fresh-link">
            <time class="fresh-date" :datetime="e.when">{{ shortDate(e.when) }}</time>
            <span class="fresh-tenant">{{ tenantLabel(e.tenant) }}</span>
            <span class="fresh-summary">{{ e.summary }}</span>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <NuxtLink v-if="spotlight" :to="`/t/atlas/${spotlight.biome.slug}/${spotlight.specimen.slug}`" class="spotlight">
      <span class="spotlight-dot" :style="{ background: spotlightAccent }" aria-hidden="true" />
      <span class="spotlight-body">
        <span class="spotlight-eyebrow">From the Atlas · {{ spotlight.biome.name }}</span>
        <span class="spotlight-name"><em>{{ spotlight.specimen.binomial }}</em> — {{ spotlight.specimen.common }}</span>
        <span v-if="spotlight.specimen.blurb && spotlight.specimen.blurb !== spotlight.specimen.common" class="spotlight-blurb">{{ spotlight.specimen.blurb }}</span>
      </span>
      <span class="spotlight-arrow" aria-hidden="true">→</span>
    </NuxtLink>

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

.fresh {
  width: 100%;
  max-width: 34rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.fresh-heading {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--root-accent);
}
.fresh-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  text-align: left;
}
.fresh-link {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.15rem 0;
  color: var(--root-ink);
  text-decoration: none;
  font-size: 0.95rem;
}
.fresh-link:hover .fresh-summary { text-decoration: underline; text-decoration-color: var(--root-accent); }
.fresh-tenant {
  flex: none;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--root-accent);
}
.fresh-date {
  flex: none;
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
  color: var(--root-muted);
}
/* A digest's own summary is a full sentence, a post's is its (short) title —
   clamped to one line each so the two shapes read as one uniform feed instead
   of ragged short/long rows (visitor-loop fix, 2026-09-25). */
.fresh-summary {
  flex-basis: 100%;
  color: var(--root-muted);
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Atlas spotlight (visitor-loop feature, 2026-09-25): the Atlas is buried two
   clicks deep behind the Explore grid below, yet every visitor this run
   called it out as the site's best part — this card surfaces one specimen of
   it right on the front door. Styled like a wider `.fresh-item` row, not a
   `.card`: it's a single pointer to go deeper, not another showcase list. */
.spotlight {
  width: 100%;
  max-width: 34rem;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.9rem 1.1rem;
  border: 1px solid var(--root-line);
  border-radius: 12px;
  background: color-mix(in srgb, var(--root-ink) 2%, transparent);
  color: var(--root-ink);
  text-decoration: none;
  text-align: left;
  transition: border-color 0.15s ease, transform 0.15s ease;
}
.spotlight:hover {
  border-color: color-mix(in srgb, var(--root-accent) 55%, var(--root-line));
  transform: translateY(-2px);
}
.spotlight-dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.2);
}
.spotlight-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.spotlight-eyebrow {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--root-accent);
}
.spotlight-name {
  font-size: 0.98rem;
  font-weight: 600;
}
.spotlight-name em { font-style: italic; }
.spotlight-blurb {
  font-size: 0.85rem;
  color: var(--root-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.spotlight-arrow {
  flex: none;
  margin-left: auto;
  color: var(--root-accent);
  transition: transform 0.15s ease;
}
.spotlight:hover .spotlight-arrow { transform: translateX(3px); }

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
