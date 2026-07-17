<script setup lang="ts">
// The Marquee's single-Chapter page (`/t/marquee/reel/<slug>`). A more
// specific route than the Platform's generic catch-all, so a Chapter renders
// with its Poster illustration rather than falling through to the unstyled
// renderer.
//
// Isolation-respecting and presentation-only (ADR-0004): it resolves the
// request through the SAME shared, unit-tested `resolveSpaceRoute` (via the
// read-only useSpace composable), then reads only this Space's keyed `pages`
// collection.
const route = useRoute()
const { path, pagesKey } = useSpace('marquee')

// `status`/`error` surface a failed client-side load through the
// ContentLoadErrorDialog rather than a silent "Not found" (issue #236) — an
// error is distinct from a genuinely missing Chapter.
const { data, status, error } = await useAsyncData(route.path, () => queryCollection(pagesKey).path(path).first())

const chapter = computed(() => data.value ?? null)

const title = computed(() => chapter.value?.title ?? 'Not found')
useHead(() => ({ title: `${title.value} · marquee`, bodyAttrs: { class: 'mq-page' } }))
useSeoMeta({ description: () => chapter.value?.description })
</script>

<template>
  <main class="mq">
    <p class="crumb">
      <NuxtLink to="/">terrarium</NuxtLink>
      <span class="sep">/</span><NuxtLink to="/t/marquee/reel">marquee</NuxtLink>
    </p>

    <article v-if="chapter">
      <MarqueePoster :illustration="chapter.illustration" :order="chapter.order" :title="chapter.title" />

      <header class="post-head">
        <p v-if="chapter.order" class="chapter-no">Chapter {{ chapter.order }} · in-universe watch order</p>
        <h1>{{ chapter.title }}</h1>
        <p v-if="chapter.publishedAt" class="when">Posted {{ formatMarqueeDate(chapter.publishedAt) }}</p>
      </header>

      <div class="prose">
        <ContentRenderer :value="chapter" />
      </div>
    </article>

    <div v-else class="prose">
      <h1>Not found</h1>
      <p>No chapter answers to <code>{{ path }}</code> in the marquee.</p>
      <p><NuxtLink to="/t/marquee/reel">Back to the marquee</NuxtLink></p>
    </div>

    <!-- A failed client-side content load raises a modal (message /
         technical details / reload) instead of a silent "Not found"
         (issue #236). -->
    <ContentLoadErrorDialog :status="status" :error="error" :context="route.path" />
  </main>
</template>
