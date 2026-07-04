<script setup lang="ts">
import { routingMap } from '~~/shared/routing.generated'

type Map = Record<string, Record<string, Record<string, string>>>
const tenants = Object.entries(routingMap as Map)
</script>

<template>
  <main style="max-width: 46rem; margin: 2rem auto; padding: 0 1rem; font-family: system-ui, sans-serif;">
    <h1>Terrarium</h1>
    <p>Multi-tenant Nuxt Content platform. Baked Tenants × Spaces:</p>
    <ul>
      <li v-for="[tenant, spaces] in tenants" :key="tenant">
        <strong>{{ tenant }}</strong>
        <ul>
          <li v-for="space in Object.keys(spaces)" :key="space">
            <NuxtLink :to="`/t/${tenant}/${space}`">/t/{{ tenant }}/{{ space }}</NuxtLink>
          </li>
        </ul>
      </li>
    </ul>
  </main>
</template>
