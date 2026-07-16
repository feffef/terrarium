<script setup lang="ts">
// The artifact card (#521's card anatomy, #523's gravestone `lost` variant):
// one catalogued Artifact's visual presentation. Presentational only — no
// data fetching; the `::midden-artifact` MDC embed (components/content/
// MiddenArtifact.vue) hands this an already-loaded MiddenArtifactView.
//
// Root element carries `id="artifact-<slug>"` + `data-stratum="<stratum>"` —
// load-bearing: StratigraphySidebar.vue's IntersectionObserver targets every
// `[data-stratum]` element on the page and its band anchors are literally
// `#artifact-<slug>`, so both attributes stay on THIS component's outermost
// rendered element, never an inner wrapper.
//
// Two-tier interaction (#523): MiddenConditionTooltip already supplies Tier-1
// (always-visible glyph+label, fixed definition on hover/focus) — this card
// doesn't duplicate that. Tier-2 (the artifact-SPECIFIC rationale) is
// MiddenConditionPopover, driven by this card's own `open` state so the WHOLE
// card is the click target ("not nested inside the glyph specifically"); the
// provenance link stops propagation so following it doesn't also toggle the
// popover.
//
// The `lost` gravestone variant (#523, unanimous): same card footprint as
// every other grade (no list reflow) with a distinct headstone frame, and the
// inscription slot structurally omitted regardless of the artifact's own
// data — `:inscription="undefined"` goes to the popover even when the
// document carries one, because the gravestone's silence is deliberate, not a
// rendering-empty accident.
import type { MiddenArtifactView } from '../../composables/useMiddenTrenchData'

const props = defineProps<{ artifact: MiddenArtifactView }>()

const open = ref(false)

function toggle() {
  open.value = !open.value
}

const isLost = computed(() => props.artifact.condition === 'lost')

// Structural omission, not a rendering-empty accident (#523) — the gravestone
// never passes its own `inscription` on to the popover, whatever the document says.
const inscriptionForPopover = computed(() => (isLost.value ? undefined : props.artifact.inscription))

// Deterministic, locale-independent date prose (no `toLocaleDateString` — SSR/
// client locale mismatch causes hydration errors). Pattern-matches
// StrataLegend.vue's local `formatDate`/`MONTH_ABBR` helper without importing
// it cross-component (that helper is presentational and small; #526 asks only
// that `assessedAt` render as prose beside the grade, never re-derive condition
// from it).
const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
function formatAssessedAt(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${Number(day)} ${MONTH_ABBR[Number(month) - 1]} ${year}`
}

// Turns the provenance discriminated union into a human label per `kind`.
function provenanceLabel(p: MiddenArtifactView['provenance']): string {
  switch (p.kind) {
    case 'pr':
      return `PR #${p.number} (${p.merged ? 'merged' : 'closed, unmerged'})`
    case 'branch':
      return `branch ${p.name}`
    case 'commit':
      return `commit ${p.hash.slice(0, 7)}${p.path ? ` ${p.path}` : ''}`
    case 'file':
      return p.path
    case 'dependency':
      return `dependency ${p.name}`
    case 'skill':
      return `Skill "${p.name}"`
    default:
      return p // exhaustive: `p` is `never` here if a provenance kind is ever added unhandled
  }
}

// Following the provenance link must not also toggle the card's popover.
function onProvenanceClick(event: MouseEvent) {
  event.stopPropagation()
}
</script>

<template>
  <article
    :id="`artifact-${artifact.slug}`"
    class="midden-artifact-card"
    :class="{ 'midden-artifact-card--lost': isLost }"
    :data-stratum="artifact.stratum"
    role="button"
    tabindex="0"
    :aria-expanded="open"
    @click="toggle"
    @keydown.enter="toggle"
    @keydown.space.prevent="toggle"
  >
    <MiddenConditionPopover
      v-model:open="open"
      :catalog-note="artifact.catalogNote"
      :inscription="inscriptionForPopover"
    >
      <h3 class="midden-artifact-card__title">{{ artifact.title }}</h3>

      <p class="midden-artifact-card__condition">
        <MiddenConditionTooltip :grade="artifact.condition" />
        <span class="midden-artifact-card__assessed">— as of {{ formatAssessedAt(artifact.assessedAt) }}</span>
      </p>

      <p class="midden-artifact-card__provenance">
        <a
          v-if="artifact.provenance.url"
          :href="artifact.provenance.url"
          target="_blank"
          rel="noopener noreferrer"
          @click="onProvenanceClick"
        >{{ provenanceLabel(artifact.provenance) }}</a>
        <template v-else>{{ provenanceLabel(artifact.provenance) }}</template>
      </p>
    </MiddenConditionPopover>
  </article>
</template>

<style scoped>
.midden-artifact-card {
  position: relative;
  display: block;
  width: 100%;
  text-align: left;
  padding: 1rem 1.1rem;
  margin: 0.9rem 0;
  background: var(--midden-paper-2, #f6f0e2);
  border: 1px solid var(--midden-line, #d8cbb2);
  border-left: 3px solid var(--midden-accent, #b4552d);
  cursor: pointer;
  font: inherit;
  color: inherit;
}
.midden-artifact-card:focus-visible {
  outline: 2px solid var(--midden-accent, #b4552d);
  outline-offset: 2px;
}

.midden-artifact-card__title {
  margin: 0 0 0.5rem;
  font-family: var(--midden-display);
  font-size: 1.15rem;
  color: var(--midden-ink);
}

.midden-artifact-card__condition {
  display: flex;
  align-items: baseline;
  gap: 0.4ch;
  margin: 0 0 0.4rem;
  flex-wrap: wrap;
}
.midden-artifact-card__assessed {
  font-family: var(--midden-data);
  font-size: 0.74rem;
  color: var(--midden-faint, #a8977c);
}

.midden-artifact-card__provenance {
  margin: 0;
  font-family: var(--midden-data);
  font-size: 0.78rem;
  color: var(--midden-muted);
}
.midden-artifact-card__provenance a {
  color: var(--midden-muted);
  text-decoration: none;
  border-bottom: 1px solid var(--midden-rule);
}
.midden-artifact-card__provenance a:hover {
  color: var(--midden-accent);
  border-bottom-color: currentColor;
}

/* ── The `lost` gravestone (#523) ─────────────────────────────────────────
   Same card footprint (no list reflow) with a distinct headstone frame — a
   generous rounded arch top against a nearly-square bottom — so it reads
   unmistakably apart from every other grade's plain rectangle. */
.midden-artifact-card--lost {
  border-left-color: var(--midden-slate, #4a5560);
  border-radius: 3.5rem 3.5rem 4px 4px / 2.2rem 2.2rem 4px 4px;
  padding-top: 1.6rem;
  background: var(--midden-paper);
  text-align: center;
}
.midden-artifact-card--lost .midden-artifact-card__condition {
  justify-content: center;
}
.midden-artifact-card--lost .midden-artifact-card__provenance {
  justify-content: center;
}
/* The epitaph gets slightly more generous prose treatment inside the popover
   (still the SAME `catalogNote` field — no separate epitaph field exists). */
.midden-artifact-card--lost :deep(.pop-note) {
  font-style: italic;
}
</style>
