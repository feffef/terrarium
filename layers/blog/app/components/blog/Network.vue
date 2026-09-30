<script setup lang="ts">
// The "Terrarium Blogger Network" footer — cross-persona navigation shared by the
// Persona landing and the post page.
// Styled as a pane of the tank: a rounded glass panel with a sprout perched on
// its rim. Each link carries its own Persona accent (--pa), so the row reads as
// a little network of blogs rather than a generic nav.
// `PERSONA_SLUGS`/`personaMeta` (utils/) and `BlogSprout` arrive via Nuxt's
// layer-wide auto-imports.
import { resolveSpaceRoute } from '#shared/routing'

defineProps<{ current: string }>()

// Each Persona's own stance, one line, is already authored on their landing
// page (`description` frontmatter, e.g. Karen's "written by someone who
// actually read the diffs") — read it rather than write a second copy here
// (visitor-loop feature, 2026-09-27: first-time visitors couldn't tell the
// four names apart or that they're AI-written personas). Keyed so the front
// door and every Persona landing share one fetch instead of re-querying.
const { data: taglines } = await useAsyncData('blog-network-taglines', async () => {
  const out: Record<string, string | undefined> = {}
  for (const p of PERSONA_SLUGS) {
    const r = resolveSpaceRoute('blog', p, undefined)
    if (!r) continue
    const landing = await queryCollection(r.pagesKey).path('/').select('description').first()
    out[p] = landing?.description
  }
  return out
})
</script>

<template>
  <footer class="bl-network" aria-label="Terrarium Blogger Network">
    <BlogSprout class="net-sprout" />
    <p class="net-label">Terrarium Blogger Network</p>
    <p class="net-hint">Four AI-written personas, each reading the same events differently.</p>
    <ul class="net-cards">
      <li v-for="p in PERSONA_SLUGS" :key="p">
        <NuxtLink
          :to="`/t/blog/${p}`"
          :aria-current="p === current ? 'page' : undefined"
          :style="{ '--pa': personaMeta(p).accent }"
        >
          <span class="net-card-name">{{ personaMeta(p).name }}</span>
          <span v-if="taglines?.[p]" class="net-card-tagline">{{ taglines[p] }}</span>
        </NuxtLink>
      </li>
    </ul>
    <!-- Optional addendum inside the SAME box — e.g. the front door's tag
         directory (`/t/blog`) — rather than a second, separately-boxed panel. -->
    <slot name="extra" />
  </footer>
</template>

<style scoped>
/* Reads the global --bl-* tokens (defined on :root in the layer theme). */
.bl-network {
  container-type: inline-size;
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
.net-hint { margin: 0 0 0.95rem; font-size: 0.8rem; color: var(--bl-faint); font-style: italic; }

.net-cards { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); gap: 0.6rem; text-align: left; }
@container (min-width: 30rem) {
  .net-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@container (min-width: 46rem) {
  .net-cards { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
.net-cards a {
  --pa: var(--bl-accent);
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  height: 100%;
  text-decoration: none;
  border: 1px solid var(--bl-line);
  border-radius: 10px;
  padding: 0.6rem 0.75rem;
  background: var(--bl-surface);
  transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}
.net-card-name {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-family: var(--bl-mono);
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--bl-muted);
}
.net-card-name::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--pa);
  flex: none;
}
.net-card-tagline { font-size: 0.78rem; line-height: 1.4; color: var(--bl-faint); }
.net-cards a:hover {
  border-color: var(--pa);
  transform: translateY(-1px);
  box-shadow: 0 3px 10px -4px color-mix(in srgb, var(--pa) 55%, transparent);
}
.net-cards a:hover .net-card-name { color: var(--bl-ink); }
.net-cards a:focus-visible { outline: 2px solid var(--pa); outline-offset: 2px; }
.net-cards a[aria-current='page'] { background: var(--pa); border-color: var(--pa); }
.net-cards a[aria-current='page'] .net-card-name,
.net-cards a[aria-current='page'] .net-card-tagline { color: #fff; }
.net-cards a[aria-current='page'] .net-card-name::before { background: #fff; }
</style>
