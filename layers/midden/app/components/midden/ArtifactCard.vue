<script setup lang="ts">
// The artifact entry (redesign handoff, direction 1a "Section column"): one
// catalogued Artifact as a quiet RULED entry — a border-top, a corner condition
// STAMP, the glyph, the title as a toggle, a mono provenance/assessed line, and
// an inline accordion (catalogNote + inscription) below. No card box.
//
// Root element carries `id="artifact-<slug>"` + `data-stratum="<stratum>"` —
// load-bearing: StratigraphySidebar.vue's IntersectionObserver targets every
// `[data-stratum]` element on the page and its gauge anchors are literally
// `#artifact-<slug>`, so both attributes stay on THIS component's outermost
// rendered element, never an inner wrapper.
//
// Two-tier interaction (#523), both preserved through the redesign:
//   Tier-1 — MiddenConditionTooltip wraps the glyph: hover/focus reveals the
//            FIXED grade-level definition. Unchanged by the mockup's simplified
//            prototype, which only draws Tier-2.
//   Tier-2 — the title `<button>` toggles this entry's own inline accordion (the
//            artifact-SPECIFIC catalogNote + inscription). The glyph's tooltip
//            trigger and the title toggle are SIBLINGS, and the provenance link
//            sits in a separate meta line — so there is no nested-interactive
//            (invalid ARIA) problem the pre-redesign card had to work around.
//
// The `lost` grade (#523): its `inscription` is omitted STRUCTURALLY regardless
// of authored data — `inscriptionForDisplay` returns undefined for `lost` even
// when the document carries one, because the gravestone's silence is deliberate,
// not a rendering-empty accident.
import { conditionMeta } from '../../utils/condition'
import type { MiddenArtifactView } from '../../composables/useMiddenTrenchData'

const props = defineProps<{ artifact: MiddenArtifactView }>()

const open = ref(false)
function toggle() {
  open.value = !open.value
}

const isLost = computed(() => props.artifact.condition === 'lost')
const label = computed(() => conditionMeta(props.artifact.condition).label)

// Structural omission, not a rendering-empty accident (#523).
const inscriptionForDisplay = computed(() => (isLost.value ? undefined : props.artifact.inscription))

// A stamp reads as physically pressed when each one sits at a slightly different
// angle/offset. Derived deterministically from the slug (SSR-stable, no hydration
// drift) from the same small tables the mockup's buildArts() used.
const STAMP_ANGLES = [-7, 5, -4, 6, -3]
const STAMP_TOPS = [16, 12, 18, 13, 15]
const STAMP_RIGHTS = [18, 26, 15, 24, 20]
const stampStyle = computed(() => {
  let h = 0
  for (const ch of props.artifact.slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const i = h % 5
  return `top:${STAMP_TOPS[i]}px;right:${STAMP_RIGHTS[i]}px;transform:rotate(${STAMP_ANGLES[i]}deg);`
})

// Deterministic, locale-independent date prose (no `toLocaleDateString`, whose
// SSR/client locale mismatch causes hydration errors). #526 asks only that
// `assessedAt` render as prose beside the grade, never re-derive condition.
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function formatAssessedAt(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${Number(day)} ${MONTH_ABBR[Number(month) - 1]} ${year}`
}

// The compact provenance line for the mono meta row — a kind-appropriate label
// derived from the REAL discriminated union (never a mockup display string).
function provenanceLine(p: MiddenArtifactView['provenance']): string {
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
  <div
    :id="`artifact-${artifact.slug}`"
    class="midden-find"
    :class="{ 'midden-find--lost': isLost }"
    :data-stratum="artifact.stratum"
  >
    <span class="stamp midden-find__stamp" :style="stampStyle">{{ label }}</span>

    <div class="midden-find__row">
      <MiddenConditionTooltip class="midden-find__glyph" :grade="artifact.condition" :size="22" />

      <div class="midden-find__main">
        <button
          type="button"
          class="midden-find__toggle"
          :aria-expanded="open"
          :aria-label="`${open ? 'Hide' : 'Show'} the curator's note for ${artifact.title}`"
          @click="toggle"
        >
          <span class="midden-find__title">{{ artifact.title }}</span>
        </button>

        <div class="tech midden-find__meta">
          <a
            v-if="artifact.provenance.url"
            :href="artifact.provenance.url"
            target="_blank"
            rel="noopener noreferrer"
          >{{ provenanceLine(artifact.provenance) }}</a>
          <span v-else>{{ provenanceLine(artifact.provenance) }}</span>
          <span class="midden-find__assessed">assessed {{ formatAssessedAt(artifact.assessedAt) }}</span>
        </div>
      </div>
    </div>

    <div v-if="open" class="midden-find__expand">
      <p class="hand midden-find__note">{{ artifact.catalogNote }}</p>
      <blockquote v-if="inscriptionForDisplay" class="midden-find__inscription">
        &ldquo;{{ inscriptionForDisplay.text }}&rdquo;
        <span class="mono midden-find__source">{{ inscriptionForDisplay.source }}</span>
      </blockquote>
      <p v-else-if="isLost" class="hand midden-find__lost">no inscription survives — nothing is left to quote.</p>
    </div>
  </div>
</template>

<style scoped>
.midden-find {
  position: relative;
  border-top: 1px solid var(--midden-rule);
  padding: 15px 2px;
}

.midden-find__stamp {
  /* top/right/rotate come from the inline :style (per-find, deterministic). */
  font-size: 0.82rem;
}

.midden-find__row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  /* Clear the corner stamp so the title never runs under it. */
  padding-right: 128px;
}

.midden-find__glyph {
  flex: none;
  margin-top: 2px;
}

.midden-find__main {
  flex: 1;
  min-width: 0;
}

.midden-find__toggle {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: 0;
  padding: 0;
  margin: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
}
.midden-find__toggle:focus-visible {
  outline: 2px solid var(--midden-accent);
  outline-offset: 3px;
  border-radius: 3px;
}
.midden-find__title {
  display: block;
  font-family: var(--midden-mono);
  font-size: 1.02rem;
  font-weight: 500;
  line-height: 1.25;
  color: var(--midden-ink);
}
.midden-find__toggle:hover .midden-find__title {
  color: var(--midden-accent-2);
}

.midden-find__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin-top: 5px;
  color: var(--midden-faint);
}
.midden-find__meta a {
  color: var(--midden-muted);
  border-bottom: 1px solid var(--midden-rule);
}
.midden-find__meta a:hover {
  color: var(--midden-accent);
  border-bottom-color: currentColor;
}

.midden-find__expand {
  margin: 14px 0 2px 36px;
  border-left: 3px solid var(--midden-accent);
  padding: 2px 0 2px 16px;
}
.midden-find__note {
  margin: 0;
  font-size: 1rem;
  line-height: 1.55;
  color: var(--midden-muted);
}
.midden-find__inscription {
  margin: 12px 0 0;
  padding: 2px 0 2px 14px;
  border-left: 2px solid var(--midden-line);
  font-family: var(--midden-mono);
  font-style: italic;
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--midden-ink);
}
.midden-find__source {
  display: block;
  margin-top: 6px;
  font-style: normal;
  font-size: 0.72rem;
  color: var(--midden-faint);
}
.midden-find__lost {
  margin: 12px 0 0;
  font-size: 0.92rem;
  color: var(--midden-faint);
}

@media (max-width: 34rem) {
  /* On a narrow column the corner stamp would overlap the title — let it fall
     to its own line by dropping the reserved right gutter and un-absoluting. */
  .midden-find__row { padding-right: 0; }
  .midden-find__stamp {
    position: static;
    display: inline-block;
    transform: none !important;
    margin-bottom: 10px;
  }
}
</style>
