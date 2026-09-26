<script setup lang="ts">
definePageMeta({ viewTransition: true })

const route = useRoute()
const { space, pagesKey } = useSpace('tinkerfund')

const { data: landing, status, error } = await useAsyncData(route.path, () => queryCollection(pagesKey).path('/').first())

useSeoMeta(tinkerfundSeo({
  kind: 'home',
  space,
  title: landing.value?.title,
  description: landing.value?.description,
}))
</script>

<template>
  <TinkerfundShell :space="space">
    <TinkerfundGallery v-if="landing && space === 'qa'" :title="landing.title" :description="landing.description" />
    <template v-else-if="landing">
      <header class="intro">
        <h1>{{ landing.title }}</h1>
        <ContentRenderer :value="landing" class="lead" />
      </header>
      <TinkerfundHome />
    </template>
    <ContentLoadErrorDialog :status="status" :error="error" :context="route.path" />
  </TinkerfundShell>
</template>

<style scoped>
.intro { display: grid; gap: 8px; max-width: 68ch; margin-bottom: 28px; }
h1 { margin: 0; font: 800 clamp(30px, 4.2vw, 44px)/1.02 var(--tf-font); font-stretch: 78%; letter-spacing: -0.01em; }
.lead { color: var(--tf-muted); }
.lead :deep(p) { margin: 0; }
</style>
