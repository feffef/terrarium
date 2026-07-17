<script setup lang="ts">
// The Marquee's Poster: frame, viewBox, caption, and a soft painterly grain
// overlay; the authored inner SVG markup (a Chapter's original illustration)
// is dropped in. Mirrors the Atlas's `SpecimenPlate` *mechanism*
// (v-html of repo-committed, agent-authored SVG — never user input, so this
// is safe) but its own visual language: muted, gradient-washed, Ghibli-
// inspired rather than the Atlas's engraved-plate look
// (layers/marquee/CONTEXT.md: Poster).
defineProps<{
  illustration?: string
  order?: number
  title: string
}>()
</script>

<template>
  <figure class="mq-poster">
    <div class="poster-frame">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <svg v-if="illustration" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid meet" role="img" :aria-label="`Original illustration for ${title}`" v-html="illustration" />
      <p v-else class="poster-wanting">No poster painted yet for this chapter.</p>
      <div class="poster-grain" aria-hidden="true" />
    </div>
    <figcaption class="poster-caption">
      <span v-if="order" class="poster-order">Chapter {{ order }}</span>
      <span class="poster-title">{{ title }}</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.mq-poster {
  margin: 0 0 1.6rem;
  max-width: 20rem;
}
.poster-frame {
  position: relative;
  aspect-ratio: 2 / 3;
  border-radius: 14px;
  overflow: hidden;
  background: linear-gradient(160deg, var(--mq-glass-edge), transparent 45%), var(--mq-surface);
  border: 1px solid var(--mq-line);
  box-shadow: var(--mq-shadow), 0 12px 32px -24px color-mix(in srgb, var(--mq-accent) 55%, transparent);
}
.poster-frame svg {
  display: block;
  width: 100%;
  height: 100%;
}
.poster-wanting {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  text-align: center;
  font-style: italic;
  color: var(--mq-faint);
  font-size: 0.92rem;
  margin: 0;
}
/* A faint, painterly grain — a soft texture atop the flat SVG shapes so the
   poster reads a little less vector-clean, closer to a hand-painted plate.
   Pure CSS (no dependency, no asset): two barely-visible radial dot fields at
   different scales, blended multiply so it only ever darkens, never washes
   out the illustration underneath. */
.poster-grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  mix-blend-mode: multiply;
  opacity: 0.5;
  background-image:
    radial-gradient(circle at 20% 30%, rgba(0, 0, 0, 0.05) 0, transparent 45%),
    radial-gradient(circle at 75% 65%, rgba(0, 0, 0, 0.04) 0, transparent 40%),
    radial-gradient(circle at 50% 85%, rgba(0, 0, 0, 0.05) 0, transparent 50%);
}
.poster-caption {
  margin-top: 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.poster-order {
  font-family: var(--mq-mono);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--mq-warm);
}
.poster-title {
  font-family: var(--mq-serif);
  font-size: 1rem;
  color: var(--mq-ink);
}
</style>
