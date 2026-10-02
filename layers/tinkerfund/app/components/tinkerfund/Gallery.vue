<script setup lang="ts">
// qa's front page (issue #1375): an index of the component gallery's sections.
defineProps<{ title: string; description?: string }>()

const { link } = useTinkerfundSpace()
</script>

<template>
  <div class="gallery">
    <TinkerfundGalleryIntro :title="title" :lead="description" />
    <p class="note">
      Each section below shows its components in their states, against qa’s edge-case fixtures. <code>TinkerfundShell</code>
      frames every page: the demo bar with <code>TinkerfundShellResetDemo</code>, <code>TinkerfundShellHeader</code> with
      <code>TinkerfundShellWordmark</code> and <code>TinkerfundShellSearchField</code>, and <code>TinkerfundShellFooter</code>
      with <code>TinkerfundShellThemeSwitch</code>. Narrow the window for the menu dialog; switch the theme to see every
      specimen in Light and Dark.
    </p>
    <ol class="sections">
      <li v-for="section in TINKERFUND_GALLERY" :key="section.id" class="tf-panel">
        <h2><NuxtLink :to="link(`/gallery/${section.id}`)">{{ section.title }}</NuxtLink></h2>
        <TinkerfundGalleryCodes :names="section.components" />
        <p class="note">{{ section.summary }}</p>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.gallery { display: grid; grid-template-columns: minmax(0, 1fr); gap: 28px; }
.note { max-width: 68ch; margin: 0; color: var(--tf-muted); }
code { font: 500 13px/1.4 var(--tf-mono); overflow-wrap: anywhere; }
.sections {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.sections li { display: grid; gap: 8px; align-content: start; padding: 16px; }
.sections li > * { margin: 0; }
h2 { font-size: 20px; line-height: 1.25; }
.sections .note { font-size: 14px; }
</style>
