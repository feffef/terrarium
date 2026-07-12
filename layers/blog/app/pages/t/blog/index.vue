<script setup lang="ts">
// The Blog Tenant's front door (`/t/blog`) — a Tenant-root layer page above its
// Spaces, the same precedent ADR-0016 already established for the Atlas
// (`layers/atlas/app/pages/t/atlas/index.vue`). Combines every Persona's posts
// into one reverse-chron feed, browsable by Tag (layers/blog/CONTEXT.md: Tag)
// via the `?tag=` query param — filtering is a client-side computed over one
// fetch, so switching tags never re-queries.
//
// Isolation-respecting and presentation-only (ADR-0004): it resolves each
// Persona through the SAME shared, unit-tested `resolveSpaceRoute` the rest of
// the Blog uses, then reads only that Space's own keyed `pages` collection —
// no cross-Space query, no new isolation surface. `PERSONA_SLUGS`/`personaMeta`/
// `formatBlogDate` arrive via the layer's `utils/` auto-imports.
import { resolveSpaceRoute } from '#shared/routing'

interface FrontPost {
  path: string
  title: string
  description?: string
  publishedAt?: string
  reactsTo?: { persona: string; path: string; title: string }
  tags?: string[]
  persona: string
}

const route = useRoute()

const { data } = await useAsyncData('blog-front', async () => {
  const posts: FrontPost[] = []
  for (const persona of PERSONA_SLUGS) {
    const resolved = resolveSpaceRoute('blog', persona, undefined)
    if (!resolved) continue
    const rows = await queryCollection(resolved.pagesKey)
      .where('publishedAt', 'IS NOT NULL')
      .select('path', 'title', 'description', 'publishedAt', 'reactsTo', 'tags')
      .all()
    posts.push(...rows.map((r) => ({ ...r, persona })))
  }
  posts.sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
  return posts
})

const posts = computed(() => data.value ?? [])

// The tag directory: every tag actually in use across all three Personas,
// most-used first — not the full curated vocabulary, so an unused tag doesn't
// clutter the list.
const tagCounts = computed(() => {
  const counts = new Map<string, number>()
  for (const post of posts.value) {
    for (const t of post.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
})

const selectedTag = computed(() => {
  const q = route.query.tag
  return typeof q === 'string' ? q : undefined
})

const filteredPosts = computed(() =>
  selectedTag.value ? posts.value.filter((p) => p.tags?.includes(selectedTag.value!)) : posts.value,
)

useHead({
  title: computed(() => (selectedTag.value ? `#${selectedTag.value} · blog` : 'blog · terrarium')),
  bodyAttrs: { class: 'bl-page' },
})
useSeoMeta({
  description: 'Three Personas narrating the same experiment from different angles, browsable by tag.',
})
</script>

<template>
  <main class="bl bl--landing bl--front">
    <p class="crumb">
      <NuxtLink to="/">terrarium</NuxtLink>
      <span class="sep">/</span><span class="here">blog</span>
    </p>

    <div class="landing-grid">
      <header class="masthead">
        <h1>The Blog</h1>
      </header>

      <!-- Same "About me" panel shape the Persona landing uses (theme.css
           `.landing-grid`/`.about`) — here it holds the cross-Persona intro,
           the Blogger Network (same component/label as each Persona page's
           footer), and the Tag directory, all sticky beside the feed on a wide
           viewport. -->
      <aside class="about" aria-label="Browse the blog">
        <p class="about-label">About</p>
        <p class="prose about-prose">
          Three Personas narrating the same experiment from different angles,
          browsable here by tag.
        </p>

        <BlogNetwork current="" />

        <p class="about-label tag-directory-label">Browse by tag</p>
        <nav class="tag-directory" aria-label="Browse by tag">
          <NuxtLink to="/t/blog" class="tag-chip" :class="{ active: !selectedTag }">all</NuxtLink>
          <NuxtLink
            v-for="[t, count] in tagCounts"
            :key="t"
            :to="`/t/blog?tag=${t}`"
            class="tag-chip"
            :class="{ active: selectedTag === t }"
          >{{ t }} <span class="tag-count">{{ count }}</span></NuxtLink>
        </nav>
      </aside>

      <div class="landing-feed">
        <ul v-if="filteredPosts.length" class="feed">
          <li v-for="post in filteredPosts" :key="`${post.persona}${post.path}`">
            <NuxtLink class="post-link" :to="`/t/blog/${post.persona}${post.path}`">
              <div class="when">
                {{ formatBlogDate(post.publishedAt) }}
                <span class="who" :style="{ color: personaMeta(post.persona).accent }">{{ personaMeta(post.persona).name }}</span>
              </div>
              <h2>{{ post.title }}</h2>
              <p v-if="post.reactsTo" class="reply">↳ in reply to {{ post.reactsTo.persona }}</p>
              <p v-if="post.description" class="excerpt">{{ post.description }}</p>
            </NuxtLink>
            <ul v-if="post.tags?.length" class="tag-chips">
              <li v-for="t in post.tags" :key="t">
                <NuxtLink :to="`/t/blog?tag=${t}`" class="tag-chip" @click.stop>{{ t }}</NuxtLink>
              </li>
            </ul>
          </li>
        </ul>
        <p v-else class="empty">No posts tagged “{{ selectedTag }}” yet.</p>
      </div>
    </div>
  </main>
</template>
