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
// A broken `slug` reference is loud, not invisible — `scripts/
// validate-content-refs.ts` plus the schema catch a bad reference at build/CI
// time, so the fallback below exists only for the rare case that slips through.
import { conditionMeta, type Grade } from '../../utils/condition'
import { digSeasonOf } from '../../utils/strata'

/** An Artifact's own words, quoted verbatim (tenant.config.ts's `inscription`). */
interface MiddenInscription {
  text: string
  source: string
}

/** The discriminated provenance union (tenant.config.ts's `provenance`), mirrored
 *  as a plain TS type — the manifest exports only the zod schema, not its inferred
 *  type. Single-homed here now: this embed is the sole consumer since the redesign
 *  folded ArtifactCard and the trench-data composable away. */
type MiddenProvenance =
  | { kind: 'pr'; number: number; merged: boolean; url?: string; continuityCheck?: string }
  | { kind: 'branch'; name: string; url?: string; continuityCheck?: string }
  | { kind: 'commit'; hash: string; path?: string; url?: string; continuityCheck?: string }
  | { kind: 'file'; path: string; url?: string; continuityCheck?: string }
  | { kind: 'dependency'; name: string; url?: string; continuityCheck?: string }
  | { kind: 'skill'; name: string; url?: string; continuityCheck?: string }

/** One raw `artifacts` Document, narrowed to the fields this find renders. The
 *  filename (`stem`) IS the slug; the schema carries no `slug` field of its own. */
interface MiddenArtifactDoc {
  stem: string
  title: string
  stratum: string
  condition: Grade
  provenance: MiddenProvenance
  catalogNote: string
  assessedAt: string
  inscription?: MiddenInscription
}

const props = defineProps<{ slug: string }>()

const { collections } = useSpace('midden')

const { data: artifact } = await useAsyncData(`midden-artifact-${props.slug}`, async () => {
  const doc = await queryCollection(collections.artifacts).where('stem', '=', props.slug).first()
  return doc ? (doc as unknown as MiddenArtifactDoc) : null
})

const isLost = computed(() => artifact.value?.condition === 'lost')
const label = computed(() => conditionMeta(artifact.value?.condition).label)
const seasonLabel = computed(() => (artifact.value ? digSeasonOf(artifact.value.stratum)?.label : undefined))

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

// Structural omission, not a rendering-empty accident (#523): the `lost` grade's
// silence is deliberate — even a document that carries an `inscription` shows none.
const inscriptionForDisplay = computed(() =>
  isLost.value ? undefined : artifact.value?.inscription,
)

// Deterministic, locale-independent date prose (no `toLocaleDateString`, whose
// SSR/client locale mismatch causes hydration errors). #526 asks only that
// `assessedAt` render as prose, never re-derive condition.
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function formatAssessedAt(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${Number(day)} ${MONTH_ABBR[Number(month) - 1]} ${year}`
}

// A kind-appropriate provenance label derived from the REAL discriminated union.
function provenanceLine(p: MiddenProvenance): string {
  switch (p.kind) {
    case 'pr':
      return `PR #${p.number} · ${p.merged ? 'merged' : 'closed'}`
    case 'branch':
      return `branch · ${p.name}`
    case 'commit':
      return `commit ${p.hash.slice(0, 7)}${p.path ? ` · ${p.path}` : ''}`
    case 'file':
      return `file · ${p.path}`
    case 'dependency':
      return `dependency · ${p.name}`
    case 'skill':
      return `Skill · ${p.name}`
    default:
      return p // exhaustive: `p` is `never` if a provenance kind is added unhandled
  }
}
</script>

<template>
  <article
    v-if="artifact"
    :id="`artifact-${slug}`"
    class="midden-find"
    :class="{ 'midden-find--lost': isLost }"
  >
    <span
      class="midden-find__stamp"
      :class="{ 'midden-find__stamp--lost': isLost }"
      :style="stampStyle"
    >{{ label }}</span>

    <header class="midden-find__head">
      <p v-if="seasonLabel" class="midden-find__season">{{ seasonLabel }}</p>

      <h3 class="mono midden-find__title">{{ artifact.title }}</h3>

      <p class="tech midden-find__prov">
        <a
          v-if="artifact.provenance.url"
          :href="artifact.provenance.url"
          target="_blank"
          rel="noopener noreferrer"
        >{{ provenanceLine(artifact.provenance) }}</a>
        <span v-else>{{ provenanceLine(artifact.provenance) }}</span>
        <span class="midden-find__dot" aria-hidden="true">·</span>
        <span class="midden-find__assessed">assessed {{ formatAssessedAt(artifact.assessedAt) }}</span>
      </p>
    </header>

    <p class="midden-find__note">{{ artifact.catalogNote }}</p>

    <blockquote v-if="inscriptionForDisplay" class="midden-find__inscription">
      <span class="midden-find__quote">&ldquo;{{ inscriptionForDisplay.text }}&rdquo;</span>
      <span class="mono midden-find__source">{{ inscriptionForDisplay.source }}</span>
    </blockquote>
    <p v-else-if="isLost" class="midden-find__silent">
      no inscription survives — nothing is left to quote.
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
