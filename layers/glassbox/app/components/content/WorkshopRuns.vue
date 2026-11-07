<script setup lang="ts">
import { sessionUrl } from '#shared/session-url'

const { collections } = useSpace('glassbox')

// Only the mapped fields below travel in the payload (ADR-0028).
const { data } = await useAsyncData('glassbox-workshop-runs', async () => {
  const runs = await queryCollection(collections.runs).order('stem', 'DESC').all()
  return runs.map(({ stem, session, mode, focus, changes }) => ({
    stem,
    session,
    mode,
    focus,
    changes: changes.map(glassboxRunChange),
  }))
})
</script>

<template>
  <p v-if="!data?.length" class="empty">No curate runs yet.</p>
  <ol v-else class="runs">
    <li v-for="run in data" :key="run.stem">
      <p class="head">
        <time class="when">{{ glassboxRunStart(run.stem) }}</time>
        <span class="mode">{{ run.mode }}</span>
        <a :href="sessionUrl(run.session)">session ↗</a>
      </p>
      <p class="focus">{{ run.focus }}</p>
      <ul v-if="run.changes.length" class="changes">
        <li v-for="(change, i) in run.changes" :key="i">
          <template v-if="'raw' in change">{{ change.raw }}</template>
          <template v-else>
            <code>{{ change.page }}</code>: {{ change.what }}. <em>{{ change.why }}</em>
          </template>
        </li>
      </ul>
    </li>
  </ol>
</template>

<style scoped>
.empty { color: var(--gb-muted); }
.runs { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
.runs > li {
  padding: 14px 18px;
  border: 1px solid var(--gb-pane-edge);
  border-radius: 14px;
  background: var(--gb-pane);
  box-shadow: var(--gb-pane-shadow);
}
.head { display: flex; flex-wrap: wrap; gap: 4px 12px; margin: 0; font: 12px var(--gb-mono); color: var(--gb-muted); }
.mode { text-transform: uppercase; letter-spacing: 0.08em; }
.focus { margin: 6px 0 0; font-weight: 600; }
.changes { margin: 8px 0 0; padding-left: 1.2em; font-size: 15px; overflow-wrap: anywhere; }
</style>
