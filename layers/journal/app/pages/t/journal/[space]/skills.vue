<script setup lang="ts">
// A static segment, so it outranks the sibling `[...slug].vue`. Reads only this
// Space's own Skill Inventory and session logs via useSpace, like index.vue.
definePageMeta({ name: 'journal-skills' })
const PAGE_TITLE = 'Platform Skills'

const route = useRoute()
const { space, collections } = useSpace('journal')

const { data } = await useAsyncData(route.path, async () => ({
  skills: await queryCollection(collections.skills).all(),
  sessions: await queryCollection(collections.sessions).all(),
}))
const platformSkills = computed(() => ownSkills(data.value?.skills ?? []))
const groupedSkills = computed(() => skillGroups(platformSkills.value))
const groupedExternal = computed(() => skillGroups(externalSkills(data.value?.skills ?? [])))
const uses = computed(() => skillUseCounts(data.value?.sessions ?? []))
const sessionTotal = computed(() => data.value?.sessions.length ?? 0)

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
        themselves here, grouped by how much the project leans on them, then the
        external-pack Skills they actually rely on. Each shows how many of this
        Journal's {{ sessionTotal }} logged sessions used it.
      </p>
    </article>

    <JournalSkillInventory v-if="groupedSkills.length" :groups="groupedSkills" :uses="uses" class="inventory" />
    <p v-else class="jd-prose">No Platform Skills authored in this Space yet.</p>

    <template v-if="groupedExternal.length">
      <article class="jd-prose">
        <h2>From the external pack</h2>
        <p>
          General-engineering Skills installed from an outside pack: used here, not
          evolved here. Marginal ones are left out.
        </p>
      </article>
      <JournalSkillInventory :groups="groupedExternal" :uses="uses" class="inventory" />
    </template>

    <SiteFooter />
  </main>
</template>

<style scoped>
.inventory { max-width: 80ch; margin-top: 1.5rem; }
.inventory + .jd-prose { margin-top: 2.5rem; }
</style>
