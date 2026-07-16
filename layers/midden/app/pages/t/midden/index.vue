<script setup lang="ts">
// The Midden's front door (`/t/midden`, issue #515): the curator's foreword —
// a Tenant-root layer route, not a Space, mirroring the Atlas front door's
// ROLE (layers/atlas/app/pages/t/atlas/index.vue), not its content or its
// per-Space "wings" directory. v1 has exactly one Space (`trench`), so this
// page stays a small foreword + a single link in — no `BIOMES`-style
// per-Space metadata array; that's overkill for one Space.
//
// Purely presentational (ADR-0004): resolves the trench Space through the
// SAME shared, unit-tested `resolveSpaceRoute` the catch-all uses, only to
// count artifacts for the colophon — a same-Space read, same as the Atlas
// front door's per-wing count.
import { resolveSpaceRoute } from '#shared/routing'

const { data } = await useAsyncData('midden-front', async () => {
  const r = resolveSpaceRoute('midden', 'trench', undefined)
  if (!r) return { artifactCount: 0 }
  const artifactCount = await queryCollection(r.collections.artifacts).count()
  return { artifactCount }
})

const artifactCount = computed(() => data.value?.artifactCount ?? 0)

useHead({ title: 'The Midden' })
</script>

<template>
  <main class="midden">
    <div class="midden-page">
      <p class="midden-crumb">
        <NuxtLink to="/">terrarium</NuxtLink><span class="sep">·</span><span class="here">the midden</span>
      </p>

      <header class="midden-cover">
        <p class="midden-eyebrow">A curator's notebook</p>
        <h1 class="midden-cover-title">The Midden</h1>

        <div class="midden-foreword">
          <p>
            Every other Tenant here shows the Platform building. This one shows it
            discarding — deliberately, not as an embarrassment. What follows is a
            trench cut down through the Platform's own spoil heap: dead branches,
            closed-unmerged pull requests, deprecated Skills, removed files and
            dependencies, proposals that never landed.
          </p>
          <p>
            A thing earns a place here only once it is unambiguously over — not
            paused, not renamed, not merged elsewhere under a new name. We date
            what we find, grade its condition, and quote it where anything
            survives to quote: the same seriousness a real dig gives a broken
            pot. Read what follows as evidence of iteration, not failure.
          </p>
        </div>

        <NuxtLink class="midden-enter" to="/t/midden/trench">Into the trench →</NuxtLink>
      </header>

      <footer class="midden-colophon">
        <p>{{ artifactCount }} artifact{{ artifactCount === 1 ? '' : 's' }} catalogued</p>
      </footer>
    </div>
  </main>
</template>

<style scoped>
.midden-cover {
  max-width: 34rem;
  margin: 3rem auto 3.5rem;
  text-align: center;
}

.midden-cover-title {
  font-family: var(--midden-display);
  font-size: clamp(2.4rem, 7vw, 3.6rem);
  line-height: 1.02;
  letter-spacing: -0.01em;
  margin: 0.6rem 0 1.4rem;
  color: var(--midden-ink);
  text-wrap: balance;
}

.midden-foreword {
  text-align: left;
  color: var(--midden-muted);
  font-size: 1.02rem;
}
.midden-foreword p {
  margin: 0 0 1rem;
}
.midden-foreword p:last-child {
  margin-bottom: 0;
}

.midden-enter {
  display: inline-block;
  margin-top: 1.8rem;
  font-family: var(--midden-label);
  font-variant: small-caps;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--midden-accent);
  text-decoration: none;
  border-bottom: 1px solid transparent;
}
.midden-enter:hover {
  border-bottom-color: currentColor;
}

.midden-colophon {
  text-align: center;
  font-family: var(--midden-data);
  font-size: 0.72rem;
  color: var(--midden-faint);
}
.midden-colophon p {
  margin: 0;
}
</style>
