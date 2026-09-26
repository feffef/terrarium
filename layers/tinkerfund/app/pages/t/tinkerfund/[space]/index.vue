<script setup lang="ts">
definePageMeta({ viewTransition: true })

const route = useRoute()
const { space, pagesKey } = useTinkerfundSpace()

const { data: landing, status, error } = await useAsyncData(route.path, () => queryCollection(pagesKey).path('/').first())

useSeoMeta(tinkerfundSeo({
  kind: 'home',
  space,
  title: landing.value?.title,
  description: landing.value?.description,
}))
</script>

<template>
  <TinkerfundShell>
    <TinkerfundGallery v-if="landing && space === 'qa'" :title="landing.title" :description="landing.description" />
    <template v-else-if="landing">
      <h1 class="tf-sr">{{ landing.title }}</h1>
      <TinkerfundHome />
      <ContentRenderer :value="landing" class="tf-prose about" />
    </template>
    <ContentLoadErrorDialog :status="status" :error="error" :context="route.path" />
  </TinkerfundShell>
</template>

<style scoped>
.about { margin-top: 44px; color: var(--tf-muted); }
</style>
