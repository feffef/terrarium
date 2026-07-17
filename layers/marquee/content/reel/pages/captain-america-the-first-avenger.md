---
title: "Captain America: The First Avenger"
description: A Brooklyn kid, a wartime laboratory, and the earliest chapter of the whole saga.
order: 1
publishedAt: 2026-07-17T09:00:00Z
illustration: |
  <defs>
    <linearGradient id="ca-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#101a33"/>
      <stop offset="30%" stop-color="#1c2c4f"/>
      <stop offset="55%" stop-color="#31446e"/>
      <stop offset="74%" stop-color="#5c5a76"/>
      <stop offset="86%" stop-color="#a06b4e"/>
      <stop offset="100%" stop-color="#d99a55"/>
    </linearGradient>
    <radialGradient id="ca-glow" cx="50%" cy="76%" r="55%">
      <stop offset="0%" stop-color="#ffd98f" stop-opacity="0.85"/>
      <stop offset="35%" stop-color="#f2b96c" stop-opacity="0.45"/>
      <stop offset="70%" stop-color="#d98e4f" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#d98e4f" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ca-beam" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#f6e8c0" stop-opacity="0.30"/>
      <stop offset="60%" stop-color="#f6e8c0" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#f6e8c0" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="ca-far" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#6d6a86"/>
      <stop offset="100%" stop-color="#8a7274"/>
    </linearGradient>
    <linearGradient id="ca-mid" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3b3f5e"/>
      <stop offset="100%" stop-color="#514a63"/>
    </linearGradient>
    <linearGradient id="ca-roof" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#141a2e"/>
      <stop offset="100%" stop-color="#0c1020"/>
    </linearGradient>
    <linearGradient id="ca-shield" x1="0.15" y1="0.1" x2="0.85" y2="0.95">
      <stop offset="0%" stop-color="#b1976a"/>
      <stop offset="45%" stop-color="#6f5d44"/>
      <stop offset="100%" stop-color="#352d23"/>
    </linearGradient>
    <radialGradient id="ca-shield-sheen" cx="32%" cy="26%" r="75%">
      <stop offset="0%" stop-color="#ffe9b8" stop-opacity="0.4"/>
      <stop offset="45%" stop-color="#e8c98e" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#e8c98e" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="ca-roofpool" cx="50%" cy="0%" r="100%">
      <stop offset="0%" stop-color="#e8a860" stop-opacity="0.28"/>
      <stop offset="60%" stop-color="#e8a860" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#e8a860" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ca-vig" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0b1226" stop-opacity="0.55"/>
      <stop offset="18%" stop-color="#0b1226" stop-opacity="0"/>
    </linearGradient>
    <filter id="ca-soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="6"/>
    </filter>
    <filter id="ca-soft2" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.2"/>
    </filter>
    <filter id="ca-paint" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="3" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="14"/>
    </filter>
    <filter id="ca-grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.6 0.6 0.6 0 0"/>
      <feComposite operator="in" in2="SourceGraphic"/>
    </filter>
  </defs>
  <!-- dusk sky -->
  <rect x="0" y="0" width="400" height="600" fill="url(#ca-sky)"/>
  <!-- painterly cloud banks -->
  <g filter="url(#ca-paint)">
    <g filter="url(#ca-soft)">
      <ellipse cx="90" cy="120" rx="150" ry="26" fill="#243356" opacity="0.7"/>
      <ellipse cx="320" cy="80" rx="140" ry="20" fill="#1b2947" opacity="0.75"/>
      <ellipse cx="240" cy="180" rx="180" ry="24" fill="#2e4066" opacity="0.6"/>
      <ellipse cx="60" cy="250" rx="160" ry="22" fill="#3d5078" opacity="0.55"/>
      <ellipse cx="340" cy="270" rx="150" ry="20" fill="#4d5678" opacity="0.5"/>
      <ellipse cx="180" cy="330" rx="200" ry="24" fill="#6d6076" opacity="0.5"/>
      <ellipse cx="90" cy="380" rx="170" ry="20" fill="#8a6a5e" opacity="0.5"/>
      <ellipse cx="310" cy="400" rx="160" ry="18" fill="#a97b52" opacity="0.5"/>
    </g>
    <g filter="url(#ca-soft2)" opacity="0.65">
      <ellipse cx="120" cy="140" rx="90" ry="8" fill="#3a4f7d"/>
      <ellipse cx="300" cy="200" rx="100" ry="7" fill="#4a5c88"/>
      <ellipse cx="80" cy="360" rx="110" ry="7" fill="#b07f57"/>
      <ellipse cx="290" cy="415" rx="120" ry="8" fill="#cf9557"/>
    </g>
  </g>
  <!-- stars -->
  <g fill="#f5ead2">
    <circle cx="52" cy="46" r="1.5" opacity="0.85"/>
    <circle cx="118" cy="72" r="1.0" opacity="0.6"/>
    <circle cx="86" cy="150" r="1.1" opacity="0.55"/>
    <circle cx="210" cy="38" r="1.3" opacity="0.75"/>
    <circle cx="262" cy="96" r="0.9" opacity="0.5"/>
    <circle cx="342" cy="52" r="1.4" opacity="0.8"/>
    <circle cx="374" cy="128" r="1.0" opacity="0.55"/>
    <circle cx="30" cy="102" r="0.9" opacity="0.5"/>
    <circle cx="160" cy="118" r="0.8" opacity="0.45"/>
    <circle cx="310" cy="160" r="0.9" opacity="0.45"/>
  </g>
  <!-- searchlight beams, rooted behind the skyline -->
  <g>
    <polygon points="52,530 84,530 186,20 156,20" fill="url(#ca-beam)"/>
    <polygon points="324,524 354,524 252,30 226,30" fill="url(#ca-beam)"/>
    <polygon points="112,536 132,536 322,60 298,60" fill="url(#ca-beam)" opacity="0.5"/>
  </g>
  <!-- distant biplane with faint drifting contrail -->
  <g transform="translate(292,108) rotate(-6)">
    <path d="M -104 10 Q -70 9 -46 4 Q -38 2.5 -32 1.5" stroke="#d9c9a8" stroke-width="2.4" fill="none" opacity="0.16" stroke-linecap="round" filter="url(#ca-soft2)"/>
    <g fill="#131a30">
      <path d="M -26 0 Q -6 -3 12 0 Q 14 2 10 3 L -22 3 Q -28 2 -26 0 Z"/>
      <rect x="-8" y="-9" width="2.4" height="9"/>
      <path d="M -16 -9 L 4 -9 L 5 -7 L -17 -7 Z"/>
      <path d="M -18 -1 L 6 -1 L 7 1 L -19 1 Z" opacity="0.9"/>
      <path d="M -26 0 L -32 -5 L -30 1 Z"/>
      <circle cx="13" cy="1" r="1.6"/>
    </g>
  </g>
  <!-- birds -->
  <g stroke="#1a2340" stroke-width="1.3" fill="none" opacity="0.8" stroke-linecap="round">
    <path d="M 96 210 q 4 -4 8 0 q 4 -4 8 0"/>
    <path d="M 118 222 q 3 -3 6 0 q 3 -3 6 0"/>
    <path d="M 80 228 q 3 -3 6 0 q 3 -3 6 0" opacity="0.6"/>
  </g>
  <!-- golden-hour glow behind the figure -->
  <rect x="0" y="0" width="400" height="600" fill="url(#ca-glow)"/>
  <!-- far skyline, hazy -->
  <g fill="url(#ca-far)" opacity="0.55" filter="url(#ca-soft2)">
    <rect x="-4" y="404" width="34" height="80"/>
    <rect x="34" y="418" width="26" height="66"/>
    <rect x="64" y="396" width="20" height="88"/>
    <rect x="88" y="424" width="30" height="60"/>
    <path d="M 122 434 h 22 v 50 h -22 z M 129 418 h 8 v 16 h -8 z"/>
    <rect x="150" y="428" width="24" height="56"/>
    <path d="M 180 400 h 18 v 84 h -18 z M 186 384 h 6 v 16 h -6 z"/>
    <rect x="204" y="430" width="26" height="54"/>
    <rect x="236" y="412" width="22" height="72"/>
    <rect x="262" y="426" width="28" height="58"/>
    <path d="M 296 406 h 20 v 78 h -20 z"/>
    <rect x="322" y="422" width="26" height="62"/>
    <rect x="352" y="398" width="22" height="86"/>
    <rect x="378" y="420" width="26" height="64"/>
  </g>
  <!-- mid skyline -->
  <g>
    <g fill="url(#ca-mid)">
      <rect x="-6" y="440" width="46" height="90"/>
      <path d="M 44 452 h 34 v 78 h -34 z M 54 438 h 14 v 14 h -14 z"/>
      <rect x="84" y="462" width="30" height="68"/>
      <path d="M 240 448 h 36 v 82 h -36 z M 250 430 h 16 v 18 h -16 z M 256 418 h 4 v 12 h -4 z"/>
      <rect x="282" y="466" width="30" height="64"/>
      <path d="M 318 442 h 30 v 88 h -30 z"/>
      <path d="M 352 456 h 32 v 74 h -32 z M 362 444 h 12 v 12 h -12 z"/>
      <rect x="386" y="470" width="20" height="60"/>
    </g>
    <g fill="#333752">
      <path d="M 96 436 l 20 0 l -2 20 l -16 0 z"/>
      <path d="M 94 436 l 24 0 l -12 -8 z"/>
      <path d="M 98 456 l 1 12 M 113 456 l -1 12" stroke="#333752" stroke-width="2.4"/>
    </g>
    <g fill="#f5c67d">
      <rect x="6" y="452" width="4" height="5" opacity="0.9"/>
      <rect x="18" y="466" width="4" height="5" opacity="0.7"/>
      <rect x="28" y="452" width="4" height="5" opacity="0.5"/>
      <rect x="52" y="464" width="4" height="5" opacity="0.85"/>
      <rect x="64" y="478" width="4" height="5" opacity="0.6"/>
      <rect x="92" y="472" width="4" height="5" opacity="0.8"/>
      <rect x="250" y="458" width="4" height="5" opacity="0.85"/>
      <rect x="262" y="472" width="4" height="5" opacity="0.6"/>
      <rect x="290" y="476" width="4" height="5" opacity="0.75"/>
      <rect x="326" y="452" width="4" height="5" opacity="0.9"/>
      <rect x="338" y="468" width="4" height="5" opacity="0.55"/>
      <rect x="360" y="466" width="4" height="5" opacity="0.8"/>
      <rect x="372" y="482" width="4" height="5" opacity="0.6"/>
    </g>
    <g stroke="#2c3050" stroke-width="1.2">
      <line x1="60" y1="438" x2="60" y2="420"/>
      <line x1="332" y1="442" x2="332" y2="422"/>
    </g>
  </g>
  <!-- warm edge light on skyline tops near the glow -->
  <g stroke="#f2b96c" fill="none" stroke-linecap="round">
    <path d="M 240 448 h 36 M 250 430 h 16" stroke-width="1.2" opacity="0.55"/>
    <path d="M 84 462 h 30" stroke-width="1.1" opacity="0.5"/>
    <path d="M 282 466 h 30" stroke-width="1" opacity="0.4"/>
    <path d="M 44 452 h 34" stroke-width="1" opacity="0.35"/>
  </g>
  <!-- foreground rooftop -->
  <g>
    <rect x="0" y="512" width="400" height="88" fill="url(#ca-roof)"/>
    <path d="M 0 512 h 400 v 6 h -400 z" fill="#1c2136"/>
    <path d="M 0 511 h 400 v 1.6 h -400 z" fill="#d99a55" opacity="0.5"/>
    <rect x="40" y="514" width="320" height="86" fill="url(#ca-roofpool)"/>
    <g fill="#0a0e1c">
      <path d="M 318 512 v -34 h 8 v -8 h 6 v 8 h 8 v 34 z"/>
      <rect x="46" y="496" width="26" height="16"/>
      <path d="M 44 496 h 30 l -15 -9 z"/>
    </g>
    <g stroke="#d99a55" stroke-width="1" opacity="0.35">
      <path d="M 46 497 h 26 M 320 480 h 20" fill="none"/>
    </g>
    <g stroke="#232a44" stroke-width="1" fill="none" opacity="0.9">
      <path d="M 0 548 h 132 M 262 548 h 138 M 0 574 h 116 M 286 574 h 114"/>
    </g>
    <g>
      <path d="M 148 512 v -10 q 0 -4 5 -4 h 3" stroke="#1e2440" stroke-width="3" fill="none"/>
      <circle cx="158" cy="498" r="2" fill="#1e2440"/>
    </g>
    <ellipse cx="238" cy="580" rx="26" ry="3" fill="#e8a860" opacity="0.12"/>
    <g stroke="#39415f" stroke-width="1.2" fill="none" opacity="0.9">
      <path d="M 368 600 v -52 h 26 M 368 566 h 26 M 368 584 h 26"/>
      <path d="M 372 566 l 18 18 M 372 584 l 18 16"/>
    </g>
    <path d="M 368 549 h 26" stroke="#c98a4b" stroke-width="1" opacity="0.5" fill="none"/>
  </g>
  <!-- figure: upright back view, plain round shield at rest in right hand -->
  <g transform="translate(196,-12)">
    <path d="M -16 584 L 4 584 L 26 610 L -46 610 Z" fill="#05070f" opacity="0.4" filter="url(#ca-soft2)"/>
    <ellipse cx="4" cy="586" rx="52" ry="6.5" fill="#05070f" opacity="0.55" filter="url(#ca-soft2)"/>
    <g fill="#10162a">
      <circle cx="0" cy="404" r="9"/>
      <path d="M -4 410 h 8 l 1 8 h -10 z"/>
      <path d="M -21 424
               C -12 417 12 417 21 424
               C 24 430 25 442 24 452
               C 23 464 21 474 19 482
               L -19 482
               C -21 474 -23 464 -24 452
               C -25 442 -24 430 -21 424 Z"/>
      <path d="M -21 425 C -27 432 -29.5 444 -30 456 C -30.4 468 -29.6 478 -28.4 488 C -28 492 -27 496 -26 499 L -19.5 498 C -20.6 494 -21.4 490 -21.8 486 C -22.8 477 -23.4 468 -23.2 458 C -23 446 -21.8 434 -19 427 Z"/>
      <path d="M 21 425 C 27 432 29.5 444 30 456 C 30.4 468 29.8 480 28.8 492 C 28.4 498 27.6 504 26.8 508 L 20 507 C 21 500 21.8 494 22.2 488 C 23 478 23.4 468 23.2 458 C 23 446 21.8 434 19 427 Z"/>
      <path d="M -19 480
               C -20 492 -20 502 -19 512
               L -14.5 584 L -4.5 584 L -3 516 L 3 516 L 4.5 584 L 14.5 584 L 19 512
               C 20 502 20 492 19 480 Z"/>
      <path d="M -15.5 582 h 12 l 1 4 h -14 z"/>
      <path d="M 3.5 582 h 12 l 1 4 h -14.5 z"/>
    </g>
    <!-- warm rim light on the glow side -->
    <g stroke="#f2c078" fill="none" stroke-linecap="round">
      <path d="M -8.7 400 A 9 9 0 0 0 -8.2 408.5" stroke-width="1.8" opacity="0.95"/>
      <path d="M -21 424 C -16 420.5 -8 418.6 0 418.6" stroke-width="1.5" opacity="0.75"/>
      <path d="M -21 424 C -27 432 -29.5 444 -30 456 C -30.4 468 -29.6 478 -28.4 488 C -28 492 -27 496 -26 499" stroke-width="1.7" opacity="0.9"/>
      <path d="M -19 480 C -20 492 -20 502 -19 512 L -14.5 584" stroke-width="1.4" opacity="0.7"/>
    </g>
    <!-- plain round shield at rest, edge on the roof beside him -->
    <g transform="translate(42,553)">
      <ellipse cx="2" cy="31" rx="30" ry="4" fill="#05070f" opacity="0.45" filter="url(#ca-soft2)"/>
      <circle cx="0" cy="0" r="31" fill="url(#ca-shield)"/>
      <circle cx="0" cy="0" r="31" fill="url(#ca-shield-sheen)"/>
      <circle cx="0" cy="0" r="31" fill="none" stroke="#3c352a" stroke-width="1.8"/>
      <circle cx="0" cy="0" r="25.5" fill="none" stroke="#6b5f4b" stroke-width="1" opacity="0.7"/>
      <path d="M -21 -21 A 29.5 29.5 0 0 1 13 -26.5" fill="none" stroke="#ffe9b8" stroke-width="1.6" opacity="0.65" stroke-linecap="round"/>
    </g>
    <!-- hand gripping the shield rim -->
    <path d="M 26.8 508 C 28 512 28.6 516 28.8 520 C 29 523 28.6 526 27.8 528 L 21.5 527 C 21.8 523 21.8 518 21.4 514 C 21.2 511.5 20.7 509.5 20 507.5 Z" fill="#10162a"/>
  </g>
  <!-- top vignette + grain -->
  <rect x="0" y="0" width="400" height="140" fill="url(#ca-vig)"/>
  <rect x="0" y="0" width="400" height="600" fill="#000" opacity="0.05" filter="url(#ca-grain)"/>
---

Everything else in this run happens after this. Before the labs, the funding
fights, and the men in expensive suits arguing about who gets to own the
future, there's a scrawny kid from Brooklyn who keeps getting rejected for
service and keeps trying anyway — not because he thinks he'll win a fight, but
because he can't stand to watch one and do nothing.

The formula that follows is almost beside the point. The film spends far more
of its runtime on who Steve Rogers already was before anyone changed his body
than on what he becomes after. That's the right call, and it's why watching
this first, ahead of everything it precedes, changes how the rest of the saga
reads: every later film's "legacy" and "greater good" arguments are being
measured, quietly, against a guy who volunteered for none of it and would have
done the same thing at half his eventual size.

It's also, structurally, a war film first and a superhero film second — grimy,
practical, more concerned with a platoon than a universe. Worth remembering
once the scale gets bigger later: this is where it started, and it started
small.
