<script setup lang="ts">
// The Blog Tenant's single-post page (`/t/blog/<persona>/<slug>`). A more specific
// route than the Platform's generic catch-all, so blog posts render in the blog
// theme with their pingbacks rather than falling through to the unstyled renderer.
//
// Isolation-respecting and presentation-only (ADR-0004): it resolves the request
// through the SAME shared, unit-tested `resolveSpaceRoute` (via the read-only
// useSpace composable), then reads only this Space's keyed `pages` and
// `pingbacks` collections. The pingback list is a SAME-Space read — the
// cross-Persona relationship was denormalised here at author time (ADR-0012),
// so nothing queries a sibling Space at render. The resolved keys are already
// this Tenant's own literal collection keys, so both queries keep the
// blog item types with no casts; `personaMeta`/`formatBlogDate`/the components
// arrive via Nuxt auto-imports.
const route = useRoute()
const { space, path, pagesKey, collections } = useSpace('blog')

const { data } = await useAsyncData(route.path, async () => {
  const post = await queryCollection(pagesKey).path(path).first()
  // Inbound reactions to THIS post, newest first — filtered and ordered in SQL.
  const pingbacks = await queryCollection(collections.pingbacks)
    .where('target', '=', path)
    .order('reactedAt', 'DESC')
    .all()
  return { post, pingbacks }
})

const meta = personaMeta(space)
const post = computed(() => data.value?.post ?? null)
const pingbacks = computed(() => data.value?.pingbacks ?? [])

const title = computed(() => post.value?.title ?? 'Not found')
// The .bl-page body class scopes the blog canvas (full-bleed background +
// accent wash) to blog routes only; the accent on <body> lets that wash tint
// itself per Persona before the page root even renders.
useHead(() => ({
  title: `${title.value} · blog/${space}`,
  bodyAttrs: { class: 'bl-page', style: `--bl-accent: ${meta.accent}` },
}))
useSeoMeta({ description: () => post.value?.description })
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
        <div v-if="post.publishedAt" class="when">{{ formatBlogDate(post.publishedAt) }}</div>
        <h1>{{ post.title }}</h1>
        <p v-if="post.reactsTo" class="replyto">
          ↳ In reply to {{ post.reactsTo.persona }}'s
          <NuxtLink :to="`/t/blog/${post.reactsTo.persona}${post.reactsTo.path}`">“{{ post.reactsTo.title }}”</NuxtLink>
        </p>
      </header>

      <div class="prose prose--post">
        <ContentRenderer :value="post" />
      </div>

      <!-- End-of-post mark: the sprout closes the piece whether or not
           anyone has reacted yet. -->
      <div class="sprig" role="presentation"><BlogSprout /></div>

      <section v-if="pingbacks.length" class="pingbacks">
        <h2>Reactions from other personas</h2>
        <ul>
          <li v-for="pb in pingbacks" :key="`${pb.fromPersona}${pb.fromPath}`">
            <span class="who" :style="{ color: personaMeta(pb.fromPersona).accent }">{{ personaMeta(pb.fromPersona).name }} reacted</span>
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
