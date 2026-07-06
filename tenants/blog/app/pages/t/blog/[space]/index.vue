<script setup lang="ts">
// The Blog Tenant's Persona landing (`/t/blog/<persona>`). A more specific route
// than the Platform's generic catch-all, so it wins for the Space *root*; single
// posts render via the sibling `[...slug].vue`.
//
// Isolation-respecting and presentation-only (ADR-0004): it resolves the Space
// through the SAME shared, unit-tested `resolveSpaceRoute` the catch-all uses (a
// read-only import — no isolation logic duplicated), then reads only this
// (Tenant, Space)'s keyed `pages` collection. Spaces cannot leak.
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
// `pagesKey` is already this Tenant's own literal `pages` keys — the resolver
// derives them from the generated `#routing` type (shared/routing.ts, #96/#55).
const pagesKey = resolved.pagesKey

const { data } = await useAsyncData(route.path, () => queryCollection(pagesKey).all())

const meta = personaMeta(space)

const pages = computed(() => data.value ?? [])
// The index.md landing sits at the Space root; posts are every page with a
// publish instant, newest first.
const landing = computed(() => pages.value.find((p) => p.path === '/') ?? null)
const posts = computed(() =>
  pages.value
    .filter((p) => Boolean(p.publishedAt))
    .sort((a, b) => new Date(b.publishedAt as string).getTime() - new Date(a.publishedAt as string).getTime()),
)

const title = computed(() => landing.value?.title ?? `${meta.name}'s blog`)
const tagline = computed(() => landing.value?.description ?? '')

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

useHead({ title: `${title.value} · blog/${space}` })
</script>

<template>
  <main class="bl bl--landing" :style="{ '--bl-accent': meta.accent }">
    <p class="crumb">
      <NuxtLink to="/">terrarium</NuxtLink>
      <span class="sep">/</span>blog<span class="sep">/</span><span class="here">{{ space }}</span>
    </p>

    <div class="landing-grid">
      <div class="landing-main">
        <header class="masthead">
          <p class="byline"><span class="dot" />{{ meta.name }}</p>
          <h1>{{ title }}</h1>
          <p v-if="tagline" class="tagline">{{ tagline }}</p>
        </header>

        <ul v-if="posts.length" class="feed">
          <li v-for="post in posts" :key="post.path">
            <NuxtLink class="post-link" :to="`/t/blog/${space}${post.path}`">
              <div class="when">{{ fmtDate(post.publishedAt as string) }}</div>
              <h2>{{ post.title }}</h2>
              <p v-if="post.reactsTo" class="reply">↳ in reply to {{ post.reactsTo.persona }}</p>
              <p v-if="post.description" class="excerpt">{{ post.description }}</p>
            </NuxtLink>
          </li>
        </ul>
        <p v-else class="empty">No posts here yet.</p>
      </div>

      <aside v-if="landing" class="about" aria-label="About me">
        <p class="about-label">About me</p>
        <div class="prose about-prose">
          <ContentRenderer :value="landing" />
        </div>
      </aside>
    </div>

    <BlogNetwork :current="space" />
  </main>
</template>
