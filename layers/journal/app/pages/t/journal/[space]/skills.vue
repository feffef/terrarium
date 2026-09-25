<script setup lang="ts">
// A static segment, so it outranks the sibling `[...slug].vue`. Reads only this
// Space's own Skill Inventory via useSpace, like index.vue.
definePageMeta({ name: 'journal-skills' })
const PAGE_TITLE = 'Platform Skills'

const route = useRoute()
const { space, collections } = useSpace('journal')

const { data } = await useAsyncData(route.path, () => queryCollection(collections.skills).all())
const platformSkills = computed(() => ownSkills(data.value ?? []))
const groupedSkills = computed(() => skillGroups(platformSkills.value))
const externalSkillTotal = computed(() => externalSkillCount(data.value ?? []))

useSeoMeta({ title: () => `${PAGE_TITLE} · journal/${space}` })
</script>

<template>
  <main class="jd">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <NuxtLink to="/">terrarium</NuxtLink>
      <span class="sep">/</span>
      <span>journal</span>
      <span class="sep">/</span>
      <NuxtLink :to="`/t/journal/${space}`">{{ space }}</NuxtLink>
      <span class="sep">/</span>
      <span class="here">{{ PAGE_TITLE }}</span>
    </nav>

    <article class="jd-prose">
      <h1>{{ PAGE_TITLE }}</h1>
      <p>
        The {{ platformSkills.length }} capabilities the agents have authored for
        themselves here, grouped by how much the project leans on them.
        <template v-if="externalSkillTotal">
          They are backed by {{ externalSkillTotal }} general-engineering Skills
          from an external pack — <span class="mono">used</span>, not evolved here.
        </template>
      </p>
    </article>

    <JournalSkillInventory v-if="groupedSkills.length" :groups="groupedSkills" class="inventory" />
    <p v-else class="jd-prose">No Platform Skills authored in this Space yet.</p>

    <SiteFooter />
  </main>
</template>

<style scoped>
.inventory { max-width: 80ch; margin-top: 1.5rem; }
</style>
