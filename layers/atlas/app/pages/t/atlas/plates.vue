<script setup lang="ts">
// The Plates (`/t/atlas/plates`): every engraving in the guide on one page, by
// wing, each a doorway to its entry. A layer page at the Tenant root (ADR-0016)
// reading the wings' keyed collections through the shared resolver.
import { resolveSpaceRoute } from '#shared/routing'

const { data } = await useAsyncData('atlas-plates', async () => {
  const wings: { slug: string; specimens: SpecimenView[] }[] = []
  for (const b of BIOMES) {
    const r = resolveSpaceRoute('atlas', b.slug, undefined)
    if (!r) continue
    const docs = await queryCollection(r.pagesKey)
      .where('path', '<>', '/')
      .select('path', 'title', 'commonName', 'description', 'rarity', 'signature', 'plate', 'illustration')
      .all()
    wings.push({ slug: b.slug, specimens: docs.map(toSpecimenView) })
  }
  return wings
})
const wings = computed(() => (data.value ?? []).map((w) => ({ ...w, meta: BIOMES.find((b) => b.slug === w.slug)! })))

useHead({ title: 'The Plates · The Atlas of the Terrarium' })
</script>

<template>
  <main class="atlas">
    <div class="atlas-page">
      <nav class="atlas-crumb" aria-label="Breadcrumb">
        <NuxtLink to="/">terrarium</NuxtLink><span class="sep">·</span><NuxtLink to="/t/atlas">the atlas</NuxtLink><span class="sep">·</span><span class="here">the plates</span>
      </nav>

      <header class="plates-head">
        <h1 class="plates-title">The Plates</h1>
        <p class="plates-lede">Every engraving in the guide, wing by wing. Choose one to read its entry.</p>
      </header>

      <section v-for="w in wings" :key="w.slug" class="plates-wing" :class="`atlas--${w.slug}`">
        <div class="atlas-sechead"><h2 class="atlas-eyebrow">{{ w.meta.name }}</h2></div>
        <ul class="plates-grid">
          <li v-for="s in w.specimens" :key="s.slug">
            <NuxtLink class="plate-link" :to="`/t/atlas/${w.slug}/${s.slug}`" :style="signatureVars(s.signature?.colors)">
              <AtlasSpecimenPlate
                :illustration="s.illustration"
                :number="s.plate?.number"
                :binomial="s.binomial"
                :conjectural="s.plate?.conjectural"
              />
              <span class="plate-meta">
                <span class="plate-common">{{ s.common }}</span>
                <AtlasRarityMark :grade="s.rarity" show-grade />
              </span>
            </NuxtLink>
          </li>
        </ul>
      </section>

      <SiteFooter />
    </div>
  </main>
</template>

<style scoped>
.plates-head { margin: 2rem 0 2.2rem; }
.plates-title { font-family: var(--atlas-display); font-size: clamp(2.4rem, 7vw, 3.6rem); line-height: 1.05; margin: 0 0 0.6rem; }
.plates-lede { color: var(--atlas-muted); max-width: 34rem; margin: 0; }
.plates-wing { margin-bottom: 2.4rem; }
.plates-wing h2 { margin: 0; }
.plates-grid { list-style: none; margin: 1rem 0 0; padding: 0; display: grid; gap: 1.4rem; grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); }
.plate-link { display: block; color: inherit; text-decoration: none; }
.plate-link:hover .atlas-plate { transform: translateY(-2px); }
.plate-link:focus-visible { outline: 2px solid var(--biome-accent); outline-offset: 4px; }
.plate-link .atlas-plate { margin: 0; transition: transform 0.15s ease; }
.plate-meta { display: flex; justify-content: space-between; align-items: baseline; gap: 0.6rem; margin-top: 0.7rem; font-size: 0.92rem; color: var(--atlas-muted); }
@media (prefers-reduced-motion: reduce) { .plate-link .atlas-plate { transition: none; } }
</style>
