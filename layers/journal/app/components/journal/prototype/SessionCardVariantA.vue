<script setup lang="ts">
// THROWAWAY — prototype variant A: "inline tag". A small outlined uppercase
// "external" tag sits right next to the goal title, echoing SkillInventory.vue's
// `.po` "platform-op" tag (same provenance-marking idea). List order and grouping
// are untouched — this is the lightest-touch option. See NOTES.md.
import type { SessionCardView } from '../../../types/journal'

const { card, expanded, anchor, external } = defineProps<{
  card: SessionCardView
  expanded: boolean
  anchor: string
  external: boolean
}>()
const emit = defineEmits<{ toggle: [] }>()
const detailId = useId()
</script>

<template>
  <article :id="anchor" class="card" :class="{ open: expanded }">
    <JournalDisclosure class="head" :expanded="expanded" :controls="detailId" @toggle="emit('toggle')">
      <div class="top">
        <span class="when">{{ card.when }} <span class="dur">· {{ card.duration }} min</span></span>
        <JournalStatusPill :status="card.status" />
      </div>
      <h3 class="goal">
        {{ card.goal }}
        <span v-if="external" class="ext-tag">external</span>
      </h3>
      <p class="outcome">{{ card.outcome }}</p>
      <div class="foot">
        <a v-for="pr in card.prs" :key="pr" class="chip pr" :href="prUrl(pr)" @click.stop>PR {{ pr.startsWith('#') ? pr : '#' + pr }}</a>
        <span v-if="card.model" class="chip model" title="Model(s) that drove this session">{{ card.model }}</span>
        <JournalFrictionStrata variant="inline" :counts="card.frictionCounts" :total="card.frictionTotal" />
        <span v-if="card.skills.length" class="skills">{{ card.skills.join(' · ') }}</span>
        <span class="sid">{{ card.sid }}</span>
        <span class="caret" aria-hidden="true">{{ expanded ? '▾' : '▸' }}</span>
      </div>
    </JournalDisclosure>
  </article>
</template>

<style scoped>
.card {
  background: var(--jd-surface);
  border: 1px solid var(--jd-line);
  border-radius: var(--jd-radius);
  padding: 1rem 1.15rem 1.05rem;
  box-shadow: var(--jd-shadow);
}
.head { cursor: pointer; display: block; border-radius: 6px; }
.top { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.5rem; }
.when { font-family: var(--jd-mono); font-size: 0.73rem; color: var(--jd-muted); font-variant-numeric: tabular-nums; }
.when .dur { color: var(--jd-faint); }
.goal { font-family: var(--jd-serif); font-size: 1.12rem; font-weight: 600; margin: 0 0 0.3rem; line-height: 1.25; text-wrap: balance; }
.ext-tag {
  display: inline-block;
  vertical-align: middle;
  margin-left: 0.5rem;
  font-family: var(--jd-mono);
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #7d5ba6;
  border: 1px solid color-mix(in oklab, #7d5ba6 40%, transparent);
  border-radius: 4px;
  padding: 0.1rem 0.32rem;
}
.outcome { margin: 0 0 0.8rem; color: var(--jd-muted); font-size: 0.92rem; }
.foot { display: flex; align-items: center; gap: 0.7rem; flex-wrap: wrap; }
.chip { font-family: var(--jd-mono); font-size: 0.72rem; color: var(--jd-muted); background: var(--jd-surface-2); border: 1px solid var(--jd-line); padding: 0.16rem 0.5rem; border-radius: 6px; }
.chip.pr { color: var(--jd-accent); text-decoration: none; }
.chip.model { color: var(--jd-ink); }
.chip.model::before { content: ''; display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: var(--jd-accent); margin-right: 0.4rem; vertical-align: middle; }
.skills { font-family: var(--jd-mono); font-size: 0.7rem; color: var(--jd-faint); }
.sid { margin-left: auto; font-family: var(--jd-mono); font-size: 0.7rem; color: var(--jd-faint); }
.caret { color: var(--jd-faint); font-size: 0.78rem; }
</style>
