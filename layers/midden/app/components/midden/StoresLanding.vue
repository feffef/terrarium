<script setup lang="ts">
// The stores landing (`/t/midden/stores`): every find held off display, in full,
// grouped by dig season. See CONTEXT.md's "The Stores" term for why this Space
// exists and what distinguishes a stored find from a trench one.
//
// The register deliberately does NOT reuse MiddenArtifact.vue. That component is
// the *display* slip — hinge, corner stamp, generous type — and a slip is how the
// trench says a find is worth your attention. Stored finds are demoted for
// significance, not for quality, so the record travels whole (every authored
// field renders here) while the presentation is quieter. Same facts, less voice.
//
// Presentation-only (ADR-0004): resolves through the SAME shared, unit-tested
// `resolveSpaceRoute` as TrenchLanding, hardcoding ('midden','stores') because
// this component is mounted from a space-index route that already fixed the Space.
// The read is same-Space only — this Space's own `artifacts`.
import { resolveSpaceRoute } from '#shared/routing'
import { CONDITION_ORDER, conditionMeta, type Grade } from '../../utils/condition'
import { formatMiddenDate, middenProvenanceLine, type MiddenArtifactDoc } from '../../utils/find'
import { DIG_SEASONS } from '../../utils/strata'

const resolved = resolveSpaceRoute('midden', 'stores', undefined)

const { data } = await useAsyncData('midden-stores', async () => {
  if (!resolved) return { finds: [] as MiddenArtifactDoc[] }
  const finds = await queryCollection(resolved.collections.artifacts).all()
  return { finds: finds as unknown as MiddenArtifactDoc[] }
})

const finds = computed(() => data.value?.finds ?? [])

// Grouped by dig season in the canonical oldest-first order (strata.ts), which is
// the axis that replaces the trench's curator-narrated Site: a stored find has no
// report to belong to, but it always has a season. Within a season, oldest
// assessment first, then title — a stable shelf order, not a ranking.
const shelves = computed(() =>
  DIG_SEASONS.map((season) => ({
    season,
    finds: finds.value
      .filter((f) => f.stratum === season.slug)
      .sort((a, b) => a.assessedAt.localeCompare(b.assessedAt) || a.title.localeCompare(b.title)),
  })).filter((shelf) => shelf.finds.length > 0),
)

const presentGrades = computed<Grade[]>(() => {
  const present = new Set(finds.value.map((f) => f.condition))
  return CONDITION_ORDER.filter((g) => present.has(g))
})

const seasonCount = computed(() => shelves.value.length)

useHead({ title: 'The Stores · The Midden' })
</script>

<template>
  <main class="midden midden--stores">
    <div class="midden-page midden-stores">
      <header class="midden-stores__head">
        <p class="tech midden-crumb">
          <NuxtLink to="/t/midden">the midden</NuxtLink><span class="sep">/</span><span class="here">the stores</span>
        </p>

        <p class="sc midden-eyebrow">An excavation catalogue — storage</p>
        <h1 class="doctitle midden-stores__title">The Stores</h1>

        <div v-if="finds.length" class="tech midden-stores__meta">
          <span>{{ finds.length }} finds in store</span><span class="midden-stores__dot">·</span>
          <span>{{ seasonCount }} {{ seasonCount === 1 ? 'season' : 'seasons' }}</span>
        </div>
      </header>

      <div class="midden-stores__foreword">
        <p>
          Most of what a dig recovers never goes on display. These finds passed the
          same bar as everything in the trench — each is truly over, each is dated
          and graded — but a catalogue that shows everything shows nothing. So they
          are held back here: not narrated, not ranked, and not abridged.
        </p>
        <p>
          Nothing has been taken out of a record to put it in this room. Every find
          below carries the whole card it was written with, boxed by the season it
          came from. What it no longer has is a dig report arguing for it.
        </p>
        <p class="sc midden-stores__pull">
          &ldquo;The record does not shrink to fit the display.&rdquo;
        </p>
      </div>

      <MiddenConditionKey v-if="presentGrades.length" :grades="presentGrades" class="midden-stores__key" />

      <div class="midden-stores__register">
        <section
          v-for="shelf in shelves"
          :key="shelf.season.slug"
          class="midden-stores__shelf"
          :aria-labelledby="`shelf-${shelf.season.slug}`"
        >
          <div class="midden-sechead">
            <span :id="`shelf-${shelf.season.slug}`" class="hand midden-sechead__title">{{ shelf.season.label }}</span>
            <span class="midden-sechead__rule" />
            <span class="mono midden-sechead__aside">{{ shelf.finds.length }} {{ shelf.finds.length === 1 ? 'find' : 'finds' }}</span>
          </div>

          <article
            v-for="find in shelf.finds"
            :id="`artifact-${find.stem}`"
            :key="find.stem"
            class="midden-entry"
            :class="{ 'midden-entry--lost': find.condition === 'lost' }"
          >
            <p class="tech midden-entry__facts">
              <span class="sc midden-entry__grade">{{ conditionMeta(find.condition).label }}</span>
              <span class="midden-entry__dot" aria-hidden="true">·</span>
              <a
                v-if="find.provenance.url"
                :href="find.provenance.url"
                target="_blank"
                rel="noopener noreferrer"
              >{{ middenProvenanceLine(find.provenance) }}</a>
              <span v-else>{{ middenProvenanceLine(find.provenance) }}</span>
              <template v-if="find.removedIn">
                <span class="midden-entry__dot" aria-hidden="true">·</span>
                <a
                  :href="`${REPO_URL}/commit/${find.removedIn}`"
                  target="_blank"
                  rel="noopener noreferrer"
                >removed in {{ find.removedIn.slice(0, 7) }}</a>
              </template>
              <span class="midden-entry__dot" aria-hidden="true">·</span>
              <span>assessed {{ formatMiddenDate(find.assessedAt) }}</span>
            </p>

            <h3 class="mono midden-entry__title">{{ find.title }}</h3>

            <p class="midden-entry__note">{{ find.catalogNote }}</p>

            <blockquote v-if="find.condition !== 'lost' && find.inscription" class="midden-entry__inscription">
              <span class="midden-entry__quote">&ldquo;{{ find.inscription.text }}&rdquo;</span>
              <span class="mono midden-entry__source">{{ find.inscription.source }}</span>
            </blockquote>

            <p v-if="find.condition !== 'lost' && find.remains?.length" class="tech midden-entry__remains">
              <span class="midden-entry__remains-label">remains</span>
              <a
                v-for="remain in find.remains"
                :key="remain.url"
                :href="remain.url"
                target="_blank"
                rel="noopener noreferrer"
              >{{ remain.label }}</a>
            </p>
          </article>
        </section>

        <p v-if="!finds.length" class="midden-empty">Nothing is held in store.</p>
      </div>

      <p class="midden-stores__back">
        <NuxtLink to="/t/midden/trench">← the trench</NuxtLink>
      </p>
    </div>
  </main>
</template>

<style scoped>
/* Two columns, mirroring the dig report's shape so the two Spaces read as one
   institution: the register plus the sticky condition key in the same margin. */
.midden-stores {
  display: grid;
  grid-template-columns: minmax(0, 44rem) 13.5rem;
  grid-template-rows: auto auto auto;
  column-gap: 3.4rem;
  justify-content: center;
  max-width: 64rem;
  padding-top: 2.4rem;
}
.midden-stores__head,
.midden-stores__foreword,
.midden-stores__register,
.midden-stores__back { grid-column: 1; }
.midden-stores__key {
  grid-column: 2;
  grid-row: 3;
  align-self: start;
  position: sticky;
  top: 2.2rem;
}

@media (max-width: 44rem) {
  .midden-stores { display: block; }
  .midden-stores__key {
    position: static;
    margin: 2rem 0 0;
    padding-bottom: 1rem;
    border-bottom: 2px solid var(--midden-rule);
  }
}

.midden-stores__title {
  margin: 0.35rem 0 0;
  font-size: clamp(2.4rem, 7vw, 3.2rem);
  line-height: 1.05;
  color: var(--midden-ink);
}

.midden-stores__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  margin: 1rem 0 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--midden-rule);
  color: var(--midden-faint);
}
.midden-stores__dot { opacity: 0.55; }

.midden-stores__foreword {
  margin-top: 1.6rem;
  max-width: 58ch;
}
.midden-stores__foreword p {
  margin: 1.1rem 0 0;
  font-family: var(--midden-serif);
  font-size: 1.05rem;
  line-height: 1.7;
  color: var(--midden-ink);
}
.midden-stores__foreword p:first-child { margin-top: 0; }
.midden-stores__pull {
  margin-top: 1.7rem;
  padding-left: 1.1rem;
  border-left: 2px solid var(--midden-accent);
  font-size: 0.95rem;
  letter-spacing: 0.03em;
  line-height: 1.55;
  color: var(--midden-accent-2);
}

.midden-stores__register { margin-top: 2.4rem; }
.midden-stores__shelf + .midden-stores__shelf { margin-top: 2.9rem; }

/* A register entry, not a specimen slip: no hinge, no tint, no corner stamp —
   the grade leads the fact line as a word instead. Roughly 60% of a trench
   find's visual mass, carrying exactly the same fields (see this file's header). */
.midden-entry {
  padding: 1.15rem 0 0;
  border-top: 1px solid var(--midden-line);
  margin-top: 1.15rem;
}
.midden-entry:first-of-type {
  border-top: none;
  margin-top: 0.5rem;
}
.midden-entry--lost .midden-entry__title { color: var(--midden-muted); }

.midden-entry__facts {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.4rem;
  margin: 0;
  color: var(--midden-faint);
}
.midden-entry__facts a {
  color: var(--midden-muted);
  border-bottom: 1px solid var(--midden-rule);
}
.midden-entry__facts a:hover {
  color: var(--midden-accent);
  border-bottom-color: currentColor;
}
.midden-entry__dot { opacity: 0.5; }
.midden-entry__grade {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--midden-accent);
}

.midden-entry__title {
  margin: 0.4rem 0 0;
  font-size: 1.02rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--midden-ink);
}

.midden-entry__note {
  margin: 0.6rem 0 0;
  font-family: var(--midden-serif);
  font-size: 0.97rem;
  line-height: 1.62;
  color: var(--midden-ink);
}

.midden-entry__inscription {
  margin: 0.7rem 0 0;
  padding: 0.1rem 0 0.1rem 0.85rem;
  border-left: 2px solid var(--midden-line);
  font-family: var(--midden-mono);
  font-style: italic;
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--midden-muted);
}
.midden-entry__quote { display: block; }
.midden-entry__source {
  display: block;
  margin-top: 0.4rem;
  font-style: normal;
  font-size: 0.68rem;
  color: var(--midden-faint);
}

.midden-entry__remains {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.3rem 0.85rem;
  margin: 0.65rem 0 0;
  color: var(--midden-faint);
}
.midden-entry__remains-label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.66rem;
}
.midden-entry__remains a {
  color: var(--midden-muted);
  border-bottom: 1px solid var(--midden-rule);
}
.midden-entry__remains a:hover {
  color: var(--midden-accent);
  border-bottom-color: currentColor;
}

.midden-stores__back {
  margin-top: 3rem;
  padding-top: 1.2rem;
  border-top: 1px solid var(--midden-rule);
  font-family: var(--midden-mono);
  font-size: 0.82rem;
}
.midden-stores__back a { color: var(--midden-muted); }
.midden-stores__back a:hover { color: var(--midden-accent); }

.midden-empty {
  color: var(--midden-faint);
  font-style: italic;
}
</style>
