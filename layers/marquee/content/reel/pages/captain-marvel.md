---
title: "Captain Marvel"
description: A photon blast, a nineties Blockbuster, and a war that started long before anyone on Earth noticed.
order: 2
publishedAt: 2026-07-17T09:20:00Z
illustration: |
  <defs>
    <linearGradient id="cmv-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0b0824"/>
      <stop offset="34%" stop-color="#221543"/>
      <stop offset="62%" stop-color="#31234f"/>
      <stop offset="80%" stop-color="#1c3a52"/>
      <stop offset="100%" stop-color="#0e2f3d"/>
    </linearGradient>
    <radialGradient id="cmv-neb-purple" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#8a55b8" stop-opacity="0.55"/>
      <stop offset="55%" stop-color="#6a3f9e" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#6a3f9e" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="cmv-neb-magenta" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#c46ad4" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#c46ad4" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="cmv-neb-teal" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#2e8ca0" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="#2e8ca0" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="cmv-burst-core" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fffdf2" stop-opacity="1"/>
      <stop offset="22%" stop-color="#ffe9ad" stop-opacity="0.95"/>
      <stop offset="55%" stop-color="#f6b95e" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#f2a248" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="cmv-burst-halo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f8cf7e" stop-opacity="0.5"/>
      <stop offset="60%" stop-color="#e79a4f" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#e79a4f" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="cmv-trail" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="#f4b860" stop-opacity="0"/>
      <stop offset="45%" stop-color="#f6c878" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#ffe9b0" stop-opacity="0.95"/>
    </linearGradient>
    <linearGradient id="cmv-dusk" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f2955c" stop-opacity="0"/>
      <stop offset="55%" stop-color="#e97f5a" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="#d95f52" stop-opacity="0.66"/>
    </linearGradient>
    <radialGradient id="cmv-vig" cx="50%" cy="46%" r="72%">
      <stop offset="62%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#05030f" stop-opacity="0.55"/>
    </radialGradient>
    <filter id="cmv-blur-md" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="8"/>
    </filter>
    <filter id="cmv-blur-sm" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="2.5"/>
    </filter>
    <filter id="cmv-grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.4 0.4 0.4 0 0"/>
      <feComposite operator="in" in2="SourceGraphic"/>
    </filter>
    <filter id="cmv-cloud" x="-30%" y="-30%" width="160%" height="160%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="3" seed="11" result="t"/>
      <feDisplacementMap in="SourceGraphic" in2="t" scale="60"/>
      <feGaussianBlur stdDeviation="6"/>
    </filter>
  </defs>
  <!-- deep space base -->
  <rect x="0" y="0" width="400" height="600" fill="url(#cmv-sky)"/>
  <!-- nebula cloud masses, displaced + blurred for painterly softness -->
  <g filter="url(#cmv-cloud)">
    <ellipse cx="290" cy="120" rx="180" ry="110" fill="url(#cmv-neb-purple)"/>
    <ellipse cx="110" cy="70" rx="140" ry="80" fill="url(#cmv-neb-magenta)"/>
    <ellipse cx="70" cy="250" rx="130" ry="100" fill="url(#cmv-neb-teal)"/>
    <ellipse cx="330" cy="300" rx="120" ry="90" fill="url(#cmv-neb-teal)"/>
    <ellipse cx="210" cy="180" rx="90" ry="60" fill="url(#cmv-neb-magenta)"/>
  </g>
  <!-- star field -->
  <g fill="#f4efe0">
    <circle cx="42" cy="48" r="1.3" opacity="0.9"/>
    <circle cx="88" cy="112" r="0.9" opacity="0.6"/>
    <circle cx="140" cy="52" r="1.1" opacity="0.75"/>
    <circle cx="196" cy="90" r="0.8" opacity="0.55"/>
    <circle cx="248" cy="40" r="1.4" opacity="0.9"/>
    <circle cx="306" cy="76" r="1" opacity="0.65"/>
    <circle cx="356" cy="40" r="1.2" opacity="0.85"/>
    <circle cx="372" cy="140" r="0.9" opacity="0.6"/>
    <circle cx="330" cy="190" r="1.1" opacity="0.7"/>
    <circle cx="30" cy="180" r="1" opacity="0.7"/>
    <circle cx="66" cy="300" r="1.2" opacity="0.75"/>
    <circle cx="120" cy="230" r="0.8" opacity="0.5"/>
    <circle cx="352" cy="260" r="0.9" opacity="0.6"/>
    <circle cx="26" cy="390" r="1" opacity="0.55"/>
    <circle cx="374" cy="360" r="1.1" opacity="0.6"/>
    <circle cx="160" cy="150" r="0.7" opacity="0.45"/>
    <circle cx="270" cy="150" r="0.8" opacity="0.5"/>
    <circle cx="220" cy="240" r="0.7" opacity="0.4"/>
    <circle cx="114" cy="360" r="0.9" opacity="0.5"/>
    <circle cx="316" cy="400" r="0.8" opacity="0.45"/>
  </g>
  <!-- brighter glint stars -->
  <g stroke="#fdf6e3" stroke-linecap="round" opacity="0.9">
    <g stroke-width="1.2"><path d="M 84 60 v 8 M 80 64 h 8"/></g>
    <g stroke-width="1"><path d="M 322 118 v 7 M 318.5 121.5 h 7"/></g>
    <g stroke-width="1"><path d="M 52 336 v 6 M 49 339 h 6"/></g>
    <g stroke-width="1"><path d="M 350 330 v 6 M 347 333 h 6"/></g>
  </g>
  <!-- distant skirmish: tiny craft glints streaking through the nebula, far off -->
  <g stroke-linecap="round">
    <path d="M 330 96 l 16 -5" stroke="#9fe8e0" stroke-width="1.6" opacity="0.75"/>
    <path d="M 316 100 l 10 -3" stroke="#9fe8e0" stroke-width="1" opacity="0.4"/>
    <path d="M 96 176 l 14 4" stroke="#e8b7f0" stroke-width="1.4" opacity="0.65"/>
    <path d="M 84 173 l 8 2" stroke="#e8b7f0" stroke-width="0.9" opacity="0.35"/>
    <path d="M 236 128 l 12 -2" stroke="#9fe8e0" stroke-width="1.2" opacity="0.5"/>
  </g>
  <!-- 1990s dusk horizon: warm glow, power lines, rooflines, neon -->
  <rect x="0" y="430" width="400" height="170" fill="url(#cmv-dusk)"/>
  <ellipse cx="200" cy="522" rx="240" ry="42" fill="#f2955c" opacity="0.22" filter="url(#cmv-blur-md)"/>
  <ellipse cx="120" cy="530" rx="120" ry="24" fill="#ffb46e" opacity="0.14" filter="url(#cmv-blur-md)"/>
  <!-- power poles + sagging lines, against the dusk glow -->
  <g stroke="#0d0820" fill="none">
    <path d="M 322 460 L 322 540" stroke-width="3"/>
    <path d="M 306 468 L 338 468 M 309 476 L 335 476" stroke-width="2"/>
    <path d="M 120 478 L 120 546" stroke-width="2.6"/>
    <path d="M 107 484 L 133 484" stroke-width="1.8"/>
    <path d="M -10 474 Q 60 494 120 484 Q 220 468 322 468 Q 370 468 410 478" stroke-width="1.1" opacity="0.9"/>
    <path d="M -10 484 Q 60 502 120 492 Q 220 478 322 476 Q 370 476 410 486" stroke-width="1" opacity="0.8"/>
  </g>
  <!-- roofline silhouette -->
  <g fill="#0e0922">
    <path d="M 0 522 L 0 600 L 400 600 L 400 526 L 384 526 L 384 516 L 352 516 L 352 530 L 300 530 L 300 508 L 290 508 L 290 502 L 284 502 L 284 508 L 258 508 L 258 532 L 224 532 L 224 518 L 206 518 L 206 510 L 170 510 L 170 528 L 132 528 L 132 516 L 118 516 L 118 534 L 78 534 L 78 522 L 40 522 L 40 530 L 0 530 Z"/>
    <rect x="212" y="494" width="4" height="18"/>
    <rect x="208" y="494" width="12" height="2.5"/>
  </g>
  <!-- lit windows + neon sign glow hints -->
  <g filter="url(#cmv-blur-sm)">
    <rect x="248" y="542" width="34" height="9" fill="#4fd8d0" opacity="0.85"/>
    <rect x="66" y="548" width="26" height="8" fill="#f27ba0" opacity="0.8"/>
    <rect x="330" y="552" width="18" height="6" fill="#f2b25c" opacity="0.7"/>
  </g>
  <g fill="#ffd98e" opacity="0.55">
    <rect x="96" y="544" width="5" height="6"/>
    <rect x="186" y="538" width="5" height="7"/>
    <rect x="196" y="538" width="5" height="7"/>
    <rect x="300" y="540" width="4" height="6"/>
    <rect x="368" y="536" width="5" height="6"/>
  </g>
  <!-- photon light-trail arc: her flight path, sweeping up from the streets to her trailing feet -->
  <g fill="none" stroke-linecap="round">
    <path d="M -36 574 C 34 566 66 478 124 392" stroke="url(#cmv-trail)" stroke-width="16" opacity="0.35" filter="url(#cmv-blur-md)"/>
    <path d="M -36 574 C 34 566 66 478 124 392" stroke="url(#cmv-trail)" stroke-width="4.5" opacity="0.9"/>
    <path d="M -36 574 C 34 566 66 478 124 392" stroke="#fff6dd" stroke-width="1.4" opacity="0.95"/>
  </g>
  <!-- sparks along the trail -->
  <g fill="#ffe9b0">
    <circle cx="40" cy="546" r="1.6" opacity="0.9"/>
    <circle cx="58" cy="500" r="1.2" opacity="0.7"/>
    <circle cx="84" cy="452" r="1.4" opacity="0.8"/>
    <circle cx="112" cy="410" r="1.1" opacity="0.7"/>
    <circle cx="8" cy="560" r="1.3" opacity="0.6"/>
  </g>
  <!-- photon burst -->
  <circle cx="252" cy="262" r="115" fill="url(#cmv-burst-halo)"/>
  <circle cx="252" cy="262" r="58" fill="url(#cmv-burst-core)"/>
  <circle cx="252" cy="262" r="44" fill="none" stroke="#ffdf9a" stroke-width="1.5" opacity="0.35" filter="url(#cmv-blur-sm)"/>
  <g stroke="#ffe9ad" stroke-linecap="round" filter="url(#cmv-blur-sm)">
    <path d="M 284 240 L 322 214" stroke-width="2.4" opacity="0.8"/>
    <path d="M 292 266 L 344 272" stroke-width="2" opacity="0.7"/>
    <path d="M 280 292 L 312 322" stroke-width="2.2" opacity="0.75"/>
    <path d="M 256 224 L 262 186" stroke-width="1.8" opacity="0.7"/>
    <path d="M 230 234 L 210 210" stroke-width="1.6" opacity="0.55"/>
  </g>
  <g fill="#ffe9b0">
    <circle cx="330" cy="230" r="1.6" opacity="0.85"/>
    <circle cx="348" cy="286" r="1.3" opacity="0.7"/>
    <circle cx="306" cy="336" r="1.4" opacity="0.7"/>
    <circle cx="268" cy="176" r="1.2" opacity="0.65"/>
  </g>
  <!-- hovering figure: gesture-stroke silhouette, flying up-right, fists into the burst -->
  <g transform="translate(182,312) rotate(-33)">
    <g stroke="#161031" fill="none" stroke-linecap="round">
      <path d="M -8 0 Q 12 -6 30 -6" stroke-width="24"/>
      <path d="M 26 -12 Q 56 -14 84 -10" stroke-width="9.5"/>
      <path d="M 24 2 Q 54 2 80 0" stroke-width="9"/>
      <path d="M -10 -2 Q -46 6 -82 28" stroke-width="12"/>
      <path d="M -70 20 Q -86 28 -98 38" stroke-width="6"/>
      <path d="M -10 4 Q -32 14 -46 30" stroke-width="11"/>
      <path d="M -44 28 Q -54 38 -62 42" stroke-width="6.5"/>
    </g>
    <circle cx="44" cy="-25" r="12" fill="#161031"/>
    <circle cx="86" cy="-10" r="6" fill="#161031"/>
    <circle cx="82" cy="1" r="5.5" fill="#161031"/>
    <!-- warm rim light on the burst side -->
    <g stroke="#ffdf9a" fill="none" stroke-linecap="round" filter="url(#cmv-blur-sm)">
      <path d="M 36 -34 Q 46 -38 55 -29" stroke-width="2.6" opacity="1"/>
      <path d="M 30 -16 Q 58 -19 82 -14" stroke-width="2.2" opacity="0.95"/>
      <path d="M -6 -11 Q 12 -18 26 -17" stroke-width="2.4" opacity="0.85"/>
      <path d="M 28 8 Q 54 8 78 5" stroke-width="1.8" opacity="0.8"/>
      <path d="M -44 22 Q -24 10 -12 4" stroke-width="1.8" opacity="0.6"/>
    </g>
  </g>
  <!-- glow at fists -->
  <circle cx="250" cy="262" r="14" fill="#fffdf2" filter="url(#cmv-blur-sm)"/>
  <!-- Goose, sitting on the rooftop corner, head tipped up to watch her go -->
  <g transform="translate(52,522) scale(1.15)">
    <g fill="#0d081e">
      <path d="M -14 12 Q -17 -8 -2 -12 Q 12 -9 13 12 Z"/>
      <circle cx="4" cy="-18" r="8.5"/>
      <path d="M -3 -24 L -7 -34 L 3 -26 Z"/>
      <path d="M 9 -25 L 15 -33 L 15 -22 Z"/>
      <path d="M 12 10 Q 30 8 30 -8" fill="none" stroke="#0d081e" stroke-width="4.5" stroke-linecap="round"/>
    </g>
  </g>
  <!-- fine painterly grain + vignette -->
  <rect x="0" y="0" width="400" height="600" filter="url(#cmv-grain)" opacity="0.05"/>
  <rect x="0" y="0" width="400" height="600" fill="url(#cmv-vig)"/>
---

By the time we meet Carol Danvers, decades of this saga have already happened
somewhere else, off-screen, on the other side of a war Earth never knew it was
adjacent to. That's the whole point of watching this second: it recontextualizes
everything after — an organization has been quietly watching this planet for
years before anyone here ever put on a suit.

The film itself is a rescue mission wearing a blockbuster's clothes: a woman
spends the whole runtime being told, gently and not so gently, what she's
allowed to feel and how much power she's allowed to use, and the plot's actual
climax is her deciding those instructions were never really about her safety.
It's also, unapologetically, a hangout movie about a fighter pilot and her best
friend, dropped into a nineties strip mall with a photon deck stuck in a Radio
Shack — light on its feet in exactly the moments the stakes could have made it
grim.

Watched here, first in the timeline but for a story that starts with someone
already fully formed, it reads less like an origin and more like a long-overdue
correction to one.
