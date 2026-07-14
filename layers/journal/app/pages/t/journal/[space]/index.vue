<script setup lang="ts">
// The Journal Tenant's Space-landing overview. A more specific route than the
// Platform's generic catch-all (`/t/[tenant]/[space]/[...slug]`), so it wins for
// the Space *root* only — individual Documents still render via the catch-all.
//
// Isolation-respecting and presentation-only: it resolves the Space to its keyed
// collections through the SAME shared, unit-tested resolver the catch-all uses
// (via the read-only useSpace composable — no isolation logic is duplicated or
// changed), then reads only `journal_<space>_{pages,skills,sessions}`. Spaces
// cannot leak.
//
// Pure aggregation/formatting lives in the layer-local, unit-tested
// `app/utils/dashboard.ts`; Nuxt auto-imports its exports, so the
// SFC keeps only the thin `computed()` wrappers below — under local names
// distinct from the exports, or the bindings merge and vue-tsc rejects the
// ambiguity (see dashboard.ts's header comment).
import { routingMap } from '#routing'
import type { SessionDoc, SkillDoc } from '../../../../types/journal'

const route = useRoute()
const tenant = 'journal'

// `useSpace` already carries this Tenant's own literal collection keys — the
// resolver derives them from the generated `#routing` type (shared/routing.ts)
// — so `queryCollection(collections.<name>)` keeps the journal item types
// with no casts.
const { space, pagesKey, collections } = useSpace(tenant)

// The resolver deliberately exposes only the one resolved Space, so read the map
// directly for the Space-toggle's list of sibling Spaces.
const spaces = Object.keys(routingMap[tenant])

const { data } = await useAsyncData(route.path, async () => {
  const pages = await queryCollection(pagesKey).all()
  const skills = await queryCollection(collections.skills).all()
  // Newest-first, ordered in SQL rather than re-sorted client-side.
  const sessions = await queryCollection(collections.sessions).order('endedAt', 'DESC').all()
  return { pages, skills, sessions }
})

// `.all()` returns the full page Documents with their parsed body, so the root's
// editorial intro AND each Digest's body are already loaded — Digests expand inline
// here with no extra request, consistent with the session cards (ADR-0010).
const allPages = computed(() => data.value?.pages ?? [])
const rootDoc = computed(() => allPages.value.find((p) => p.path === '/') ?? null)
const digests = computed(() => digestList(allPages.value))

// ── Newcomer on-ramp — labelled doors to the explainer pages ──
// Content-homed: a page opts in through its OWN frontmatter (`onramp` sort order
// plus `onrampLabel`/`onrampBlurb` teaser copy — see the `pages` schema), so
// adding or reordering a door needs no edit here. Isolation-respecting: sourced
// from THIS Space's own `pages`, so a page must exist in-Space to surface — the
// archived Space, lacking these pages, shows none.
const onrampCards = computed(() =>
  allPages.value
    .filter((p) => p.onramp != null && p.onrampLabel && p.path)
    .sort((a, b) => (a.onramp ?? 0) - (b.onramp ?? 0))
    .map((p) => ({
      key: p.path as string,
      title: p.onrampLabel as string,
      blurb: p.onrampBlurb,
      to: `/t/${tenant}/${space}${p.path}`,
    })),
)

// Page-wide accordion: a single item — one session card OR one digest — is open
// at a time, tracked by its deep-link anchor. Both inline feeds share this one
// piece of state, so opening either one collapses whatever else was open.
//
// The open anchor is mirrored to the URL hash so any open item is deep-linkable.
// The hash is the source of truth on load: fragments aren't sent to the server,
// so SSR always renders collapsed and `onMounted` opens the linked item on the
// client (no hydration mismatch — both start from `null`).
const openAnchor = ref<string | null>(null)
const isOpen = (anchor: string) => openAnchor.value === anchor

// replaceState (not `location.hash =`) so toggling neither floods history nor
// triggers the browser's native jump-to-anchor scroll — we scroll deliberately
// instead: pinTopAcrossTransition() on a click-triggered open, scrollToOpen()
// on a deep-link load (see each for why they differ).
const syncHash = (anchor: string | null) => {
  history.replaceState(history.state, '', anchor ? `${route.path}#${anchor}` : route.path)
}

const toggle = (anchor: string) => {
  const opening = !isOpen(anchor)
  const next = opening ? anchor : null
  // Captured BEFORE the state flips: the accordion is one-at-a-time, so opening
  // this item can close another one elsewhere on the page (above or below it),
  // reflowing everything between them. Comparing this item's own viewport
  // position before vs. after — rather than assuming a direction — covers every
  // case: another entry above collapsing out from under it, one below collapsing
  // with no effect on it, or (on a deep-linked reload) no prior entry at all.
  const el = opening ? document.getElementById(anchor) : null
  const beforeTop = el?.getBoundingClientRect().top ?? null
  openAnchor.value = next
  syncHash(next)
  // Closing needs no scroll — nothing above the (now-shorter) item moves.
  if (opening) nextTick(() => pinTopAcrossTransition(el, beforeTop))
}

// Holds the clicked item's own top at the exact screen position it was at
// before the click — a collapsing sibling elsewhere can shift it, but the item
// the user just acted on shouldn't visually jump. This item's own body and any
// sibling's collapse both animate their height now (expandTransition.ts), so
// the shift plays out over several frames rather than in one DOM patch —
// correcting once, right after the patch, would miss most of it. Each frame:
// counter-scroll instantly (never animated — an animated correction would show
// the very motion this hides, clamped to 0 for the same near-top-of-page
// reason as before) by whatever moved the item since the last frame, then
// check whether the item's OWN position in the document — independent of our
// own counter-scroll — is still changing; stop once it holds steady for a
// frame. The frame cap is a backstop against a runaway loop, not an expected path.
const pinTopAcrossTransition = (el: HTMLElement | null, beforeTop: number | null) => {
  if (!el || beforeTop == null) return
  let settledAt: number | null = null
  let frame = 0
  const step = () => {
    const rectTop = el.getBoundingClientRect().top
    const delta = rectTop - beforeTop
    if (delta) window.scrollTo({ top: Math.max(0, window.scrollY + delta), behavior: 'auto' })
    const documentTop = rectTop + window.scrollY // invariant to our own counter-scroll
    if (documentTop === settledAt || ++frame > 90) return
    settledAt = documentTop
    requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

const scrollToOpen = () => {
  if (!openAnchor.value) return
  const el = document.getElementById(openAnchor.value)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

const openFromHash = () => {
  const anchor = window.location.hash.slice(1)
  openAnchor.value = anchor || null
  if (anchor) nextTick(scrollToOpen)
}

onMounted(() => {
  openFromHash()
  // Honor a hash the user edits or an in-page anchor link. Our own replaceState
  // never fires hashchange, so this can't loop back on syncHash().
  window.addEventListener('hashchange', openFromHash)
})
onBeforeUnmount(() => window.removeEventListener('hashchange', openFromHash))
// No cast: `collections.skills`/`collections.sessions` are this Tenant's own
// literal collection keys, so `data.value.{skills,sessions}` already carry the
// real, generated item types — the SAME types `SkillDoc`/`SessionDoc` alias.
// A schema edit that drops a field now fails to typecheck right
// here instead of being silently erased by an `as unknown as` cast.
const skills = computed<SkillDoc[]>(() => data.value?.skills ?? [])
const sessions = computed<SessionDoc[]>(() => data.value?.sessions ?? [])

// ── Derived dashboard data — thin wrappers over the pure module ──
// The wrapped functions (sessionCardViews, frictionTotals, …) are dashboard.ts
// exports arriving via auto-import; each local name is distinct.
const sessionCards = computed(() => sessionCardViews(sessions.value))
const frictionSeverityTotals = computed(() => frictionTotals(sessions.value))
const totalFrictions = computed(() => frictionCount(sessions.value))
const sessionKindCounts = computed(() => kindCounts(sessions.value))
const referencedPrs = computed(() => prRefs(sessions.value))
const referencedPrParts = computed(() => prRefsParts(referencedPrs.value))

const platformSkills = computed(() => ownSkills(skills.value))
const externalSkillTotal = computed(() => externalSkillCount(skills.value))
const skillsHeading = computed(() => skillsLabel(externalSkillTotal.value))
const skillsSubtext = computed(() => skillsSub(platformSkills.value))
const groupedSkills = computed(() => skillGroups(platformSkills.value))

const title = computed(() => rootDoc.value?.title ?? `The Platform Journal — ${space}`)
const lede = computed(() => rootDoc.value?.description ?? `The ${space} Space of the journal Tenant.`)

useSeoMeta({
  title: () => `${title.value} · journal/${space}`,
  description: () => lede.value,
})
</script>

<template>
  <main class="jd">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <NuxtLink to="/">terrarium</NuxtLink>
      <span class="sep">/</span>
      <span>journal</span>
      <span class="sep">/</span>
      <span class="here">{{ space }}</span>
    </nav>

    <header class="masthead">
      <div>
        <h1>{{ title }}</h1>
        <p class="lede">{{ lede }}</p>
      </div>
      <div class="spaces">
        <div class="space-toggle" role="tablist" aria-label="Space">
          <NuxtLink
            v-for="s in spaces"
            :key="s"
            :to="`/t/journal/${s}`"
            role="tab"
            :aria-current="s === space ? 'page' : undefined"
          >
            <span class="dot" />{{ s }}
          </NuxtLink>
        </div>
        <div class="snapshot">
          <span class="live">live snapshot</span><br >
          updates as sessions are logged
        </div>
      </div>
    </header>

    <!-- Free-form editorial intro — the root page's Markdown body -->
    <section v-if="rootDoc" class="intro">
      <ContentRenderer :value="rootDoc" />
    </section>

    <!-- Newcomer on-ramp — the two explainer pages surfaced as visible doors, set
         between the intro and the data-heavy digests/feed below. -->
    <section v-if="onrampCards.length" class="onramp" aria-label="Start here">
      <p class="onramp-lead">New here? Start with the short version:</p>
      <div class="onramp-cards">
        <NuxtLink v-for="c in onrampCards" :key="c.key" :to="c.to" class="onramp-card">
          <span class="onramp-card-title">{{ c.title }}<span class="onramp-arrow" aria-hidden="true">→</span></span>
          <span class="onramp-blurb">{{ c.blurb }}</span>
        </NuxtLink>
      </div>
    </section>

    <!-- Daily digests — a plain-language, day-by-day recap of project activity -->
    <section v-if="digests.length" class="panel digests">
      <div class="section-head">
        <h2>Daily digests</h2>
        <span class="count">newest first</span>
      </div>
      <p class="panel-intro">
        A plain recap of what changed across the project each day — click any day
        to read the full story.
      </p>
      <ul class="digest-list">
        <li
          v-for="d in digests"
          :id="digestAnchor(d.date)"
          :key="d.doc.path"
          class="digest"
          :class="{ open: isOpen(digestAnchor(d.date)) }"
        >
          <JournalDisclosure
            class="drow"
            :expanded="isOpen(digestAnchor(d.date))"
            @toggle="toggle(digestAnchor(d.date))"
          >
            <span class="digest-date">{{ d.date }}</span>
            <span class="digest-summary">{{ d.summary }}</span>
            <JournalCopyLinkButton :anchor="digestAnchor(d.date)" label="Copy link to this digest" />
            <span class="caret" aria-hidden="true">{{ isOpen(digestAnchor(d.date)) ? '▾' : '▸' }}</span>
          </JournalDisclosure>
          <Transition :css="false" @enter="expandOnEnter" @leave="expandOnLeave">
            <div v-if="isOpen(digestAnchor(d.date))" class="digest-body-clip">
              <div class="digest-body">
                <ContentRenderer :value="d.doc" />
              </div>
            </div>
          </Transition>
        </li>
      </ul>
    </section>

    <!-- State of this Space -->
    <section class="tiles" aria-label="State of this Space">
      <JournalStatTile
        label="Sessions logged"
        :value="sessions.length"
        :sub="`${sessionKindCounts.interactive} interactive · ${sessionKindCounts.delegated} delegated · ${sessionKindCounts.autonomous} autonomous`"
      />
      <JournalStatTile
        :label="skillsHeading"
        :value="platformSkills.length"
        :sub="skillsSubtext"
      />
      <JournalStatTile
        label="Frictions surfaced"
        :value="totalFrictions"
        :sub="`${frictionSeverityTotals.blocker} blockers · ${frictionSeverityTotals.major} major`"
      />
      <JournalStatTile
        label="PRs referenced"
        :value="referencedPrs.length"
      >
        <template #sub>
          <template v-if="referencedPrParts.shown.length">
            <template v-for="(p, i) in referencedPrParts.shown" :key="p">
              <template v-if="i"> · </template><a class="pr-link" :href="prUrl(p)">#{{ p }}</a>
            </template>
            <template v-if="referencedPrParts.rest"> +{{ referencedPrParts.rest }} earlier</template>
          </template>
          <template v-else>none yet</template>
        </template>
      </JournalStatTile>
    </section>

    <div class="grid">
      <!-- Recent activity -->
      <section class="feed">
        <div class="section-head">
          <h2>Recent activity</h2>
          <span class="count">session logs, newest first</span>
        </div>
        <div v-if="sessionCards.length" class="cards">
          <JournalSessionCard
            v-for="c in sessionCards"
            :key="c.key"
            :card="c"
            :anchor="sessionAnchor(c.key)"
            :expanded="isOpen(sessionAnchor(c.key))"
            @toggle="toggle(sessionAnchor(c.key))"
          />
        </div>
        <p v-else class="empty">No sessions logged in this Space yet.</p>
      </section>

      <!-- Rail -->
      <aside class="rail">
        <section class="panel">
          <div class="section-head">
            <h2>Friction signal</h2>
            <span class="count">{{ totalFrictions }} across {{ sessions.length }} session{{ sessions.length === 1 ? '' : 's' }}</span>
          </div>
          <p class="panel-intro">
            Pain-points agents log about their own work — recorded so the
            platform can improve. More logged is better, not worse.
          </p>
          <JournalFrictionStrata :counts="frictionSeverityTotals" :total="totalFrictions" />
          <p v-if="totalFrictions" class="friction-note">
            Graded <span class="mono">nit → blocker</span>. These are
            pain-points agents honestly log about their own work, recorded so
            the platform can later spot recurring problems on its own.
          </p>
        </section>

        <section class="panel">
          <div class="section-head">
            <h2>Platform Skills</h2>
            <span class="count">{{ platformSkills.length }} authored here</span>
          </div>
          <JournalSkillInventory v-if="groupedSkills.length" :groups="groupedSkills" />
          <p v-else class="empty">No Platform Skills authored in this Space yet.</p>
          <p v-if="externalSkillTotal" class="skill-note">
            Backed by {{ externalSkillTotal }} general-engineering Skills from an
            external pack — <span class="mono">used</span>, not evolved here.
          </p>
        </section>
      </aside>
    </div>
  </main>
</template>

<style scoped>
/* The `.jd` tokens + base layout, `.mono`, and the breadcrumb live in the shared
   theme (layers/journal/app/assets/theme.css, registered globally in the layer's
   nuxt.config). This block holds only the landing-page-specific styling. */
.masthead {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem 2rem;
  align-items: start;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--jd-line);
}
h1 {
  font-family: var(--jd-serif);
  font-weight: 600;
  font-size: clamp(1.9rem, 4.2vw, 2.7rem);
  line-height: 1.05;
  letter-spacing: -0.01em;
  margin: 0 0 0.55rem;
  text-wrap: balance;
}
.lede { margin: 0; max-width: 54ch; color: var(--jd-muted); font-size: 1.02rem; }

.intro { margin: 1.6rem 0 0; max-width: 68ch; font-size: 1.04rem; }
.intro :deep(p) { margin: 0 0 0.8rem; color: var(--jd-muted); }
.intro :deep(p:last-child) { margin-bottom: 0; }
.intro :deep(a) { color: var(--jd-accent); text-decoration: none; }
.intro :deep(a:hover) { text-decoration: underline; }
.intro :deep(strong) { color: var(--jd-ink); font-weight: 600; }
.intro :deep(code) {
  font-family: var(--jd-mono);
  font-size: 0.88em;
  background: var(--jd-surface-2);
  padding: 0.1em 0.35em;
  border-radius: 4px;
}
.intro :deep(h2) {
  font-family: var(--jd-mono);
  font-size: 0.88rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--jd-ink);
  margin: 1.3rem 0 0.5rem;
}

.onramp { margin: 1.6rem 0 0; }
.onramp-lead {
  margin: 0 0 0.7rem;
  font-family: var(--jd-mono);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--jd-muted);
}
.onramp-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; }
.onramp-card {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.95rem 1.1rem;
  background: var(--jd-surface);
  border: 1px solid var(--jd-line);
  border-left: 3px solid var(--jd-accent);
  border-radius: var(--jd-radius);
  box-shadow: var(--jd-shadow);
  text-decoration: none;
  transition: border-color 0.15s ease, transform 0.15s ease, background-color 0.15s ease;
}
.onramp-card:hover {
  transform: translateY(-2px);
  background-color: color-mix(in srgb, var(--jd-accent) 5%, transparent);
}
.onramp-card-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 600;
  color: var(--jd-ink);
  font-size: 1rem;
}
.onramp-arrow { color: var(--jd-accent); transition: transform 0.15s ease; }
.onramp-card:hover .onramp-arrow { transform: translateX(3px); }
.onramp-blurb { color: var(--jd-muted); font-size: 0.88rem; line-height: 1.45; }

.spaces { display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-end; }
.space-toggle {
  display: inline-flex;
  background: var(--jd-surface-2);
  border: 1px solid var(--jd-line);
  border-radius: 999px;
  padding: 3px;
  font-family: var(--jd-mono);
  font-size: 0.8rem;
}
.space-toggle a {
  text-decoration: none;
  color: var(--jd-muted);
  padding: 0.28rem 0.8rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  text-transform: lowercase;
}
.space-toggle a[aria-current='page'] {
  background: var(--jd-surface);
  color: var(--jd-ink);
  box-shadow: var(--jd-shadow);
}
.space-toggle .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--jd-accent); }
.space-toggle a:not([aria-current='page']) .dot { background: var(--jd-faint); }
.snapshot { color: var(--jd-faint); font-size: 0.72rem; text-align: right; font-family: var(--jd-mono); }
.snapshot .live { color: var(--jd-accent); }
.snapshot .live::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--jd-accent);
  margin-right: 0.35rem;
  vertical-align: middle;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.9rem;
  margin: 1.75rem 0 2.25rem;
}

.pr-link { color: var(--jd-accent); text-decoration: none; }
.pr-link:hover { text-decoration: underline; }

.grid { display: grid; grid-template-columns: 1.7fr 1fr; gap: 1.6rem; align-items: start; }
.feed, .rail { min-width: 0; }

.digests { margin-top: 1.75rem; }
.panel-intro { margin: 0 0 0.95rem; max-width: 72ch; color: var(--jd-muted); font-size: 0.92rem; line-height: 1.5; }
.digest-list { list-style: none; margin: 0; padding: 0; }
/* scroll-margin-top: breathing room when a deep-linked digest is scrolled to the viewport top. */
.digest { border-top: 1px solid var(--jd-line); scroll-margin-top: 1.5rem; }
.digest:first-child { border-top: 0; }
.drow {
  display: grid;
  grid-template-columns: max-content 1fr max-content max-content;
  gap: 0.1rem 0.9rem;
  align-items: center;
  padding: 0.7rem 0;
  cursor: pointer;
  border-radius: 6px;
}
.drow:focus-visible { outline: 2px solid var(--jd-accent); outline-offset: 3px; }
.digest-date { font-family: var(--jd-mono); font-size: 0.82rem; color: var(--jd-accent); white-space: nowrap; }
.digest-summary { color: var(--jd-ink); font-size: 0.96rem; }
.caret { color: var(--jd-faint); font-size: 0.78rem; }

/* Open digest = the active row: mark it with an accent bar, faint tint, and a
   bolder summary. It previously dimmed its summary to `--jd-muted`, which read as
   disabled rather than expanded. */
.digest.open { background: color-mix(in srgb, var(--jd-accent) 7%, transparent); border-radius: 8px; }
.digest.open, .digest.open + .digest { border-top-color: transparent; }
.digest.open .drow { padding-inline: 0.85rem; box-shadow: inset 3px 0 0 var(--jd-accent); }
.digest.open .digest-summary { color: var(--jd-ink); font-weight: 600; }
.digest.open .caret { color: var(--jd-accent); }

/* The clip wrapper is what expandOnEnter/expandOnLeave (utils/expandTransition.ts)
   animate `height` on — it carries none of `.digest-body`'s own padding, so
   collapsing it to 0 needs no separate padding animation to reach a true zero size. */
.digest-body-clip { overflow: hidden; }
.digest-body { padding: 0 0.85rem 1rem; }
.digest-body :deep(h1) { display: none; } /* the row already shows the date */
.digest-body :deep(p) { margin: 0 0 0.7rem; color: var(--jd-muted); font-size: 0.95rem; line-height: 1.6; }
.digest-body :deep(p:last-child) { margin-bottom: 0; }
.digest-body :deep(a) { color: var(--jd-accent); text-decoration: none; }
.digest-body :deep(a:hover) { text-decoration: underline; }
.digest-body :deep(strong) { color: var(--jd-ink); font-weight: 600; }
.digest-body :deep(code) {
  font-family: var(--jd-mono);
  font-size: 0.85em;
  background: var(--jd-surface-2);
  padding: 0.1em 0.35em;
  border-radius: 4px;
}
.digest-body :deep(ul) { margin: 0 0 0.7rem; padding-left: 1.1rem; color: var(--jd-muted); }

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin: 0 0 1rem;
  padding-bottom: 0.55rem;
  border-bottom: 1px solid var(--jd-line);
}
.section-head h2 {
  margin: 0;
  font-family: var(--jd-mono);
  font-weight: 600;
  font-size: 0.78rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--jd-ink);
}
.section-head .count { color: var(--jd-faint); font-family: var(--jd-mono); font-size: 0.75rem; }

.cards { display: flex; flex-direction: column; gap: 0.85rem; min-width: 0; }
.empty { color: var(--jd-faint); font-size: 0.9rem; margin: 0; }

.rail { display: flex; flex-direction: column; gap: 1.6rem; }
.panel {
  background: var(--jd-surface);
  border: 1px solid var(--jd-line);
  border-radius: var(--jd-radius);
  padding: 1.1rem 1.15rem 1.2rem;
  box-shadow: var(--jd-shadow);
}
.friction-note { margin: 0.9rem 0 0; font-size: 0.82rem; color: var(--jd-muted); }
.friction-note .mono { color: var(--jd-ink); }
.skill-note { margin: 0.9rem 0 0; font-size: 0.8rem; color: var(--jd-muted); }
.skill-note .mono { color: var(--jd-ink); }

@media (max-width: 900px) {
  .tiles { grid-template-columns: repeat(2, 1fr); }
  .grid { grid-template-columns: 1fr; }
  .masthead { grid-template-columns: 1fr; }
  .spaces { align-items: flex-start; }
  .snapshot { text-align: left; }
  .onramp-cards { grid-template-columns: 1fr; }
}
@media (max-width: 460px) {
  .tiles { grid-template-columns: 1fr 1fr; }
}
</style>
