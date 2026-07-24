<script setup lang="ts">
// `::midden-artifact{slug="..."}` (#521): the MDC embed rendering one
// catalogued Artifact inline inside a Site's dig-report body — as ONE flat,
// fully open ruled entry (owner-directed land → read flattening,
// layers/midden/CONTEXT.md): the condition as a plain word with its dig-season
// label, the title, a linked provenance line, the assessed date, the catalog
// note, and the inscription — nothing collapsed, nothing to hover or decode.
// Lives in `components/content/`, unprefixed, so Nuxt Content's kebab-case tag
// resolution maps `::midden-artifact` to this exact component name.
//
// Same-Space read only (ADR-0004/0006): resolves the CURRENT route's Space
// through `useSpace('midden')` to read this Space's own `artifacts`
// collection key, so an embed inside one Site's body can never reach across
// Spaces.
//
// A broken `slug` reference is loud, not invisible — `scripts/
// validate-content-refs.ts` plus the schema catch a bad reference at build/CI
// time, so the fallback exists for the rare case that slips through.
//
// The `lost` grade (#523): its `inscription` is omitted STRUCTURALLY regardless
// of authored data — the gravestone's silence is deliberate, not a
// rendering-empty accident.
import { conditionMeta } from '../../utils/condition'
import { digSeasonOf } from '../../utils/strata'
import {
  formatMiddenDate,
  provenanceLine,
  toMiddenArtifactView,
  type MiddenArtifactDoc,
} from '../../utils/artifact'

const props = defineProps<{ slug: string }>()

const { collections } = useSpace('midden')

const { data: artifact } = await useAsyncData(`midden-artifact-${props.slug}`, async () => {
  const doc = await queryCollection(collections.artifacts).where('stem', '=', props.slug).first()
  return doc ? toMiddenArtifactView(doc as MiddenArtifactDoc) : null
})

const isLost = computed(() => artifact.value?.condition === 'lost')
const label = computed(() => conditionMeta(artifact.value?.condition).label)
const seasonLabel = computed(() =>
  artifact.value ? digSeasonOf(artifact.value.stratum)?.label : undefined,
)

// Structural omission, not a rendering-empty accident (#523).
const inscriptionForDisplay = computed(() =>
  isLost.value ? undefined : artifact.value?.inscription,
)
</script>

<template>
  <article
    v-if="artifact"
    :id="`artifact-${artifact.slug}`"
    class="midden-find"
    :class="{ 'midden-find--lost': isLost }"
  >
    <p class="midden-find__gradeline">
      <span class="sc midden-find__grade">{{ label }}</span>
      <span v-if="seasonLabel" class="tech midden-find__season">· {{ seasonLabel }}</span>
    </p>

    <h3 class="midden-find__title">{{ artifact.title }}</h3>

    <p class="tech midden-find__meta">
      <a
        v-if="artifact.provenance.url"
        :href="artifact.provenance.url"
        target="_blank"
        rel="noopener noreferrer"
      >{{ provenanceLine(artifact.provenance) }}</a>
      <span v-else>{{ provenanceLine(artifact.provenance) }}</span>
      <span class="midden-find__assessed">assessed {{ formatMiddenDate(artifact.assessedAt) }}</span>
    </p>

    <p class="hand midden-find__note">{{ artifact.catalogNote }}</p>

    <blockquote v-if="inscriptionForDisplay" class="midden-find__inscription">
      &ldquo;{{ inscriptionForDisplay.text }}&rdquo;
      <span class="mono midden-find__source">{{ inscriptionForDisplay.source }}</span>
    </blockquote>
    <p v-else-if="isLost" class="hand midden-find__lost">no inscription survives — nothing is left to quote.</p>
  </article>

  <p v-else class="midden-artifact-missing">
    Artifact not found: <code>{{ slug }}</code>
  </p>
</template>

<style scoped>
.midden-find {
  border-top: 1px solid var(--midden-rule);
  margin-top: 1.6rem;
  padding: 16px 0 4px;
}

.midden-find__gradeline {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
  margin: 0;
}
.midden-find__grade {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.09em;
  color: var(--midden-accent);
}
.midden-find--lost .midden-find__grade {
  color: var(--midden-muted);
}
.midden-find__season {
  color: var(--midden-faint);
}

.midden-find__title {
  margin: 6px 0 0;
  font-family: var(--midden-mono);
  font-size: 1.05rem;
  font-weight: 500;
  line-height: 1.3;
  color: var(--midden-ink);
}

.midden-find__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin: 5px 0 0;
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

.midden-find__note {
  margin: 12px 0 0;
  font-size: 1rem;
  line-height: 1.55;
  color: var(--midden-muted);
}

.midden-find__inscription {
  margin: 12px 0 0;
  padding: 2px 0 2px 14px;
  border-left: 2px solid var(--midden-accent);
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
  font-family: var(--midden-mono);
  font-size: 0.85rem;
}
</style>
