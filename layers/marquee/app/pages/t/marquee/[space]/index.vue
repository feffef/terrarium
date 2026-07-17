<script setup lang="ts">
// The Marquee's Screening landing (`/t/marquee/reel`). A more specific route
// than the Platform's generic catch-all, so it wins for the Space *root*;
// single Chapters render via the sibling `[...slug].vue`.
//
// Isolation-respecting and presentation-only (ADR-0004): it resolves the
// Space through the SAME shared, unit-tested `resolveSpaceRoute` the
// catch-all uses (via the read-only useSpace composable — no isolation logic
// duplicated), then reads only this (Tenant, Space)'s keyed `pages`
// collection. `pagesKey` is already this Tenant's own literal `pages` key.
const route = useRoute()
const { pagesKey } = useSpace('marquee')

// The index.md landing sits at the Space root (full body — it renders); the
// run is every page with an `order`, in ascending in-universe story order
// (NOT reverse-chron like the Blog's feed — the point here is watch order).
// `status`/`error` are read alongside `data` so a failed client-side load
// (issue #236, mirrored from the Blog/Atlas layers) raises the
// ContentLoadErrorDialog instead of a silent blank.
const { data, status, error } = await useAsyncData(route.path, async () => {
  const landing = await queryCollection(pagesKey).path('/').first()
  const chapters = await queryCollection(pagesKey)
    .where('order', 'IS NOT NULL')
    .order('order', 'ASC')
    .select('path', 'title', 'description', 'order', 'publishedAt')
    .all()
  return { landing, chapters }
})

const landing = computed(() => data.value?.landing ?? null)
const chapters = computed(() => data.value?.chapters ?? [])

const title = computed(() => landing.value?.title ?? 'The Marquee')
const tagline = computed(() => landing.value?.description ?? '')

// The .mq-page body class scopes the Marquee canvas (full-bleed background +
// accent wash) to Marquee routes only.
useHead(() => ({ title: `${title.value} · marquee`, bodyAttrs: { class: 'mq-page' } }))
useSeoMeta({ description: () => tagline.value })
</script>

<template>
  <main class="mq">
    <p class="crumb">
      <NuxtLink to="/">terrarium</NuxtLink>
      <span class="sep">/</span><span class="here">marquee</span>
    </p>

    <header class="masthead">
      <p class="eyebrow">In-universe watch order</p>
      <h1>{{ title }}</h1>
      <p v-if="tagline" class="tagline">{{ tagline }}</p>
    </header>

    <div v-if="landing" class="prose">
      <ContentRenderer :value="landing" />
    </div>

    <ol v-if="chapters.length" class="reel">
      <li v-for="chapter in chapters" :key="chapter.path">
        <NuxtLink class="chapter-link" :to="`/t/marquee/reel${chapter.path}`">
          <span class="order">{{ chapter.order }}.</span>
          <span>
            <h2>{{ chapter.title }}</h2>
            <p v-if="chapter.description" class="excerpt">{{ chapter.description }}</p>
          </span>
        </NuxtLink>
      </li>
    </ol>
    <p v-else class="empty">No chapters here yet.</p>

    <!-- A failed client-side content load must never present as a silent
         blank (issue #236) — raise a modal with a message, technical
         details, reload. -->
    <ContentLoadErrorDialog :status="status" :error="error" :context="route.path" />
  </main>
</template>
