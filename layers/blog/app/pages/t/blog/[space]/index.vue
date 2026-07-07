<script setup lang="ts">
// The Blog Tenant's Persona landing (`/t/blog/<persona>`). A more specific route
// than the Platform's generic catch-all, so it wins for the Space *root*; single
// posts render via the sibling `[...slug].vue`.
//
// Isolation-respecting and presentation-only (ADR-0004): it resolves the Space
// through the SAME shared, unit-tested `resolveSpaceRoute` the catch-all uses
// (via the read-only useSpace composable — no isolation logic duplicated), then
// reads only this (Tenant, Space)'s keyed `pages` collection. Spaces cannot
// leak. `pagesKey` is already this Tenant's own literal `pages` keys (#96/#55);
// `personaMeta`/`formatBlogDate`/the components arrive via Nuxt auto-imports.
const route = useRoute()
const { space, pagesKey } = useSpace('blog')

// The index.md landing sits at the Space root (full body — it renders); the
// feed is every page with a publish instant, newest first, trimmed in SQL to
// the fields the list actually shows.
const { data } = await useAsyncData(route.path, async () => {
  const landing = await queryCollection(pagesKey).path('/').first()
  const posts = await queryCollection(pagesKey)
    .where('publishedAt', 'IS NOT NULL')
    .order('publishedAt', 'DESC')
    .select('path', 'title', 'description', 'publishedAt', 'reactsTo')
    .all()
  return { landing, posts }
})

const meta = personaMeta(space)

const landing = computed(() => data.value?.landing ?? null)
const posts = computed(() => data.value?.posts ?? [])

const title = computed(() => landing.value?.title ?? `${meta.name}'s blog`)
const tagline = computed(() => landing.value?.description ?? '')

// The .bl-page body class scopes the blog canvas (full-bleed background +
// accent wash) to blog routes only; the accent on <body> lets that wash tint
// itself per Persona before the page root even renders.
useHead(() => ({
  title: `${title.value} · blog/${space}`,
  bodyAttrs: { class: 'bl-page', style: `--bl-accent: ${meta.accent}` },
}))
useSeoMeta({ description: () => tagline.value })
</script>

<template>
  <main class="bl bl--landing" :style="{ '--bl-accent': meta.accent }">
    <p class="crumb">
      <NuxtLink to="/">terrarium</NuxtLink>
      <span class="sep">/</span>blog<span class="sep">/</span><span class="here">{{ space }}</span>
    </p>

    <div class="landing-grid">
      <header class="masthead">
        <p class="byline"><BlogSprout />{{ meta.name }}</p>
        <h1>{{ title }}</h1>
        <p v-if="tagline" class="tagline">{{ tagline }}</p>
      </header>

      <!-- The intro sits between the masthead and the feed in the DOM, so on
           narrow viewports it stacks slogan → About → posts. On wide viewports
           the grid areas float it into a sticky panel at the top-right. -->
      <aside v-if="landing" class="about" aria-label="About me">
        <p class="about-label">About me</p>
        <div class="prose about-prose">
          <ContentRenderer :value="landing" />
        </div>
      </aside>

      <div class="landing-feed">
        <ul v-if="posts.length" class="feed">
          <li v-for="post in posts" :key="post.path">
            <NuxtLink class="post-link" :to="`/t/blog/${space}${post.path}`">
              <div class="when">{{ formatBlogDate(post.publishedAt) }}</div>
              <h2>{{ post.title }}</h2>
              <p v-if="post.reactsTo" class="reply">↳ in reply to {{ post.reactsTo.persona }}</p>
              <p v-if="post.description" class="excerpt">{{ post.description }}</p>
            </NuxtLink>
          </li>
        </ul>
        <p v-else class="empty">No posts here yet.</p>
      </div>
    </div>

    <BlogNetwork :current="space" />
  </main>
</template>
