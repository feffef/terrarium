<script setup lang="ts">
definePageMeta({ viewTransition: true })

const route = useRoute()
const { space, path, pagesKey } = useSpace('tinkerfund')

const { data: doc, status, error } = await useAsyncData(route.path, () => queryCollection(pagesKey).path(path).first())

const kind = doc.value?.campaign ? 'campaign' : doc.value?.update ? 'update' : 'page'
useSeoMeta(tinkerfundSeo(doc.value
  ? { kind, space, title: doc.value.title, description: doc.value.description }
  : { kind: 'not-found', space }))
</script>

<template>
  <TinkerfundShell :space="space">
    <TinkerfundCampaign v-if="doc?.campaign" :doc="{ ...doc, campaign: doc.campaign }" />
    <TinkerfundUpdate v-else-if="doc?.update" :doc="{ ...doc, update: doc.update }" />
    <article v-else-if="doc" class="tf-prose">
      <h1>{{ doc.title }}</h1>
      <ContentRenderer :value="doc" />
    </article>

    <TinkerfundNotFound v-else-if="!error" />

    <ContentLoadErrorDialog :status="status" :error="error" :context="route.path" />
  </TinkerfundShell>
</template>

