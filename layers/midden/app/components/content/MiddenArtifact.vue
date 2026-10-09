<script setup lang="ts">
// `::midden-artifact{slug="..."}` (#521): the MDC embed rendering one catalogued
// Artifact inline inside a Site's dig-report body. Lives in `components/content/`,
// unprefixed, so Nuxt Content's kebab-case tag resolution maps `::midden-artifact`
// to this exact component name — mirrors layers/atlas/app/components/content/
// Sighting.vue's placement and the same reasoning.
//
// Post-MVP simplification (owner-directed, this branch): a find now renders OPEN
// and FLAT — no accordion, no hover-to-decode glyph. The former
// ArtifactCard + this embed are one component now (see CONTEXT.md's Condition
// term). Condition reads as its WORD, shown as a slug-angled corner STAMP
// (owner-restored); the whole entry (note + inscription) is
// visible on load. `land → read`, nothing to click.
//
// Same-Space read only (ADR-0004/0006): resolves the CURRENT route's Space through
// `useSpace('midden')` to read this Space's own `artifacts` collection key, so an
// embed inside one Site's body can never reach across Spaces.
//
// A broken `slug` reference isn't caught at build/CI time (issue #740) — the
// `v-else` fallback below is load-bearing, not a rare-case backstop.
const props = defineProps<{ slug: string }>()

// The dig report's page-wide first-use split for this find's note (issue #1463).
const glossedNotes = inject<Ref<Record<string, MiddenGlossPart[]>>>(MIDDEN_GLOSSED_NOTES)
const noteParts = computed(() => glossedNotes?.value[props.slug])

const { collections } = useSpace('midden')

const { data: artifact } = await useAsyncData(`midden-artifact-${props.slug}`, () =>
  queryCollection(collections.artifacts).where('stem', '=', props.slug).first(),
)

// Condition restored as a slug-angled corner STAMP (earlier revisions had it; owner
// asked for it back). The tilt is derived from the slug so it is SSR-stable —
// Math.random()/Date would hydrate-mismatch — reading like a specimen physically
// stamped with its grade. It is the sole place the condition word now appears; the
// dig-report Condition Key sidebar carries the definitions.
const STAMP_ANGLES = [-8, 6, -5, 7, -4, 5]
const stampStyle = computed(() => {
  let h = 0
  for (const ch of props.slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return `transform: rotate(${STAMP_ANGLES[h % STAMP_ANGLES.length]}deg);`
})
</script>

<template>
  <article
    v-if="artifact"
    :id="`artifact-${slug}`"
    class="midden-find"
    :class="{ 'midden-find--lost': artifact.condition === 'lost' }"
  >
    <span
      class="midden-find__stamp"
      :class="{ 'midden-find__stamp--lost': artifact.condition === 'lost' }"
      :style="stampStyle"
    >{{ conditionMeta(artifact.condition).label }}</span>

    <header class="midden-find__head">
      <p v-if="digSeasonOf(artifact.stratum)" class="midden-find__season">{{ digSeasonOf(artifact.stratum)?.label }}</p>

      <h3 class="mono midden-find__title"><MiddenTicks :text="artifact.title" /></h3>

      <p class="tech midden-find__prov">
        <a
          v-if="artifact.provenance.url"
          :href="artifact.provenance.url"
          target="_blank"
          rel="noopener noreferrer"
        >{{ middenProvenanceLine(artifact.provenance) }}</a>
        <span v-else>{{ middenProvenanceLine(artifact.provenance) }}</span>
        <template v-if="artifact.removedIn">
          <span class="midden-find__dot" aria-hidden="true">·</span>
          <a :href="`${REPO_URL}/commit/${artifact.removedIn}`" target="_blank" rel="noopener noreferrer">removed in {{ artifact.removedIn.slice(0, 7) }}</a>
        </template>
        <span class="midden-find__dot" aria-hidden="true">·</span>
        <span class="midden-find__assessed">assessed {{ formatMiddenDate(artifact.assessedAt) }}</span>
      </p>
    </header>

    <p class="midden-find__note"><MiddenGlossedText :text="artifact.catalogNote" :parts="noteParts" /></p>

    <!-- The `lost` grade's silence is deliberate (#523): even a document carrying an
         `inscription` or `remains` shows none. -->
    <blockquote v-if="artifact.condition !== 'lost' && artifact.inscription" class="midden-find__inscription">
      <span class="midden-find__quote">&ldquo;{{ artifact.inscription.text }}&rdquo;</span>
      <span class="mono midden-find__source">{{ artifact.inscription.source }}</span>
    </blockquote>
    <p v-else-if="artifact.condition === 'lost'" class="midden-find__silent">
      no inscription survives — nothing is left to quote.
    </p>

    <p v-if="artifact.condition !== 'lost' && artifact.remains?.length" class="tech midden-find__remains">
      <span class="midden-find__remains-label">remains</span>
      <a
        v-for="remain in artifact.remains"
        :key="remain.url"
        :href="remain.url"
        target="_blank"
        rel="noopener noreferrer"
      >{{ remain.label }}</a>
    </p>
  </article>

  <p v-else class="midden-artifact-missing">
    Artifact not found: <code>{{ slug }}</code>
  </p>
</template>

<style scoped>
/* One find, rendered open and flat: a slip of lighter find-tray paper with a
   terracotta hinge down its left edge and the condition word as its masthead.
   No full box, no shadow — the tint alone lifts it off the parchment, so a
   column of finds reads as a stack of specimen slips rather than boxed forms. */
.midden-find {
  position: relative;
  margin: 2.8rem 0;
  padding: 1.35rem 1.6rem 1.5rem;
  border-left: 3px solid var(--midden-accent);
  background: var(--midden-paper-2);
}
.midden-find--lost {
  border-left-color: var(--midden-faint);
  background: transparent;
  padding-left: 1.3rem;
  border-left-style: dashed;
}

/* The head (season eyebrow + title + provenance) reserves right space so it never
   runs under the corner stamp; the note/inscription below flow full width. */
.midden-find__head {
  padding-right: 9.5rem;
}

.midden-find__season {
  margin: 0;
  font-family: var(--midden-mono);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: var(--midden-faint);
}

/* The condition, restored as a slug-angled corner stamp — a specimen physically
   stamped with its grade. Rotation comes from the inline :style (slug-deterministic,
   SSR-stable). It is the sole condition display; the sidebar carries definitions. */
.midden-find__stamp {
  position: absolute;
  top: 1.15rem;
  right: 1.4rem;
  font-family: var(--midden-typewriter);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.8rem;
  line-height: 1;
  color: var(--midden-accent);
  border: 2.5px solid var(--midden-accent);
  border-radius: 5px;
  padding: 6px 10px 4px;
  opacity: 0.82;
  mix-blend-mode: multiply;
  white-space: nowrap;
  pointer-events: none;
}
@media (prefers-color-scheme: dark) {
  /* multiply darkens against a dark ground — screen keeps the ink legible. */
  .midden-find__stamp { mix-blend-mode: screen; opacity: 0.9; }
}
.midden-find__stamp--lost {
  color: var(--midden-faint);
  border-color: var(--midden-faint);
  opacity: 0.7;
}

/* On a narrow column the corner stamp would collide with the title — let it fall
   inline above the head instead, upright. */
@media (max-width: 38rem) {
  .midden-find__head { padding-right: 0; }
  .midden-find__stamp {
    position: static;
    display: inline-block;
    transform: none !important;
    margin-bottom: 0.75rem;
    mix-blend-mode: normal;
  }
}

.midden-find__title {
  margin: 0.35rem 0 0;
  font-size: 1.14rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--midden-ink);
}

.midden-find__prov {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.4rem;
  margin: 0.5rem 0 0;
  color: var(--midden-faint);
  /* A record fact is one unbreakable token (a file name, a branch); on a narrow
     column it must wrap inside itself rather than widen the slip. */
  overflow-wrap: anywhere;
}
.midden-find__prov a {
  color: var(--midden-muted);
  border-bottom: 1px solid var(--midden-rule);
}
.midden-find__prov a:hover {
  color: var(--midden-accent);
  border-bottom-color: currentColor;
}
.midden-find__dot { opacity: 0.5; }

/* The catalog note is the curator speaking — serif, against the mono facts
   above it (theme.css's two-register split). */
.midden-find__note {
  margin: 0.95rem 0 0;
  font-family: var(--midden-serif);
  font-size: 1.03rem;
  line-height: 1.68;
  color: var(--midden-ink);
}

.midden-find__inscription {
  margin: 0.95rem 0 0;
  padding: 0.15rem 0 0.15rem 0.9rem;
  border-left: 2px solid var(--midden-line);
  font-family: var(--midden-mono);
  font-style: italic;
  font-size: 0.9rem;
  line-height: 1.55;
  color: var(--midden-muted);
}
.midden-find__quote { display: block; }
.midden-find__source {
  display: block;
  overflow-wrap: anywhere;
  margin-top: 0.5rem;
  font-style: normal;
  font-size: 0.7rem;
  letter-spacing: 0.01em;
  color: var(--midden-faint);
}

.midden-find__silent {
  margin: 0.9rem 0 0;
  font-family: var(--midden-serif);
  font-style: italic;
  font-size: 0.95rem;
  color: var(--midden-faint);
}

/* The remains row: labelled SHA-pinned links to the artifact's preserved
   original state, trailing the entry in the record's mono register. */
.midden-find__remains {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem 0.9rem;
  margin: 0.9rem 0 0;
  color: var(--midden-faint);
}
.midden-find__remains a, .midden-find__prov a { overflow-wrap: anywhere; }
.midden-find a[target='_blank']::after { content: '\00a0\2197'; content: '\00a0\2197' / ''; }
.midden-find__remains-label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.68rem;
}
.midden-find__remains a {
  color: var(--midden-muted);
  border-bottom: 1px solid var(--midden-rule);
}
.midden-find__remains a:hover {
  color: var(--midden-accent);
  border-bottom-color: currentColor;
}

.midden-artifact-missing {
  padding: 0.7rem 0.9rem;
  margin: 0.9rem 0;
  background: var(--midden-accent-soft);
  border: 1px dashed var(--midden-accent);
  color: var(--midden-muted);
  font-family: var(--midden-mono);
  font-size: 0.85rem;
}
</style>
