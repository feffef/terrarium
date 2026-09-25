<script setup lang="ts">
import { resolveSpaceRoute } from '#shared/routing'

// The showcase Tenants below the hero. Each one is ONE tile, and its entries are
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

// Teasers reuse the Commons Timeline's own normalization (`queryTimeline`,
// layers/commons/app/composables/timeline.ts) rather than re-deriving a second
// cross-Tenant read of digests and posts.
const { data: timelineData } = await useAsyncData('home-timeline', () => queryTimeline())
const digests = computed(() =>
  (timelineData.value ?? []).filter((e) => e.genre === 'digest' && e.space === 'current'),
)
const blogPosts = computed(() =>
  (timelineData.value ?? []).filter((e) => e.genre === 'post' && e.tenant === 'blog').slice(0, 10),
)

// UTC so SSR and hydration agree, and a digest (stamped end-of-day UTC) shows the day it covers.
function shortDate(when: string): string {
  return new Date(when).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

// Today's pick from a stably sorted list, rotating by UTC day. This route isn't
// prerendered, so it's computed per request — an honest "today", not a value
// frozen at the last build.
function pickOfTheDay<T>(items: T[]): T | null {
  return items.length ? items[Math.floor(Date.now() / 86_400_000) % items.length]! : null
}

// The per-biome resolve-then-query loop mirrors the Atlas front door's own
// (layers/atlas/app/pages/t/atlas/index.vue).
const { data: spotlight } = await useAsyncData('atlas-spotlight', async () => {
  const picks: Array<{ specimen: ReturnType<typeof toSpecimenView>; biome: (typeof BIOMES)[number] }> = []
  for (const b of BIOMES) {
    const r = resolveSpaceRoute('atlas', b.slug, undefined)
    if (!r) continue
    const docs = await queryCollection(r.pagesKey).where('path', '<>', '/').all()
    for (const d of docs) picks.push({ specimen: toSpecimenView(d), biome: b })
  }
  picks.sort((a, b) => a.specimen.slug.localeCompare(b.specimen.slug))
  return pickOfTheDay(picks)
})

// Trench only: the Stores are off display (layers/midden/CONTEXT.md). Artifacts
// aren't routed (ADR-0006), so a find links to its Site's dig report, which
// anchors it as `#artifact-<stem>`.
const { data: find } = await useAsyncData('midden-find', async () => {
  const r = resolveSpaceRoute('midden', 'trench', undefined)
  if (!r) return null
  const finds = (await queryCollection(r.collections.artifacts).all()) as unknown as MiddenArtifactDoc[]
  finds.sort((a, b) => a.stem.localeCompare(b.stem))
  const d = pickOfTheDay(finds)
  return d && { ...d, url: `/t/midden/trench${d.site ? `/${d.site}` : ''}#artifact-${d.stem}` }
})

useHead({ title: 'terrarium · a self-growing garden of websites' })
</script>

<template>
  <main class="root">
    <div class="hero">
      <div class="hero-copy">
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
        <p class="tagline cta-hint">Start here — how humans and agents build this together, one session at a time.</p>
      </div>

      <section v-if="digests.length" class="digests" aria-labelledby="digests-heading">
        <h2 id="digests-heading" class="eyebrow">Latest from the Journal</h2>
        <div class="scroll-well">
          <ul class="digest-list scroll-box">
            <li v-for="d in digests" :key="d.url">
              <NuxtLink :to="d.url" class="digest">
                <time class="digest-date" :datetime="d.when">{{ shortDate(d.when) }}</time>
                <span class="digest-summary">{{ d.summary }}</span>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </section>
    </div>

    <section class="explore" aria-labelledby="explore-heading">
      <div class="explore-head">
        <h2 id="explore-heading" class="eyebrow">Elsewhere in the terrarium</h2>
        <p class="tagline">
          Other ways in — each its own site, with its own voice and its own rooms to wander.
        </p>
      </div>
      <div class="explore-grid">
        <HomeShowcase
          tenant="The Blog"
          path="/t/blog"
          noun="voices"
          dress="blog"
          teaser-label="Latest posts"
          blurb="A plain-language read on the experiment — the same work seen as impressive, as flawed, plainly observed, or painted as a living place."
          :entries="blogEntries"
        >
          <div class="scroll-well">
            <ul class="posts scroll-box">
              <li v-for="p in blogPosts" :key="p.url">
                <NuxtLink :to="p.url" class="post" :style="{ '--ea': personaMeta(p.space).accent }">
                  <span class="post-meta">
                    <span class="post-persona">{{ personaMeta(p.space).name }}</span>
                    <time :datetime="p.when">{{ shortDate(p.when) }}</time>
                  </span>
                  <span class="post-title">{{ p.summary }}</span>
                </NuxtLink>
              </li>
            </ul>
          </div>
        </HomeShowcase>

        <HomeShowcase
          tenant="The Atlas"
          path="/t/atlas"
          noun="wings"
          dress="atlas"
          teaser-label="Specimen of the day"
          blurb="A fictional field guide the agents illustrate and grow as their own practice ground — plates, seasons and a living food web, one specimen at a time."
          :entries="atlasEntries"
          :style="spotlight ? { '--biome-accent': spotlight.biome.accent } : undefined"
        >
          <NuxtLink
            v-if="spotlight"
            :to="`/t/atlas/${spotlight.biome.slug}/${spotlight.specimen.slug}`"
            class="specimen"
            :style="signatureVars(spotlight.specimen.signature?.colors)"
          >
            <AtlasSpecimenPlate
              class="specimen-plate"
              :illustration="spotlight.specimen.illustration"
              :number="spotlight.specimen.plate?.number"
              :binomial="spotlight.specimen.binomial"
              :conjectural="spotlight.specimen.plate?.conjectural"
            />
            <span class="specimen-common">{{ spotlight.specimen.common }}</span>
            <span class="specimen-where">{{ spotlight.biome.name }}</span>
          </NuxtLink>
        </HomeShowcase>

        <HomeShowcase
          tenant="The Midden"
          path="/t/midden"
          noun="rooms"
          dress="midden"
          teaser-label="Today's find"
          blurb="An excavation of what the platform threw away — dead branches, closed pull requests, retired skills — dated, graded and catalogued like broken pottery."
          :entries="middenEntries"
        >
          <NuxtLink v-if="find" :to="find.url" class="find">
            <span class="find-stamp">{{ conditionMeta(find.condition).label }}</span>
            <span class="find-title">{{ find.title }}</span>
            <span class="scroll-well find-well"><span class="find-note scroll-box">{{ find.catalogNote }}</span></span>
            <span class="find-meta">{{ digSeasonOf(find.stratum)?.label ?? find.stratum }}</span>
          </NuxtLink>
        </HomeShowcase>
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
  align-items: center;
  gap: 3.5rem;
  margin: 0;
  padding: clamp(1.5rem, 5vw, 3.5rem) 1rem 3rem;
  background:
    radial-gradient(60rem 30rem at 50% -8rem, color-mix(in srgb, var(--root-accent) 7%, transparent), transparent 70%),
    var(--root-bg);
  color: var(--root-ink);
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
}

/* One column for the whole page: hero, digests and the card grid share its
   width and left edge so the page reads as a single composition. */
.hero,
.explore {
  width: 100%;
  max-width: 70rem;
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

.eyebrow,
.kicker {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--root-accent);
  text-wrap: balance;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(16rem, 22rem);
  gap: 2rem 4rem;
}
@media (max-width: 56rem) {
  .hero {
    grid-template-columns: minmax(0, 1fr);
  }
}
.hero-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
}
.hero-copy > p,
.hero-copy > h1 {
  max-width: 34rem;
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
  margin-top: 0.4rem;
  text-wrap: balance;
}

/* Desktop: a well fills whatever height its row already has and scrolls the
   rest, so a long list never sets that height — the hero copy sets the digests'
   row and the Atlas plate sets the cards'. Absolute positioning is what keeps
   the list out of the row's height calculation. Phones stack everything, so
   there each list shows its first three entries at natural height instead. */
.scroll-well {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
@media (min-width: 56.01rem) {
  .scroll-well {
    position: relative;
    min-height: 6rem;
  }
  /* The fade says "more below"; the bottom padding lets the last entry
     scroll clear of it. Specificity outranks each list's own padding. */
  .scroll-well > .scroll-box {
    position: absolute;
    inset: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    padding-bottom: 2.5rem;
    mask-image: linear-gradient(to bottom, #000 calc(100% - 2.5rem), transparent);
  }
}
@media (max-width: 56rem) {
  .scroll-box > li:nth-child(n + 4) {
    display: none;
  }
}

.digests {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.digest-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: 0.6rem;
}
@media (min-width: 56.01rem) {
  .digest-list {
    grid-template-columns: 1fr;
  }
}
.digest-list > li {
  display: flex;
}
.digest {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--root-line);
  border-left: 3px solid var(--root-accent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--root-bg) 70%, transparent);
  color: var(--root-ink);
  text-decoration: none;
  transition: border-color 0.15s ease;
}
.digest:hover {
  border-color: color-mix(in srgb, var(--root-accent) 55%, var(--root-line));
  border-left-color: var(--root-accent);
}
.digest-date {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
  color: var(--root-accent);
}
.digest-summary {
  font-size: 0.88rem;
  line-height: 1.45;
  color: var(--root-muted);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.explore {
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
  padding-top: 2.25rem;
  border-top: 1px solid var(--root-line);
}
.explore-head {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

/* Three columns share one row (so the Atlas plate sets every card's height,
   see .scroll-well) — or a single stacked column on phones. */
.explore-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.1rem;
}
@media (min-width: 56.01rem) {
  .explore-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

/* ── Blog teaser ── */
.posts {
  list-style: none;
  margin: 0;
  padding: 0 0.25rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.post {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.1rem 0 0.1rem 0.7rem;
  border-left: 3px solid var(--ea);
  color: var(--bl-ink);
  text-decoration: none;
}
.post-meta {
  display: flex;
  gap: 0.5rem;
  font-size: 0.72rem;
  color: var(--bl-muted);
}
.post-persona {
  font-weight: 700;
  color: var(--ea);
}
.post-title {
  font-family: var(--bl-serif);
  font-size: 1rem;
  line-height: 1.35;
}
.post:hover .post-title {
  text-decoration: underline;
  text-decoration-color: var(--ea);
}

/* ── Atlas teaser: the specimen's own engraved plate, via the Atlas's global
   `.atlas-plate` styles, tightened to fit a tile. ── */
.specimen {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  color: var(--atlas-ink);
  text-decoration: none;
}
.specimen-plate {
  margin: 0 0 0.45rem;
  padding: 0.8rem 0.8rem 0.3rem;
}
.specimen-plate::before {
  inset: 0.3rem;
}
.specimen-common {
  font-family: var(--atlas-display);
  font-size: 1.02rem;
}
.specimen-where {
  font-family: var(--atlas-label);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--atlas-muted);
}
.specimen:hover .specimen-common {
  text-decoration: underline;
  text-decoration-color: var(--biome-accent);
}

/* ── Midden teaser: a catalogue slip with its condition stamp. ── */
.find {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  color: var(--midden-ink);
  text-decoration: none;
}
.find-stamp {
  align-self: flex-start;
  padding: 0.1rem 0.45rem;
  border: 1.5px solid var(--midden-accent);
  border-radius: 3px;
  font-family: var(--midden-typewriter);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--midden-accent);
  transform: rotate(-4deg);
}
.find-title {
  font-family: var(--midden-mono);
  font-size: 0.92rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.find-note {
  font-family: var(--midden-serif);
  font-size: 0.92rem;
  line-height: 1.45;
  color: var(--midden-muted);
  display: -webkit-box;
  -webkit-line-clamp: 7;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
@media (min-width: 56.01rem) {
  .find-note {
    display: block;
    padding-right: 0.25rem;
    overflow-y: auto;
  }
}
.find-meta {
  font-family: var(--midden-typewriter);
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--midden-faint);
}
.find:hover .find-title {
  text-decoration: underline;
  text-decoration-color: var(--midden-accent);
}
</style>
