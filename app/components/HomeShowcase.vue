<script setup lang="ts">
// One Tenant's tile on the root index: header, that Tenant's rooms (the main way
// in), then a teaser (the default slot, supplied by the page).
// `dress` names the Tenant whose own global tokens tint the tile (each layer's
// theme.css registers them on :root), so the tile tracks the Tenant's palette
// and light/dark pairs without copying a colour.
import type { ShowcaseEntry } from '~/utils/showcase'

const props = defineProps<{
  tenant: string
  path: string
  /** Plural noun for the entry count, e.g. "voices" — the number is derived. */
  noun: string
  blurb: string
  entries: ShowcaseEntry[]
  dress: 'blog' | 'atlas' | 'midden'
  teaserLabel: string
}>()

const { listed, overflow } = listEntries(props.entries)
</script>

<template>
  <article class="tile" :class="`tile--${dress}`">
    <span class="rail" aria-hidden="true">
      <span v-for="e in entries" :key="e.path" class="rail-seg" :style="{ background: e.accent }" />
    </span>

    <header class="head">
      <h3 class="title">
        <NuxtLink :to="path" class="title-link">{{ tenant }}<span class="arrow" aria-hidden="true">→</span></NuxtLink>
      </h3>
      <p class="blurb">{{ blurb }}</p>
    </header>

    <nav class="rooms" :aria-label="`${tenant}: ${entries.length} ${noun}`">
      <ul class="room-list">
        <li v-for="e in listed" :key="e.path">
          <NuxtLink :to="e.path" class="room" :style="{ '--ea': e.accent }">
            <span class="dot" aria-hidden="true" /><span class="room-name">{{ e.name }}</span>
            <span v-if="e.note" class="room-note">{{ e.note }}</span>
          </NuxtLink>
        </li>
        <li v-if="overflow > 0">
          <NuxtLink :to="path" class="room room--more">+{{ overflow }} more</NuxtLink>
        </li>
      </ul>
    </nav>

    <div class="teaser">
      <p class="teaser-label">{{ teaserLabel }}</p>
      <slot />
    </div>
  </article>
</template>

<style scoped>
.tile {
  --tile-accent: var(--root-accent);
  --tile-display: inherit;
  --tile-panel: color-mix(in srgb, var(--root-ink) 3%, var(--root-bg));
  --tile-panel-line: var(--root-line);

  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--root-line);
  border-radius: 14px;
  background:
    radial-gradient(28rem 12rem at 0% 0%, color-mix(in srgb, var(--tile-accent) 9%, transparent), transparent 70%),
    var(--root-bg);
  text-align: left;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.tile:hover {
  border-color: color-mix(in srgb, var(--tile-accent) 50%, var(--root-line));
  box-shadow: 0 12px 28px -18px rgba(0, 0, 0, 0.45);
}

.tile--blog {
  --tile-accent: var(--bl-accent);
  --tile-display: var(--bl-serif);
  --tile-panel: var(--bl-surface);
  --tile-panel-line: var(--bl-line);
}
.tile--atlas {
  --tile-accent: var(--biome-accent);
  --tile-display: var(--atlas-display);
  --tile-panel: var(--atlas-paper);
  --tile-panel-line: var(--atlas-rule);
}
.tile--midden {
  --tile-accent: var(--midden-accent);
  --tile-display: var(--midden-serif);
  --tile-panel: var(--midden-paper-2);
  --tile-panel-line: var(--midden-rule);
}

.rail {
  display: flex;
  height: 5px;
}
.rail-seg {
  flex: 1 1 0;
}

.head {
  padding: 1rem 1.15rem 0;
}
.title {
  margin: 0;
  font-family: var(--tile-display);
  font-size: 1.3rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.title-link {
  color: var(--root-ink);
  text-decoration: none;
}
.arrow {
  display: inline-block;
  margin-left: 0.35em;
  color: var(--tile-accent);
  transition: transform 0.15s ease;
}
.tile:hover .arrow {
  transform: translateX(3px);
}
.blurb {
  margin: 0.4rem 0 0;
  font-size: 0.86rem;
  line-height: 1.5;
  color: var(--root-muted);
}

.rooms {
  padding: 0.75rem 1.15rem 0;
}
.room-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.room {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  column-gap: 0.5rem;
  color: var(--root-ink);
  text-decoration: none;
}
.room-name {
  font-size: 0.9rem;
  font-weight: 600;
}
.room-note {
  font-size: 0.8rem;
  color: var(--root-muted);
}
.room:hover .room-name {
  text-decoration: underline;
  text-decoration-color: var(--ea);
}
.dot {
  flex: none;
  align-self: center;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ea);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.2);
}
.room--more {
  font-size: 0.85rem;
  color: var(--root-muted);
}

/* Fills the card to the row's height; the page keeps long teasers from setting it. */
.teaser {
  flex: 1;
  margin: 0.95rem 0.8rem 0.8rem;
  padding: 0.75rem 0.85rem 0.85rem;
  border: 1px solid var(--tile-panel-line);
  border-radius: 10px;
  background: var(--tile-panel);
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}
.teaser-label {
  margin: 0;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--tile-accent);
}

/* index.vue's own focus rule is scoped to its DOM and never reaches these links. */
.tile a:focus-visible {
  outline: 2px solid var(--tile-accent);
  outline-offset: 2px;
  border-radius: 7px;
}
</style>
