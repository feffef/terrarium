<script setup lang="ts">
// One Tenant's showcase card on the root index. The card is the unit that scales:
// a Tenant's entries (Personas, Biomes, Spaces) grow *inside* it instead of adding
// another full-width page section, so the index grows by one grid cell per Tenant
// rather than one vertical block per Tenant.
import type { ShowcaseEntry } from '~/utils/showcase'

const props = defineProps<{
  tenant: string
  path: string
  /** Plural noun for the entry count, e.g. "voices" — the number is derived. */
  noun: string
  blurb: string
  entries: ShowcaseEntry[]
}>()

const { listed, overflow } = listEntries(props.entries)
</script>

<template>
  <article class="card">
    <span class="rail" aria-hidden="true">
      <span v-for="e in entries" :key="e.path" class="rail-seg" :style="{ background: e.accent }" />
    </span>

    <div class="head">
      <h3 class="title">
        <NuxtLink :to="path" class="title-link">
          {{ tenant }}<span class="arrow" aria-hidden="true">→</span>
        </NuxtLink>
      </h3>
      <span class="count">{{ entries.length }} {{ noun }}</span>
    </div>

    <p class="blurb">{{ blurb }}</p>

    <ul class="entries">
      <li v-for="e in listed" :key="e.path">
        <NuxtLink :to="e.path" class="entry" :style="{ '--ea': e.accent }">
          <span class="dot" aria-hidden="true" />
          <span class="entry-name">{{ e.name }}</span>
          <span v-if="e.note" class="entry-note">{{ e.note }}</span>
        </NuxtLink>
      </li>
      <li v-if="overflow > 0">
        <NuxtLink :to="path" class="entry more">
          <span class="dot more-dot" aria-hidden="true" />
          <span class="entry-name">{{ overflow }} more {{ noun }}</span>
        </NuxtLink>
      </li>
    </ul>
  </article>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 0 0 0.9rem;
  overflow: hidden;
  border: 1px solid var(--root-line);
  border-radius: 12px;
  background: color-mix(in srgb, var(--root-ink) 2%, transparent);
  text-align: left;
  transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}
.card:hover {
  border-color: color-mix(in srgb, var(--root-accent) 55%, var(--root-line));
  transform: translateY(-2px);
  box-shadow: 0 10px 24px -14px rgba(0, 0, 0, 0.5);
}

/* The colour identity of the whole Tenant, one segment per entry — it thins as
   entries are added instead of adding another row of swatches. */
.rail {
  display: flex;
  height: 5px;
  width: 100%;
}
.rail-seg {
  flex: 1 1 0;
  min-width: 0;
}

.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.85rem 1.1rem 0;
}

.title {
  margin: 0;
  font-size: 1.12rem;
  font-weight: 650;
  letter-spacing: -0.01em;
}
.title-link {
  color: var(--root-ink);
  text-decoration: none;
}
.arrow {
  display: inline-block;
  margin-left: 0.35em;
  color: var(--root-accent);
  transition: transform 0.15s ease;
}
.card:hover .arrow {
  transform: translateX(3px);
}

.count {
  flex: none;
  padding: 0.12rem 0.5rem;
  border: 1px solid var(--root-line);
  border-radius: 999px;
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  color: var(--root-muted);
  white-space: nowrap;
}

.blurb {
  margin: 0;
  padding: 0 1.1rem;
  font-size: 0.87rem;
  line-height: 1.5;
  color: var(--root-muted);
}

.entries {
  margin: 0.15rem 0 0;
  padding: 0.55rem 0.6rem 0;
  list-style: none;
  border-top: 1px solid var(--root-line);
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.entry {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.3rem 0.5rem;
  border-radius: 7px;
  text-decoration: none;
  transition: background-color 0.12s ease;
}
.entry:hover {
  background: color-mix(in srgb, var(--ea) 12%, transparent);
}

.dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ea);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.2);
  transform: translateY(-1px);
}
.entry-name {
  font-size: 0.87rem;
  font-weight: 600;
  color: var(--root-ink);
  white-space: nowrap;
}
.entry-note {
  min-width: 0;
  font-size: 0.78rem;
  color: var(--root-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more {
  --ea: var(--root-accent);
}
.more .entry-name {
  font-weight: 500;
  color: var(--root-muted);
}
.more-dot {
  background: transparent;
  box-shadow: inset 0 0 0 1px var(--root-muted);
}

/* Scoped to this component because index.vue's own focus rule is scoped to its
   own DOM and never reaches these links. */
.card a:focus-visible {
  outline: 2px solid var(--root-accent);
  outline-offset: 2px;
  border-radius: 7px;
}
</style>
