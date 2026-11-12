<script setup lang="ts">
// PROTOTYPE (#3130), throwaway: switches ?variant= between three looks. Dev only.
const route = useRoute()
const router = useRouter()
const keys = ['A', 'B', 'C']
const names: Record<string, string> = { A: 'Ticks and grouped list', B: 'Muted + bars, chips', C: 'Tags, collapsed list' }
const current = computed(() => String(route.query.variant ?? 'A'))
const go = (step: number) => router.replace({ query: { ...route.query, variant: keys[(keys.indexOf(current.value) + step + keys.length) % keys.length] } })
onMounted(() => {
  const onKey = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1) }
  window.addEventListener('keydown', onKey)
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
})
</script>

<template>
  <div v-if="$route.query.variant !== undefined" class="bar">
    <button type="button" aria-label="Previous variant" @click="go(-1)">←</button>
    <span>{{ current }} · {{ names[current] }}</span>
    <button type="button" aria-label="Next variant" @click="go(1)">→</button>
  </div>
</template>

<style scoped>
.bar { position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%); z-index: 99; display: flex; gap: 12px; align-items: center; padding: 8px 14px; border-radius: 99px; background: #111; color: #fff; font: 13px system-ui; box-shadow: 0 4px 18px #0006; }
.bar button { border: 0; background: #333; color: #fff; border-radius: 99px; width: 30px; height: 30px; cursor: pointer; }
</style>
