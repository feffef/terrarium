<script setup lang="ts">
// The Blog Tenant's single-post page (`/t/blog/<persona>/<slug>`). A more specific
// route than the Platform's generic catch-all, so blog posts render in the blog
// theme with their pingbacks rather than falling through to the unstyled renderer.
//
// Isolation-respecting and presentation-only (ADR-0004): it resolves the request
// through the SAME shared, unit-tested `resolveSpaceRoute`, then reads only this
// Space's keyed `pages` and `pingbacks` collections. The pingback list is a
// SAME-Space read — the cross-Persona relationship was denormalised here at author
// time (ADR-0012), so nothing queries a sibling Space at render.
import { resolveSpaceRoute } from '~~/shared/routing'
import { personaMeta } from '../../../../personas'
import BlogNetwork from '../../../../components/BlogNetwork.vue'

const route = useRoute()
const tenant = 'blog'
const space = String(route.params.space)

const resolved = resolveSpaceRoute(tenant, space, route.params.slug)
if (!resolved) {
  throw createError({ statusCode: 404, statusMessage: `Unknown Persona: ${tenant}/${space}` })
}
// `resolved` already carries this Tenant's own literal collection keys — the
// resolver derives them from the generated `#routing` type (shared/routing.ts,
// #96/#55) — so both queries keep the blog item types with no casts.
const { path, pagesKey } = resolved
const pingbacksKey = resolved.dataCollections.find((d) => d.name === 'pingbacks')?.key

const { data } = await useAsyncData(route.path, async () => {
  const post = await queryCollection(pagesKey).path(path).first()
  const pingbacks = pingbacksKey ? await queryCollection(pingbacksKey).all() : []
  return { post, pingbacks }
})

const meta = personaMeta(space)
const post = computed(() => data.value?.post ?? null)
// Inbound reactions to THIS post, from the same-Space pingbacks collection.
const pingbacks = computed(() =>
  (data.value?.pingbacks ?? [])
    .filter((p) => p.target === path)
    .sort((a, b) => new Date(b.reactedAt).getTime() - new Date(a.reactedAt).getTime()),
)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

const title = computed(() => post.value?.title ?? 'Not found')
useHead({ title: `${title.value} · blog/${space}` })
</script>

<template>
  <main class="bl" :style="{ '--bl-accent': meta.accent }">
    <p class="crumb">
      <NuxtLink to="/">terrarium</NuxtLink>
      <span class="sep">/</span>blog<span class="sep">/</span>
      <NuxtLink :to="`/t/blog/${space}`">{{ space }}</NuxtLink>
    </p>

    <article v-if="post">
      <header class="post-head">
        <div v-if="post.publishedAt" class="when">{{ fmtDate(post.publishedAt as string) }}</div>
        <h1>{{ post.title }}</h1>
        <p v-if="post.reactsTo" class="replyto">
          ↳ In reply to {{ post.reactsTo.persona }}'s
          <NuxtLink :to="`/t/blog/${post.reactsTo.persona}${post.reactsTo.path}`">“{{ post.reactsTo.title }}”</NuxtLink>
        </p>
      </header>

      <div class="prose">
        <ContentRenderer :value="post" />
      </div>

      <section v-if="pingbacks.length" class="pingbacks">
        <h2>Reactions from other personas</h2>
        <ul>
          <li v-for="pb in pingbacks" :key="`${pb.fromPersona}${pb.fromPath}`">
            <span class="who">{{ personaMeta(pb.fromPersona).name }} reacted</span>
            <span class="pb-title">
              <NuxtLink :to="`/t/blog/${pb.fromPersona}${pb.fromPath}`">{{ pb.fromTitle }}</NuxtLink>
            </span>
            <span class="blurb">{{ pb.blurb }}</span>
          </li>
        </ul>
      </section>
    </article>

    <div v-else class="prose">
      <h1>Not found</h1>
      <p>No document at <code>{{ path }}</code> in blog/{{ space }}.</p>
    </div>

    <BlogNetwork :current="space" />
  </main>
</template>
