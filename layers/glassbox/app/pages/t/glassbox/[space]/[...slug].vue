<script setup lang="ts">
const route = useRoute()
const { path, pagesKey, space } = useSpace('glassbox')

const { data, status, error } = await useAsyncData(route.path, () => queryCollection(pagesKey).path(path).first())

if (!data.value && !error.value) setResponseStatus(404)

useHead(() => ({ title: `${data.value?.title ?? 'Not found'} · glassbox` }))
useSeoMeta({ description: () => data.value?.description })
</script>

<template>
  <main class="gb">
    <article v-if="data">
      <h1>{{ data.title }}</h1>
      <ContentRenderer :value="data" />
    </article>

    <div v-else>
      <h1>Not found</h1>
      <p>No page answers to <code>{{ path }}</code> in Glass Box.</p>
      <p><NuxtLink :to="`/t/glassbox/${space}`">Back to Glass Box</NuxtLink></p>
    </div>

    <ContentLoadErrorDialog :status="status" :error="error" />
    <SiteFooter />
  </main>
</template>
