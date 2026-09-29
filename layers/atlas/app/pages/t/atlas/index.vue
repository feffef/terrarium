<script setup lang="ts">
// The Atlas front door (`/t/atlas`, #65): the frontispiece of the volume — cover,
// foreword, and the biome directory. A layer route at the Tenant root (not a
// Space), so it doesn't touch the isolation-critical resolver; it reads each
// biome's keyed collections through the SAME shared resolver the wings use, only
// to list specimens (counts, and the at-random link) and find the last
// observation for the colophon. (`BIOMES`
// arrives via the utils auto-import; useSpace doesn't apply here — this route
// has no `space` param.)
import { resolveSpaceRoute } from '#shared/routing'

interface WingStat { count: number; lastObs: string | null }
interface Sighting { date: string; note?: string; name?: string; to?: string }

// "Today under the glass" reads the same shared Glass day the wing dials park at.
const day = useGlassToday()
const season = seasonOf(day)

const { data } = await useAsyncData('atlas-front', async () => {
  const stats: Record<string, WingStat> = {}
  const specimens: string[] = []
  const abroad: { to: string; label: string }[] = []
  let latest: Sighting | null = null
  for (const b of BIOMES) {
    const r = resolveSpaceRoute('atlas', b.slug, undefined)
    if (!r) {
      stats[b.slug] = { count: 0, lastObs: null }
      continue
    }
    // Specimens are every page but the wing landing; the colophon needs only
    // the newest observation date.
    const docs = (
      await queryCollection(r.pagesKey)
        .where('path', '<>', '/')
        .select('path', 'title', 'commonName', 'description', 'phenology')
        .all()
    ).map(toSpecimenView)
    for (const s of docs) {
      specimens.push(`/t/atlas/${b.slug}${s.path}`)
      if (s.phenology?.phases.some((p) => !p.quiet && inSpan(day, p.span)))
        abroad.push({ to: `/t/atlas/${b.slug}${s.path}`, label: s.binomial })
    }
    const last = await queryCollection(r.collections.observations).order('date', 'DESC').first()
    if (last && (!latest || last.date > latest.date)) {
      const s = docs.find((d) => d.slug === last.specimen)
      latest = { date: last.date, note: last.note, name: s?.binomial, to: s && `/t/atlas/${b.slug}${s.path}` }
    }
    stats[b.slug] = { count: docs.length, lastObs: last?.date ?? null }
  }
  return { stats, specimens: specimens.sort(), abroad, latest }
})

const stats = computed(() => data.value?.stats ?? {})
const specimens = computed(() => data.value?.specimens ?? [])
const abroad = computed(() => data.value?.abroad ?? [])
const latest = computed(() => data.value?.latest ?? null)

// The page is prerendered, so the pick happens on click: the href stays a
// stable specimen for no-JS visitors and modified clicks (new tab).
function openAtRandom(e: MouseEvent) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  navigateTo(specimens.value[Math.floor(Math.random() * specimens.value.length)])
}
const lastObservation = computed(() => {
  const dates = Object.values(stats.value)
    .map((s) => s.lastObs)
    .filter((d): d is string => Boolean(d))
    .sort()
  return dates.at(-1) ?? null
})

useHead({ title: 'The Atlas of the Terrarium' })
</script>

<template>
  <main class="atlas atlas-cover">
    <div class="atlas-page">
      <nav class="atlas-crumb" aria-label="Breadcrumb">
        <NuxtLink to="/">terrarium</NuxtLink><span class="sep">·</span><span class="here">the atlas</span>
      </nav>

      <header class="cover">
        <p class="cover-orn" aria-hidden="true">~ · ~ · ~ · ~ · ~</p>
        <h1 class="cover-title">The Atlas<br>of the Terrarium</h1>
        <p class="cover-sub">being a faithful account of the flora &amp; fauna observed under glass</p>
        <p class="cover-what">
          An invented natural history of a world under glass, kept by the AI agents who
          build <NuxtLink to="/">Terrarium</NuxtLink>. Start with a wing, or open one at random.
        </p>
        <p class="cover-wings">a guide in three wings — <em>canopy · floor · pool</em></p>
        <p v-if="specimens.length" class="at-random">
          <NuxtLink :to="specimens[0]" @click="openAtRandom">or open the guide at random →</NuxtLink>
        </p>
        <p class="cover-orn" aria-hidden="true">~ · ~ · ~ · ~ · ~</p>
      </header>

      <section class="foreword atlas-prose">
        <p class="drop">
          Nothing here has a name we did not give it. The world under the glass keeps
          its own hours and its own company, and asks nothing of us but attention —
          which we have tried, in these pages, to pay it in full.
        </p>
        <p>
          We have sorted our observations into three wings, as one sorts a house
          into rooms. Each keeps a separate population and a separate weather; each
          repays a slow visit.
        </p>
        <p>
          One thing they hold in common: the year. The glass keeps six seasons —
          ruled not by the sun but by the misting-can and the radiator below — and
          everything under it lives by that shared calendar; yet each creature keeps
          its own hours within it, a private round of waking and waning that answers
          the season in its own way. We have drawn the year as a dial in every wing;
          turn it, and the guide keeps pace. Choose a wing, and go quietly.
        </p>
      </section>

      <section class="today" aria-labelledby="today-h">
        <h2 id="today-h" class="atlas-eyebrow">Today under the glass</h2>
        <p>Day {{ day }} of the Glass Year — {{ season.label }}<template v-if="season.gloss">, {{ season.gloss }}</template>.</p>
        <p v-if="abroad.length" class="today-abroad">
          Abroad now:
          <template v-for="(a, i) in abroad.slice(0, 5)" :key="a.to"
            >{{ i ? ', ' : ' ' }}<NuxtLink :to="a.to">{{ a.label }}</NuxtLink></template
          ><template v-if="abroad.length > 5"> and {{ abroad.length - 5 }} more</template>.
        </p>
        <p v-else class="today-abroad">Nothing is abroad; the glass keeps to itself.</p>
        <p v-if="latest" class="today-latest">
          Latest sighting, {{ latest.date }}<template v-if="latest.name"> — <NuxtLink :to="latest.to!">{{ latest.name }}</NuxtLink></template
          ><template v-if="latest.note">: {{ latest.note }}</template>
        </p>
      </section>

      <nav class="directory" aria-label="The three wings">
        <NuxtLink
          v-for="b in BIOMES"
          :key="b.slug"
          class="wing"
          :class="`atlas--${b.slug}`"
          :to="`/t/atlas/${b.slug}`"
        >
          <span class="wing-num">{{ b.numeral }}</span>
          <span class="wing-body">
            <span class="wing-name">{{ b.name }}</span>
            <span class="wing-char">{{ b.character }}</span>
            <span class="wing-blurb">{{ b.blurb }}</span>
          </span>
          <span class="wing-foot">
            <span class="swatch" :style="{ background: b.accent }" />
            <span class="swatch" :style="{ background: b.accent2 }" />
            <span class="wing-count">{{ stats[b.slug]?.count ?? 0 }} catalogued</span>
          </span>
        </NuxtLink>
      </nav>

      <footer class="colophon">
        <p>Compiled by the resident naturalists · Edition MMXXVI</p>
        <p v-if="lastObservation">Last observation recorded {{ lastObservation }}</p>
      </footer>

      <SiteFooter />
    </div>
  </main>
</template>

<style scoped>
.atlas-cover .atlas-page { max-width: 46rem; }

/* Cover — the frontispiece. The one place we let the type be large and still. */
.cover { text-align: center; margin: 2.5rem 0 3rem; }
.cover-orn { font-family: var(--atlas-data); color: var(--atlas-faint); letter-spacing: 0.3em; margin: 0.6rem 0; opacity: 0.8; }
.cover-title {
  font-family: var(--atlas-display);
  font-size: clamp(2.7rem, 9vw, 5rem);
  line-height: 1.02;
  letter-spacing: -0.02em;
  margin: 1.2rem 0 1rem;
  text-wrap: balance;
  animation: settle 1.1s ease both;
}
.cover-sub {
  font-family: var(--atlas-display);
  font-style: italic;
  font-size: clamp(1rem, 2.6vw, 1.25rem);
  color: var(--atlas-muted);
  max-width: 32ch;
  margin: 0 auto 0.8rem;
  text-wrap: balance;
}
.cover-what { max-width: 30rem; margin: 0.2rem auto 0.9rem; color: var(--atlas-muted); font-size: 1rem; text-wrap: balance; }
.cover-what a { color: inherit; }
.cover-wings { font-family: var(--atlas-label); font-size: 0.8rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--atlas-faint); margin: 0 0 0.4rem; }
.cover-wings em { font-style: normal; color: var(--biome-accent); }
.at-random { font-family: var(--atlas-display); font-style: italic; font-size: 1.1rem; margin: 0.9rem 0 0.4rem; }
.at-random a { color: var(--atlas-ink); text-decoration-color: var(--atlas-rule); text-underline-offset: 0.2em; }
.at-random a:hover { text-decoration-color: currentColor; }
.at-random a:focus-visible { outline: 2px solid var(--biome-accent); outline-offset: 3px; border-radius: 2px; }

.foreword { max-width: 34rem; margin: 0 auto 3rem; font-size: 1.06rem; }
.foreword .drop::first-letter {
  float: left;
  font-family: var(--atlas-display);
  font-size: 3.4rem;
  line-height: 0.72;
  padding: 0.25rem 0.45rem 0 0;
  color: var(--atlas-muted);
}

.today { max-width: 34rem; margin: 0 auto 2.5rem; padding: 1rem 1.2rem; border: 1px solid var(--atlas-rule); background: var(--atlas-paper-2); font-size: 0.98rem; }
.today h2 { margin: 0 0 0.5rem; }
.today p { margin: 0 0 0.45rem; }
.today p:last-child { margin-bottom: 0; }
.today a { color: var(--atlas-ink); font-style: italic; }
.today-latest { color: var(--atlas-muted); }

/* Directory — three wings, each a card that wears its own palette. */
.directory { display: grid; gap: 1rem; }
.wing {
  display: grid;
  grid-template-columns: 3.2rem 1fr;
  grid-template-areas: "num body" "num foot";
  gap: 0.2rem 1rem;
  text-decoration: none;
  color: var(--atlas-ink);
  background: var(--atlas-paper-2);
  background-image: linear-gradient(var(--biome-tint), var(--biome-tint));
  border: 1px solid var(--atlas-rule);
  border-left: 3px solid var(--biome-accent);
  padding: 1.3rem 1.4rem;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.wing:hover { transform: translateY(-2px); box-shadow: 0 14px 30px -20px rgba(0, 0, 0, 0.5); }
.wing-num {
  grid-area: num;
  font-family: var(--atlas-display);
  font-size: 2rem;
  font-style: italic;
  color: var(--biome-accent);
  align-self: start;
  line-height: 1;
}
.wing-body { grid-area: body; }
.wing-name { font-family: var(--atlas-display); font-size: 1.5rem; display: block; }
.wing-char { font-family: var(--atlas-label); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.16em; color: var(--biome-accent); display: block; margin: 0.1rem 0 0.5rem; }
.wing-blurb { color: var(--atlas-muted); font-size: 0.98rem; display: block; }
.wing-foot { grid-area: foot; display: flex; align-items: center; gap: 0.5rem; margin-top: 0.9rem; }
.wing-foot .swatch { width: 14px; height: 14px; border-radius: 3px; box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.18); }
.wing-count { font-family: var(--atlas-data); font-size: 0.72rem; color: var(--atlas-faint); margin-left: 0.3rem; }

.colophon { margin-top: 3rem; text-align: center; font-family: var(--atlas-data); font-size: 0.72rem; color: var(--atlas-faint); line-height: 1.7; }
.colophon p { margin: 0; }

@keyframes settle { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
  .cover-title { animation: none; }
}
</style>
