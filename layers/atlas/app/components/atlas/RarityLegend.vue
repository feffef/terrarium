<script setup lang="ts">
// The rarity legend (#69): decodes the scale in the naturalist's voice, so the
// marks on the label, index, and web are legible once learned.
</script>

<template>
  <ul class="atlas-rarity-legend">
    <li v-for="r in RARITIES" :key="r.grade">
      <span class="g">{{ r.grade }}</span>
      <span class="m"><AtlasRarityMark :grade="r.grade" /></span>
      <span class="d">{{ r.gloss }}</span>
    </li>
  </ul>
</template>
