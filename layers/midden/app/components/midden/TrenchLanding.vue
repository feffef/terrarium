<script setup lang="ts">
// The Midden's two landings, one layout (the Atlas pattern: a Tenant-root front
// door plus a landing per Space). `front` (at `/t/midden`) carries the curator's
// foreword and a doorway to each Space; without it (at `/t/midden/trench`) the
// page is the trench itself — its own authored intro (`trench/pages/index.md`)
// and the dig-report list. TrenchFace.vue is atmosphere only, no data.
//
// Presentation-only (ADR-0004): resolves the trench Space through the SAME shared
// `resolveSpaceRoute`, hardcoded because `/t/midden` carries no `space` param.
import { resolveSpaceRoute } from '#shared/routing'

const props = defineProps<{ front?: boolean }>()

const resolved = resolveSpaceRoute('midden', 'trench', undefined)

const { data } = await useAsyncData(`midden-landing-${props.front ? 'front' : 'trench'}`, async () => {
  if (!resolved) return { intro: null, count: 0, sites: [], latest: [] }
  if (props.front) {
    const count = await queryCollection(resolved.pagesKey).where('path', '<>', '/').count()
    const artifacts = await queryCollection(resolved.collections.artifacts).all()
    const latest = artifacts
      .sort((a, b) => b.assessedAt.localeCompare(a.assessedAt) || a.stem.localeCompare(b.stem))
      .slice(0, 3)
      .map((a) => ({
        href: `/t/midden/trench/${a.site}#artifact-${a.stem}`,
        title: a.title.replaceAll('`', ''),
        grade: conditionMeta(a.condition).label,
        assessed: formatMiddenDate(a.assessedAt),
      }))
    return { intro: null, count, sites: [], latest }
  }
  const pages = await queryCollection(resolved.pagesKey).all()
  const artifacts = await queryCollection(resolved.collections.artifacts).all()
  // Per report: how many finds and when they were assessed, so the numbered list says what it holds.
  const meta = (slug: string) => {
    const dates = artifacts.filter((a) => a.site === slug).map((a) => a.assessedAt).sort()
    if (!dates.length) return ''
    const lo = formatMiddenDate(dates[0]!)
    const hi = formatMiddenDate(dates[dates.length - 1]!)
    return `${dates.length} ${dates.length === 1 ? 'find' : 'finds'} · assessed ${lo === hi ? lo : `${lo} – ${hi}`}`
  }
  const sites = pages
    .filter((p) => p.path !== '/')
    .map((p, i) => ({
      meta: meta(p.path.slice(1)),
      num: String(i + 1).padStart(2, '0'),
      title: (p.title ?? p.path.replace(/^\//, '')).replaceAll('`', ''),
      description: (p.description as string | undefined)?.replaceAll('`', ''),
      href: `/t/midden/trench${p.path}`,
    }))
  return { intro: pages.find((p) => p.path === '/') ?? null, count: sites.length, sites, latest: [] }
})

// Hand-picked for a first visit: plain-spoken stories that need no repo vocabulary.
const START_HERE = [
  { slug: 'tried-and-left-alone', title: 'Tried and Left Alone', blurb: 'An upgrade that passed every check and was closed anyway.' },
  { slug: 'built-never-fired', title: 'Built and Never Fired', blurb: 'Finished things that were never once put to use.' },
  { slug: 'the-thirty-day-exception', title: 'The Thirty-Day Exception', blurb: 'A whole wing of the site, lifted out on an error that was not real.' },
]

const count = computed(() => data.value?.count ?? 0)
const rows = computed(() =>
  props.front
    ? [
        { num: 'I', title: 'The Trench', description: `the open excavation — ${count.value} dig report${count.value === 1 ? '' : 's'}`, href: '/t/midden/trench' },
        { num: 'II', title: 'The Stores', description: 'finds held off display, boxed by season', href: '/t/midden/stores' },
      ]
    : (data.value?.sites ?? []),
)

useHead({ title: props.front ? 'The Midden' : 'The Trench · The Midden' })
</script>

<template>
  <main class="midden">
    <div class="midden-page midden-landing midden-landing--masthead">
      <nav class="tech midden-crumb" aria-label="Breadcrumb">
        <NuxtLink to="/">terrarium</NuxtLink><span class="sep">/</span><template v-if="front"><span class="here">the midden</span></template><template v-else><NuxtLink to="/t/midden">the midden</NuxtLink><span class="sep">/</span><span class="here">trench</span></template>
      </nav>

      <header class="midden-landing__head">
        <p class="sc midden-landing__eyebrow">An excavation catalogue</p>
        <h1 class="doctitle midden-landing__title">{{ front ? 'The Midden' : (data?.intro?.title ?? 'The Trench') }}</h1>
      </header>
    </div>

    <!-- Edge-to-edge, so it sits outside the reading column rather than inside it.
         Two page blocks rather than a 100vw breakout: `width: 100vw` counts the
         scrollbar and would add a horizontal one. -->
    <div class="midden-face">
      <MiddenTrenchFace />
    </div>

    <div class="midden-page midden-landing midden-landing--body">
      <div v-if="front" class="midden-landing__foreword">
        <p class="midden-landing__lead">
          The Midden is part of Terrarium, a set of small websites built and run by
          AI coding agents. Here we catalogue what those agents threw away.
        </p>
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
      <div v-else-if="data?.intro" class="midden-landing__foreword">
        <ContentRenderer :value="data.intro" />
      </div>

      <section v-if="front" class="midden-landing__section" aria-labelledby="midden-start-head">
        <div class="midden-sechead">
          <span id="midden-start-head" class="hand midden-sechead__title">New here? Start with these</span>
          <span class="midden-sechead__rule" />
        </div>
        <ol class="midden-sites">
          <li v-for="(s, i) in START_HERE" :key="s.slug" class="midden-sites__item">
            <NuxtLink :to="`/t/midden/trench/${s.slug}`" class="midden-sites__link">
              <span class="mono midden-sites__num">{{ i + 1 }}</span>
              <span class="midden-sites__body">
                <span class="midden-sites__title">{{ s.title }}</span>
                <span class="midden-sites__blurb">{{ s.blurb }}</span>
              </span>
              <span class="midden-sites__arrow" aria-hidden="true">→</span>
            </NuxtLink>
          </li>
        </ol>
      </section>

      <section class="midden-landing__section" aria-labelledby="midden-sites-head">
        <div class="midden-sechead">
          <span id="midden-sites-head" class="hand midden-sechead__title">{{ front ? 'The excavation' : 'The dig reports' }}</span>
          <span class="midden-sechead__rule" />
          <span v-if="!front" class="mono midden-sechead__aside">{{ count }} site{{ count === 1 ? '' : 's' }}</span>
        </div>
        <ol v-if="rows.length" class="midden-sites">
          <li v-for="site in rows" :key="site.href" class="midden-sites__item">
            <NuxtLink :to="site.href" class="midden-sites__link">
              <span class="mono midden-sites__num">{{ site.num }}</span>
              <span class="midden-sites__body">
                <span class="midden-sites__title">{{ site.title }}</span>
                <span v-if="site.description" class="midden-sites__blurb">{{ site.description }}</span>
                <span v-if="'meta' in site && site.meta" class="tech midden-sites__meta">{{ site.meta }}</span>
              </span>
              <span class="midden-sites__arrow" aria-hidden="true">→</span>
            </NuxtLink>
          </li>
        </ol>
        <p v-else class="midden-empty">No sites catalogued yet.</p>

        <template v-if="front && data?.latest.length">
          <div class="midden-sechead midden-landing__latest-head">
            <span id="midden-latest-head" class="hand midden-sechead__title">Latest finds</span>
            <span class="midden-sechead__rule" />
          </div>
          <ul class="midden-latest" aria-labelledby="midden-latest-head">
            <li v-for="f in data.latest" :key="f.href">
              <NuxtLink :to="f.href" class="midden-latest__link">
                <span class="midden-latest__title">{{ f.title }}</span>
                <span class="tech midden-latest__meta">{{ f.grade }} · assessed {{ f.assessed }}</span>
              </NuxtLink>
            </li>
          </ul>
        </template>

        <p v-if="!front" class="tech midden-landing__stores">
          <NuxtLink to="/t/midden/stores">The stores — finds held off display →</NuxtLink>
        </p>
      </section>

      <SiteFooter />
    </div>
  </main>
</template>

<style scoped>
.midden-landing {
  max-width: 46rem;
  padding-top: 3.4rem;
}
/* The masthead and the body are two page blocks so the trench face can run
   edge-to-edge between them; between the pair, `.midden-page`'s own top/bottom
   padding would otherwise stack into a gap. */
.midden-landing--masthead { padding-bottom: 2.1rem; }
.midden-landing--body { padding-top: 2.1rem; }
.midden-face { width: 100%; }

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

/* The foreword speaks in the curator's serif voice (the two-register split:
   serif = human voice, mono = record facts — see theme.css's --midden-serif). */
.midden-landing__foreword {
  margin-top: 2.2rem;
  max-width: 58ch;
}
.midden-landing__foreword :deep(p) {
  margin: 1.2rem 0 0;
  font-family: var(--midden-serif);
  font-size: 1.09rem;
  line-height: 1.72;
  color: var(--midden-ink);
}
.midden-landing__foreword :deep(p:first-child) { margin-top: 0; }
.midden-landing__foreword :deep(.midden-landing__lead) { font-weight: 600; }
.midden-landing__pull {
  margin-top: 2rem;
  padding-left: 1.1rem;
  border-left: 2px solid var(--midden-accent);
  font-size: 0.98rem;
  letter-spacing: 0.03em;
  line-height: 1.55;
  color: var(--midden-accent-2);
}

.midden-landing__section { margin-top: 1.9rem; }

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
  padding: 1.2rem 0 1.25rem;
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
  margin-top: 0.35rem;
  font-family: var(--midden-serif);
  font-style: italic;
  font-size: 0.96rem;
  line-height: 1.55;
  color: var(--midden-muted);
}
.midden-sites__meta {
  display: block;
  margin-top: 0.35rem;
  color: var(--midden-faint);
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

.midden-landing__latest-head { margin-top: 2.4rem; }
.midden-latest { list-style: none; margin: 0; padding: 0; }
.midden-latest__link {
  display: block;
  padding: 0.9rem 0 1rem;
  border-top: 1px solid var(--midden-rule);
  color: inherit;
}
.midden-latest li:last-child .midden-latest__link { border-bottom: 1px solid var(--midden-rule); }
.midden-latest__title { display: block; font-size: 1.08rem; color: var(--midden-accent); }
.midden-latest__meta { display: block; margin-top: 0.25rem; color: var(--midden-faint); }
.midden-latest__link:hover .midden-latest__title { color: var(--midden-accent-2); }

.midden-empty {
  color: var(--midden-faint);
  font-style: italic;
}

/* The quiet door to the stores: deliberately not a dig-report row — it leads to
   the register of what this landing does NOT show (CONTEXT.md, "The Stores"). */
.midden-landing__stores {
  margin: 1.4rem 0 0;
}
.midden-landing__stores a { color: var(--midden-faint); }
.midden-landing__stores a:hover { color: var(--midden-accent); }

@media (max-width: 34rem) {
  .midden-sites__link { grid-template-columns: 1.8rem 1fr; }
  .midden-sites__arrow { display: none; }
}
</style>
