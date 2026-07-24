<script setup lang="ts">
// The Midden's single landing (owner-directed post-MVP simplification, this
// branch): ONE page rendered at BOTH `/t/midden` and `/t/midden/trench` — the two
// former near-duplicate landings (a front door + a trench index) merged into one
// `land → read` surface. A tight foreword, the six-grade condition legend shown
// ONCE (word + one-line definition), and a plain list of the dig reports. The
// stats row, proportional season bars, and per-site tick strips are gone.
//
// Presentation-only (ADR-0004): resolves the trench Space through the SAME shared,
// unit-tested `resolveSpaceRoute` — hardcoding ('midden','trench') rather than
// reading the route, because the front door `/t/midden` carries no `space` param.
// The read is same-Space only: this Space's own `pages`.
//
// The foreword prose and the pull-quote are verbatim authored curator copy (the
// former front-door `foreword1`/`foreword2` and the "corpse" line, itself the
// inclusion bar from CONTEXT.md) — not placeholder.
import { resolveSpaceRoute } from '#shared/routing'
import { CONDITION_GRADES } from '../../utils/condition'

const resolved = resolveSpaceRoute('midden', 'trench', undefined)

const { data } = await useAsyncData('midden-landing', async () => {
  if (!resolved) return { sites: [] }
  const pages = await queryCollection(resolved.pagesKey).all()
  // The Space-root document (path '/') is the trench's own index prose, not a
  // dig-report Site — the merged landing carries its own foreword, so it's excluded.
  return {
    sites: pages
      .filter((p) => p.path !== '/')
      .map((p, i) => ({
        num: String(i + 1).padStart(2, '0'),
        title: p.title ?? p.path.replace(/^\//, ''),
        description: p.description as string | undefined,
        href: `/t/midden/trench${p.path}`,
      })),
  }
})

const sites = computed(() => data.value?.sites ?? [])

useHead({ title: 'The Midden' })
</script>

<template>
  <main class="midden">
    <div class="midden-page midden-landing">
      <p class="tech midden-crumb">
        <NuxtLink to="/">terrarium</NuxtLink><span class="sep">/</span><span class="here">the midden</span>
      </p>

      <header class="midden-landing__head">
        <p class="sc midden-landing__eyebrow">An excavation catalogue</p>
        <h1 class="doctitle midden-landing__title">The Midden</h1>
      </header>

      <div class="midden-landing__foreword">
        <p>
          Every other quarter of this place shows the platform building. The Midden
          shows what it set down and walked away from — dead branches, pull requests
          closed unmerged, dependencies carried and never called, whole files retired
          the day the build outgrew them.
        </p>
        <p>
          Nothing is here by accident, and nothing is here in apology. A thing earns
          a place only once it is unambiguously over: not paused, not renamed, not
          merged elsewhere under a new name. We date it, we grade it for condition,
          and where anything survives to quote, we quote it.
        </p>
        <p class="sc midden-landing__pull">
          &ldquo;You catalogue a corpse only where nothing living grew back.&rdquo;
        </p>
      </div>

      <section class="midden-landing__section" aria-labelledby="midden-legend-head">
        <div class="midden-sechead">
          <span id="midden-legend-head" class="hand midden-sechead__title">The condition ladder</span>
          <span class="midden-sechead__rule" />
          <span class="mono midden-sechead__aside">curator-graded, never computed</span>
        </div>
        <dl class="midden-legend">
          <div v-for="c in CONDITION_GRADES" :key="c.grade" class="midden-legend__row">
            <dt class="sc midden-legend__term">{{ c.label }}</dt>
            <dd class="midden-legend__def">{{ c.definition }}</dd>
          </div>
        </dl>
      </section>

      <section class="midden-landing__section" aria-labelledby="midden-sites-head">
        <div class="midden-sechead">
          <span id="midden-sites-head" class="hand midden-sechead__title">The dig reports</span>
          <span class="midden-sechead__rule" />
          <span class="mono midden-sechead__aside">{{ sites.length }} sites</span>
        </div>
        <ol v-if="sites.length" class="midden-sites">
          <li v-for="site in sites" :key="site.href" class="midden-sites__item">
            <NuxtLink :to="site.href" class="midden-sites__link">
              <span class="mono midden-sites__num">{{ site.num }}</span>
              <span class="midden-sites__body">
                <span class="midden-sites__title">{{ site.title }}</span>
                <span v-if="site.description" class="midden-sites__blurb">{{ site.description }}</span>
              </span>
              <span class="midden-sites__arrow" aria-hidden="true">→</span>
            </NuxtLink>
          </li>
        </ol>
        <p v-else class="midden-empty">No sites catalogued yet.</p>
      </section>
    </div>
  </main>
</template>

<style scoped>
.midden-landing {
  max-width: 46rem;
  padding-top: 3.4rem;
}

.midden-landing__eyebrow {
  font-size: 0.8rem;
  letter-spacing: 0.16em;
  color: var(--midden-accent);
}
.midden-landing__title {
  margin: 0.45rem 0 0;
  font-size: clamp(3rem, 11vw, 4.4rem);
  line-height: 0.96;
  color: var(--midden-ink);
}

.midden-landing__foreword {
  margin-top: 1.6rem;
  max-width: 56ch;
}
.midden-landing__foreword p {
  margin: 1.05rem 0 0;
  font-size: 1.04rem;
  line-height: 1.66;
  color: var(--midden-ink);
}
.midden-landing__foreword p:first-child { margin-top: 0; }
.midden-landing__pull {
  margin-top: 1.6rem;
  padding-left: 1.1rem;
  border-left: 2px solid var(--midden-accent);
  font-size: 0.98rem;
  letter-spacing: 0.03em;
  line-height: 1.55;
  color: var(--midden-accent-2);
}

.midden-landing__section { margin-top: 0.5rem; }

/* The legend: six quiet rows, each a word + its one-line definition. Shown once. */
.midden-legend {
  margin: 0;
}
.midden-legend__row {
  display: grid;
  grid-template-columns: 9.5rem 1fr;
  gap: 0.5rem 1.1rem;
  align-items: baseline;
  padding: 0.6rem 0;
  border-top: 1px solid var(--midden-line);
}
.midden-legend__row:first-child { border-top: 0; }
.midden-legend__term {
  margin: 0;
  font-size: 0.88rem;
  letter-spacing: 0.05em;
  color: var(--midden-ink);
}
.midden-legend__def {
  margin: 0;
  font-style: italic;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--midden-muted);
}

/* The dig-report list: a plain numbered list, each row a full-width link. */
.midden-sites {
  list-style: none;
  margin: 0;
  padding: 0;
}
.midden-sites__link {
  display: grid;
  grid-template-columns: 2.2rem 1fr auto;
  gap: 0 1.1rem;
  align-items: baseline;
  padding: 0.95rem 0;
  border-top: 1px solid var(--midden-rule);
  color: inherit;
}
.midden-sites__item:last-child .midden-sites__link {
  border-bottom: 1px solid var(--midden-rule);
}
.midden-sites__num {
  color: var(--midden-faint);
  font-size: 0.78rem;
}
.midden-sites__body { min-width: 0; }
.midden-sites__title {
  display: block;
  font-size: 1.24rem;
  font-weight: 500;
  line-height: 1.25;
  color: var(--midden-accent);
}
.midden-sites__blurb {
  display: block;
  margin-top: 0.3rem;
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--midden-muted);
}
.midden-sites__arrow {
  color: var(--midden-faint);
  font-size: 1.1rem;
  transition: transform 0.15s ease, color 0.15s ease;
}
.midden-sites__link:hover .midden-sites__title { color: var(--midden-accent-2); }
.midden-sites__link:hover .midden-sites__arrow {
  color: var(--midden-accent);
  transform: translateX(3px);
}

.midden-empty {
  color: var(--midden-faint);
  font-style: italic;
}

@media (max-width: 34rem) {
  .midden-legend__row { grid-template-columns: 1fr; gap: 0.15rem; }
  .midden-sites__link { grid-template-columns: 1.8rem 1fr; }
  .midden-sites__arrow { display: none; }
}
</style>
