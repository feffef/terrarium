<script setup lang="ts">
const { collections } = useSpace('glassbox')

const { data } = await useAsyncData('glassbox-workshop-checks', async () => {
  const [files, guide] = await Promise.all([
    queryCollection(collections.checks).select('pages').all(),
    useGlassboxPages('guide'),
  ])
  const checks = files.flatMap((file) => file.pages)
  return { checks: checks.length, rows: glassboxCheckRows(guide, checks) }
})
</script>

<template>
  <p v-if="!data?.checks" class="empty">No full checks yet.</p>
  <table v-if="data?.rows.length" class="checks">
    <thead>
      <tr><th scope="col">Last full check</th><th scope="col">Page</th></tr>
    </thead>
    <tbody>
      <tr v-for="row in data.rows" :key="row.stem">
        <td class="when">{{ row.checked ?? 'never' }}</td>
        <td><NuxtLink :to="row.path">{{ row.title }}</NuxtLink></td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.empty { color: var(--gb-muted); }
.checks { width: 100%; border-collapse: collapse; font-size: 15px; }
th { text-align: left; font: 11px var(--gb-mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--gb-muted); }
th, td { padding: 6px 10px 6px 0; border-bottom: 1px solid var(--gb-line); }
.when { font: 13px var(--gb-mono); white-space: nowrap; color: var(--gb-muted); }
</style>
