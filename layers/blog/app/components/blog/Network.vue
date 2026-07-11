<script setup lang="ts">
// The "Terrarium Blogger Network" footer — cross-persona navigation shared by the
// Persona landing and the post page.
// Styled as a pane of the tank: a rounded glass panel with a sprout perched on
// its rim. Each link carries its own Persona accent (--pa), so the row reads as
// a little network of three blogs rather than a generic nav.
// `PERSONA_SLUGS`/`personaMeta` (utils/) and `BlogSprout` arrive via Nuxt's
// layer-wide auto-imports.
defineProps<{ current: string }>()
</script>

<template>
  <footer class="bl-network" aria-label="Terrarium Blogger Network">
    <BlogSprout class="net-sprout" />
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
  margin-top: 3.25rem;
  border: 1px solid var(--bl-line);
  border-radius: 16px;
  background:
    linear-gradient(170deg, var(--bl-glass-shine), transparent 55%),
    var(--bl-surface);
  box-shadow: var(--bl-shadow), inset 0 1px 0 var(--bl-glass-edge);
  padding: 1.35rem 1.25rem 1.3rem;
  text-align: center;
}
.net-sprout { color: var(--bl-accent); display: block; margin: 0 auto 0.4rem; }
.net-label {
  font-family: var(--bl-mono);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--bl-faint);
  margin: 0 0 0.95rem;
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
  background: var(--bl-surface);
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  transition: border-color 0.15s ease, color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}
.net-links a::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--pa);
  flex: none;
}
.net-links a:hover {
  border-color: var(--pa);
  color: var(--bl-ink);
  transform: translateY(-1px);
  box-shadow: 0 3px 10px -4px color-mix(in srgb, var(--pa) 55%, transparent);
}
.net-links a:focus-visible { outline: 2px solid var(--pa); outline-offset: 2px; }
.net-links a[aria-current='page'] { background: var(--pa); border-color: var(--pa); color: #fff; }
.net-links a[aria-current='page']::before { background: #fff; }
.net-hint { margin: 0.95rem 0 0; font-size: 0.8rem; color: var(--bl-faint); font-style: italic; }
</style>
