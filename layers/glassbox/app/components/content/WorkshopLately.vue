<script setup lang="ts">
const { collections } = useSpace('glassbox')

// Only the mapped fields below travel in the payload (ADR-0028).
const { data } = await useAsyncData('glassbox-workshop-lately', async () => {
  const [runs, checks] = await Promise.all([
    queryCollection(collections.runs).order('stem', 'DESC').select('stem', 'changes').all(),
    queryCollection(collections.checks).select('pages').all(),
  ])
  // Only a page the checks list names is known to exist (workshop.spec.ts); older run entries may name renamed pages.
  const known = new Set(checks.flatMap((file) => file.pages.map((p) => p.page)))
  const latest = glassboxLatelyChanges(runs.map(({ stem, changes }) => ({ stem, changes: changes.map(glassboxRunChange) })))
  return latest.map(({ stem, page, what }) => ({
    key: `${stem} ${page}`,
    day: glassboxRunStart(stem).slice(0, 10),
    page,
    what,
    to: known.has(page) ? glassboxGuidePath(page) : undefined,
  }))
})
</script>

<template>
  <p v-if="!data?.length" class="empty">No changes yet.</p>
  <ul v-else class="lately">
    <li v-for="row in data" :key="row.key">
      <time class="day">{{ row.day }}</time>
      <span class="what">{{ row.what }}</span>
      <NuxtLink v-if="row.to" class="page" :to="row.to">{{ row.page }}</NuxtLink>
      <code v-else class="page">{{ row.page }}</code>
    </li>
  </ul>
</template>

<style scoped>
.empty { color: var(--gb-muted); }
.lately { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.lately li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 2px 14px;
  padding: 12px 16px;
  border: 1px solid var(--gb-pane-edge);
  border-radius: 14px;
  background: var(--gb-pane);
  box-shadow: var(--gb-pane-shadow);
}
.day { grid-row: span 2; font: 12px var(--gb-mono); color: var(--gb-muted); padding-top: 3px; }
.what { font-size: 15.5px; overflow-wrap: anywhere; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
.page { font: 13px var(--gb-mono); color: var(--gb-muted); overflow-wrap: anywhere; }
a.page { color: var(--gb-accent); }
</style>
