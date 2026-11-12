<script setup lang="ts">
const { collections } = useSpace('glassbox')

// Only the mapped fields below travel in the payload (ADR-0028).
const { data } = await useAsyncData('glassbox-workshop-runs', async () => {
  const [runs, logs] = await Promise.all([
    queryCollection(collections.runs).order('stem', 'DESC').all(),
    queryAcrossTenants('session', (item) => ({ session: item.session as string })),
  ])
  // A Journal session card's anchor is `session-<id>` (the Journal's sessionAnchor); the catalog gives the Space it sits in.
  const logUrl = new Map(logs.filter((log) => log.tenant === 'journal').map((log) => [log.session, `/t/journal/${log.space}#session-${log.session}`]))
  return runs.map(({ stem, session, mode, focus, changes }) => ({
    stem,
    logUrl: logUrl.get(session),
    mode,
    focus,
    changes: changes.map(glassboxRunChange),
  }))
})
</script>

<template>
  <p v-if="!data?.length" class="empty">No curate runs yet.</p>
  <ol v-else class="runs">
    <li v-for="(run, i) in data" :key="run.stem">
      <!-- The newest runs open; the rest fold up so the page is not one long wall. -->
      <details :open="i < 3">
        <summary>
          <span class="head">
            <time class="when">{{ glassboxRunStart(run.stem) }}</time>
            <span class="mode">{{ run.mode }}</span>
          </span>
          <span class="focus">{{ run.focus }}</span>
        </summary>
        <p v-if="run.logUrl" class="session"><NuxtLink :to="run.logUrl">session log</NuxtLink></p>
        <ul v-if="run.changes.length" class="changes">
          <li v-for="(change, j) in run.changes" :key="j">
            <template v-if="'raw' in change">{{ change.raw }}</template>
            <template v-else>
              <code>{{ change.page }}</code>: {{ change.what }}. <em>{{ change.why }}</em>
            </template>
          </li>
        </ul>
      </details>
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
summary { cursor: pointer; }
.head { display: flex; flex-wrap: wrap; gap: 4px 12px; font: 12px var(--gb-mono); color: var(--gb-muted); }
.mode { text-transform: uppercase; letter-spacing: 0.08em; }
.focus { display: block; margin-top: 6px; font-weight: 600; }
details:not([open]) .focus { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.session { margin: 8px 0 0; font: 12px var(--gb-mono); }
.changes { margin: 8px 0 0; padding-left: 1.2em; font-size: 15px; overflow-wrap: anywhere; }
</style>
