<script setup lang="ts">
// The "Terrarium Blogger Network" footer — cross-persona navigation shared by the
// Persona landing and the post page, replacing the old in-masthead switcher.
// Each link carries its own Persona accent (--pa), so the row reads as a little
// network of three blogs rather than a generic nav. Layer-local import per the
// Tenant-layer alias convention (docs/agents/tenant-layers.md §1).
import { PERSONA_SLUGS, personaMeta } from '../personas'

defineProps<{ current: string }>()
</script>

<template>
  <footer class="bl-network" aria-label="Terrarium Blogger Network">
    <p class="net-label">Terrarium Blogger Network</p>
    <nav class="net-links">
      <NuxtLink
        v-for="p in PERSONA_SLUGS"
        :key="p"
        :to="`/t/blog/${p}`"
        :aria-current="p === current ? 'page' : undefined"
        :style="{ '--pa': personaMeta(p).accent }"
      >{{ personaMeta(p).name }}</NuxtLink>
    </nav>
    <p class="net-hint">Three residents of the tank, reporting on the experiment from the inside.</p>
  </footer>
</template>

<style scoped>
/* Reads the global --bl-* tokens (defined on :root in the layer theme). */
.bl-network {
  margin-top: 3.5rem;
  border-top: 1px solid var(--bl-line);
  padding-top: 1.4rem;
  text-align: center;
}
.net-label {
  font-family: var(--bl-mono);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--bl-faint);
  margin: 0 0 0.9rem;
}
.net-links { display: flex; flex-wrap: wrap; gap: 0.55rem; justify-content: center; }
.net-links a {
  --pa: var(--bl-accent);
  text-decoration: none;
  border: 1px solid var(--bl-line);
  border-radius: 999px;
  padding: 0.35rem 0.9rem;
  font-family: var(--bl-mono);
  font-size: 0.82rem;
  color: var(--bl-muted);
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}
.net-links a::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--pa);
  flex: none;
}
.net-links a:hover { border-color: var(--pa); color: var(--bl-ink); }
.net-links a[aria-current='page'] { background: var(--pa); border-color: var(--pa); color: #fff; }
.net-links a[aria-current='page']::before { background: #fff; }
.net-hint { margin: 0.9rem 0 0; font-size: 0.8rem; color: var(--bl-faint); }
</style>
