<script setup lang="ts">
// The Midden's front door (`/t/midden`, issue #515; redesign handoff, direction
// 1e "Front door"): the curator's foreword a visitor reads first. A Tenant-root
// layer route, not a Space, mirroring the Atlas front door's ROLE. v1 has one
// Space (`trench`).
//
// Purely presentational (ADR-0004): resolves the trench Space through the SAME
// shared, unit-tested `resolveSpaceRoute` the catch-all uses, only to COUNT
// finds and sites for the stats row — a same-Space read. Seasons and grades are
// structural counts, read from the single-homed utils tables (auto-imported).
//
// The foreword prose and the pull-quote below are verbatim authored copy from
// the Claude-Design session (the handoff's `foreword1`/`foreword2` and the
// "corpse" pull-quote) — not placeholder.
import { resolveSpaceRoute } from '#shared/routing'

const { data } = await useAsyncData('midden-front', async () => {
  const r = resolveSpaceRoute('midden', 'trench', undefined)
  if (!r) return { finds: 0, sites: 0 }
  const finds = await queryCollection(r.collections.artifacts).count()
  const pages = await queryCollection(r.pagesKey).all()
  // The landing page (path '/') is the trench index, not a dig-report site.
  const sites = pages.filter((p) => p.path !== '/').length
  return { finds, sites }
})

const stats = computed(() => [
  { n: data.value?.finds ?? 0, label: 'finds' },
  { n: data.value?.sites ?? 0, label: 'sites' },
  { n: DIG_SEASONS.length, label: 'seasons' },
  { n: CONDITION_ORDER.length, label: 'grades' },
])

useHead({ title: 'The Midden' })
</script>

<template>
  <main class="midden">
    <div class="midden-page midden-front">
      <p class="tech midden-crumb">
        <NuxtLink to="/">terrarium</NuxtLink><span class="sep">/</span><span class="here">the midden</span>
      </p>

      <p class="sc midden-front__eyebrow">An excavation catalogue</p>
      <h1 class="doctitle midden-front__title">The Midden</h1>

      <p class="midden-front__lede">
        Every other quarter of this place shows the platform building. The Midden
        shows what it set down and walked away from — dead branches, pull requests
        closed unmerged, dependencies carried and never called, whole files retired
        the day the build outgrew them.
      </p>
      <p class="midden-front__lede">
        Nothing is here by accident, and nothing is here in apology. A thing earns
        a place only once it is unambiguously over: not paused, not renamed, not
        merged elsewhere under a new name. We date it, we grade it for condition,
        and where anything survives to quote, we quote it.
      </p>

      <p class="sc midden-front__pull">&ldquo;You catalogue a corpse only where nothing living grew back.&rdquo;</p>

      <div class="midden-front__stats">
        <div v-for="st in stats" :key="st.label" class="midden-front__stat">
          <span class="mono midden-front__stat-n">{{ st.n }}</span>
          <span class="sc midden-front__stat-label">{{ st.label }}</span>
        </div>
      </div>

      <div class="midden-front__ladder">
        <div v-for="c in CONDITION_GRADES" :key="c.grade" class="midden-front__grade">
          <MiddenConditionGlyph :grade="c.grade" :size="24" />
          <span class="sc midden-front__grade-label">{{ c.label }}</span>
        </div>
      </div>

      <NuxtLink class="midden-front__enter" to="/t/midden/trench">
        Enter the trench <span aria-hidden="true">→</span>
      </NuxtLink>
    </div>
  </main>
</template>

<style scoped>
.midden-front {
  max-width: 44rem;
  padding-top: 3.5rem;
}

.midden-front__eyebrow {
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  color: var(--midden-accent);
}
.midden-front__title {
  margin: 0.5rem 0 0;
  font-size: clamp(3.4rem, 12vw, 4.75rem);
  line-height: 0.95;
  color: var(--midden-ink);
}

.midden-front__lede {
  margin: 1.6rem 0 0;
  font-size: 1.05rem;
  line-height: 1.62;
  max-width: 56ch;
  color: var(--midden-ink);
}

.midden-front__pull {
  margin: 1.4rem 0 0;
  font-size: 1.02rem;
  letter-spacing: 0.03em;
  font-weight: 500;
  color: var(--midden-accent-2);
}

.midden-front__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 36px;
  margin: 2.1rem 0 1.9rem;
  padding: 18px 0;
  border-top: 1px solid var(--midden-rule);
  border-bottom: 1px solid var(--midden-rule);
}
.midden-front__stat-n {
  font-size: 1.6rem;
  color: var(--midden-accent);
}
.midden-front__stat-label {
  display: block;
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  color: var(--midden-muted);
  margin-top: 2px;
}

.midden-front__ladder {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 8px;
  align-items: flex-start;
  margin-bottom: 2.1rem;
}
.midden-front__grade {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 6.75rem;
  text-align: center;
}
.midden-front__grade-label {
  font-size: 0.68rem;
  letter-spacing: 0.03em;
  color: var(--midden-muted);
  line-height: 1.15;
}

.midden-front__enter {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 1.2rem;
  font-weight: 500;
  color: var(--midden-accent);
  border-bottom: 1px solid var(--midden-accent);
  padding-bottom: 2px;
}
.midden-front__enter:hover {
  color: var(--midden-accent-2);
  border-bottom-color: var(--midden-accent-2);
}
</style>
