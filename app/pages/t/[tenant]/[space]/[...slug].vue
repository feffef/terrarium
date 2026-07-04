<script setup lang="ts">
// Runtime routing (ADR-0001): the request path selects which baked (Tenant, Space)
// to serve. We resolve it to generated collection keys and query only those
// collections — physical table-level isolation means no cross-Space leakage.
import type { Collections } from '@nuxt/content'
import { routingMap } from '~~/shared/routing.generated'

type Map = Record<string, Record<string, Record<string, string>>>

const route = useRoute()
const tenant = String(route.params.tenant)
const space = String(route.params.space)

const slugParam = route.params.slug
const joined = Array.isArray(slugParam) ? slugParam.join('/') : (slugParam ?? '')
const path = joined ? `/${joined}`.replace(/\/$/, '') : '/'

const spaceCollections = (routingMap as Map)[tenant]?.[space]

if (!spaceCollections?.pages) {
  throw createError({
    statusCode: 404,
    statusMessage: `Unknown Tenant/Space: ${tenant}/${space}`,
  })
}

const pagesKey = spaceCollections.pages as keyof Collections

// Convention: `pages` is the routed collection; every other collection in the
// Space is queryable `data`, surfaced as a catalog on the Space landing. Each is
// still keyed per (Tenant, Space), so this stays fully isolated.
const dataCollections = Object.entries(spaceCollections)
  .filter(([name]) => name !== 'pages')
  .map(([name, key]) => ({ name, key: key as keyof Collections }))

const atRoot = path === '/'

const { data } = await useAsyncData(route.path, async () => {
  const page = await queryCollection(pagesKey).path(path).first()
  const catalog = atRoot
    ? await Promise.all(
        dataCollections.map(async ({ name, key }) => ({
          name,
          items: await queryCollection(key).all(),
        })),
      )
    : []
  return { page, catalog }
})

// Show only authored fields — drop Nuxt Content's built-in/page fields.
const HIDDEN = new Set([
  'id', 'stem', 'extension', 'meta', 'path', 'title', 'description', 'seo', 'body', 'navigation',
])
function fields(item: Record<string, unknown>): [string, unknown][] {
  return Object.entries(item).filter(
    ([k, v]) => !k.startsWith('_') && !HIDDEN.has(k) && typeof v !== 'object',
  )
}
</script>

<template>
  <main style="max-width: 46rem; margin: 2rem auto; padding: 0 1rem; font-family: system-ui, sans-serif;">
    <p style="opacity: 0.6; font-size: 0.85rem;">
      <NuxtLink to="/">terrarium</NuxtLink> · {{ tenant }} · {{ space }}
    </p>

    <ContentRenderer v-if="data?.page" :value="data.page" />
    <div v-else>
      <h1>Not found</h1>
      <p>No document at <code>{{ path }}</code> in {{ tenant }}/{{ space }}.</p>
    </div>

    <section v-for="c in data?.catalog" :key="c.name" style="margin-top: 2rem;">
      <h2 style="text-transform: capitalize;">{{ c.name }}</h2>
      <ul style="list-style: none; padding: 0; margin: 0;">
        <li
          v-for="item in c.items"
          :key="item.id"
          style="border: 1px solid #8884; border-radius: 8px; padding: 0.6rem 0.9rem; margin: 0.5rem 0;"
        >
          <dl style="margin: 0; display: grid; grid-template-columns: max-content 1fr; gap: 0.15rem 0.6rem;">
            <template v-for="[k, v] in fields(item)" :key="k">
              <dt style="font-weight: 600;">{{ k }}</dt>
              <dd style="margin: 0;">{{ v }}</dd>
            </template>
          </dl>
        </li>
      </ul>
    </section>
  </main>
</template>
