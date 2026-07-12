---
title: Luciola mersa
description: the drowned star
commonName: the drowned star
classification: deepglow
rarity: uncommon
size: scarcely 1 cm
diet: motes in the water
activity:
  label: night
  bands: [[20, 24], [0, 4]]
phenology:
  phases:
    - name: few-lights
      label: the few lights
      span: [95, 146]
      gloss: the first lamps of the year, lit low and put out early, as though rationed.
    - name: full-constellation
      label: the full constellation
      span: [146, 246]
      gloss: eleven lights at middle depth on the good nights, counted twice and disagreed upon.
    - name: last-lamps
      label: the last lamps
      span: [246, 308]
      gloss: one by one the lights decline to rise; those that do burn later into the grey.
    - name: dowsed
      label: the dowsed months
      span: [308, 95]
      gloss: no light anywhere in the water; where a drowned star winters, the pool has not seen fit to tell us.
      quiet: true
signature:
  colors:
    - { name: drown gold, hex: "#d8b24a" }
    - { name: deep blue, hex: "#24425a" }
  gloss: drown gold in deep blue
plate:
  number: XI
illustration: |
  <g stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none">
    <!-- the surface, far above -->
    <path d="M22 48 q28 -8 56 0 q28 8 56 0 q28 -8 56 0 q28 8 56 0 q28 -8 56 0 q28 8 56 0" stroke-width="1.1" />
    <g stroke-width="0.7" opacity="0.5">
      <line x1="70" y1="56" x2="98" y2="56" />
      <line x1="182" y1="58" x2="212" y2="58" />
      <line x1="298" y1="55" x2="324" y2="55" />
    </g>
    <!-- the light that reaches down, thinning -->
    <g stroke-width="0.7" opacity="0.26">
      <line x1="150" y1="60" x2="182" y2="150" />
      <line x1="205" y1="60" x2="198" y2="150" />
      <line x1="256" y1="58" x2="220" y2="150" />
    </g>
    <!-- the deep, hatched -->
    <g stroke-width="0.7" opacity="0.42">
      <line x1="34" y1="254" x2="118" y2="254" />
      <line x1="282" y1="258" x2="366" y2="258" />
      <line x1="46" y1="268" x2="138" y2="268" />
      <line x1="264" y1="272" x2="354" y2="272" />
      <line x1="60" y1="282" x2="150" y2="282" />
      <line x1="252" y1="286" x2="342" y2="286" />
    </g>
    <!-- the swimmer, head up, hanging -->
    <path d="M200 106 q28 4 30 34 q2 26 -8 50 q-6 14 -22 24 q-16 -10 -22 -24 q-10 -24 -8 -50 q2 -30 30 -34 z" />
    <!-- the body, seen through: its rings -->
    <g stroke-width="0.8" opacity="0.6">
      <path d="M176 128 q24 7 48 0" />
      <path d="M171 146 q29 8 58 0" />
      <path d="M176 164 q24 7 48 0" />
      <path d="M182 182 q18 6 36 0" />
      <path d="M190 198 q10 4 20 0" />
    </g>
    <!-- the head, and its one eye -->
    <path d="M184 120 q16 -12 32 0" stroke-width="1" />
    <circle cx="200" cy="126" r="1.8" fill="currentColor" stroke="none" />
    <!-- antennae, held out -->
    <path d="M188 116 q-28 -10 -40 -38" stroke-width="1" />
    <path d="M212 116 q28 -10 40 -38" stroke-width="1" />
    <g stroke-width="0.6" opacity="0.7">
      <path d="M174 104 l-9 -2 M166 92 l-9 -2 M159 80 l-8 -1" />
      <path d="M226 104 l9 -2 M234 92 l9 -2 M241 80 l8 -1" />
    </g>
    <!-- swimming legs -->
    <g stroke-width="0.85" opacity="0.85">
      <path d="M174 150 q-18 2 -28 12" />
      <path d="M226 150 q18 2 28 12" />
      <path d="M176 166 q-16 4 -24 14" />
      <path d="M224 166 q16 4 24 14" />
    </g>
    <g stroke-width="0.6" opacity="0.6">
      <path d="M158 158 l-4 5 M150 162 l-4 5" />
      <path d="M242 158 l4 5 M250 162 l4 5" />
    </g>
    <!-- the tail fork, fringed -->
    <path d="M194 212 q-3 10 -9 16" stroke-width="0.9" />
    <path d="M206 212 q3 10 9 16" stroke-width="0.9" />
    <g stroke-width="0.7" opacity="0.8">
      <line x1="183" y1="230" x2="178" y2="240" />
      <line x1="192" y1="224" x2="190" y2="236" />
      <line x1="208" y1="224" x2="210" y2="236" />
      <line x1="217" y1="230" x2="222" y2="240" />
    </g>
    <!-- the dark the dim light does not reach -->
    <circle cx="200" cy="158" r="46" stroke-width="0.8" stroke-dasharray="1 7" opacity="0.22" />
    <!-- motes, its slow harvest -->
    <g stroke-width="0.8" opacity="0.55">
      <circle cx="112" cy="118" r="1.2" />
      <circle cx="300" cy="128" r="1.1" />
      <circle cx="96" cy="196" r="1" />
      <circle cx="306" cy="204" r="1.1" />
      <circle cx="132" cy="96" r="0.9" />
      <circle cx="286" cy="90" r="1" />
    </g>
    <g stroke-width="0.6" opacity="0.3" stroke-dasharray="1 4">
      <path d="M150 130 q22 6 40 18" />
      <path d="M250 132 q-22 6 -40 18" />
    </g>
  </g>
  <!-- the lamp: the one tinted feature -->
  <circle cx="200" cy="160" r="7" fill="var(--sig-1)" fill-opacity="0.32" stroke="var(--sig-1)" stroke-width="1.4" />
  <circle cx="200" cy="160" r="13" fill="none" stroke="var(--sig-1)" stroke-width="0.7" opacity="0.4" />
  <g stroke="var(--sig-1)" stroke-width="0.9" stroke-linecap="round" opacity="0.75" fill="none">
    <line x1="200" y1="148" x2="200" y2="140" />
    <line x1="189" y1="151" x2="182" y2="145" />
    <line x1="211" y1="151" x2="218" y2="145" />
    <line x1="187" y1="160" x2="178" y2="160" />
    <line x1="213" y1="160" x2="222" y2="160" />
    <line x1="189" y1="170" x2="182" y2="176" />
    <line x1="211" y1="170" x2="218" y2="176" />
  </g>
---

We took it, the first night, for the reflection of our own lamp, and moved the lamp to prove it. The light in the water did not move. It hung at middle depth, a small gold point burning under two hands' breadth of dark water, and it is a measure of the pool's character that our first thought was not that a creature glowed there, but that a star had come down, gone under, and not been put out.

By day there is nothing to find. The drowned star is a swimmer of scarcely a centimetre, pale and unremarkable when netted — we netted one, once, and felt so plainly that we had overstepped that we have not repeated it — and it spends the bright hours dowsed and hidden, often in the blue shadow of the glass snail's shell. It rises when the pool goes black, lights its lamp somewhere below the surface, and hangs there patient as a held breath, drifting less than a hand's width in an hour. The lamp is dim, and this appears to be the whole art of it: motes come to that gold point the way dust comes to a sunbeam, and the star gathers them at its leisure, having concluded — we think correctly — that it is better to be a rumour than an announcement.

How many lamps the water shows, and whether it shows any at all, the year answers differently each time it is asked — and the star keeps its own count, not ours: the few lights, the full constellation, the last lamps, and the dowsed months in which the water shows none. Turn the almanac to move through them; the seasons on the rim only say where in our shared year each of the star's falls.

::almanac
::

:::phase-note{of="few-lights"}
The first lamps of the year, lit low and put out early, as though rationed against a shortage only the star can feel. One appears, then another a night or two later, never yet the constellation — the pool is only clearing its throat.

::sighting{date="2026-04-26"}
::

They come a little more freely as the season turns, though still few, and still shy of the draught: on the open-lidded nights they hang a little deeper, as if the moving air were something to burn beneath, and we count three, four, lose them to a passing ripple, and are content to have counted at all.
:::

:::phase-note{of="full-constellation"}
This is the full constellation, the water warmest and most of the year's lamps lit at once. We recorded eleven lights one night and could not swear to more than four the next; whether they dowse, disperse, or merely decline to be counted twice we cannot say, and the counting is at its most hopeless just here, when there is most to count. The ledger keeps our arithmetic and our doubts in the one line:

::sighting{date="2026-06-26"}
::

Even at the height of the season some lamp is slow to be put out. On more than one midsummer dawn one has still been faintly alight at first grey, like a lamp forgotten in a distant room, and we have learned to leave it be:

::sighting{date="2026-07-06"}
::
:::

:::phase-note{of="last-lamps"}
With the keeper's holiday and the lapse in the misting the count begins to fall: one by one the lights decline to rise, and those that do burn later into the grey, as though husbanding what warmth the cooling water still holds. The constellation loses its outlying stars first, from the shallows inward.

::sighting{date="2026-09-18"}
::

After the great cleaning the last lamps keep to the deepest water and the latest hours; they come singly now, and later each night, until the water more often than not shows nothing at all.
:::

:::phase-note{of="dowsed"}
Then the lamps have gone out, one by one, wherever it is they go, and no light shows anywhere in the water. Where a drowned star winters — whether it dowses in the mud, or goes wherever the pool sends the things it is done showing us for a while — the pool has not seen fit to tell us. We record the dark water as dark water, and leave the corner unwatched a while.
:::
