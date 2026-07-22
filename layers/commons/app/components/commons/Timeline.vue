<script setup lang="ts">
// The Timeline view (`/t/commons/timeline`) — a reverse-chronological feed of
// every timestamped piece of content across the Platform (dated posts, daily
// Journal digests, and session logs), one line each, linking to where it really
// lives. Reads only through this layer's own `queryTimeline` normalization
// (composables/timeline.ts) over the sanctioned read primitive (ADR-0025); the
// feed is build-time/committed content (ADR-0001), never a live feed.
const { data, status, error } = await useAsyncData('commons-timeline', () => queryTimeline())
const entries = computed(() => data.value ?? [])
const tenantCount = computed(() => new Set(entries.value.map((e) => e.tenant)).size)

// Format the UTC calendar date straight from the ISO string parts — zone-stable,
// so a `…Z` instant never shifts a day when re-rendered in the viewer's timezone
// (the drift the Journal's `utcTimestamp` comment warns about).
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function calendarDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`
}
</script>

<template>
  <div class="tl">
    <p class="count">
      {{ entries.length }} {{ entries.length === 1 ? 'entry' : 'entries' }}
      across {{ tenantCount }} {{ tenantCount === 1 ? 'tenant' : 'tenants' }}
    </p>

    <ol class="feed">
      <li v-for="e in entries" :key="e.url + e.when" class="tl-entry">
        <NuxtLink :to="e.url" class="row">
          <time class="when" :datetime="e.when">{{ calendarDate(e.when) }}</time>
          <span class="body">
            <span class="summary">
              <span class="genre" :class="`genre-${e.genre}`">{{ e.genre }}</span>
              {{ e.summary }}
            </span>
            <span class="prov">{{ e.tenant }} <span class="dot">·</span> {{ e.space }}</span>
          </span>
        </NuxtLink>
      </li>
    </ol>
    <p v-if="!entries.length" class="empty">No timestamped content yet.</p>

    <ContentLoadErrorDialog :status="status" :error="error" context="/t/commons/timeline" />
  </div>
</template>

<style scoped>
.count {
  margin: 0.4rem 0 0.8rem;
  font-size: 0.85rem;
  color: var(--co-muted);
}
.feed {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.tl-entry + .tl-entry {
  border-top: 1px solid var(--co-line);
}
.row {
  display: grid;
  grid-template-columns: 6.5rem 1fr;
  gap: 0.2rem 1rem;
  align-items: baseline;
  padding: 0.7rem 0.4rem;
  text-decoration: none;
  color: inherit;
  transition: background-color 0.12s ease;
}
.row:hover {
  background: color-mix(in srgb, var(--co-accent) 6%, transparent);
}
.when {
  font-variant-numeric: tabular-nums;
  font-size: 0.82rem;
  color: var(--co-muted);
  white-space: nowrap;
}
.body {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.summary {
  font-weight: 600;
  font-size: 1rem;
  line-height: 1.35;
}
.genre {
  display: inline-block;
  margin-right: 0.4rem;
  padding: 0.05rem 0.4rem;
  border-radius: 999px;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  vertical-align: 0.08em;
  color: var(--co-card);
  background: var(--co-muted);
}
.genre-post {
  background: var(--co-accent);
}
.genre-digest {
  background: #9a6a2f;
}
.genre-session {
  background: #4a5b8c;
}
@media (prefers-color-scheme: dark) {
  .genre-digest {
    background: #c79a5c;
  }
  .genre-session {
    background: #8fa2d8;
  }
}
.prov {
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--co-accent);
}
.prov .dot {
  opacity: 0.5;
}
.empty {
  margin: 1rem 0 0;
  color: var(--co-muted);
}
@media (max-width: 30rem) {
  .row {
    grid-template-columns: 1fr;
    gap: 0.05rem;
  }
}
</style>
