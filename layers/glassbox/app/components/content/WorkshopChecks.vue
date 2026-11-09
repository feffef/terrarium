<script setup lang="ts">
const { collections } = useSpace('glassbox')

const { data } = await useAsyncData('glassbox-workshop-checks', async () => {
  const files = await queryCollection(collections.checks).select('pages').all()
  return glassboxCheckRows(files.flatMap((file) => file.pages))
})
</script>

<template>
  <p v-if="!data?.length" class="empty">No full checks yet.</p>
  <template v-else>
    <p class="count">{{ data.length }} guide {{ data.length === 1 ? 'page has' : 'pages have' }} a recorded full check; pages not listed have none yet.</p>
    <table class="checks">
      <thead>
        <tr><th scope="col">Last full check</th><th scope="col">Page</th></tr>
      </thead>
      <tbody>
        <tr v-for="row in data" :key="row.page">
          <td class="when">{{ row.checked }}</td>
          <td class="page"><NuxtLink :to="glassboxGuidePath(row.page)">{{ row.page }}</NuxtLink></td>
        </tr>
      </tbody>
    </table>
  </template>
</template>

<style scoped>
.empty, .count { color: var(--gb-muted); }
.checks { width: 100%; border-collapse: collapse; font-size: 15px; }
th { text-align: left; font: 11px var(--gb-mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--gb-muted); }
th, td { padding: 6px 10px 6px 0; border-bottom: 1px solid var(--gb-line); }
.when { font: 13px var(--gb-mono); white-space: nowrap; color: var(--gb-muted); }
.page { font: 13px var(--gb-mono); overflow-wrap: anywhere; }
</style>
