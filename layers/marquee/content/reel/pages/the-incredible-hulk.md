---
title: "The Incredible Hulk"
description: A fugitive scientist, a rain-soaked city, and a rage he can't afford to let out.
order: 5
publishedAt: 2026-07-17T10:20:00Z
illustration: |
  <defs>
    <linearGradient id="hu-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#050f0c"/>
      <stop offset="26%" stop-color="#0c231c"/>
      <stop offset="50%" stop-color="#16463a"/>
      <stop offset="68%" stop-color="#0f3129"/>
      <stop offset="100%" stop-color="#061410"/>
    </linearGradient>
    <radialGradient id="hu-moonhalo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#eef6db" stop-opacity="0.95"/>
      <stop offset="16%" stop-color="#d5e8c0" stop-opacity="0.6"/>
      <stop offset="42%" stop-color="#a3cfa8" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#a3cfa8" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="hu-moondisc" cx="42%" cy="38%" r="65%">
      <stop offset="0%" stop-color="#f8fcee"/>
      <stop offset="65%" stop-color="#dceac8"/>
      <stop offset="100%" stop-color="#b8d0a6"/>
    </radialGradient>
    <radialGradient id="hu-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#c8ffd6" stop-opacity="0.95"/>
      <stop offset="22%" stop-color="#7deda0" stop-opacity="0.6"/>
      <stop offset="55%" stop-color="#3cb46e" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#3cb46e" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="hu-hill-far" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#123c30"/>
      <stop offset="100%" stop-color="#0b2820"/>
    </linearGradient>
    <linearGradient id="hu-hill-mid" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0c2a21"/>
      <stop offset="100%" stop-color="#071a14"/>
    </linearGradient>
    <linearGradient id="hu-street" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0f2c21"/>
      <stop offset="40%" stop-color="#15402e"/>
      <stop offset="100%" stop-color="#0e2b1e"/>
    </linearGradient>
    <linearGradient id="hu-figure" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#13241c"/>
      <stop offset="60%" stop-color="#0b1712"/>
      <stop offset="100%" stop-color="#050d09"/>
    </linearGradient>
    <linearGradient id="hu-reflect" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#6fe89b" stop-opacity="0.65"/>
      <stop offset="100%" stop-color="#6fe89b" stop-opacity="0"/>
    </linearGradient>
    <filter id="hu-soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="7"/>
    </filter>
    <filter id="hu-soft2" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="1.8"/>
    </filter>
    <filter id="hu-clouds" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.011 0.028" numOctaves="4" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="46"/>
      <feGaussianBlur stdDeviation="2.6"/>
    </filter>
    <filter id="hu-mist" x="-30%" y="-30%" width="160%" height="160%">
      <feTurbulence type="fractalNoise" baseFrequency="0.009 0.03" numOctaves="3" seed="11" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="55"/>
      <feGaussianBlur stdDeviation="6"/>
    </filter>
    <filter id="hu-paper">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.4 0.4 0.4 0 0"/>
      <feComposite operator="in" in2="SourceGraphic"/>
    </filter>
    <radialGradient id="hu-vignette" cx="50%" cy="46%" r="74%">
      <stop offset="0%" stop-color="#000" stop-opacity="0"/>
      <stop offset="72%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.34"/>
    </radialGradient>
    <linearGradient id="hu-sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#57d181" stop-opacity="0.03"/>
      <stop offset="45%" stop-color="#3fbf72" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#4fce7e" stop-opacity="0.18"/>
    </linearGradient>
  </defs>

  <!-- sky -->
  <rect x="0" y="0" width="400" height="600" fill="url(#hu-sky)"/>

  <!-- moon + halo -->
  <circle cx="286" cy="102" r="130" fill="url(#hu-moonhalo)"/>
  <circle cx="286" cy="102" r="36" fill="url(#hu-moondisc)"/>
  <!-- cloud bands dragged across the moon -->
  <g filter="url(#hu-clouds)">
    <ellipse cx="240" cy="86" rx="150" ry="15" fill="#07160f" opacity="0.7"/>
    <ellipse cx="320" cy="116" rx="170" ry="13" fill="#091b13" opacity="0.75"/>
    <ellipse cx="170" cy="146" rx="200" ry="18" fill="#05120d" opacity="0.65"/>
    <ellipse cx="300" cy="52" rx="160" ry="11" fill="#081912" opacity="0.55"/>
    <ellipse cx="90" cy="60" rx="140" ry="20" fill="#04100b" opacity="0.6"/>
  </g>

  <!-- far ridge: hillside favela climbing left slope -->
  <g>
    <path d="M0 208 L 26 218 L 48 202 L 74 216 L 96 200 L 122 214 L 148 224 L 178 240 L 210 254 L 246 268 L 288 278 L 336 286 L 400 292 L 400 380 L 0 380 Z" fill="url(#hu-hill-far)"/>
    <g fill="#173f31">
      <rect x="8" y="206" width="16" height="13"/>
      <rect x="30" y="198" width="13" height="15"/>
      <rect x="50" y="206" width="15" height="12"/>
      <rect x="72" y="199" width="13" height="14"/>
      <rect x="92" y="207" width="15" height="12"/>
      <rect x="114" y="202" width="13" height="14"/>
      <rect x="134" y="212" width="15" height="13"/>
      <rect x="158" y="222" width="14" height="13"/>
      <rect x="182" y="232" width="15" height="13"/>
      <rect x="208" y="242" width="13" height="14"/>
      <rect x="232" y="252" width="15" height="13"/>
      <rect x="258" y="260" width="13" height="13"/>
      <rect x="284" y="268" width="15" height="12"/>
      <rect x="312" y="274" width="13" height="13"/>
      <rect x="340" y="280" width="14" height="12"/>
    </g>
    <g stroke="#8fbf9a" stroke-width="1" opacity="0.5">
      <line x1="8" y1="206" x2="24" y2="206"/>
      <line x1="30" y1="198" x2="43" y2="198"/>
      <line x1="72" y1="199" x2="85" y2="199"/>
      <line x1="114" y1="202" x2="127" y2="202"/>
      <line x1="158" y1="222" x2="172" y2="222"/>
      <line x1="208" y1="242" x2="221" y2="242"/>
      <line x1="258" y1="260" x2="271" y2="260"/>
      <line x1="312" y1="274" x2="325" y2="274"/>
    </g>
    <g fill="#f0e9a0">
      <rect x="12" y="210" width="2.5" height="3.5"/>
      <rect x="34" y="203" width="2.5" height="3.5"/>
      <rect x="55" y="210" width="2" height="3"/>
      <rect x="76" y="203" width="2.5" height="3.5"/>
      <rect x="97" y="211" width="2" height="3"/>
      <rect x="118" y="206" width="2.5" height="3.5"/>
      <rect x="139" y="216" width="2" height="3"/>
      <rect x="162" y="226" width="2.5" height="3.5"/>
      <rect x="187" y="236" width="2" height="3"/>
      <rect x="212" y="246" width="2.5" height="3.5"/>
      <rect x="237" y="256" width="2" height="3"/>
      <rect x="262" y="263" width="2.5" height="3"/>
      <rect x="289" y="271" width="2" height="3"/>
      <rect x="316" y="277" width="2.5" height="3"/>
      <rect x="344" y="283" width="2" height="3"/>
    </g>
  </g>

  <!-- mist between ridges -->
  <g filter="url(#hu-mist)" opacity="0.5">
    <ellipse cx="140" cy="330" rx="230" ry="24" fill="#2c6b50"/>
    <ellipse cx="300" cy="360" rx="200" ry="20" fill="#1f5741" opacity="0.8"/>
  </g>

  <!-- power lines sagging across, high, from the left pole -->
  <g stroke="#031008" fill="none" opacity="0.85">
    <path d="M40 296 Q 200 330 404 304" stroke-width="1.3"/>
    <path d="M40 304 Q 190 340 404 314" stroke-width="1"/>
    <path d="M40 312 Q 150 336 300 318 Q 360 312 404 322" stroke-width="0.8"/>
  </g>
  <g fill="#bfe8cf" opacity="0.5">
    <circle cx="120" cy="316" r="1.1"/>
    <circle cx="238" cy="327" r="1.2"/>
    <circle cx="330" cy="310" r="1"/>
  </g>

  <!-- mid ridge: jungle canopy + rooftops right slope -->
  <g>
    <path d="M0 356 Q 18 334 40 346 Q 58 324 82 340 Q 100 320 124 338 L 148 328 Q 168 314 192 332 L 214 322 Q 236 306 262 326 L 286 314 L 314 330 Q 336 314 362 332 L 400 320 L 400 460 L 0 460 Z" fill="url(#hu-hill-mid)"/>
    <g fill="#0e2d22">
      <rect x="24" y="342" width="20" height="17"/>
      <rect x="58" y="333" width="17" height="20"/>
      <rect x="94" y="330" width="21" height="19"/>
      <rect x="140" y="331" width="17" height="17"/>
      <rect x="188" y="328" width="19" height="19"/>
      <rect x="240" y="322" width="19" height="19"/>
      <rect x="292" y="320" width="21" height="21"/>
      <rect x="342" y="326" width="17" height="19"/>
    </g>
    <g stroke="#7fb28c" stroke-width="1.1" opacity="0.45">
      <line x1="24" y1="342" x2="44" y2="342"/>
      <line x1="94" y1="330" x2="115" y2="330"/>
      <line x1="188" y1="328" x2="207" y2="328"/>
      <line x1="292" y1="320" x2="313" y2="320"/>
    </g>
    <g fill="#f4eda8">
      <rect x="30" y="347" width="3" height="4.5"/>
      <rect x="64" y="339" width="3" height="4.5"/>
      <rect x="100" y="336" width="3" height="4.5"/>
      <rect x="145" y="337" width="2.5" height="4"/>
      <rect x="194" y="334" width="3" height="4.5"/>
      <rect x="246" y="328" width="3" height="4.5"/>
      <rect x="298" y="326" width="3" height="4.5"/>
      <rect x="347" y="332" width="2.5" height="4"/>
    </g>
  </g>

  <!-- utility pole, frame left -->
  <g>
    <rect x="30" y="282" width="6" height="182" fill="#04100b"/>
    <rect x="16" y="292" width="34" height="4" fill="#04100b"/>
    <line x1="35.5" y1="284" x2="35.5" y2="462" stroke="#4f8f70" stroke-width="1" opacity="0.5"/>
    <line x1="18" y1="293" x2="48" y2="293" stroke="#4f8f70" stroke-width="0.8" opacity="0.4"/>
  </g>

  <!-- street plane: wet alley -->
  <path d="M0 460 L 400 460 L 400 600 L 0 600 Z" fill="url(#hu-street)"/>
  <g stroke="#1e5c40" stroke-width="1.2" opacity="0.55" fill="none">
    <path d="M186 462 L 60 600"/>
    <path d="M214 462 L 340 600"/>
    <path d="M196 462 L 130 600"/>
    <path d="M204 462 L 270 600"/>
  </g>
  <g stroke="#2c7a55" stroke-width="1" opacity="0.35" fill="none">
    <path d="M40 500 Q 200 486 360 500"/>
    <path d="M20 540 Q 200 522 380 540"/>
    <path d="M0 584 Q 200 562 400 584"/>
  </g>

  <!-- glow pool behind + under figure -->
  <ellipse cx="200" cy="452" rx="165" ry="145" fill="url(#hu-glow)" filter="url(#hu-soft)"/>
  <ellipse cx="200" cy="548" rx="150" ry="28" fill="url(#hu-reflect)" filter="url(#hu-soft2)"/>
  <!-- shockwave ripple rings spreading on the wet ground -->
  <g fill="none" stroke-linecap="round">
    <ellipse cx="200" cy="540" rx="96" ry="16" stroke="#9df5bb" stroke-width="1.6" opacity="0.55"/>
    <ellipse cx="200" cy="548" rx="136" ry="23" stroke="#6fe89b" stroke-width="1.2" opacity="0.38"/>
    <ellipse cx="200" cy="556" rx="176" ry="30" stroke="#4fce7e" stroke-width="1" opacity="0.22"/>
  </g>
  <!-- streaked reflections in the wet ground -->
  <g stroke="#8af2ae" opacity="0.55" stroke-linecap="round">
    <line x1="176" y1="536" x2="176" y2="570" stroke-width="2.4"/>
    <line x1="200" y1="540" x2="200" y2="588" stroke-width="3"/>
    <line x1="226" y1="538" x2="226" y2="566" stroke-width="2"/>
    <line x1="152" y1="542" x2="152" y2="562" stroke-width="1.6"/>
    <line x1="250" y1="544" x2="250" y2="560" stroke-width="1.4"/>
  </g>
  <g stroke="#57d181" opacity="0.32" stroke-linecap="round" stroke-width="1">
    <line x1="120" y1="548" x2="120" y2="562"/>
    <line x1="286" y1="550" x2="286" y2="566"/>
    <line x1="94" y1="540" x2="94" y2="550"/>
    <line x1="312" y1="540" x2="312" y2="552"/>
    <line x1="168" y1="576" x2="168" y2="592"/>
    <line x1="234" y1="578" x2="234" y2="594"/>
    <line x1="130" y1="584" x2="130" y2="596"/>
    <line x1="276" y1="586" x2="276" y2="597"/>
  </g>
  <!-- low sheen: glow bouncing off the wet street across the frame bottom -->
  <rect x="0" y="508" width="400" height="92" fill="url(#hu-sheen)"/>

  <!-- radiating energy: rays aimed outward from the figure's core (200,400) -->
  <g stroke-linecap="round">
    <g stroke="#b8ffcb" opacity="0.9">
      <line x1="200" y1="344" x2="198" y2="296" stroke-width="2.4"/>
      <line x1="168" y1="352" x2="146" y2="314" stroke-width="2"/>
      <line x1="233" y1="350" x2="256" y2="312" stroke-width="2"/>
      <line x1="146" y1="376" x2="112" y2="346" stroke-width="1.8"/>
      <line x1="256" y1="374" x2="292" y2="344" stroke-width="1.8"/>
    </g>
    <g stroke="#7deda0" opacity="0.5">
      <line x1="130" y1="404" x2="78" y2="382" stroke-width="1.6"/>
      <line x1="272" y1="402" x2="330" y2="378" stroke-width="1.4"/>
      <line x1="182" y1="348" x2="172" y2="288" stroke-width="1.3"/>
      <line x1="222" y1="346" x2="238" y2="286" stroke-width="1.3"/>
    </g>
    <g stroke="#4fce7e" opacity="0.3">
      <line x1="128" y1="428" x2="82" y2="414" stroke-width="1.2"/>
      <line x1="274" y1="428" x2="322" y2="416" stroke-width="1.2"/>
      <line x1="200" y1="336" x2="202" y2="262" stroke-width="1"/>
      <line x1="152" y1="362" x2="106" y2="312" stroke-width="1"/>
      <line x1="250" y1="362" x2="298" y2="316" stroke-width="1"/>
    </g>
  </g>
  <!-- pressure-wave arc hanging in the air around the figure -->
  <path d="M 96 470 A 108 118 0 1 1 304 472" fill="none" stroke="#7deda0" stroke-width="1.6" opacity="0.3" filter="url(#hu-soft2)"/>
  <!-- glow motes drifting up off the figure -->
  <g fill="#c8ffd8" filter="url(#hu-soft2)">
    <circle cx="146" cy="330" r="1.8" opacity="0.8"/>
    <circle cx="238" cy="306" r="1.4" opacity="0.7"/>
    <circle cx="188" cy="272" r="1.2" opacity="0.55"/>
    <circle cx="266" cy="352" r="1.6" opacity="0.65"/>
    <circle cx="122" cy="376" r="1.3" opacity="0.6"/>
    <circle cx="212" cy="246" r="1" opacity="0.4"/>
    <circle cx="288" cy="298" r="1.1" opacity="0.45"/>
    <circle cx="164" cy="238" r="0.9" opacity="0.35"/>
  </g>
  <!-- crackling filaments, forked -->
  <g stroke="#defff0" stroke-width="1.2" fill="none" opacity="0.85">
    <path d="M152 374 L 138 360 L 144 348 L 128 332 L 134 320"/>
    <path d="M250 376 L 264 360 L 256 348 L 272 334"/>
    <path d="M202 340 L 194 322 L 206 310 L 198 292 L 206 282"/>
    <path d="M138 360 L 126 356"/>
    <path d="M256 348 L 268 346"/>
  </g>

  <!-- the hunched figure: head down, shoulders heaved, knuckles to the ground -->
  <g transform="translate(200,424)">
    <ellipse cx="0" cy="120" rx="86" ry="14" fill="#010604" opacity="0.6"/>
    <path d="M -70 116
             C -78 82 -74 46 -58 18
             C -44 -6 -24 -24 -2 -30
             C -14 -40 -16 -54 -8 -62
             C 0 -70 14 -68 20 -58
             C 25 -49 22 -39 14 -32
             C 38 -26 58 -8 68 20
             C 78 50 80 86 74 116
             Z" fill="url(#hu-figure)"/>
    <path d="M -62 40 C -84 52 -98 78 -102 110 C -96 118 -82 119 -74 113 C -70 86 -62 64 -48 52 Z" fill="url(#hu-figure)"/>
    <path d="M 60 44 C 82 58 94 82 98 112 C 92 120 78 120 70 114 C 66 88 58 68 46 56 Z" fill="url(#hu-figure)"/>
    <ellipse cx="-88" cy="112" rx="16" ry="10" fill="url(#hu-figure)"/>
    <ellipse cx="84" cy="114" rx="15" ry="10" fill="url(#hu-figure)"/>
    <!-- rim light -->
    <path d="M -58 18 C -72 42 -77 80 -70 114" stroke="#98f2b4" stroke-width="3" fill="none" opacity="0.95" filter="url(#hu-soft2)"/>
    <path d="M -8 -62 C 0 -70 14 -68 20 -58 C 25 -49 22 -39 14 -32" stroke="#b8ffcb" stroke-width="2.4" fill="none" opacity="0.9" filter="url(#hu-soft2)"/>
    <path d="M 14 -32 C 38 -26 58 -8 68 20" stroke="#5fd486" stroke-width="2" fill="none" opacity="0.6" filter="url(#hu-soft2)"/>
    <path d="M -2 -30 C -24 -24 -44 -6 -58 18" stroke="#7deda0" stroke-width="2" fill="none" opacity="0.7" filter="url(#hu-soft2)"/>
    <path d="M -62 40 C -84 52 -98 78 -102 110" stroke="#6ade92" stroke-width="2" fill="none" opacity="0.6" filter="url(#hu-soft2)"/>
    <path d="M 60 44 C 82 58 94 82 98 112" stroke="#4fce7e" stroke-width="1.6" fill="none" opacity="0.45" filter="url(#hu-soft2)"/>
    <path d="M -102 106 Q -88 100 -74 106" stroke="#7deda0" stroke-width="1.6" fill="none" opacity="0.6" filter="url(#hu-soft2)"/>
    <path d="M 70 108 Q 84 102 98 108" stroke="#5fd486" stroke-width="1.4" fill="none" opacity="0.5" filter="url(#hu-soft2)"/>
    <!-- veins of light splitting the silhouette -->
    <g stroke="#c8ffd8" stroke-width="1.3" fill="none" opacity="0.9">
      <path d="M -34 22 L -26 38 L -34 54 L -22 72 L -28 90"/>
      <path d="M 16 10 L 26 26 L 18 44 L 28 60"/>
      <path d="M -4 -16 L 4 0 L -6 18 L 2 34"/>
      <path d="M 44 38 L 52 56 L 46 74"/>
    </g>
    <g stroke="#7dedb2" stroke-width="0.8" fill="none" opacity="0.6">
      <path d="M -48 50 L -42 64 L -48 78"/>
      <path d="M 34 20 L 40 32 L 34 46"/>
      <path d="M 8 -46 L 14 -38 L 8 -28"/>
    </g>
    <!-- inner glow bleeding through at the core -->
    <ellipse cx="-4" cy="32" rx="30" ry="44" fill="#3cb46e" opacity="0.28" filter="url(#hu-soft)"/>
  </g>

  <!-- slim alley-wall silhouettes framing the bottom corners -->
  <g>
    <path d="M0 442 L 30 452 L 30 600 L 0 600 Z" fill="#030c08"/>
    <line x1="30" y1="452" x2="30" y2="600" stroke="#2f6b4e" stroke-width="1.2" opacity="0.5"/>
    <path d="M400 438 L 372 450 L 372 600 L 400 600 Z" fill="#030c08"/>
    <line x1="372" y1="450" x2="372" y2="600" stroke="#2a5f46" stroke-width="1.2" opacity="0.45"/>
    <g stroke="#bfe8cf" stroke-width="0.8" opacity="0.35" stroke-linecap="round">
      <line x1="26" y1="470" x2="24" y2="484"/>
      <line x1="376" y1="466" x2="374" y2="480"/>
    </g>
  </g>

  <!-- rain: three depth layers, wind-slanted -->
  <g stroke="#bfe8cf" stroke-width="0.7" opacity="0.15" stroke-linecap="round">
    <line x1="30" y1="10" x2="18" y2="58"/>
    <line x1="80" y1="-6" x2="68" y2="44"/>
    <line x1="140" y1="20" x2="128" y2="70"/>
    <line x1="200" y1="-4" x2="188" y2="48"/>
    <line x1="255" y1="26" x2="243" y2="74"/>
    <line x1="330" y1="4" x2="318" y2="52"/>
    <line x1="380" y1="30" x2="368" y2="80"/>
    <line x1="55" y1="120" x2="43" y2="170"/>
    <line x1="120" y1="140" x2="108" y2="190"/>
    <line x1="185" y1="110" x2="173" y2="158"/>
    <line x1="260" y1="150" x2="248" y2="198"/>
    <line x1="345" y1="130" x2="333" y2="178"/>
    <line x1="30" y1="230" x2="18" y2="280"/>
    <line x1="95" y1="255" x2="83" y2="305"/>
    <line x1="165" y1="235" x2="153" y2="285"/>
    <line x1="235" y1="265" x2="223" y2="313"/>
    <line x1="310" y1="240" x2="298" y2="288"/>
    <line x1="375" y1="270" x2="363" y2="318"/>
  </g>
  <g stroke="#d6f2df" stroke-width="1" opacity="0.26" stroke-linecap="round">
    <line x1="60" y1="40" x2="44" y2="108"/>
    <line x1="150" y1="70" x2="134" y2="140"/>
    <line x1="240" y1="30" x2="224" y2="98"/>
    <line x1="320" y1="80" x2="304" y2="150"/>
    <line x1="20" y1="170" x2="4" y2="238"/>
    <line x1="110" y1="200" x2="94" y2="268"/>
    <line x1="290" y1="180" x2="274" y2="248"/>
    <line x1="370" y1="200" x2="354" y2="268"/>
    <line x1="70" y1="320" x2="54" y2="388"/>
    <line x1="330" y1="330" x2="314" y2="398"/>
    <line x1="40" y1="440" x2="24" y2="508"/>
    <line x1="360" y1="450" x2="344" y2="518"/>
  </g>
  <g stroke="#eafff0" stroke-width="1.4" opacity="0.32" stroke-linecap="round">
    <line x1="100" y1="10" x2="78" y2="100"/>
    <line x1="280" y1="-10" x2="258" y2="80"/>
    <line x1="350" y1="120" x2="328" y2="210"/>
    <line x1="30" y1="330" x2="8" y2="420"/>
    <line x1="130" y1="460" x2="108" y2="550"/>
    <line x1="300" y1="480" x2="278" y2="570"/>
    <line x1="380" y1="380" x2="358" y2="470"/>
    <line x1="60" y1="500" x2="38" y2="590"/>
  </g>
  <!-- splash ticks where heavy drops hit the wet street -->
  <g stroke="#a5efc0" stroke-width="0.9" opacity="0.4" stroke-linecap="round">
    <path d="M124 552 Q 128 546 132 552" fill="none"/>
    <path d="M272 566 Q 276 560 280 566" fill="none"/>
    <path d="M158 584 Q 162 578 166 584" fill="none"/>
    <path d="M244 588 Q 248 582 252 588" fill="none"/>
  </g>

  <!-- vignette + grain -->
  <rect x="0" y="0" width="400" height="600" fill="url(#hu-vignette)"/>
  <rect x="0" y="0" width="400" height="600" filter="url(#hu-paper)" opacity="0.3"/>
---

Chronologically, this is where the saga's other founding trauma sits: not a
cave in a war zone, but a lab experiment gone wrong and the years afterward
spent running. By the time we meet Bruce Banner here he isn't discovering his
condition, he's already a fugitive who has spent a long time perfecting the
art of staying calm, favela to favela, one heart-rate monitor away from
catastrophe.

That framing — deep into hiding, not at the beginning of the problem — is what
makes this chapter feel different from everything around it in the run. There's
no workshop, no suit being built, no choice to become something. Just a man
trying to out-run the worst version of himself and a general who wants to
weaponize it. The film's best moments are the quiet ones: a heartbeat spiking
on a screen, a whispered countdown to calm down, the dread of a low simmer that
both the character and the camera know is about to boil over anyway.

Watched here, fifth in a run about people choosing to become more than they
were, this is the one entry about someone who never wanted the power at all —
which makes it the clearest possible contrast heading into whatever comes next.
