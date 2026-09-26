---
title: Rain-Aware Umbrella
description: An umbrella that tells you, via app, that it is raining.
campaign:
  registry: TF-0006
  inventor: mats-eberhardt
  category: outdoors
  goal: 40000
  launch: -9d
  end: +21d
  backers: 306
  pledged: 22000
  specifications:
    - { label: Canopy, value: Ø 1040 mm }
    - { label: "Length, furled", value: 880 mm }
    - { label: Sensor, value: "Capacitive, tip-mounted" }
    - { label: Battery, value: "3 months, USB-C" }
    - { label: Alerts, value: It is raining }
    - { label: Range, value: The umbrella’s own location }
  figures:
    - style: isometric
      caption: "The umbrella open in the rain, with its paired phone."
      svg: |-
        <ellipse cx="206" cy="270" rx="130" ry="18" style="fill:var(--tf-line)" />
        <path d="M36 40q5 8 0 12q-5 -4 0 -12zM70 90q5 8 0 12q-5 -4 0 -12zM34 146q5 8 0 12q-5 -4 0 -12zM122 22q5 8 0 12q-5 -4 0 -12zM256 24q5 8 0 12q-5 -4 0 -12zM300 60q5 8 0 12q-5 -4 0 -12zM348 30q5 8 0 12q-5 -4 0 -12zM374 96q5 8 0 12q-5 -4 0 -12zM356 150q5 8 0 12q-5 -4 0 -12zM148 56q5 8 0 12q-5 -4 0 -12z" style="fill:var(--tf-link)" />
        <path d="M197 150h3v104h-3z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M200 150h3v104h-3z" style="fill:var(--tf-ink)" />
        <path d="M200 254v10a13 13 0 0 1-26 0v-4" style="fill:none;stroke:var(--tf-ink);stroke-width:7;stroke-linecap:round;stroke-linejoin:round" />
        <path d="M200 60L145.7 96.4Q200 100.1 254.3 96.4Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M200 60L254.3 96.4Q286.4 114.7 331.2 127.8Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M200 60L331.2 127.8Q322.1 150 331.2 172.2Z" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" />
        <path d="M200 60L331.2 172.2Q286.4 185.3 254.3 203.6Z" style="fill:var(--tf-accent)" />
        <path d="M200 60L254.3 203.6Q200 199.9 145.7 203.6Z" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" />
        <path d="M200 60L145.7 203.6Q113.6 185.3 68.8 172.2Z" style="fill:var(--tf-accent)" />
        <path d="M200 60L68.8 172.2Q77.9 150 68.8 127.8Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M200 60L68.8 127.8Q113.6 114.7 145.7 96.4Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M200 60L145.7 96.4M200 60L254.3 96.4M200 60L331.2 127.8M200 60L331.2 172.2M200 60L254.3 203.6M200 60L145.7 203.6M200 60L68.8 172.2M200 60L68.8 127.8" style="fill:none;stroke:color-mix(in srgb, var(--tf-accent) 60%, var(--tf-ink));stroke-width:1.3;stroke-linecap:round;stroke-linejoin:round" />
        <path d="M195 42V60A5 2.9 0 0 0 200 62.9V44.9A5 2.9 0 0 1 195 42Z" style="fill:var(--tf-ink)" />
        <path d="M200 44.9V62.9A5 2.9 0 0 0 205 60V42A5 2.9 0 0 1 200 44.9Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <ellipse cx="200" cy="42" rx="5" ry="2.9" style="fill:var(--tf-muted)" />
        <path d="M212 34a10 10 0 0 1 0 14M218 29a17 17 0 0 1 0 24" style="fill:none;stroke:var(--tf-accent);stroke-width:2;stroke-linecap:round;stroke-linejoin:round" />
        <path d="M318 218L352.6 238L288.6 275L253.9 255Z" style="fill:var(--tf-ink)" />
        <path d="M253.9 259L288.6 279L288.6 275L253.9 255Z" style="fill:var(--tf-ink)" />
        <path d="M352.6 242L288.6 279L288.6 275L352.6 238Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M318 221L347.4 238L288.6 272L259.1 255Z" style="fill:var(--tf-surface)" />
        <path d="M316.3 225L340.5 239L324.9 248L300.7 234Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M316.3 225L318.9 226.5L303.3 235.5L300.7 234Z" style="fill:var(--tf-accent)" />
        <path d="M318 230L333.6 239L331 240.5L315.4 231.5Z" style="fill:var(--tf-ink)" />
        <path d="M311.9 233.5L324.1 240.5L321.5 242L309.3 235Z" style="fill:var(--tf-muted)" />
    - style: isometric
      caption: "The notification, as delivered. The umbrella is shown for context and was already aware."
      svg: |-
        <ellipse cx="186" cy="254" rx="120" ry="18" style="fill:var(--tf-line)" />
        <g transform="translate(112 34) scale(.62)"><path d="M197 180h3v70h-3z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" /><path d="M200 180h3v70h-3z" style="fill:var(--tf-ink)" /><path d="M200 248v10a13 13 0 0 1-26 0v-3" style="fill:none;stroke:var(--tf-ink);stroke-width:7;stroke-linecap:round" /><path d="M200 62L60 142Q94.8 118.1 101 109.5Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M200 62L101 109.5Q156.4 97.8 200 96Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M200 62L200 96Q243.6 97.8 299 109.5Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M200 62L299 109.5Q305.2 118.1 340 142Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M200 62L340 142Q305.2 146.7 299 174.5Z" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" />
        <path d="M200 62L299 174.5Q243.6 167 200 188Z" style="fill:var(--tf-accent)" />
        <path d="M200 62L200 188Q156.4 167 101 174.5Z" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" />
        <path d="M200 62L101 174.5Q94.8 146.7 60 142Z" style="fill:var(--tf-accent)" /><path d="M196 48h4v15h-4z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M200 48h4v15h-4z" style="fill:var(--tf-ink)" />
        <ellipse cx="200" cy="48" rx="4" ry="1.8" style="fill:var(--tf-muted)" /><path d="M212 38a10 10 0 0 1 0 14M218 33a17 17 0 0 1 0 24" style="fill:none;stroke:var(--tf-accent);stroke-width:2;stroke-linecap:round" /></g>
        <path d="M30 40q5 8 0 12q-5 -4 0 -12zM60 90q5 8 0 12q-5 -4 0 -12zM40 150q5 8 0 12q-5 -4 0 -12zM250 30q5 8 0 12q-5 -4 0 -12zM300 60q5 8 0 12q-5 -4 0 -12zM340 24q5 8 0 12q-5 -4 0 -12zM372 100q5 8 0 12q-5 -4 0 -12zM350 160q5 8 0 12q-5 -4 0 -12zM200 20q5 8 0 12q-5 -4 0 -12zM80 20q5 8 0 12q-5 -4 0 -12z" style="fill:var(--tf-link)" />
        <path d="M82.2 53.5L155 95.5L149.8 98.5L77 56.5Z" style="fill:var(--tf-ink)" />
        <path d="M77 206.5L149.8 248.5L149.8 98.5L77 56.5Z" style="fill:var(--tf-ink)" />
        <path d="M155 245.5L149.8 248.5L149.8 98.5L155 95.5Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M80.5 202.5L146.3 240.5L146.3 102.5L80.5 64.5Z" style="fill:var(--tf-surface)" />
        <path d="M82.2 103.5L144.6 139.5L144.6 107.5L82.2 71.5Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M84 100.5L86.6 102L86.6 78L84 76.5Z" style="fill:var(--tf-accent)" />
        <text transform="matrix(.866 .5 0 1 84 82.5)" style="fill:var(--tf-ink);font:600 8px var(--tf-mono)">IT IS RAINING.</text>
        <text transform="matrix(.866 .5 0 1 84 94.5)" style="fill:var(--tf-muted);font:500 6.5px var(--tf-mono)">UMBRELLA · NOW</text>
        <path d="M87.4 192.5L139.4 222.5L139.4 208.5L87.4 178.5Z" style="fill:var(--tf-line)" />
        <path d="M100.20577136594005 140.5q5 8 0 12q-5 -4 0 -12z" style="fill:var(--tf-link)" />
        <path d="M150 186q5 8 0 12q-5 -4 0 -12zM92 236q5 8 0 12q-5 -4 0 -12zM212 220q5 8 0 12q-5 -4 0 -12z" style="fill:var(--tf-link)" />
    - style: isometric
      caption: "Full size in signal orange; compact in slate. Both notice rain to the same standard."
      svg: |-
        <ellipse cx="158" cy="252" rx="44" ry="10" style="fill:var(--tf-line)" />
        <ellipse cx="298" cy="244" rx="40" ry="9" style="fill:var(--tf-line)" />
        <path d="M150 62L139 184L150 190Z" style="fill:var(--tf-accent)" />
        <path d="M150 62L161 184L150 190Z" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" />
        <ellipse cx="150" cy="184" rx="11" ry="5.5" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" />
        <path d="M147 82L143.95 176M153 82L156.05 176" style="fill:none;stroke:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface));stroke-width:1.2" />
        <path d="M141.2 148L158.8 148L159.9 156L140.1 156Z" style="fill:var(--tf-ink)" />
        <path d="M146 188h4v42h-4z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M150 188h4v42h-4z" style="fill:var(--tf-ink)" />
        <path d="M150 228v10a13 13 0 0 1-26 0v-3" style="fill:none;stroke:var(--tf-ink);stroke-width:7;stroke-linecap:round" />
        <path d="M146 48h4v15h-4z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M150 48h4v15h-4z" style="fill:var(--tf-ink)" />
        <ellipse cx="150" cy="48" rx="4" ry="1.8" style="fill:var(--tf-muted)" />
        <path d="M162 38a10 10 0 0 1 0 14M168 33a17 17 0 0 1 0 24" style="fill:none;stroke:var(--tf-accent);stroke-width:2;stroke-linecap:round" />
        <path d="M290 132L275 202L290 208Z" style="fill:var(--tf-ink)" />
        <path d="M290 132L305 202L290 208Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <ellipse cx="290" cy="202" rx="15" ry="7.5" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M287 152L281.75 194M293 152L298.25 194" style="fill:none;stroke:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface));stroke-width:1.2" />
        <path d="M278 174L302 174L303.5 182L276.5 182Z" style="fill:var(--tf-accent)" />
        <path d="M281 212V238A9 5.2 0 0 0 290 243.2V217.2A9 5.2 0 0 1 281 212Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M290 217.2V243.2A9 5.2 0 0 0 299 238V212A9 5.2 0 0 1 290 217.2Z" style="fill:var(--tf-ink)" />
        <ellipse cx="290" cy="212" rx="9" ry="5.2" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M286 118h4v15h-4z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M290 118h4v15h-4z" style="fill:var(--tf-ink)" />
        <ellipse cx="290" cy="118" rx="4" ry="1.8" style="fill:var(--tf-muted)" />
        <path d="M302 108a10 10 0 0 1 0 14M308 103a17 17 0 0 1 0 24" style="fill:none;stroke:var(--tf-accent);stroke-width:2;stroke-linecap:round" />
        <g style="fill:var(--tf-muted);font:600 10px var(--tf-mono);letter-spacing:.06em;text-anchor:middle"><text x="130" y="276">FULL SIZE · SIGNAL</text><text x="300" y="276">COMPACT · SLATE</text></g>
    - style: patent
      caption: "Elevation, open, showing the rain sensor (14) and the paired phone (20)."
      svg: |-
        <g style="fill:none;stroke:var(--tf-ink);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round">
        <path d="M60 70l-6 10M90 40l-6 10M130 56l-6 10M40 120l-6 10M300 34l-6 10M340 60l-6 10M366 110l-6 10M350 150l-6 10" style="stroke-width:.9" />
        <path d="M72 152Q100 76 200 64Q300 76 328 152" style="stroke-width:2.4" />
        <path d="M200 64Q150 70 136 148M200 64Q250 70 264 150M200 64V152M200 64Q112 82 72 152M200 64Q288 82 328 152" />
        <path d="M72 152q32-12 64-4q32-10 64 4q32-14 64 0q32-10 64 4" />
        <path d="M219.4 67.4L254.2 102.2M210.2 65.3L258.1 113.2M202.2 64.3L262 124.1M200 69.2L262.6 131.8M200 76.3L263.2 139.4M200 83.3L263.8 147.1M200 90.4L257 147.4M200 97.5L246.3 143.8M200 104.5L238.2 142.8M200 111.6L230.6 142.2M200 118.7L224.3 143M200 125.8L218 143.8M200 132.8L212.8 145.6M200 139.9L208.1 148M200 147L203.4 150.3" style="stroke-width:.8" />
        <path d="M200 130L150 104M200 130L250 104M200 152v-22" style="stroke-width:1;stroke-dasharray:5 3.5" />
        <path d="M196 40h8v24h-8zM196 40a4 4 0 0 1 8 0" />
        <path d="M176 26q5 8 0 12q-5 -4 0 -12zM224 22q5 8 0 12q-5 -4 0 -12zM160 52q5 8 0 12q-5 -4 0 -12zM244 46q5 8 0 12q-5 -4 0 -12z" />
        <path d="M197 152v100M203 152v100" />
        <path d="M203 252v10a16 16 0 0 1-32 0v-4M197 252v10a10 10 0 0 1-20 0v-4" />
        <path d="M296 170h44a8 8 0 0 1 8 8v78a8 8 0 0 1-8 8h-44a8 8 0 0 1-8-8v-78a8 8 0 0 1 8-8z" />
        <path d="M292 178h52v80h-52z" style="stroke-width:.9" />
        <path d="M296 186h44v20h-44z" />
        <path d="M300 192h20M300 198h30" style="stroke-width:.9" />
        <path d="M212 50Q330 60 318 168" style="stroke-width:1;stroke-dasharray:5 3.5" />
        <path d="M110 112Q94.5 88 66 86M252 96Q281 98 300 76M204 44Q184.5 28 160 34M203 200Q184 184.3 160 190M172 270Q154 253.5 130 258M348 230Q352 244.5 366 250M340 190Q358.5 185.5 366 168M280 52Q308 58.5 330 40" style="stroke-width:.9" />
        </g>
        <g style="fill:var(--tf-ink);font:500 12px var(--tf-mono)"><text x="46" y="90">10</text><text x="304" y="80">12</text><text x="138" y="38">14</text><text x="138" y="194">16</text><text x="108" y="262">18</text><text x="370" y="254">20</text><text x="370" y="172">22</text><text x="334" y="44">24</text></g>
        <g style="fill:var(--tf-ink);font:500 11px var(--tf-mono)"><text x="120" y="290">ELEVATION · OPEN · PAIRED</text></g>
    - style: patent
      caption: "The umbrella furled, with detail A of the rain sensor."
      svg: |-
        <g style="fill:none;stroke:var(--tf-ink);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round">
        <path d="M104 56L96 190h28L116 56z" style="stroke-width:2.4" />
        <path d="M104 40h12v16h-12zM104 40a6 6 0 0 1 12 0" />
        <path d="M102 80l22 16M100 110l24 16M98 140l26 16M97 170l26 12" style="stroke-width:.9" />
        <path d="M92 118h36v12H92z" />
        <path d="M107.5 124a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0" style="stroke-width:.9" />
        <path d="M107 190v40M113 190v40" />
        <path d="M113 230v12a13 13 0 0 1-26 0v-4M107 230v12a7 7 0 0 1-14 0v-4" />
        <path d="M60 40V262M57.5 46l2.5-6 2.5 6M57.5 256l2.5 6 2.5-6" style="stroke-width:.9" /><text x="65" y="154" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono)">880</text>
        <path d="M94 48a16 16 0 1 0 32 0a16 16 0 1 0 -32 0M124 40L184 88M124 56L184 212" style="stroke-width:.9" />
        <path d="M180 150a92 92 0 1 0 184 0a92 92 0 1 0 -184 0" style="stroke-width:2.4" />
        <path d="M248 232V150a24 24 0 0 1 48 0v82" />
        <path d="M288.6 150L296 157.4M282.9 150L296 163.1M280 152.7L296 168.7M280 158.4L296 174.4M280 164L296 180M280 169.7L296 185.7M280 175.3L296 191.3M280 181L296 197M280 186.7L296 202.7M280 192.3L296 208.3M280 198L296 214M280 203.6L296 219.6M280 209.3L296 225.3M280 214.9L296 230.9M280 220.6L291.4 232M280 226.3L285.7 232" style="stroke-width:.8" />
        <path d="M280 150v82" />
        <path d="M253.8 166a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M253.8 178a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M253.8 190a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M253.8 202a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M253.8 214a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M263.8 166a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M263.8 178a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M263.8 190a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M263.8 202a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M263.8 214a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M273.8 166a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M273.8 178a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M273.8 190a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M273.8 202a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M273.8 214a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0" style="stroke-width:.9" />
        <path d="M286 158h6v12h-6z" />
        <path d="M289 170v58M286 232l3 6 3-6" style="stroke-width:1;stroke-dasharray:5 3.5" />
        <path d="M248 132H296M254 129.5l-6 2.5 6 2.5M290 129.5l6 2.5-6 2.5" style="stroke-width:.9" /><text x="272" y="128" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono);text-anchor:middle">Ø 12</text>
        <path d="M262 190Q231.5 191 214 216M292 162Q319.5 162 336 140M276 126Q302.5 123 316 100M296 210Q309.5 233 336 236" style="stroke-width:.9" />
        </g>
        <g style="fill:var(--tf-ink);font:500 11px var(--tf-mono)"><text x="92" y="34">A</text><text x="180" y="80">A</text></g>
        <g style="fill:var(--tf-ink);font:500 12px var(--tf-mono)"><text x="190" y="220">14a</text><text x="340" y="144">14b</text><text x="320" y="104">26</text><text x="340" y="240">10</text></g>
        <g style="fill:var(--tf-ink);font:500 11px var(--tf-mono)"><text x="120" y="290">FURLED · DETAIL A · 5:1</text></g>
    - style: patent
      caption: "The compact umbrella folded, with its three-stage telescoping shaft (16a–c) collapsed inside the canopy, and extended below. The tip (14) is the same."
      svg: |-
        <g style="fill:none;stroke:var(--tf-ink);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round">
        <path d="M44 116h12v8H44z" />
        <path d="M48 120a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" style="stroke-width:.9" />
        <path d="M56 120C60 100 90 96 140 96S222 100 226 120S190 144 140 144S60 140 56 120Z" style="stroke-width:2.4" />
        <path d="M70 108C110 104 180 104 214 110M70 132C110 136 180 136 214 130" style="stroke-width:.9" />
        <path d="M70 114h150v12h-150zM80 116h140v8h-140zM90 118h130v4h-130z" style="stroke-width:1;stroke-dasharray:5 3.5" />
        <path d="M226 116h20v8h-20z" />
        <path d="M246 110h70a10 10 0 0 1 0 20h-70z" />
        <path d="M299.5 110L306 116.5M293.8 110L306 122.2M288.2 110L306 127.8M282.5 110L302.5 130M276.9 110L296.9 130M271.2 110L291.2 130M265.6 110L285.6 130M259.9 110L279.9 130M256 111.8L274.2 130M256 117.4L268.6 130M256 123.1L262.9 130M256 128.7L257.3 130" style="stroke-width:.8" />
        <path d="M326 120a10 10 0 1 0 20 0a10 10 0 1 0-20 0" style="stroke-width:.9" />
        <path d="M44 84V110M316 84V104M44 88H316" style="stroke-width:.9" />
        <path d="M44 216h12v8H44z" />
        <path d="M56 220h60" style="stroke-width:1;stroke-dasharray:5 3.5" />
        <path d="M56 216h96v8H56zM152 217h96v6h-96zM248 218h80v4h-80z" />
        <path d="M328 210h50a10 10 0 0 1 0 20h-50z" />
        <path d="M50 116Q69 90.5 60 60M110 98Q115 80.5 104 66M100 224Q94 236 100 248M200 223Q193.8 235.5 200 248M288 222Q281.5 235 288 248M280 130Q282.5 150 300 160M346 110Q362.5 102 366 84" style="stroke-width:.9" />
        </g>
        <g style="fill:var(--tf-ink);font:500 12px var(--tf-mono)"><text x="52" y="56">14</text><text x="96" y="62">10</text><text x="90" y="262">16a</text><text x="190" y="262">16b</text><text x="278" y="262">16c</text><text x="302" y="174">18</text><text x="368" y="80">34</text></g>
        <g style="fill:var(--tf-ink);font:500 9px var(--tf-mono)"><text x="168" y="80">320</text><text x="60" y="206">EXTENDED</text></g>
        <g style="fill:var(--tf-ink);font:500 11px var(--tf-mono)"><text x="70" y="290">COMPACT · FOLDED · 3-STAGE SHAFT (16)</text></g>
    - style: patent
      caption: "System diagram. Rain enters at the sensor tip (14) and leaves the phone (20) as a notification (44), in plain language."
      svg: |-
        <g style="fill:none;stroke:var(--tf-ink);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round">
        <path d="M40 46h320v124H40z" style="stroke-width:1;stroke-dasharray:5 3.5" />
        <path d="M70 22q5 8 0 12q-5-4 0-12zM90 14q5 8 0 12q-5-4 0-12zM110 26q5 8 0 12q-5-4 0-12z" />
        <path d="M90 40v18M86 52l4 6 4-6" />
        <path d="M56 66h70v30H56z" />
        <text x="60" y="76" style="fill:var(--tf-ink);font:500 8px var(--tf-mono)">14</text>
        <text x="91" y="88" style="fill:var(--tf-ink);font:500 9px var(--tf-mono);text-anchor:middle">SENSOR TIP</text>
        <path d="M166 66h70v30H166z" />
        <text x="170" y="76" style="fill:var(--tf-ink);font:500 8px var(--tf-mono)">40</text>
        <text x="201" y="88" style="fill:var(--tf-ink);font:500 9px var(--tf-mono);text-anchor:middle">MCU</text>
        <path d="M276 66h70v30H276z" />
        <text x="280" y="76" style="fill:var(--tf-ink);font:500 8px var(--tf-mono)">42</text>
        <text x="311" y="88" style="fill:var(--tf-ink);font:500 9px var(--tf-mono);text-anchor:middle">BLE</text>
        <path d="M166 122h70v30H166z" />
        <text x="170" y="132" style="fill:var(--tf-ink);font:500 8px var(--tf-mono)">46</text>
        <text x="201" y="144" style="fill:var(--tf-ink);font:500 9px var(--tf-mono);text-anchor:middle">BATTERY</text>
        <path d="M276 122h70v30H276z" />
        <text x="280" y="132" style="fill:var(--tf-ink);font:500 8px var(--tf-mono)">48</text>
        <text x="311" y="144" style="fill:var(--tf-ink);font:500 9px var(--tf-mono);text-anchor:middle">USB-C</text>
        <path d="M126 81h40M160 77l6 4-6 4M236 81h40M270 77l6 4-6 4M201 122v-26M197 102l4-6 4 6M276 137h-40M242 133l-6 4 6 4" />
        <path d="M311 96v54L288 214" style="stroke-width:1;stroke-dasharray:5 3.5" />
        <path d="M300 176a14 14 0 0 1 20 0M295 168a20 20 0 0 1 30 0" style="stroke-width:.9" />
        <path d="M120 198h160a8 8 0 0 1 8 8v54a8 8 0 0 1-8 8H120a8 8 0 0 1-8-8v-54a8 8 0 0 1 8-8z" />
        <path d="M120 206h160v50H120z" style="stroke-width:.9" />
        <path d="M282 244Q307.5 265.5 340 258" style="stroke-width:.9" />
        </g>
        <text x="200" y="240" style="fill:var(--tf-ink);font:600 11px var(--tf-mono);text-anchor:middle">IT IS RAINING.</text>
        <text x="200" y="222" style="fill:var(--tf-muted);font:500 8px var(--tf-mono);text-anchor:middle">UMBRELLA · NOW</text>
        <g style="fill:var(--tf-ink);font:500 9px var(--tf-mono)"><text x="262" y="42">10 · UMBRELLA</text><text x="112" y="194">20</text></g>
        <g style="fill:var(--tf-ink);font:500 12px var(--tf-mono)"><text x="344" y="262">44</text></g>
        <g style="fill:var(--tf-ink);font:500 11px var(--tf-mono)"><text x="70" y="290">SYSTEM · RAIN IN, NOTIFICATION OUT</text></g>
  rewards:
    - id: compact
      title: Compact
      description: A folding umbrella for a bag or a coat pocket.
      price: 49
      claimed: 170
      options:
        - id: canopy
          name: Canopy
          choices:
            - { id: signal, label: Signal orange }
            - { id: slate, label: Slate }
      shipsTo: [domestic, europe]
      delivery: +150d
    - id: full-size
      title: Full size
      description: A walking-length umbrella with a hooked handle.
      price: 69
      claimed: 110
      options:
        - id: canopy
          name: Canopy
          choices:
            - { id: signal, label: Signal orange }
            - { id: slate, label: Slate }
      shipsTo: [domestic, europe]
      delivery: +150d
    - id: household
      title: Household pack
      description: Three full-size umbrellas, one alert each.
      price: 149
      claimed: 26
      shipsTo: [domestic, europe]
      delivery: +165d
  addons:
    - { id: sensor-tip, title: Spare sensor tip, price: 15, claimed: 60 }
  shipping: { domestic: 6, europe: 11 }
---

You are outside. It begins to rain. The Rain-Aware Umbrella notices, and
sends a notification to your phone so that you know.

## The sensor

A capacitive sensor in the tip of the umbrella detects falling water within a
fraction of a second. The paired app then tells you, in plain language, that
it is raining.

## Why an app

Early testers reported that they could usually tell it was raining without
help. They could not, however, tell it from their phone. The app closes that
gap.

## Shipping

The umbrella ships within Europe only. Outside Europe we cannot yet confirm
that it rains in the same way.
