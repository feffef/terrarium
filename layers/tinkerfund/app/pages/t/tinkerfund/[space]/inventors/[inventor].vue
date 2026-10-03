<script setup lang="ts">
definePageMeta({ viewTransition: true })

const route = useRoute()
const slug = String(route.params.inventor)
const { space, collections } = useTinkerfundSpace()
const { data: inventor } = await useAsyncData(`tinkerfund-inventor-${space}-${slug}`, () =>
  queryCollection(collections.inventors).where('stem', '=', slug).first(),
)
const { clock, cards } = await useTinkerfundCatalog()
const mine = computed(() => cards.value.filter((c) => c.inventor === slug))

useSeoMeta(tinkerfundSeo(inventor.value
  ? { kind: 'page', space, title: inventor.value.name, description: inventor.value.bio }
  : { kind: 'not-found', space }))
</script>

<template>
  <TinkerfundShell>
    <TinkerfundInventorProfile v-if="inventor" :inventor="inventor" :cards="mine" :clock="clock" />
    <TinkerfundShellNotFound v-else />
  </TinkerfundShell>
</template>
