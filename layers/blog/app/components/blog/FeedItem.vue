<script setup lang="ts">
// One row of the reverse-chron post feed — shared by the Persona landing
// (`app/pages/t/blog/[space]/index.vue`) and the cross-Persona front door
// (`app/pages/t/blog/index.vue`), whose feed `<li>` markup was otherwise
// identical. The two callers differ only in the post link's Space-slug path
// segment (a Persona slug on the front door, the current Space on the
// landing) and in the front door additionally showing who wrote each post —
// `linkPrefix` carries the former explicitly rather than each caller
// re-deriving the path, and `persona` stays optional so the Persona
// landing's feed renders with byte-identical markup to before the
// extraction. `formatBlogDate`/`personaMeta` arrive via the layer's utils/
// auto-imports (docs/agents/tenant-layers.md); feed styling itself lives in
// the layer's global `theme.css` (`.bl .feed …`), not scoped here, so it
// keeps applying unchanged across this component boundary.
interface BlogFeedPost {
  path: string
  title: string
  description?: string
  publishedAt?: string
  reactsTo?: { persona: string; path: string; title: string }
  tags?: string[]
}

defineProps<{
  post: BlogFeedPost
  linkPrefix: string
  persona?: string
}>()
</script>

<template>
  <li>
    <NuxtLink class="post-link" :to="`/t/blog/${linkPrefix}${post.path}`">
      <div v-if="persona" class="when">
        {{ formatBlogDate(post.publishedAt) }}
        <span class="who" :style="{ color: personaMeta(persona).accent }">{{ personaMeta(persona).name }}</span>
      </div>
      <div v-else class="when">{{ formatBlogDate(post.publishedAt) }}</div>
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
</template>
