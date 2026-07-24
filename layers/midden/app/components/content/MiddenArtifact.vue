<script setup lang="ts">
// `::midden-artifact{slug="..."}` (#521): the MDC embed rendering one
// catalogued Artifact inline inside a Site's dig-report body. Lives in
// `components/content/`, unprefixed, so Nuxt Content's kebab-case tag
// resolution maps `::midden-artifact` to this exact component name —
// mirrors layers/atlas/app/components/content/Sighting.vue's placement and
// the same reasoning.
//
// Flattened visitor experience (post-MVP simplification, see
// layers/midden/CONTEXT.md): this used to delegate rendering to a separate
// ArtifactCard.vue collapsed behind a hover-to-decode glyph and a click
// toggle. Both are gone — this component now fetches AND renders the find as
// one flat, always-open block: condition as a plain word (with its dig-season
// label), the title, a linked provenance line, the assessed date, the
// catalog note, and the inscription. No accordion, no SVG, no rotating stamp.
//
// Same-Space read only (ADR-0004/0006): resolves the CURRENT route's Space
// through `useSpace('midden')` to read this Space's own `artifacts`
// collection key, so an embed inside one Site's body can never reach across
// Spaces — mirrors every other Tenant page's isolation stance.
//
// A broken `slug` reference is loud, not invisible (content-embedded, so a
// silent blank would be worse than a visible gap) — `scripts/
// validate-content-refs.ts`'s `site`/`stratum`/`provenance` checks plus the
// schema itself catch a bad reference at build/CI time, so this fallback
// exists for the rare case that slips through.
import { conditionMeta } from '../../utils/condition'
import { digSeasonOf } from '../../utils/strata'

/** The discriminated provenance union (tenant.config.ts's `provenance`),
 *  mirrored as a plain TS type for this component's own `provenanceLine()` —
 *  the manifest only exports the zod schema itself, not its inferred type. */
type MiddenProvenance =
  | { kind: 'pr'; number: number; merged: boolean; url?: string }
  | { kind: 'branch'; name: string; url?: string }
  | { kind: 'commit'; hash: string; path?: string; url?: string }
  | { kind: 'file'; path: string; url?: string }
  | { kind: 'dependency'; name: string; url?: string }
  | { kind: 'skill'; name: string; url?: string }

const props = defineProps<{ slug: string }>()

const { collections } = useSpace('midden')

const { data: artifact } = await useAsyncData(`midden-artifact-${props.slug}`, async () => {
  return (await queryCollection(collections.artifacts).where('stem', '=', props.slug).first()) ?? null
})

const isLost = computed(() => artifact.value?.condition === 'lost')
const label = computed(() => conditionMeta(artifact.value?.condition).label)
const seasonLabel = computed(() => (artifact.value ? digSeasonOf(artifact.value.stratum)?.label : undefined))

// Structural omission, not a rendering-empty accident (#523): a `lost` find
// never shows an inscription even when the document happens to carry one.
const inscriptionForDisplay = computed(() => (isLost.value ? undefined : artifact.value?.inscription))

// Deterministic, locale-independent date prose (no `toLocaleDateString`, whose
// SSR/client locale mismatch causes hydration errors).
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function formatAssessedAt(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${Number(day)} ${MONTH_ABBR[Number(month) - 1]} ${year}`
}

// The compact provenance line — a kind-appropriate label derived from the REAL
// discriminated union (never a display string authored per document).
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
  <div v-if="artifact" class="midden-find" :class="{ 'midden-find--lost': isLost }">
    <div class="midden-find__head">
      <span class="sc midden-find__condition">{{ label }}</span>
      <span v-if="seasonLabel" class="tech midden-find__season">{{ seasonLabel }}</span>
    </div>

    <h3 class="midden-find__title">{{ artifact.title }}</h3>

    <p class="tech midden-find__meta">
      <a
        v-if="artifact.provenance.url"
        :href="artifact.provenance.url"
        target="_blank"
        rel="noopener noreferrer"
      >{{ provenanceLine(artifact.provenance) }}</a>
      <span v-else>{{ provenanceLine(artifact.provenance) }}</span>
      <span class="midden-find__dot">·</span>
      <span>assessed {{ formatAssessedAt(artifact.assessedAt) }}</span>
    </p>

    <p class="hand midden-find__note">{{ artifact.catalogNote }}</p>

    <blockquote v-if="inscriptionForDisplay" class="midden-find__inscription">
      &ldquo;{{ inscriptionForDisplay.text }}&rdquo;
      <span class="mono midden-find__source">{{ inscriptionForDisplay.source }}</span>
    </blockquote>
    <p v-else-if="isLost" class="hand midden-find__lost">no inscription survives — nothing is left to quote.</p>
  </div>
  <p v-else class="midden-artifact-missing">
    Artifact not found: <code>{{ slug }}</code>
  </p>
</template>

<style scoped>
.midden-find {
  border-top: 1px solid var(--midden-rule);
  padding: 20px 2px 22px;
}

.midden-find__head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 6px;
}
.midden-find__condition {
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--midden-accent);
}
.midden-find--lost .midden-find__condition {
  color: var(--midden-faint);
}
.midden-find__season {
  color: var(--midden-faint);
}

.midden-find__title {
  margin: 0 0 7px;
  font-family: var(--midden-mono);
  font-size: 1.06rem;
  font-weight: 500;
  line-height: 1.3;
  color: var(--midden-ink);
}

.midden-find__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin: 0 0 13px;
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
.midden-find__dot {
  opacity: 0.55;
}

.midden-find__note {
  margin: 0;
  max-width: 58ch;
  font-size: 1rem;
  line-height: 1.55;
  color: var(--midden-muted);
}

.midden-find__inscription {
  margin: 14px 0 0;
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

.midden-artifact-missing {
  padding: 0.7rem 0.9rem;
  margin: 0.9rem 0;
  background: var(--midden-accent-soft, rgba(180, 85, 45, 0.12));
  border: 1px dashed var(--midden-accent, #b4552d);
  color: var(--midden-muted);
  font-family: var(--midden-data);
  font-size: 0.85rem;
}
</style>
