<script setup lang="ts">
definePageMeta({ viewTransition: true })

const route = useRoute()
const { space } = useSpace('tinkerfund')
const [{ zoneName, status, error }, { loaded, backer, account }] = await Promise.all([useTinkerfundShop(), useTinkerfundCart()])

useSeoMeta(tinkerfundSeo({ kind: 'private', space, title: 'Your account' }))
</script>

<template>
  <TinkerfundShell :space="space">
    <div class="account">
      <header class="intro">
        <p class="tf-label">The demo Backer · always signed in</p>
        <h1>Your account</h1>
      </header>

      <div v-if="backer" class="cards">
        <section class="card tf-panel" aria-labelledby="profile-h">
          <h2 id="profile-h">Profile</h2>
          <dl>
            <div><dt>Name</dt><dd>{{ backer.name }}</dd></div>
            <div><dt>Email</dt><dd>{{ backer.email }}</dd></div>
          </dl>
        </section>
        <section class="card tf-panel" aria-labelledby="address-h">
          <h2 id="address-h">Shipping address</h2>
          <address>
            {{ backer.name }}<br>{{ backer.address.street }}<br>
            {{ backer.address.postcode }} {{ backer.address.city }}<br>{{ backer.address.country }}
          </address>
          <p class="note">Shipping zone: {{ zoneName(backer.address.zone) }}</p>
        </section>
      </div>

      <section class="pledges" aria-labelledby="pledges-h">
        <h2 id="pledges-h">Your Pledges <span v-if="loaded" class="count">{{ account.length }}</span></h2>
        <p v-if="!loaded" class="note">Opening your Pledges…</p>
        <p v-else-if="!account.length" class="note">No Pledges yet. <NuxtLink :to="tinkerfundPath(space, '/discover')">Find a Campaign to back</NuxtLink>.</p>
        <TinkerfundPledgeList v-else :space="space" :pledges="account" />
      </section>
    </div>
    <ContentLoadErrorDialog :status="status" :error="error" :context="route.path" />
  </TinkerfundShell>
</template>

<style scoped>
.account { display: grid; gap: 24px; max-width: 900px; }
.intro { display: grid; gap: 8px; }
.intro > * { margin: 0; }
h1 { margin: 0; font: 800 clamp(30px, 4vw, 42px)/1.05 var(--tf-font); font-stretch: 78%; }
h2 { display: flex; gap: 10px; align-items: baseline; margin: 0; font: 800 22px/1.1 var(--tf-font); font-stretch: 80%; }
.count { color: var(--tf-muted); font: 500 14px/1 var(--tf-mono); }
.cards { display: grid; gap: 14px; }
@media (min-width: 720px) { .cards { grid-template-columns: 1fr 1fr; } }
.card { display: grid; gap: 10px; align-content: start; padding: 18px; }
.card > * { margin: 0; }
dl { display: grid; gap: 6px; margin: 0; }
dl div { display: grid; grid-template-columns: 70px 1fr; gap: 12px; }
dt { color: var(--tf-muted); }
dd { margin: 0; overflow-wrap: anywhere; }
address { font-style: normal; }
.note { margin: 0; color: var(--tf-muted); }
.pledges { display: grid; gap: 12px; }
</style>
