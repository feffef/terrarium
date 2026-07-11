<script setup lang="ts">
// `:season[display]{of="slug"}` (#283) — a Glass-Year season's name as a live
// handle in the essay. The slot is the letterpress display text (falls back to
// the season's own label); a miniature arc-glyph shows where the season sits
// on the year; the hovercard gives label, span, and gloss from GLASS_SEASONS
// (the seasons' one home); a click swings the almanac needle to the season's
// midpoint. Underlined by the almanac wash while the needle rides inside the
// season. Without an Almanac provider (a non-specimen Document) it degrades to
// styled text. Engraved register throughout: currentColor stroke, fill none
// (/atlas-specimen §2).
//
// Lives in `components/content/` — @nuxt/content registers every layer's
// components/content directory unprefixed, and pascal-cases the markdown tag
// (`:season` → Season) against it, so this SFC resolves inside
// <ContentRenderer> with no config and no schema change.
const props = defineProps<{ of?: string }>()

const almanac = useAlmanac()
const season = computed(() => GLASS_SEASONS.find((s) => s.name === props.of))

if (import.meta.dev && !season.value) {
  console.warn(
    `[atlas] :season{of="${props.of ?? ''}"} names no season of the Glass Year; `
    + `the calendar keeps only: ${GLASS_SEASONS.map((s) => s.name).join(', ')}.`,
  )
}

/** Clickable only when there is both a season and a dial to swing. Stable
 *  across SSR/hydration: the provider is created in the page's setup on both
 *  sides, so the chosen tag never mismatches. */
const live = computed(() => Boolean(almanac && season.value))

/** The almanac wash: underlined while the needle is inside this season. */
const now = computed(() =>
  Boolean(almanac && season.value && inSpan(almanac.day.value, season.value.span)),
)

const glyphArc = computed(() => (season.value ? ringArcPath(season.value.span, 5) : ''))

function swing() {
  if (!almanac || !season.value) return
  almanac.setDay(spanMidpoint(season.value.span))
}
</script>

<template>
  <component
    :is="live ? 'button' : 'span'"
    :type="live ? 'button' : undefined"
    class="atlas-season"
    :class="{ 'is-now': now, 'is-live': live }"
    @click="swing"
  >
    <svg v-if="season" class="season-glyph" viewBox="-8 -8 16 16" aria-hidden="true">
      <circle class="year" r="5" />
      <path class="arc" :d.attr="glyphArc" />
    </svg>
    <span class="season-name"><slot>{{ season?.label ?? of }}</slot></span>
    <span v-if="season" class="season-card" role="tooltip">
      <span class="card-label">{{ season.label }}</span>
      <span class="card-span">d. {{ season.span[0] }} – d. {{ season.span[1] }}</span>
      <span v-if="season.gloss" class="card-gloss">{{ season.gloss }}</span>
    </span>
  </component>
</template>
