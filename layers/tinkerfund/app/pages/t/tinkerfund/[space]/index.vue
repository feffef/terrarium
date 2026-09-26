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
    <section v-if="landing" class="hero tf-panel">
      <div class="fig" aria-hidden="true">
        <span class="tf-label">FIG. 0 · TF-0000</span>
      </div>
      <div class="read">
        <p class="tf-label">Tinkerfund · {{ space }}</p>
        <h1>{{ landing.title }}</h1>
        <p class="lead">{{ landing.description }}</p>
        <ContentRenderer :value="landing" class="body" />
        <p class="actions">
          <NuxtLink class="tf-btn primary" :to="tinkerfundPath(space, '/discover')">Discover Campaigns</NuxtLink>
          <NuxtLink class="tf-btn" :to="tinkerfundPath(space, '/how-it-works')">How it works</NuxtLink>
        </p>
      </div>
    </section>
    <ContentLoadErrorDialog :status="status" :error="error" :context="route.path" />
  </TinkerfundShell>
</template>

<style scoped>
.hero { display: grid; overflow: hidden; box-shadow: var(--tf-shadow); }
@media (min-width: 860px) { .hero { grid-template-columns: 1fr 1.15fr; } }
.fig { min-height: 220px; padding: 14px; background: var(--tf-paper), var(--tf-surface); border-bottom: var(--tf-hairline); }
@media (min-width: 860px) { .fig { border-bottom: 0; border-right: var(--tf-hairline); } }
.read { display: grid; gap: 14px; align-content: start; padding: 22px; }
h1 { margin: 0; font: 800 clamp(32px, 4.5vw, 48px)/1 var(--tf-font); font-stretch: 78%; letter-spacing: -0.01em; }
.lead { margin: 0; color: var(--tf-muted); }
.body :deep(p) { margin: 0; }
.actions { display: flex; flex-wrap: wrap; gap: 10px; margin: 4px 0 0; }
</style>
