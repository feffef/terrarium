<script setup lang="ts">
// The trench face: a full-bleed section drawing under the Midden's masthead.
//
// Deliberately carries NO data — it is atmosphere, restoring the physicality the
// post-MVP simplification stripped when the landing went to pure type (CONTEXT.md's
// note at the foot). Because it states no fact, it is `aria-hidden`: there is
// nothing here a screen reader would be missing.
//
// Every coordinate is hard-coded rather than generated. A `Math.random()` waver
// would differ between the server render and the client hydration; the jitter here
// is authored once and identical in both.
</script>

<template>
  <svg
    class="midden-face__svg"
    viewBox="0 0 900 180"
    preserveAspectRatio="xMidYMid slice"
    width="100%"
    height="180"
    aria-hidden="true"
  >
    <defs>
      <pattern id="mf-hatch45" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="6" class="p-hair" />
      </pattern>
      <pattern id="mf-hatch315" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
        <line x1="0" y1="0" x2="0" y2="7" class="p-hair" />
      </pattern>
      <pattern id="mf-stip" width="5" height="5" patternUnits="userSpaceOnUse">
        <circle cx="1.4" cy="1.4" r="0.55" class="p-dot" />
      </pattern>
      <pattern id="mf-tick" width="16" height="16" patternUnits="userSpaceOnUse">
        <line x1="1" y1="4" x2="6.5" y2="4" class="p-tick" />
        <line x1="9" y1="12" x2="14.5" y2="12" class="p-tick" />
      </pattern>
    </defs>

    <!-- Five bands. The tonal rhythm (earth / paper / accent / paper / earth-2) is
         what separates the strata; the textures only add grain. An earlier pass
         separated them by texture alone and the light theme had no depth at all. -->
    <path class="f-earth" opacity="0.45" d="M0 0 L900 0 L900 37.6 L867 38.7 L833 40.4 L800 38.9 L767 36.6 L733 35.8 L700 36.9 L667 39.2 L633 41.8 L600 39.4 L567 36.6 L533 38 L500 39.9 L467 38.2 L433 35.8 L400 37.4 L367 36.1 L333 36.9 L300 34.8 L267 35.9 L233 38.3 L200 40.6 L167 38.8 L133 37.2 L100 39 L67 41.2 L33 39.8 L0 37.5 Z" />
    <path fill="url(#mf-hatch45)" opacity="0.45" d="M0 0 L900 0 L900 37.6 L867 38.7 L833 40.4 L800 38.9 L767 36.6 L733 35.8 L700 36.9 L667 39.2 L633 41.8 L600 39.4 L567 36.6 L533 38 L500 39.9 L467 38.2 L433 35.8 L400 37.4 L367 36.1 L333 36.9 L300 34.8 L267 35.9 L233 38.3 L200 40.6 L167 38.8 L133 37.2 L100 39 L67 41.2 L33 39.8 L0 37.5 Z" />

    <path fill="url(#mf-stip)" opacity="0.4" d="M0 37.5 L33 39.8 L67 41.2 L100 39 L133 37.2 L167 38.8 L200 40.6 L233 38.3 L267 35.9 L300 34.8 L333 36.9 L367 36.1 L400 37.4 L433 35.8 L467 38.2 L500 39.9 L533 38 L567 36.6 L600 39.4 L633 41.8 L667 39.2 L700 36.9 L733 35.8 L767 36.6 L800 38.9 L833 40.4 L867 38.7 L900 37.6 L900 74 L867 75.5 L833 77.2 L800 75.9 L767 74.1 L733 73 L700 71.6 L667 70.8 L633 70.1 L600 71.4 L567 73.5 L533 72.6 L500 74.2 L467 75.8 L433 74.4 L400 72.9 L367 71.8 L333 73.4 L300 75.6 L267 74.9 L233 72.8 L200 70.6 L167 71.9 L133 73.8 L100 72.4 L67 70.9 L33 72 L0 73.4 Z" />

    <path class="f-acc-soft" opacity="0.6" d="M0 73.4 L33 72 L67 70.9 L100 72.4 L133 73.8 L167 71.9 L200 70.6 L233 72.8 L267 74.9 L300 75.6 L333 73.4 L367 71.8 L400 72.9 L433 74.4 L467 75.8 L500 74.2 L533 72.6 L567 73.5 L600 71.4 L633 70.1 L667 70.8 L700 71.6 L733 73 L767 74.1 L800 75.9 L833 77.2 L867 75.5 L900 74 L900 106.2 L867 106.8 L833 107.6 L800 108.4 L767 110.1 L733 111.4 L700 110.3 L667 109.6 L633 107.1 L600 104.6 L567 105.9 L533 108.4 L500 110.6 L467 109.2 L433 106.6 L400 104.8 L367 105.4 L333 106.9 L300 109.4 L267 111.8 L233 110.9 L200 109.1 L167 110.2 L133 108.6 L100 109.8 L67 111.6 L33 110.4 L0 108.9 Z" />
    <path fill="url(#mf-tick)" opacity="0.5" d="M0 73.4 L33 72 L67 70.9 L100 72.4 L133 73.8 L167 71.9 L200 70.6 L233 72.8 L267 74.9 L300 75.6 L333 73.4 L367 71.8 L400 72.9 L433 74.4 L467 75.8 L500 74.2 L533 72.6 L567 73.5 L600 71.4 L633 70.1 L667 70.8 L700 71.6 L733 73 L767 74.1 L800 75.9 L833 77.2 L867 75.5 L900 74 L900 106.2 L867 106.8 L833 107.6 L800 108.4 L767 110.1 L733 111.4 L700 110.3 L667 109.6 L633 107.1 L600 104.6 L567 105.9 L533 108.4 L500 110.6 L467 109.2 L433 106.6 L400 104.8 L367 105.4 L333 106.9 L300 109.4 L267 111.8 L233 110.9 L200 109.1 L167 110.2 L133 108.6 L100 109.8 L67 111.6 L33 110.4 L0 108.9 Z" />

    <path fill="url(#mf-hatch315)" opacity="0.4" d="M0 108.9 L33 110.4 L67 111.6 L100 109.8 L133 108.6 L167 110.2 L200 109.1 L233 110.9 L267 111.8 L300 109.4 L333 106.9 L367 105.4 L400 104.8 L433 106.6 L467 109.2 L500 110.6 L533 108.4 L567 105.9 L600 104.6 L633 107.1 L667 109.6 L700 110.3 L733 111.4 L767 110.1 L800 108.4 L833 107.6 L867 106.8 L900 106.2 L900 145.8 L867 146.6 L833 147.4 L800 148.2 L767 146.9 L733 145.1 L700 143.8 L667 145.2 L633 147.4 L600 145.9 L567 144.1 L533 146.9 L500 149.6 L467 147.8 L433 144.4 L400 146.1 L367 147.2 L333 144.8 L300 142.6 L267 143.9 L233 147.6 L200 149.1 L167 147.4 L133 145.6 L100 147.1 L67 148.8 L33 147.9 L0 146.2 Z" />

    <path class="f-earth2" opacity="0.45" d="M0 146.2 L33 147.9 L67 148.8 L100 147.1 L133 145.6 L167 147.4 L200 149.1 L233 147.6 L267 143.9 L300 142.6 L333 144.8 L367 147.2 L400 146.1 L433 144.4 L467 147.8 L500 149.6 L533 146.9 L567 144.1 L600 145.9 L633 147.4 L667 145.2 L700 143.8 L733 145.1 L767 146.9 L800 148.2 L833 147.4 L867 146.6 L900 145.8 L900 180 L0 180 Z" />
    <path fill="url(#mf-stip)" opacity="0.55" d="M0 146.2 L33 147.9 L67 148.8 L100 147.1 L133 145.6 L167 147.4 L200 149.1 L233 147.6 L267 143.9 L300 142.6 L333 144.8 L367 147.2 L400 146.1 L433 144.4 L467 147.8 L500 149.6 L533 146.9 L567 144.1 L600 145.9 L633 147.4 L667 145.2 L700 143.8 L733 145.1 L767 146.9 L800 148.2 L833 147.4 L867 146.6 L900 145.8 L900 180 L0 180 Z" />

    <g class="f-none s-slate2" stroke-width="0.7" opacity="0.45">
      <polyline points="0,37.5 33,39.8 67,41.2 100,39 133,37.2 167,38.8 200,40.6 233,38.3 267,35.9 300,34.8 333,36.9 367,36.1 400,37.4 433,35.8 467,38.2 500,39.9 533,38 567,36.6 600,39.4 633,41.8 667,39.2 700,36.9 733,35.8 767,36.6 800,38.9 833,40.4 867,38.7 900,37.6" />
      <polyline points="0,73.4 33,72 67,70.9 100,72.4 133,73.8 167,71.9 200,70.6 233,72.8 267,74.9 300,75.6 333,73.4 367,71.8 400,72.9 433,74.4 467,75.8 500,74.2 533,72.6 567,73.5 600,71.4 633,70.1 667,70.8 700,71.6 733,73 767,74.1 800,75.9 833,77.2 867,75.5 900,74" />
      <polyline points="0,108.9 33,110.4 67,111.6 100,109.8 133,108.6 167,110.2 200,109.1 233,110.9 267,111.8 300,109.4 333,106.9 367,105.4 400,104.8 433,106.6 467,109.2 500,110.6 533,108.4 567,105.9 600,104.6 633,107.1 667,109.6 700,110.3 733,111.4 767,110.1 800,108.4 833,107.6 867,106.8 900,106.2" />
      <polyline points="0,146.2 33,147.9 67,148.8 100,147.1 133,145.6 167,147.4 200,149.1 233,147.6 267,143.9 300,142.6 333,144.8 367,147.2 400,146.1 433,144.4 467,147.8 500,149.6 533,146.9 567,144.1 600,145.9 633,147.4 667,145.2 700,143.8 733,145.1 767,146.9 800,148.2 833,147.4 867,146.6 900,145.8" />
    </g>

    <!-- Three half-buried finds, each crossing a boundary. The portion below its
         boundary is dashed: the drawing convention for an unexcavated part. All sit
         inside x 100-800 / y 34-146, the zone that survives the `slice` crop at
         every viewport width (narrow crops the sides, wide crops top and bottom). -->
    <g class="s-ink" opacity="0.55" fill="none">
      <path stroke-width="1.2" d="M247 42 Q272 53 289 74.8" />
      <path stroke-width="1.2" d="M242 50 Q265 61 280 77.5" />
      <path stroke-width="1.2" d="M247 42 Q240 41 242 50" />
      <g stroke-width="0.8">
        <line x1="251" y1="46.8" x2="248" y2="50.7" />
        <line x1="260.8" y1="51.5" x2="257.2" y2="56" />
        <line x1="269.8" y1="57.6" x2="266.2" y2="62.4" />
        <line x1="278.8" y1="65.4" x2="275.2" y2="69.6" />
      </g>
      <path stroke-width="1.2" stroke-dasharray="4 3" d="M289 74.8 Q299 90 303 110" />
      <path stroke-width="1.2" stroke-dasharray="4 3" d="M280 77.5 Q288 93 292 108" />
      <path stroke-width="1.2" stroke-dasharray="4 3" d="M303 110 L292 108" />

      <path stroke-width="2.6" d="M538 64 L558 61" />
      <path stroke-width="2.2" d="M547.5 63 C550 72 553 80 551.5 90 L552.5 105" />
      <path stroke-width="2.2" stroke-dasharray="4 3" d="M552.5 105 L547 120 L551 134" />

      <path stroke-width="1.2" stroke-linejoin="round" d="M696 44 L711 38 L723 66 L708 72 Z" />
      <path stroke-width="1.2" stroke-linejoin="round" stroke-dasharray="4 3" d="M708 72 L707 102 L722 96 L723 66" />
    </g>

    <!-- Pebble lenses and charcoal flecks, so the empty stretches read as sterile
         soil rather than as blank paper. -->
    <g class="f-none s-slate2" stroke-width="0.8" opacity="0.5">
      <path d="M395 54 Q399 51 403 53.5 Q405 56 401 57.5 Q396 58 395 54 Z" />
      <path d="M409 57 Q412 54.5 415.5 56 Q417 58.5 413.5 60 Q409.5 60 409 57 Z" />
      <path d="M402 61 Q404 59 407 60 Q409 62 406 63.5 Q402.5 63.5 402 61 Z" />
      <path d="M468 91 Q470.5 88.5 474 90 Q475.5 92.5 472 94 Q468.5 94 468 91 Z" />
      <path d="M346 124 Q350 120.5 355 123 Q357.5 126 353 128.5 Q347 129 346 124 Z" />
      <path d="M637 126 Q640 123 644.5 124.5 Q646.5 127.5 642.5 129.5 Q638 129.5 637 126 Z" />
    </g>
    <g class="s-ink" stroke-width="2" opacity="0.42" fill="none" stroke-linecap="round">
      <path d="M181 57 l4.5 2.5" />
      <path d="M191 62 l3 -3" />
      <path d="M199 54.5 l1.5 3.5" />
      <path d="M207 60 l4 0.5" />
    </g>

    <g class="s-ink" opacity="0.5">
      <line x1="118" y1="14" x2="118" y2="168" stroke-width="0.8" />
      <line x1="113" y1="39" x2="123" y2="39" stroke-width="0.8" />
      <line x1="113" y1="72" x2="123" y2="72" stroke-width="0.8" />
      <line x1="113" y1="110" x2="123" y2="110" stroke-width="0.8" />
      <line x1="113" y1="147" x2="123" y2="147" stroke-width="0.8" />
    </g>
  </svg>
</template>

<style scoped>
.midden-face__svg { display: block; }

/* Colour comes from classes referencing the theme tokens, never from `fill=`/
   `stroke=` attributes — that is what makes the dark-mode token flip carry here
   for free (theme.css). */
.f-none { fill: none; }
.f-earth { fill: var(--midden-earth); }
.f-earth2 { fill: var(--midden-earth-2); }
.f-acc-soft { fill: var(--midden-accent-soft); }
.s-ink { stroke: var(--midden-ink); }
.s-slate2 { stroke: var(--midden-slate-2); }
.p-hair { stroke: var(--midden-slate-2); stroke-width: 0.7; }
.p-dot { fill: var(--midden-slate-2); }
.p-tick { stroke: var(--midden-slate-2); stroke-width: 0.8; }
</style>
