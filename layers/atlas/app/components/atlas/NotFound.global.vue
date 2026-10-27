<script setup lang="ts">
// The Atlas's own 404, in the guide's chrome, for both dead-address shapes:
// a known Biome with no such Specimen (`[...slug].vue` renders it) and an
// unknown Biome (`app/error.vue` renders it: the `.global.vue` suffix registers
// `AtlasNotFound` for the Platform's not-found seam, docs/agents/tenant-layers.md §4).
// Route-derived rather than prop-fed so the two callers share one code path.
// Reads no Space data: `BIOMES` is presentational metadata only (ADR-0006).
const route = useRoute()
const segments = route.path.split('/').filter(Boolean) // ['t', 'atlas', <biome>, ...rest]
const biome = BIOMES.find((b) => b.slug === segments[2])
const rest = `/${segments.slice(biome ? 3 : 2).join('/')}`
const back = biome ? { to: `/t/atlas/${biome.slug}`, label: `Back to ${biome.name}` } : { to: '/t/atlas', label: 'Back to the Atlas' }
// `--sig-1` is fixed to the neutral accent on `:root` (theme.css), so the Biome's
// accent only reaches the plate when re-bound here; an unknown Biome draws in ink.
const tint = {
  '--sig-1': 'var(--biome-accent)',
  ...(biome ? {} : { '--biome-accent': 'var(--atlas-ink)' }),
}

useSeoMeta({ title: 'Not catalogued · The Atlas of the Terrarium' })

// Plate —: an empty stoppered jar with a blank label. The one tinted feature is
// the smudge on the glass where something used to be (atlas-specimen Skill §2).
const illustration = `
<g stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none">
  <!-- stopper -->
  <path d="M176 58 q24 -9 48 0 l-3 10 q-21 -6 -42 0 z" />
  <path d="M184 68 q16 -3 32 0 l2 18 q-18 3 -36 0 z" />
  <g stroke-width="0.7" opacity="0.65">
    <line x1="182" y1="63" x2="186" y2="83" /><line x1="190" y1="61" x2="193" y2="84" />
    <line x1="198" y1="60" x2="200" y2="84" /><line x1="206" y1="61" x2="207" y2="84" />
    <line x1="214" y1="63" x2="214" y2="83" />
  </g>
  <!-- neck and body -->
  <path d="M166 90 q34 -6 68 0" />
  <path d="M166 90 l-1 14 q-34 10 -34 44 l2 92 q2 14 18 16 q49 5 98 0 q16 -2 18 -16 l2 -92 q0 -34 -34 -44 l-1 -14" />
  <path d="M170 104 q30 -4 60 0" stroke-width="0.9" opacity="0.7" />
  <!-- glass shading: hatch on the left shoulder and flank -->
  <g stroke-width="0.75" opacity="0.6">
    <line x1="140" y1="134" x2="156" y2="113" /><line x1="139" y1="146" x2="158" y2="121" />
    <line x1="138" y1="158" x2="160" y2="129" /><line x1="138" y1="170" x2="161" y2="139" />
    <line x1="139" y1="182" x2="152" y2="165" /><line x1="139" y1="196" x2="150" y2="182" />
    <line x1="140" y1="210" x2="150" y2="197" /><line x1="140" y1="224" x2="151" y2="211" />
    <line x1="141" y1="238" x2="151" y2="225" />
  </g>
  <!-- highlight: an unbroken reflection down the right flank -->
  <path d="M258 128 q6 40 2 100" stroke-width="0.8" opacity="0.5" />
  <!-- water line of air: nothing in it, so only the bottom catches a shade -->
  <g stroke-width="0.7" opacity="0.55">
    <line x1="148" y1="248" x2="252" y2="248" /><line x1="152" y1="253" x2="248" y2="253" />
  </g>
  <!-- the blank label, a little askew, tied on -->
  <path d="M168 154 l66 -3 l1 44 l-66 3 z" />
  <path d="M171 157 l60 -3 l1 38 l-60 3 z" stroke-width="0.6" opacity="0.5" />
  <path d="M234 151 q10 -14 6 -32" stroke-width="0.8" opacity="0.6" />
  <g stroke-width="0.6" opacity="0.5">
    <line x1="235" y1="160" x2="236" y2="192" /><line x1="237" y1="161" x2="238" y2="193" />
  </g>
  <!-- ground -->
  <path d="M110 268 q90 10 180 0" stroke-width="1" opacity="0.7" />
  <g stroke-width="0.7" opacity="0.5">
    <line x1="122" y1="274" x2="136" y2="274" /><line x1="150" y1="276" x2="176" y2="276" />
    <line x1="200" y1="277" x2="226" y2="277" /><line x1="250" y1="275" x2="274" y2="275" />
  </g>
</g>
<!-- the smudge: the one tinted feature -->
<path class="smudge" d="M196 120 q22 -10 36 4 q10 14 -2 28 q-16 12 -34 2 q-14 -12 0 -34 z" fill="var(--sig-1)" fill-opacity="0.16" stroke="var(--sig-1)" stroke-width="0.8" stroke-opacity="0.45" stroke-linecap="round" />
<path d="M204 128 q14 -4 22 6" fill="none" stroke="var(--sig-1)" stroke-width="0.7" stroke-opacity="0.5" stroke-linecap="round" />
`
</script>

<template>
  <main class="atlas" :class="biome && `atlas--${biome.slug}`" :style="tint">
    <div class="atlas-page">
      <nav class="atlas-crumb" aria-label="Breadcrumb">
        <NuxtLink to="/">terrarium</NuxtLink><span class="sep">·</span><NuxtLink to="/t/atlas">the atlas</NuxtLink><span class="sep">·</span>
        <template v-if="biome"><NuxtLink :to="back.to">{{ biome.name }}</NuxtLink><span class="sep">·</span></template>
        <span class="here">not catalogued</span>
      </nav>

      <AtlasSpecimenPlate :illustration="illustration" number="—" binomial="Locus ignotus" />

      <div class="atlas-prose not-found">
        <h1>Not catalogued</h1>
        <p>
          No specimen answers to <code>{{ rest }}</code><template v-if="biome"> in {{ biome.name }}</template><template v-else>, and no wing of the Atlas bears that name</template>.
          Perhaps it was never here; perhaps it simply prefers to be elsewhere.
        </p>
        <p><NuxtLink :to="back.to">{{ back.label }}</NuxtLink></p>
      </div>

      <SiteFooter />
    </div>
  </main>
</template>

<style scoped>
.not-found { margin-top: 1.6rem; }
.not-found h1 { font-family: var(--atlas-display); font-size: 2rem; margin: 0 0 0.6rem; }
</style>
