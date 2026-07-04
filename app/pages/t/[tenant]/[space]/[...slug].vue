<script setup lang="ts">
// Runtime routing (ADR-0001): the request path selects which baked (Tenant, Space)
// to serve. We resolve it to a generated collection key and query only that
// collection — physical table-level isolation means no cross-Space leakage.
import type { Collections } from '@nuxt/content'
import { routingMap } from '~~/shared/routing.generated'

type Map = Record<string, Record<string, Record<string, string>>>

const route = useRoute()
const tenant = String(route.params.tenant)
const space = String(route.params.space)

const slugParam = route.params.slug
const joined = Array.isArray(slugParam) ? slugParam.join('/') : (slugParam ?? '')
const path = joined ? `/${joined}`.replace(/\/$/, '') : '/'

const collectionKey = (routingMap as Map)[tenant]?.[space]?.pages as keyof Collections | undefined

if (!collectionKey) {
  throw createError({
    statusCode: 404,
    statusMessage: `Unknown Tenant/Space: ${tenant}/${space}`,
  })
}

const { data: page } = await useAsyncData(route.path, () =>
  queryCollection(collectionKey).path(path).first(),
)
</script>

<template>
  <main style="max-width: 46rem; margin: 2rem auto; padding: 0 1rem; font-family: system-ui, sans-serif;">
    <p style="opacity: 0.6; font-size: 0.85rem;">
      <NuxtLink to="/">terrarium</NuxtLink> · {{ tenant }} · {{ space }}
    </p>
    <ContentRenderer v-if="page" :value="page" />
    <div v-else>
      <h1>Not found</h1>
      <p>No document at <code>{{ path }}</code> in {{ tenant }}/{{ space }}.</p>
    </div>
  </main>
</template>
