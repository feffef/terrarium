<script setup lang="ts">
// The biome wing landing (`/t/atlas/<biome>`, #66): one grammar, three rooms.
// A more specific route than the Platform's generic catch-all, so it wins for the
// Space root; specimen entries render via the sibling `[...slug].vue`.
//
// Isolation-respecting and presentation-only (ADR-0004): it resolves the Space
// through the SAME shared, unit-tested `resolveSpaceRoute` the catch-all uses
// (via the read-only useSpace composable), then reads only this biome's keyed
// pages/interactions/observations. Biomes cannot leak — the whole wing is a
// same-Space read. `biomeMeta`, the utils (`toSpecimenView`, `signatureVars`)
// and the Atlas* components arrive via Nuxt's layer-wide auto-imports; only the
// types still import relatively. The three-`queryCollection` load itself (and
// the shared `specimensBySlug` lookup) is single-homed in the
// `useAtlasWingData` composable — the sibling `[...slug].vue` entry page needs
// the exact same load (code review; see that composable's header for why).
import type { PhenologyPhase, SpecimenView } from '../../../../utils/atlas'

const route = useRoute()
const { space, pagesKey, collections } = useSpace('atlas')
const { pages, edges, observations, specimensBySlug } = await useAtlasWingData(route.path, {
  pagesKey,
  collections,
})

const meta = biomeMeta(space)
const landing = computed(() => pages.value.find((p) => p.path === '/') ?? null)
const specimens = computed<SpecimenView[]>(() =>
  pages.value
    .filter((p) => p.path !== '/')
    .map(toSpecimenView)
    .sort((a, b) => a.binomial.localeCompare(b.binomial)),
)
const withRhythm = computed(() => specimens.value.filter((s) => s.activity))

// The wing's season dial (feedback rework, replacing the #285 composite): ONE
// shared almanac the reader turns like a season selector, and beside it a
// roster answering "who would I find abroad in this season?" — far more legible
// than the old stack of one hatched band per specimen on a single needle.
//
// The landing owns the shared needle state (`provideAlmanac`), so the dial
// parks at today, restores from a shared `?day=` link, AND its scrub writes
// back to that param — the same round-trip the specimen entry has
// (composables/almanac.ts). No `phases`: the dial draws only the year's rim
// here; the roster below reads the shared `day`.
const almanac = provideAlmanac({ initialDay: parseAlmanacDayParam(route.query.day) })
const withPhenology = computed(() => specimens.value.filter((s) => (s.phenology?.phases.length ?? 0) > 0))
const currentSeason = computed(() => seasonOf(almanac.day.value))
// Who is astir on the needle's day — a specimen with a non-quiet phase covering
// it — paired with that active phase's label. Turning the dial re-reads this,
// so the wing's roster changes season by season with the needle.
const astir = computed(() => {
  const out: { s: SpecimenView; phase: PhenologyPhase }[] = []
  for (const s of withPhenology.value) {
    const phase = s.phenology!.phases.find((p) => !p.quiet && inSpan(almanac.day.value, p.span))
    if (phase) out.push({ s, phase })
  }
  return out
})
// The rest of the phenology-carrying wing — present, but keeping to itself.
const resting = computed(() => {
  const abroad = new Set(astir.value.map((x) => x.s.slug))
  return withPhenology.value.filter((s) => !abroad.has(s.slug))
})
// Shared hover state: a roster row and the catalogue each set this one ref, so
// hovering a name in either lights up the same specimen in the other.
const hoveredSpecimen = ref<string | null>(null)

const sigStyle = (s: SpecimenView) => signatureVars(s.signature?.colors)

useHead({ title: `${meta.name} · The Atlas of the Terrarium` })
</script>

<template>
  <main class="atlas" :class="`atlas--${space}`">
    <div class="atlas-page">
      <p class="atlas-crumb">
        <NuxtLink to="/t/atlas">The Atlas</NuxtLink><span class="sep">·</span><span class="here">{{ meta.name }}</span>
      </p>

      <header class="biome-head">
        <p class="atlas-eyebrow">Wing {{ meta.numeral }} · {{ meta.character }}</p>
        <h1>{{ landing?.title ?? meta.name }}</h1>
        <div v-if="landing" class="atlas-prose biome-intro">
          <ContentRenderer :value="landing" />
        </div>
      </header>

      <section>
        <div class="atlas-sechead"><span class="atlas-eyebrow">The catalogue</span></div>
        <AtlasSpecimenIndex v-model:highlight="hoveredSpecimen" :specimens="specimens" :biome="space" />
      </section>

      <section>
        <div class="atlas-sechead"><span class="atlas-eyebrow">The food web</span></div>
        <AtlasFoodWeb :specimens="specimens" :edges="edges" :biome="space" />
      </section>

      <section v-if="withRhythm.length">
        <div class="atlas-sechead"><span class="atlas-eyebrow">Daily choreography</span></div>
        <ul class="choreo">
          <li v-for="s in withRhythm" :key="s.slug" :style="sigStyle(s)">
            <NuxtLink class="cname" :to="`/t/atlas/${space}/${s.slug}`">{{ s.binomial }}</NuxtLink>
            <AtlasRhythmBand :bands="s.activity!.bands" :label="s.activity!.label" />
          </li>
        </ul>
      </section>

      <section v-if="withPhenology.length" class="almanac-section">
        <div class="atlas-sechead"><span class="atlas-eyebrow">The wing's year</span></div>
        <p class="almanac-lede">
          Turn the almanac to any season and the wing tells you who you would find abroad in
          it — and who is keeping to itself.
        </p>
        <div class="wing-almanac">
          <AtlasPhenologyWheel class="wing-wheel" wing :observations="observations" />
          <div class="wing-roster">
            <p class="roster-season">In {{ currentSeason.label }}</p>
            <ul v-if="astir.length" class="roster-astir">
              <li
                v-for="a in astir"
                :key="a.s.slug"
                :style="sigStyle(a.s)"
                @mouseenter="hoveredSpecimen = a.s.slug"
                @mouseleave="hoveredSpecimen = null"
              >
                <NuxtLink class="rname" :to="`/t/atlas/${space}/${a.s.slug}`">{{ a.s.binomial }}</NuxtLink>
                <span class="rphase">{{ a.phase.label }}</span>
              </li>
            </ul>
            <p v-else class="roster-none">Nothing is abroad; the wing keeps to itself this season.</p>
            <p v-if="resting.length" class="roster-quiet">
              <span class="rq-label">Keeping quiet:</span>
              <span v-for="(r, i) in resting" :key="r.slug"
                >{{ i ? ', ' : ' ' }}<NuxtLink
                  :to="`/t/atlas/${space}/${r.slug}`"
                  @mouseenter="hoveredSpecimen = r.slug"
                  @mouseleave="hoveredSpecimen = null"
                  >{{ r.binomial }}</NuxtLink
                ></span>
            </p>
          </div>
        </div>
      </section>

      <section>
        <div class="atlas-sechead"><span class="atlas-eyebrow">Field log</span></div>
        <AtlasFieldLog :observations="observations" :specimens-by-slug="specimensBySlug" :biome="space" :limit="8" />
      </section>

      <section>
        <div class="atlas-sechead"><span class="atlas-eyebrow">On rarity</span></div>
        <AtlasRarityLegend />
      </section>
    </div>
  </main>
</template>

<style scoped>
.biome-head { margin-bottom: 1rem; }
.biome-head h1 {
  font-family: var(--atlas-display);
  font-size: clamp(2.6rem, 8vw, 4.4rem);
  line-height: 0.98;
  letter-spacing: -0.02em;
  margin: 0.5rem 0 0;
  text-wrap: balance;
}
.biome-intro { margin-top: 1.1rem; max-width: 40rem; color: var(--atlas-muted); }
.choreo { list-style: none; margin: 0; padding: 0; display: grid; gap: 1.4rem; }
.choreo li {
  display: grid;
  grid-template-columns: minmax(9rem, 12rem) 1fr;
  gap: 0.4rem 1.4rem;
  align-items: center;
}
.choreo .cname {
  font-family: var(--atlas-display);
  font-style: italic;
  font-size: 1.05rem;
  color: var(--atlas-ink);
  text-decoration: none;
  border-bottom: 1px solid transparent;
}
.choreo .cname:hover { color: var(--biome-accent); border-bottom-color: currentColor; }
@media (max-width: 34rem) {
  .choreo li { grid-template-columns: 1fr; gap: 0.5rem; }
}
.almanac-lede { max-width: 34rem; color: var(--atlas-muted); margin: 0 0 1.3rem; font-size: 0.95rem; }
.wing-almanac {
  display: grid;
  grid-template-columns: minmax(0, 20rem) 1fr;
  gap: 1.5rem 2.4rem;
  align-items: center;
}
.wing-wheel { width: 100%; }
.wing-roster { min-width: 0; }
.roster-season {
  font-family: var(--atlas-label);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--biome-accent);
  margin: 0 0 0.7rem;
}
.roster-astir { list-style: none; margin: 0 0 1rem; padding: 0; display: grid; gap: 0.55rem; }
.roster-astir li {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem 1rem;
  align-items: baseline;
  border-left: 2px solid var(--sig-1, var(--biome-accent));
  padding-left: 0.7rem;
}
.roster-astir .rname {
  font-family: var(--atlas-display);
  font-style: italic;
  font-size: 1.05rem;
  color: var(--atlas-ink);
  text-decoration: none;
  border-bottom: 1px solid transparent;
}
.roster-astir .rname:hover { color: var(--biome-accent); border-bottom-color: currentColor; }
.roster-astir .rphase {
  font-family: var(--atlas-label);
  font-size: 0.68rem;
  text-transform: lowercase;
  letter-spacing: 0.05em;
  color: var(--atlas-muted);
  text-align: right;
}
.roster-none { color: var(--atlas-faint); font-style: italic; margin: 0 0 1rem; }
.roster-quiet { font-size: 0.85rem; color: var(--atlas-muted); margin: 0; line-height: 1.7; }
.roster-quiet .rq-label {
  font-family: var(--atlas-label);
  font-size: 0.66rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--atlas-faint);
}
.roster-quiet a { color: var(--atlas-muted); text-decoration: none; border-bottom: 1px solid var(--atlas-line); }
.roster-quiet a:hover { color: var(--biome-accent); border-bottom-color: currentColor; }
@media (max-width: 46rem) {
  .wing-almanac { grid-template-columns: 1fr; justify-items: center; }
  .wing-wheel { max-width: 22rem; }
  .wing-roster { width: 100%; max-width: 30rem; }
}
</style>
