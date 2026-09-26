<script setup lang="ts">
import type { TinkerfundPage } from '../../types/tinkerfund'

const props = defineProps<{ doc: TinkerfundPage & { update: NonNullable<TinkerfundPage['update']> } }>()

const { space, pagesKey, link } = useTinkerfundSpace()
const { now } = await useTinkerfundClock()
const categories = useTinkerfundCategories()

const campaignPath = props.doc.path.replace(/\/updates\/[^/]+$/, '')
const n = tinkerfundSlug(props.doc.path)
const { data: parent } = await useAsyncData(`tinkerfund-update-parent-${space}-${campaignPath}`, () =>
  queryCollection(pagesKey).path(campaignPath).select('title', 'campaign').first(),
)
const category = computed(() => categories.value.find((x) => x.slug === parent.value?.campaign?.category))
const at = computed(() => resolveTinkerfundOffset(props.doc.update.published, now.value))
</script>

<template>
  <article class="update">
    <TinkerfundBreadcrumbs
      :items="[
        { label: 'Home', to: link() },
        ...(parent?.campaign
          ? [{ label: category?.name ?? parent.campaign.category, to: link(`/category/${parent.campaign.category}`) }]
          : []),
        { label: parent?.title ?? 'Campaign', to: link(campaignPath) },
        { label: `Update #${n}` },
      ]"
    />
    <div class="tf-prose">
      <p class="tf-label">
        <span v-if="parent?.campaign">{{ parent.campaign.registry }} · </span>Update #{{ n }} ·
        <TinkerfundTime :at="at" :text="formatTinkerfundAgo(now, at)" />
      </p>
      <h1>{{ doc.title }}</h1>
      <ContentRenderer :value="doc" />
      <p class="back">
        <NuxtLink class="tf-btn" :to="link(`${campaignPath}#updates`)">All Updates</NuxtLink>
      </p>
    </div>
  </article>
</template>

<style scoped>
.tf-label { margin: 0 0 10px; }
.back { margin-top: 28px; }
</style>
