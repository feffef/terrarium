<script setup lang="ts">
const props = defineProps<{ space: string }>()
const link = (path = '') => tinkerfundPath(props.space, path)
const categories = useTinkerfundCategories()
const { view: cart } = await useTinkerfundCart()
const menu = useTemplateRef<HTMLDialogElement>('menu')
const closeOnBackdrop = (e: MouseEvent) => {
  if (e.target === menu.value) menu.value?.close()
}
</script>

<template>
  <header class="head">
    <div class="tf-wrap row">
      <button type="button" class="icon-btn menu-btn" aria-label="Menu" @click="menu?.showModal()">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>

      <TinkerfundWordmark :to="link()" />

      <nav class="nav" aria-label="Main">
        <NuxtLink :to="link('/discover')">Discover</NuxtLink>
        <button type="button" class="cats-btn" popovertarget="tf-categories">
          Categories
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
        </button>
        <div id="tf-categories" popover class="cats">
          <NuxtLink v-for="c in categories" :key="c.slug" :to="link(`/category/${c.slug}`)">
            {{ c.name }}
          </NuxtLink>
          <NuxtLink :to="link('/discover')">All Campaigns</NuxtLink>
        </div>
        <NuxtLink :to="link('/deals')">Deals</NuxtLink>
      </nav>

      <TinkerfundSearchField class="field" />

      <div class="tools">
        <NuxtLink class="icon-btn search-icon" :to="link('/search')" aria-label="Search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
        </NuxtLink>
        <NuxtLink class="cart" :to="link('/cart')" :aria-label="`Cart, ${formatTinkerfundItems(cart.count)}`">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2.5l2.2 11h10.6L20.5 8H7" /><circle cx="9.5" cy="19.5" r="1.3" /><circle cx="16.5" cy="19.5" r="1.3" /></svg>
          <span class="count">{{ cart.count }}</span>
        </NuxtLink>
        <NuxtLink class="icon-btn avatar" :to="link('/account')" aria-label="Your account">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="3.6" /><path d="M5 20c1.2-3.6 4-5.2 7-5.2s5.8 1.6 7 5.2" /></svg>
        </NuxtLink>
      </div>
    </div>

    <dialog ref="menu" class="menu" aria-label="Menu" @click="closeOnBackdrop">
      <div class="menu-body">
        <div class="menu-top">
          <TinkerfundWordmark :to="link()" />
          <button type="button" class="icon-btn" aria-label="Close menu" @click="menu?.close()">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <TinkerfundSearchField />
        <nav aria-label="Site" @click="menu?.close()">
          <NuxtLink :to="link('/discover')">Discover</NuxtLink>
          <p class="tf-label">Categories</p>
          <NuxtLink v-for="c in categories" :key="c.slug" class="sub" :to="link(`/category/${c.slug}`)">
            {{ c.name }}
          </NuxtLink>
          <NuxtLink :to="link('/deals')">Deals</NuxtLink>
          <NuxtLink :to="link('/how-it-works')">How it works</NuxtLink>
        </nav>
      </div>
    </dialog>
  </header>
</template>

<style scoped>
.head {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--tf-surface);
  border-bottom: var(--tf-hairline);
}
.row { display: flex; align-items: center; gap: 18px; min-height: 60px; }
svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

.nav { display: flex; gap: 4px; align-items: center; }
.nav > a, .cats-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 7px 10px;
  border: 0;
  border-radius: 6px;
  background: none;
  color: var(--tf-ink);
  font-size: 15px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: background-color var(--tf-dur) var(--tf-ease);
}
.nav > a:hover, .cats-btn:hover { background: var(--tf-bg); }
.cats-btn svg { width: 16px; height: 16px; }
.cats-btn { anchor-name: --tf-categories; }

.cats {
  position-anchor: --tf-categories;
  inset: auto;
  top: anchor(bottom);
  left: anchor(left);
  margin: 6px 0 0;
  padding: 6px;
  min-width: 200px;
  border: var(--tf-hairline);
  border-radius: var(--tf-radius);
  background: var(--tf-surface);
  color: var(--tf-ink);
  box-shadow: var(--tf-shadow);
  opacity: 1;
  translate: 0 0;
  transition: opacity var(--tf-dur) var(--tf-ease), translate var(--tf-dur) var(--tf-ease),
    overlay var(--tf-dur) allow-discrete, display var(--tf-dur) allow-discrete;
}
.cats:popover-open { display: grid; }
@starting-style { .cats:popover-open { opacity: 0; translate: 0 -4px; } }
@supports not (anchor-name: --a) {
  .cats { top: 64px; left: 50%; translate: -50% 0; }
}
.cats a { padding: 8px 10px; border-radius: 6px; color: var(--tf-ink); text-decoration: none; }
.cats a:hover { background: var(--tf-bg); }
.cats a:last-child { border-top: var(--tf-hairline); margin-top: 4px; font-family: var(--tf-mono); font-size: 13px; }

.field { flex: 1; min-width: 180px; }

.tools { display: flex; gap: 8px; align-items: center; margin-left: auto; }
.icon-btn {
  display: inline-grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: var(--tf-radius);
  background: none;
  color: var(--tf-ink);
  cursor: pointer;
}
.icon-btn:hover { background: var(--tf-bg); }
.avatar { border: var(--tf-hairline); border-radius: 50%; }
.cart {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 8px 12px;
  border-radius: var(--tf-radius);
  background: var(--tf-ink);
  color: var(--tf-surface);
  text-decoration: none;
}
.count {
  padding: 3px 6px;
  border-radius: 4px;
  background: var(--tf-accent);
  color: var(--tf-accent-ink);
  font: 600 12px/1 var(--tf-mono);
}

.menu-btn, .search-icon { display: none; }
@media (max-width: 859px) {
  .row { gap: 8px; }
  .nav, .field { display: none; }
  .menu-btn, .search-icon { display: inline-grid; }
}

.menu {
  margin: 0;
  width: min(360px, 88vw);
  max-width: none;
  height: 100dvh;
  max-height: none;
  padding: 0;
  border: 0;
  border-right: var(--tf-hairline);
  background: var(--tf-surface);
  color: var(--tf-ink);
  translate: 0 0;
  transition: translate var(--tf-dur) var(--tf-ease), overlay var(--tf-dur) allow-discrete,
    display var(--tf-dur) allow-discrete;
}
.menu:not([open]) { translate: -100% 0; }
@starting-style { .menu[open] { translate: -100% 0; } }
.menu::backdrop { background: rgb(0 0 0 / 0.45); }
.menu-body { display: grid; gap: 16px; padding: 16px; }
.menu-top { display: flex; justify-content: space-between; align-items: center; }
.menu nav { display: grid; }
.menu nav a { padding: 10px 0; border-bottom: var(--tf-hairline); color: var(--tf-ink); font-weight: 600; text-decoration: none; }
.menu nav a.sub { padding-left: 14px; font-weight: 400; }
.menu nav .tf-label { margin: 14px 0 4px; }
</style>
