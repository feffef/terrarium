<script setup lang="ts">
// The one presentational surface of the Commits PoC (used as `::latest-commit`
// MDC in the Tenant's index.md). Fetches the live latest commit from the
// Tenant's runtime git endpoint and shows the subject in a large font.
// `useFetch` runs the endpoint in-process during SSR, so the commit is already
// in the hydration payload — no client refetch, no console errors for the L2
// clean-hydration gate to trip on (tests/e2e/smoke.spec.ts).
const { data } = await useFetch('/api/latest-commit')
</script>

<template>
  <div class="commit-poc">
    <template v-if="data?.ok">
      <p class="commit-poc__label">latest commit</p>
      <p class="commit-poc__subject">{{ data.subject }}</p>
      <p v-if="data.body" class="commit-poc__body">{{ data.body }}</p>
      <p class="commit-poc__meta">
        <code>{{ data.hash.slice(0, 8) }}</code>
        <span>{{ data.author }}</span>
        <span>{{ data.date }}</span>
      </p>
    </template>
    <p v-else class="commit-poc__error">Couldn't read the latest commit at runtime.</p>
  </div>
</template>

<style scoped>
.commit-poc {
  margin: 2rem 0;
  padding: 1.5rem 1.75rem;
  border: 1px solid #8884;
  border-radius: 12px;
  font-family: system-ui, sans-serif;
}

.commit-poc__label {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.55;
}

.commit-poc__subject {
  margin: 0;
  font-size: clamp(2rem, 6vw, 4rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  /* Commit subjects can carry long unbreakable tokens (a session id, a URL);
     break them so the headline never overflows the card / scrolls the page. */
  overflow-wrap: anywhere;
}

.commit-poc__body {
  margin: 1rem 0 0;
  white-space: pre-wrap;
  font-size: 1rem;
  line-height: 1.5;
  opacity: 0.8;
}

.commit-poc__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.9rem;
  margin: 1.25rem 0 0;
  font-size: 0.85rem;
  opacity: 0.65;
}

.commit-poc__meta code {
  font-family: ui-monospace, monospace;
}

.commit-poc__error {
  margin: 0;
  font-size: 1.1rem;
  opacity: 0.7;
}
</style>
