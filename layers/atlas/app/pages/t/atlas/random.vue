<script setup lang="ts">
// `/t/atlas/random`: a shareable "open the guide at random" address. The pick
// happens in the browser: routes are cached for 60 s (ADR-0028), so a server
// redirect would send every visitor to the same specimen. Layer route at the
// Tenant root (ADR-0016).
import { resolveSpaceRoute } from '#shared/routing'

const { data: specimens } = await useAsyncData('atlas-specimen-paths', async () => {
  const paths: string[] = []
  for (const b of BIOMES) {
    const r = resolveSpaceRoute('atlas', b.slug, undefined)
    if (!r) continue
    const docs = await queryCollection(r.pagesKey).where('path', '<>', '/').select('path').all()
    for (const d of docs) paths.push(`/t/atlas/${b.slug}${d.path}`)
  }
  return paths.sort()
})

onMounted(() => {
  const all = specimens.value ?? []
  if (all.length) navigateTo(all[Math.floor(Math.random() * all.length)], { replace: true })
})

useHead({ title: 'A random specimen · The Atlas of the Terrarium', meta: [{ name: 'robots', content: 'noindex' }] })
</script>

<template>
  <main class="atlas atlas-cover">
    <div class="atlas-page">
      <p>
        Choosing a specimen…
        <NuxtLink v-if="specimens?.length" :to="specimens[0]">open one directly</NuxtLink>
        <NuxtLink v-else to="/t/atlas">back to the Atlas</NuxtLink>
      </p>
    </div>
  </main>
</template>
