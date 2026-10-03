<script setup lang="ts">
import type { TinkerfundCampaign } from '../../../types/tinkerfund'

// No ticker or rotation: each row fades in once (issue #1386, WCAG 2.2.2).
const props = defineProps<{
  recent: TinkerfundCampaign['recent']
  now: number
  /** When the visitor placed their own Pledge, if they have one. */
  you?: number
}>()
const id = useId()
const rows = computed(() => tinkerfundRecentBackers(props.recent, props.now))
</script>

<template>
  <section class="recent tf-panel" :aria-labelledby="id">
    <h2 :id="id" class="tf-label">Recently backed</h2>
    <ol>
      <li v-if="you !== undefined" class="you">
        <b>You</b> · <TinkerfundTime :at="you" :text="formatTinkerfundAgo(now, you)" />
      </li>
      <li v-for="r in rows" :key="`${r.name}-${r.at}`">
        <b>{{ r.name }}</b> · {{ r.city }} · <TinkerfundTime :at="r.at" :text="formatTinkerfundAgo(now, r.at)" />
      </li>
    </ol>
  </section>
</template>

<style scoped>
.recent { display: grid; gap: 10px; padding: 16px 20px; }
h2 { margin: 0; }
ol { display: grid; margin: 0; padding: 0; list-style: none; font-size: 14px; }
li { padding: 7px 0; border-top: var(--tf-hairline); color: var(--tf-muted); overflow-wrap: anywhere; animation: tf-row-in var(--tf-dur) var(--tf-ease) both; }
li:first-child { border-top: 0; padding-top: 0; }
b { color: var(--tf-ink); font-weight: 600; }
time { font: 500 12px/1.4 var(--tf-mono); }
@keyframes tf-row-in { from { opacity: 0; } }
</style>
