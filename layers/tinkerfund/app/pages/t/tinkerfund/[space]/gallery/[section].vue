<script setup lang="ts">
definePageMeta({ viewTransition: true })

const route = useRoute()
const { space, link } = useTinkerfundSpace()
const at = TINKERFUND_GALLERY.findIndex((s) => s.id === route.params.section)
const section = space === 'qa' ? TINKERFUND_GALLERY[at] : undefined
const prev = TINKERFUND_GALLERY[at - 1]
const next = TINKERFUND_GALLERY[at + 1]

useSeoMeta(tinkerfundSeo(section
  ? { kind: 'page', space, title: section.title, description: section.summary }
  : { kind: 'not-found', space }))
</script>

<template>
  <TinkerfundShell>
    <div v-if="section" class="page">
      <div>
        <TinkerfundShellBreadcrumbs :items="[{ label: 'Component gallery', to: link() }, { label: section.title }]" />
        <TinkerfundGalleryIntro :title="section.title" :lead="section.summary">
          <p class="codes"><code v-for="name in section.components" :key="name">{{ name }}</code></p>
        </TinkerfundGalleryIntro>
      </div>
      <TinkerfundGallerySection :id="section.id" />
      <nav class="pager" aria-label="Gallery sections">
        <NuxtLink v-if="prev" rel="prev" :to="link(`/gallery/${prev.id}`)">← {{ prev.title }}</NuxtLink>
        <NuxtLink v-if="next" rel="next" class="next" :to="link(`/gallery/${next.id}`)">{{ next.title }} →</NuxtLink>
      </nav>
    </div>
    <TinkerfundShellNotFound v-else />
  </TinkerfundShell>
</template>

<style scoped>
.page { display: grid; grid-template-columns: minmax(0, 1fr); gap: 36px; }
.codes { display: flex; flex-wrap: wrap; gap: 4px 12px; color: var(--tf-muted); font: 500 13px/1.4 var(--tf-mono); }
code { font: inherit; overflow-wrap: anywhere; }
.pager { display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; padding-top: 18px; border-top: 1px solid var(--tf-line); font: 500 14px/1.4 var(--tf-mono); }
.next { margin-inline-start: auto; }
</style>
