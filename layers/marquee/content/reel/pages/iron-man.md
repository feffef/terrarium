---
title: "Iron Man"
description: A cave, a captor's workshop, and the exact moment a weapons dealer decides to make something else instead.
order: 3
publishedAt: 2026-07-17T09:40:00Z
illustration: |
  <defs>
    <linearGradient id="imx-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#221430"/>
      <stop offset="28%" stop-color="#43223e"/>
      <stop offset="52%" stop-color="#83403a"/>
      <stop offset="76%" stop-color="#bf6a33"/>
      <stop offset="100%" stop-color="#eda954"/>
    </linearGradient>
    <linearGradient id="imx-dune-far" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#9a5538"/>
      <stop offset="100%" stop-color="#71392a"/>
    </linearGradient>
    <linearGradient id="imx-dune-mid" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#63301f"/>
      <stop offset="100%" stop-color="#421f16"/>
    </linearGradient>
    <linearGradient id="imx-dune-near" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3a1c14"/>
      <stop offset="100%" stop-color="#22110d"/>
    </linearGradient>
    <linearGradient id="imx-rock" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1b1119"/>
      <stop offset="55%" stop-color="#110b10"/>
      <stop offset="100%" stop-color="#0a0709"/>
    </linearGradient>
    <linearGradient id="imx-floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#33180f"/>
      <stop offset="50%" stop-color="#1d0f0b"/>
      <stop offset="100%" stop-color="#0d0807"/>
    </linearGradient>
    <linearGradient id="imx-figure" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#261613"/>
      <stop offset="100%" stop-color="#100a0a"/>
    </linearGradient>
    <radialGradient id="imx-sun" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffe6ac" stop-opacity="0.95"/>
      <stop offset="40%" stop-color="#f3a75a" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#f3a75a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="imx-reactor" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f6ffff" stop-opacity="1"/>
      <stop offset="22%" stop-color="#c2f0f6" stop-opacity="0.9"/>
      <stop offset="55%" stop-color="#72c6d6" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#5db3c8" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="imx-forgeglow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffd98c" stop-opacity="0.95"/>
      <stop offset="40%" stop-color="#ec8438" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#c05a25" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="imx-floorpool" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f2a552" stop-opacity="0.5"/>
      <stop offset="55%" stop-color="#a4522a" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#a4522a" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="imx-haze" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e89a52" stop-opacity="0"/>
      <stop offset="100%" stop-color="#e89a52" stop-opacity="0.28"/>
    </linearGradient>
    <filter id="imx-blur10" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="10"/>
    </filter>
    <filter id="imx-blur4" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="4"/>
    </filter>
    <filter id="imx-blur1" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="1.1"/>
    </filter>
    <filter id="imx-grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0.9 0.9 0 0"/>
      <feComposite operator="in" in2="SourceGraphic"/>
    </filter>
    <filter id="imx-rocktex" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.018 0.032" numOctaves="4" seed="11" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="16" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="imx-dunetex" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.02 0.007" numOctaves="3" seed="4" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>

  <!-- ======== sky through the cave mouth ======== -->
  <rect x="0" y="0" width="400" height="600" fill="url(#imx-sky)"/>
  <!-- first stars in the plum dusk -->
  <g fill="#e8d8f0">
    <circle cx="150" cy="86" r="0.9" opacity="0.55"/>
    <circle cx="210" cy="64" r="0.7" opacity="0.4"/>
    <circle cx="258" cy="112" r="0.8" opacity="0.5"/>
    <circle cx="118" cy="140" r="0.6" opacity="0.35"/>
    <circle cx="285" cy="72" r="0.6" opacity="0.35"/>
    <circle cx="182" cy="128" r="0.5" opacity="0.3"/>
    <circle cx="240" cy="170" r="0.6" opacity="0.3"/>
  </g>
  <g filter="url(#imx-blur10)">
    <ellipse cx="130" cy="110" rx="160" ry="15" fill="#5a2a44" opacity="0.6"/>
    <ellipse cx="300" cy="150" rx="140" ry="12" fill="#6d3145" opacity="0.5"/>
    <ellipse cx="200" cy="200" rx="185" ry="14" fill="#93453a" opacity="0.55"/>
    <ellipse cx="100" cy="250" rx="150" ry="12" fill="#b25d34" opacity="0.5"/>
    <ellipse cx="280" cy="290" rx="170" ry="13" fill="#cd7a3e" opacity="0.5"/>
    <ellipse cx="170" cy="330" rx="200" ry="16" fill="#e29349" opacity="0.45"/>
  </g>
  <!-- low sun, sunk behind the far dune line -->
  <ellipse cx="150" cy="370" rx="160" ry="85" fill="url(#imx-sun)"/>
  <circle cx="150" cy="366" r="30" fill="#ffedbe" opacity="0.95" filter="url(#imx-blur4)"/>
  <ellipse cx="150" cy="354" rx="85" ry="2.6" fill="#ffe2a4" opacity="0.5" filter="url(#imx-blur1)"/>
  <ellipse cx="205" cy="342" rx="48" ry="1.8" fill="#f6c684" opacity="0.35" filter="url(#imx-blur1)"/>

  <!-- ======== layered dunes ======== -->
  <g filter="url(#imx-dunetex)">
    <path d="M-10 356 Q 60 334 140 350 T 290 342 T 410 336 V 470 H -10 Z" fill="url(#imx-dune-far)" opacity="0.9"/>
    <path d="M-10 388 Q 90 360 200 382 T 410 374 V 500 H -10 Z" fill="url(#imx-dune-mid)"/>
    <path d="M-10 420 Q 110 396 240 416 T 410 408 V 520 H -10 Z" fill="url(#imx-dune-near)"/>
  </g>
  <g stroke-linecap="round" fill="none" opacity="0.55">
    <path d="M18 353 Q 62 335 138 350" stroke="#f0a45e" stroke-width="1.3"/>
    <path d="M170 347 Q 235 337 292 343" stroke="#e0904e" stroke-width="1"/>
    <path d="M28 382 Q 92 362 198 382" stroke="#b56438" stroke-width="1.2"/>
    <path d="M240 380 Q 320 368 396 374" stroke="#a4562e" stroke-width="1"/>
  </g>
  <!-- warm haze where dunes meet the cave interior -->
  <rect x="0" y="330" width="400" height="110" fill="url(#imx-haze)"/>

  <!-- ======== cave floor ======== -->
  <path d="M-10 428 Q 120 416 210 426 T 410 422 V 610 H -10 Z" fill="url(#imx-floor)"/>
  <ellipse cx="185" cy="500" rx="175" ry="70" fill="url(#imx-floorpool)"/>
  <!-- scattered scrap, warm-rimmed toward the forge -->
  <g>
    <ellipse cx="96" cy="524" rx="17" ry="5.5" fill="#0e0806"/>
    <path d="M82 521 q 12 -3 26 -1" stroke="#c76f36" stroke-width="0.9" fill="none" opacity="0.6"/>
    <ellipse cx="304" cy="550" rx="21" ry="6" fill="#0d0706"/>
    <path d="M286 547 q 14 -4 30 -1" stroke="#a4562c" stroke-width="0.8" fill="none" opacity="0.45"/>
    <path d="M120 552 l 26 -5 4 5 -26 6 z" fill="#0e0806"/>
    <path d="M122 551 l 24 -4" stroke="#c76f36" stroke-width="0.8" fill="none" opacity="0.5"/>
    <ellipse cx="256" cy="572" rx="27" ry="6.5" fill="#0c0706"/>
    <path d="M56 570 l 20 -4 3 4 -20 5 z" fill="#0d0706"/>
    <ellipse cx="348" cy="586" rx="18" ry="5" fill="#0b0605"/>
    <!-- faint cool reactor scatter on the floor by the figure -->
    <ellipse cx="238" cy="512" rx="60" ry="14" fill="#6fc3d4" opacity="0.08" filter="url(#imx-blur4)"/>
    <!-- sand ripples across the lit floor -->
    <g stroke="#120908" fill="none" stroke-linecap="round" opacity="0.35">
      <path d="M78 508 q 60 -8 130 -3" stroke-width="1.1"/>
      <path d="M96 534 q 70 -8 150 -2" stroke-width="1.2"/>
      <path d="M140 562 q 80 -9 160 -2" stroke-width="1.2"/>
      <path d="M70 584 q 90 -10 190 -3" stroke-width="1.3"/>
    </g>
  </g>
  <!-- scrap mound in the right midground, against the cave wall -->
  <g fill="#1c0e0a">
    <path d="M296 446 Q 316 428 342 434 Q 366 438 374 450 L 376 456 L 292 456 Z"/>
    <path d="M306 436 l 20 -12 6 6 -18 12 z"/>
    <path d="M340 430 l 14 -6 8 8 -12 6 z"/>
  </g>
  <path d="M298 448 Q 318 432 340 435" stroke="#8c4526" stroke-width="1" fill="none" opacity="0.5" stroke-linecap="round"/>
  <!-- dust motes drifting in the sunset light -->
  <g fill="#ffdf9e" filter="url(#imx-blur1)">
    <circle cx="112" cy="330" r="1" opacity="0.5"/>
    <circle cx="158" cy="308" r="0.8" opacity="0.4"/>
    <circle cx="238" cy="322" r="0.9" opacity="0.45"/>
    <circle cx="196" cy="346" r="0.7" opacity="0.4"/>
    <circle cx="262" cy="356" r="0.8" opacity="0.35"/>
    <circle cx="128" cy="368" r="0.7" opacity="0.4"/>
    <circle cx="290" cy="398" r="0.8" opacity="0.3"/>
    <circle cx="96" cy="404" r="0.7" opacity="0.3"/>
  </g>

  <!-- ======== the forge: stone plinth + crucible ======== -->
  <ellipse cx="170" cy="452" rx="62" ry="42" fill="url(#imx-forgeglow)" opacity="0.8"/>
  <g fill="#150c0a">
    <!-- solid stone plinth -->
    <path d="M134 452 L 208 452 L 216 502 Q 172 510 126 502 Z"/>
    <!-- crucible sitting on the plinth -->
    <path d="M158 452 q 1 -13 14 -13 q 13 0 14 13 z"/>
    <!-- hammer leaning on the plinth -->
    <path d="M120 486 l -17 -24 3.5 -2.5 17 24 z"/>
    <path d="M100 464 l 13 -9 5.5 7.5 -13 9 z"/>
    <!-- scrap plate on the plinth -->
    <path d="M184 449 l 22 -6 4 5 -22 6 z"/>
  </g>
  <!-- warm top edge of the plinth -->
  <path d="M136 452 h 70" stroke="#e89550" stroke-width="1.3" opacity="0.55" stroke-linecap="round" fill="none"/>
  <!-- crucible hot spot + thin smoke wisp -->
  <circle cx="172" cy="443" r="22" fill="url(#imx-forgeglow)"/>
  <circle cx="172" cy="440" r="5.5" fill="#fff0c0" filter="url(#imx-blur1)"/>
  <path d="M170 432 q -8 -18 2 -34 q 10 -16 2 -34 q -6 -14 4 -26" fill="none" stroke="#e8b684" stroke-width="2.4" opacity="0.16" filter="url(#imx-blur4)"/>

  <!-- ======== kneeling figure, hunched low over the crucible ======== -->
  <g>
    <ellipse cx="262" cy="508" rx="80" ry="14" fill="#080404" opacity="0.4" filter="url(#imx-blur4)"/>
    <!-- reactor halo first, so the body and arms cut in front of it -->
    <circle cx="207" cy="404" r="34" fill="url(#imx-reactor)" opacity="0.9"/>
    <!-- torso + neck: back arched over the bowed head -->
    <path d="M192 380
             Q 202 364 222 356
             Q 248 346 272 358
             Q 290 370 296 398
             Q 303 428 302 458
             Q 301 486 294 504
             L 248 504
             Q 246 474 238 448
             Q 230 422 214 406
             Q 200 392 192 380 Z"
          fill="url(#imx-figure)"/>
    <!-- bowed head, face down toward the work; crown tucks under the back line -->
    <path d="M190 390
             Q 181 384 181 372
             Q 182 359 194 355
             Q 208 351 217 360
             Q 225 370 220 382
             Q 215 392 204 394
             Q 196 395 190 390 Z" fill="url(#imx-figure)"/>
    <path d="M200 358 Q 214 350 230 356 L 238 372 Q 220 360 206 368 Z" fill="url(#imx-figure)"/>
    <!-- near arm reaching down to the crucible -->
    <path d="M242 398
             Q 218 406 200 426
             Q 190 438 182 450
             L 196 459
             Q 206 444 219 430
             Q 235 414 252 406 Z" fill="#1c100e"/>
    <!-- kneeling legs: knee under, shin trailing back -->
    <path d="M250 504 Q 248 492 260 488 Q 280 484 300 490 Q 328 496 338 504 Q 342 509 334 510 L 252 510 Q 246 508 250 504 Z" fill="#120b0a"/>
    <!-- chest reactor: rough, improvised — set into the upper chest -->
    <circle cx="207" cy="404" r="14" fill="url(#imx-reactor)"/>
    <circle cx="207" cy="404" r="6" fill="#f2feff"/>
    <circle cx="207" cy="404" r="10" fill="none" stroke="#cdf2f8" stroke-width="1.4" opacity="0.9" stroke-dasharray="3.2 2.6"/>
    <path d="M211 396 q 8 -12 20 -16" fill="none" stroke="#8fd4e0" stroke-width="1.1" opacity="0.5"/>
    <!-- cool reactor spill up the chin and down the inner arm -->
    <path d="M192 386 Q 197 393 204 397" fill="none" stroke="#bfe9f0" stroke-width="1.3" opacity="0.6" stroke-linecap="round"/>
    <path d="M212 416 Q 222 428 230 442" fill="none" stroke="#9adcea" stroke-width="1.1" opacity="0.45" stroke-linecap="round"/>
    <!-- warm forge rim light on face/front -->
    <path d="M190 390 Q 181 384 181 372 Q 182 360 193 356" fill="none" stroke="#f6b168" stroke-width="1.6" opacity="0.85" stroke-linecap="round"/>
    <path d="M200 426 Q 191 437 183 449" fill="none" stroke="#f2a55c" stroke-width="1.5" opacity="0.75" stroke-linecap="round"/>
    <path d="M239 449 Q 244 474 247 502" fill="none" stroke="#e08c48" stroke-width="1.2" opacity="0.4" stroke-linecap="round"/>
    <!-- cool dusk rim along the arched back -->
    <path d="M232 355 Q 252 348 271 358 Q 289 370 295 398 Q 302 428 301 456 Q 300 486 294 502" fill="none" stroke="#c97a9a" stroke-width="1.4" opacity="0.45" stroke-linecap="round"/>
  </g>

  <!-- car battery on the floor, cabled up to the improvised chest light -->
  <g>
    <path d="M226 486 h 34 l 3 20 q -20 5 -40 0 Z" fill="#100908"/>
    <path d="M229 486 l -1 -5 h 8 v 5 z M 250 486 l 1 -5 h 8 l -1 5 z" fill="#0d0706"/>
    <path d="M228 487 h 30" stroke="#c76f36" stroke-width="0.9" opacity="0.5" fill="none" stroke-linecap="round"/>
    <path d="M233 482 Q 219 456 209 418" stroke="#0e0808" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M233 482 Q 219 456 209 418" stroke="#7fc9d8" stroke-width="0.7" fill="none" opacity="0.5" stroke-linecap="round"/>
    <path d="M255 482 Q 246 462 234 450" stroke="#0e0808" stroke-width="1.8" fill="none" stroke-linecap="round" opacity="0.9"/>
  </g>

  <!-- ======== welding sparks: bright burst, drooping tips ======== -->
  <g stroke-linecap="round" fill="none">
    <!-- short bright core burst -->
    <g stroke="#fff0c2" opacity="0.95">
      <path d="M172 440 l -10 -12" stroke-width="1.5"/>
      <path d="M172 440 l 9 -13" stroke-width="1.4"/>
      <path d="M172 440 l -14 -4" stroke-width="1.3"/>
      <path d="M172 440 l 14 -3" stroke-width="1.2"/>
      <path d="M172 440 l -2 -16" stroke-width="1.3"/>
    </g>
    <!-- spray: near-straight lines with a slight droop at the tip -->
    <g stroke="#ffd98c" opacity="0.85">
      <path d="M172 440 l -30 -26 q -6 -5 -13 -6" stroke-width="1.1"/>
      <path d="M172 440 l -40 -12 q -8 -2 -14 1" stroke-width="0.9"/>
      <path d="M172 440 l 24 -30 q 4 -6 11 -8" stroke-width="1"/>
      <path d="M172 440 l -14 -40 q -2 -8 -8 -12" stroke-width="0.9"/>
      <path d="M172 440 l 36 -14 q 7 -3 13 0" stroke-width="0.8"/>
      <path d="M172 440 l 6 -44 q 1 -8 -3 -14" stroke-width="0.7"/>
    </g>
    <!-- ember dots along and beyond the trails -->
    <g fill="#ffe6a8" stroke="none">
      <circle cx="124" cy="413" r="1.7"/>
      <circle cx="118" cy="435" r="1.4"/>
      <circle cx="214" cy="409" r="1.5"/>
      <circle cx="140" cy="389" r="1.3"/>
      <circle cx="216" cy="443" r="1.2"/>
      <circle cx="158" cy="380" r="1.1"/>
      <circle cx="172" cy="362" r="1"/>
      <circle cx="146" cy="352" r="0.9"/>
      <circle cx="188" cy="342" r="0.8"/>
    </g>
    <g fill="#ffcf86" stroke="none" opacity="0.7" filter="url(#imx-blur1)">
      <circle cx="112" cy="382" r="1.6"/>
      <circle cx="206" cy="356" r="1.4"/>
      <circle cx="176" cy="312" r="1.2"/>
      <circle cx="144" cy="300" r="1"/>
      <circle cx="196" cy="282" r="0.9"/>
    </g>
  </g>

  <!-- ======== cave arch: heavy organic masses framing everything ======== -->
  <g filter="url(#imx-rocktex)">
    <path d="M-10 -10 H 96 Q 66 60 80 130 Q 94 200 72 270 Q 50 340 70 420 Q 86 500 66 610 H -10 Z" fill="url(#imx-rock)"/>
    <path d="M410 -10 H 296 Q 330 54 318 128 Q 306 204 334 278 Q 358 348 340 430 Q 326 510 350 610 H 410 Z" fill="url(#imx-rock)"/>
    <!-- top mass: irregular craggy underside -->
    <path d="M-10 -10 H 410 V 70 Q 372 44 344 62 L 330 90 Q 320 58 288 52 L 270 76 Q 258 44 222 46 L 204 70 Q 192 38 158 42 L 144 66 Q 120 40 92 56 L 80 84 Q 48 40 -10 66 Z" fill="url(#imx-rock)"/>
    <g fill="none" stroke-linecap="round">
      <path d="M94 12 Q 68 64 81 132 Q 94 200 72 268" stroke="#d0703a" stroke-width="1.8" opacity="0.6"/>
      <path d="M72 272 Q 52 340 70 418" stroke="#b55c30" stroke-width="1.5" opacity="0.45"/>
      <path d="M298 8 Q 329 58 318 130 Q 308 202 333 274" stroke="#d0703a" stroke-width="1.8" opacity="0.6"/>
      <path d="M334 280 Q 357 348 341 428" stroke="#b55c30" stroke-width="1.5" opacity="0.45"/>
      <path d="M80 84 Q 92 58 118 52 M 144 66 Q 158 44 190 48 M 204 70 Q 222 48 256 52 M 270 76 Q 288 54 318 60 M 330 90 Q 344 64 372 56" stroke="#a34e2c" stroke-width="1.3" opacity="0.5"/>
      <path d="M70 424 Q 84 500 68 580" stroke="#7fc9d8" stroke-width="1.5" opacity="0.35"/>
      <path d="M340 434 Q 327 508 348 586" stroke="#7fc9d8" stroke-width="1.5" opacity="0.35"/>
    </g>
    <g stroke="#050304" stroke-width="1" fill="none" opacity="0.7">
      <path d="M34 110 q 16 34 5 72 q -9 32 7 66 q 10 24 2 52"/>
      <path d="M368 130 q -14 40 -3 76 q 9 30 -5 62"/>
      <path d="M150 20 q 22 16 50 12"/>
      <path d="M250 26 q 26 8 44 26"/>
    </g>
  </g>

  <!-- ======== atmosphere & grain ======== -->
  <ellipse cx="190" cy="430" rx="200" ry="160" fill="#e8934a" opacity="0.06" filter="url(#imx-blur10)"/>
  <ellipse cx="224" cy="416" rx="90" ry="70" fill="#7fd0de" opacity="0.05" filter="url(#imx-blur10)"/>
  <rect x="0" y="0" width="400" height="600" fill="#ffffff" opacity="0.05" filter="url(#imx-grain)"/>
  <rect x="0" y="0" width="400" height="600" fill="#190e14" opacity="0.1" style="mix-blend-mode:multiply"/>
---

There's a version of this saga's beginning that opens with a wormhole or a
tesseract or a god falling out of the sky. Instead the actual first spark, in
story order, is a billionaire arms manufacturer watching his own missile go off
in a crowd he sold it to, and building a very small, very bright thing in his
chest so he can keep having opinions about that afterward.

What holds up, watched here as chapter three rather than as the franchise's
technical starting point, is how *unglamorous* the invention itself is: two
men in a cave, scrap metal, a car battery, and a problem that has to be solved
today or not at all. The suit isn't handed to Tony Stark by circumstance — he
builds the ugly version first, badly, twice, before he ever builds the one on
the poster.

It's also, in hindsight, the quietest possible entry point for a story about
people who will eventually fight gods: everything here is grounded, mortal,
solvable with tools you could actually buy. That contrast is worth carrying
forward — it's the baseline the rest of the run keeps escalating past.
