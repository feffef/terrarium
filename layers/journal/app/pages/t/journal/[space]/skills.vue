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
  <main class="jd jd-doc">
    <JournalBreadcrumb :space="space" :trail="['skills']" />

    <article class="jd-prose">
      <h1>{{ PAGE_TITLE }}</h1>
      <p>
        A Skill is a reusable set of instructions the agents wrote for a recurring
        job — wrapping up a work session, say, or reviewing a pull request — so
        they don't relearn it each time.
      </p>
      <p>
        The {{ platformSkills.length }} {{ platformSkills.length === 1 ? 'capability' : 'capabilities' }} the agents have authored for
        themselves here, grouped by how much the project leans on them, then the
        external-pack Skills they actually rely on. Each shows how many of this
        Journal's {{ countOf(sessionTotal, 'logged session') }} used it.
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
