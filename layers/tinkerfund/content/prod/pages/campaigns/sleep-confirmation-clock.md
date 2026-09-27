---
title: Sleep Confirmation Clock
description: A bedside clock that tells you, in the morning, that you slept.
campaign:
  registry: TF-0023
  inventor: tomasz-wrobel
  category: sleep
  goal: 14000
  launch: -2d
  end: +28d
  backers: 120
  pledged: 7140
  specifications:
    - { label: Sensors, value: "Accelerometer under the mattress plate, condenser microphone in the base" }
    - { label: Verdict, value: "Asleep or Not Asleep, shown at the alarm" }
    - { label: Score, value: "None. The clock reports a fact, not a grade" }
    - { label: Hours recorded, value: "Time from first stillness to alarm" }
    - { label: Height, value: "90 mm" }
    - { label: Materials, value: "Solid ash or solid walnut, oiled finish" }
    - { label: Display, value: "E-ink, always legible, no backlight glow at night" }
    - { label: Power, value: "USB-C, 14 days on battery" }
  figures:
    - style: isometric
      caption: "The clock at the alarm, in ash. It has read the night and reports it."
      svg: |-
        <ellipse cx="200" cy="228" rx="91.2" ry="32.6" style="fill:var(--tf-line)" />
        <path d="M186.1 42L269.3 90L213.9 122L130.7 74Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M130.7 218L213.9 266L213.9 122L130.7 74Z" style="fill:var(--tf-accent)" />
        <path d="M269.3 234L213.9 266L213.9 122L269.3 90Z" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" />
        <g transform="matrix(.866 .5 -.866 .5 200 82)"><path d="M-44 -9.6q32 -4.8 48 0t40 0M-44 12.8q32 -4.8 48 0t40 0" style="fill:none;stroke:color-mix(in srgb, var(--tf-accent) 62%, var(--tf-surface));stroke-width:0.8;stroke-linecap:round;stroke-linejoin:round" /></g>
        <path d="M139 88.4L205.5 126.8L205.5 181.2L139 142.8Z" style="fill:var(--tf-surface)" />
        <path d="M139 88.4l66.5 38.4v54.4l-66.5 -38.4Z" style="fill:none;stroke:var(--tf-line);stroke-width:1;stroke-linecap:round;stroke-linejoin:round" />
        <g transform="matrix(.866 .5 0 1 139 88.4)"><text x="38.4" y="20.4" style="fill:var(--tf-ink);stroke:none;font:500 15px var(--tf-mono);text-anchor:middle">ASLEEP</text><text x="38.4" y="33.9" style="fill:var(--tf-ink);stroke:none;font:500 10px var(--tf-mono);text-anchor:middle">7.4 H</text></g>
        <g transform="matrix(.866 .5 0 1 144.6 213.2)"><path d="M0 0h5.6M12.8 0h5.6M25.6 0h5.6M38.4 0h5.6M51.2 0h5.6" style="fill:none;stroke:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface));stroke-width:3.2;stroke-linecap:round" /></g>
        <g transform="matrix(-.866 .5 0 1 230.5 242)"><rect x="0" y="0" width="14.4" height="4.8" rx="2.4" style="fill:var(--tf-ink)" /></g>
    - style: isometric
      caption: "Exploded: e-ink panel, timber body, base with the microphone, battery and USB-C, and the mattress plate on its cable. The plate goes under the mattress; nothing else does."
      svg: |-
        <ellipse cx="150" cy="244" rx="62.7" ry="22.4" style="fill:var(--tf-line)" />
        <path d="M140.5 200.2L197.6 233.2L159.5 255.2L102.4 222.2Z" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M102.4 236.5L159.5 269.5L159.5 255.2L102.4 222.2Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M197.6 247.5L159.5 269.5L159.5 255.2L197.6 233.2Z" style="fill:var(--tf-ink)" />
        <path d="M120.5 215.6V223.3A6.6 3.8 0 0 0 127.1 227.1V219.4A6.6 3.8 0 0 1 120.5 215.6Z" style="fill:var(--tf-ink)" />
        <path d="M127.1 219.4V227.1A6.6 3.8 0 0 0 133.7 223.3V215.6A6.6 3.8 0 0 1 127.1 219.4Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <ellipse cx="127.1" cy="215.6" rx="6.6" ry="3.8" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M157.6 210.1L182.4 224.4L159.5 237.6L134.8 223.3Z" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M134.8 232.1L159.5 246.4L159.5 237.6L134.8 223.3Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M182.4 233.2L159.5 246.4L159.5 237.6L182.4 224.4Z" style="fill:var(--tf-ink)" />
        <g transform="matrix(-.866 .5 0 1 171 258.5)"><rect x="0" y="0" width="9.9" height="3.3" rx="1.7" style="fill:var(--tf-surface)" /></g>
        <path d="M150 227.7v-34" style="fill:none;stroke:var(--tf-muted);stroke-width:1;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:3 3" />
        <path d="M140.5 87.5L197.6 120.5L159.5 142.5L102.4 109.5Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M102.4 194.2L159.5 227.2L159.5 142.5L102.4 109.5Z" style="fill:var(--tf-accent)" />
        <path d="M197.6 205.2L159.5 227.2L159.5 142.5L197.6 120.5Z" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" />
        <path d="M108.1 119.4L153.8 145.8L153.8 183.2L108.1 156.8Z" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" />
        <g transform="matrix(.866 .5 0 1 111.9 190.9)"><path d="M0 0h3.9M8.8 0h3.9M17.6 0h3.9M26.4 0h3.9M35.2 0h3.9" style="fill:none;stroke:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink));stroke-width:2.2;stroke-linecap:round" /></g>
        <path d="M83.3 171.1L129 197.5L129 160.1L83.3 133.7Z" style="fill:var(--tf-surface)" />
        <path d="M130.9 196.4L129 197.5L129 160.1L130.9 159Z" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M83.3 133.7l45.7 26.4v37.4l-45.7 -26.4Z" style="fill:none;stroke:var(--tf-line);stroke-width:1;stroke-linecap:round;stroke-linejoin:round" />
        <g transform="matrix(.866 .5 0 1 83.3 133.7)"><text x="26.4" y="14.2" style="fill:var(--tf-ink);stroke:none;font:500 10.5px var(--tf-mono);text-anchor:middle">ASLEEP</text><text x="26.4" y="24.6" style="fill:var(--tf-ink);stroke:none;font:500 7.5px var(--tf-mono);text-anchor:middle">7.4 H</text></g>
        <ellipse cx="303.3" cy="223.5" rx="67.2" ry="24" style="fill:var(--tf-line)" />
        <path d="M292 180.1L375.2 228.1L319.7 260.1L236.6 212.1Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M236.6 214L319.7 262L319.7 260.1L236.6 212.1Z" style="fill:var(--tf-accent)" />
        <path d="M375.2 230L319.7 262L319.7 260.1L375.2 228.1Z" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" />
        <path d="M302.7 219.3V220.1A3.2 1.8 0 0 0 305.9 221.9V221.1A3.2 1.8 0 0 1 302.7 219.3Z" style="fill:var(--tf-ink)" />
        <path d="M305.9 221.1V221.9A3.2 1.8 0 0 0 309.1 220.1V219.3A3.2 1.8 0 0 1 305.9 221.1Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <ellipse cx="305.9" cy="219.3" rx="3.2" ry="1.8" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M165.2 264.2q44 14 88 -62.8" style="fill:none;stroke:var(--tf-ink);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round" />
    - style: isometric
      caption: "Ash and walnut. The Walnut Edition is shown displaying the other verdict, which either clock can reach."
      svg: |-
        <ellipse cx="112" cy="192" rx="65.6" ry="23.5" style="fill:var(--tf-line)" />
        <path d="M102 57.8L161.8 92.3L122 115.3L62.2 80.8Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M62.2 184.3L122 218.8L122 115.3L62.2 80.8Z" style="fill:var(--tf-accent)" />
        <path d="M161.8 195.8L122 218.8L122 115.3L161.8 92.3Z" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" />
        <path d="M62.2 184.3L122 218.8L161.8 195.8L161.8 92.3L102 57.8L62.2 80.8Z" style="fill:none;stroke:var(--tf-line);stroke-width:1;stroke-linecap:round;stroke-linejoin:round" />
        <g transform="matrix(.866 .5 -.866 .5 112 86.5)"><path d="M-30.5 -6.9q23 -3.4 34.5 0t26.5 0M-30.5 9.2q23 -3.4 34.5 0t26.5 0" style="fill:none;stroke:color-mix(in srgb, var(--tf-accent) 62%, var(--tf-surface));stroke-width:0.8;stroke-linecap:round;stroke-linejoin:round" /></g>
        <path d="M68.2 91.1L116 118.7L116 157.8L68.2 130.2Z" style="fill:var(--tf-surface)" />
        <path d="M68.2 91.1l47.8 27.6v39.1l-47.8 -27.6Z" style="fill:none;stroke:var(--tf-line);stroke-width:1;stroke-linecap:round;stroke-linejoin:round" />
        <g transform="matrix(.866 .5 0 1 68.2 91.1)"><text x="27.6" y="14.9" style="fill:var(--tf-ink);stroke:none;font:500 11px var(--tf-mono);text-anchor:middle">ASLEEP</text><text x="27.6" y="25.9" style="fill:var(--tf-ink);stroke:none;font:500 8px var(--tf-mono);text-anchor:middle">7.4 H</text></g>
        <g transform="matrix(.866 .5 0 1 72.2 180.8)"><path d="M0 0h4M9.2 0h4M18.4 0h4M27.6 0h4M36.8 0h4" style="fill:none;stroke:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface));stroke-width:2.3;stroke-linecap:round" /></g>
        <g transform="matrix(-.866 .5 0 1 133.9 201.5)"><rect x="0" y="0" width="10.4" height="3.5" rx="1.7" style="fill:var(--tf-ink)" /></g>
        <ellipse cx="288" cy="192" rx="65.6" ry="23.5" style="fill:var(--tf-line)" />
        <path d="M278 57.8L337.8 92.3L298 115.3L238.2 80.8Z" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" />
        <path d="M238.2 184.3L298 218.8L298 115.3L238.2 80.8Z" style="fill:color-mix(in srgb, var(--tf-accent) 55%, var(--tf-ink))" />
        <path d="M337.8 195.8L298 218.8L298 115.3L337.8 92.3Z" style="fill:color-mix(in srgb, var(--tf-accent) 38%, var(--tf-ink))" />
        <g transform="matrix(.866 .5 -.866 .5 288 86.5)"><path d="M-30.5 -6.9q23 -3.4 34.5 0t26.5 0M-30.5 9.2q23 -3.4 34.5 0t26.5 0" style="fill:none;stroke:color-mix(in srgb, var(--tf-accent) 38%, var(--tf-ink));stroke-width:0.8;stroke-linecap:round;stroke-linejoin:round" /></g>
        <path d="M244.2 91.1L292 118.7L292 157.8L244.2 130.2Z" style="fill:var(--tf-surface)" />
        <path d="M244.2 91.1l47.8 27.6v39.1l-47.8 -27.6Z" style="fill:none;stroke:var(--tf-line);stroke-width:1;stroke-linecap:round;stroke-linejoin:round" />
        <g transform="matrix(.866 .5 0 1 244.2 91.1)"><text x="27.6" y="12.4" style="fill:var(--tf-ink);stroke:none;font:500 8.5px var(--tf-mono);text-anchor:middle">NOT</text><text x="27.6" y="24" style="fill:var(--tf-ink);stroke:none;font:500 8.5px var(--tf-mono);text-anchor:middle">ASLEEP</text><text x="27.6" y="34.4" style="fill:var(--tf-ink);stroke:none;font:500 7.5px var(--tf-mono);text-anchor:middle">0.0 H</text></g>
        <g transform="matrix(.866 .5 0 1 248.2 180.8)"><path d="M0 0h4M9.2 0h4M18.4 0h4M27.6 0h4M36.8 0h4" style="fill:none;stroke:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface));stroke-width:2.3;stroke-linecap:round" /></g>
        <g transform="matrix(-.866 .5 0 1 309.9 201.5)"><rect x="0" y="0" width="10.4" height="3.5" rx="1.7" style="fill:var(--tf-ink)" /></g>
        <text x="112" y="262" style="fill:var(--tf-ink);stroke:none;font:500 10px var(--tf-mono);text-anchor:middle">ASH</text>
        <text x="288" y="262" style="fill:var(--tf-ink);stroke:none;font:500 10px var(--tf-mono);text-anchor:middle">WALNUT · 150 UNITS</text>
        <text x="200" y="284" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono);text-anchor:middle">BOTH 90 MM · BOTH VERDICTS</text>
    - style: patent
      caption: "Section A–A through the clock: timber body (10), e-ink panel (12), microphone (14) over its sound port (20), USB-C (16), battery (18) and the socket for the mattress plate (22)."
      svg: |-
        <g style="fill:none;stroke:var(--tf-ink);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round">
        <path d="M150 42h84v189h-84z" style="stroke-width:2.4" />
        <path d="M150 54.6h6.3v71.4h-6.3z" />
        <path d="M158.4 197.4h67.2v25.2h-67.2z" />
        <path d="M229.4 42L234 46.6M222.3 42L234 53.7M215.2 42L234 60.8M208.2 42L234 67.8M201.1 42L234 74.9M194 42L234 82M187 42L234 89M179.9 42L234 96.1M172.8 42L234 103.2M165.7 42L234 110.3M158.7 42L234 117.3M151.6 42L234 124.4M150 47.5L234 131.5M156.3 60.8L234 138.5M156.3 67.9L234 145.6M156.3 75L234 152.7M156.3 82.1L234 159.8M156.3 89.1L234 166.8M156.3 96.2L234 173.9M156.3 103.3L234 181M156.3 110.3L234 188M156.3 117.4L234 195.1M156.3 124.5L234 202.2M150.7 126L222.1 197.4M225.6 200.9L234 209.3M150 132.3L215.1 197.4M225.6 207.9L234 216.3M150 139.4L208 197.4M225.6 215L234 223.4M150 146.5L200.9 197.4M225.6 222.1L234 230.5M150 153.5L193.9 197.4M219.1 222.6L227.5 231M150 160.6L186.8 197.4M212 222.6L220.4 231M150 167.7L179.7 197.4M204.9 222.6L213.3 231M150 174.7L172.7 197.4M197.9 222.6L206.3 231M150 181.8L165.6 197.4M190.8 222.6L199.2 231M150 188.9L158.5 197.4M183.7 222.6L192.1 231M150 196L158.4 204.4M168.2 214.2L175.2 221.2M176.6 222.6L185 231M150 203L158.4 211.4M161.2 214.2L169.6 222.6M175.2 228.2L178 231M150 210.1L158.4 218.5M158.4 218.5L162.5 222.6M150 217.2L158.4 225.6M150 224.2L156.8 231" style="stroke-width:.8" />
        <path d="M147.9 54.6h7.4v71.4h-7.3z" />
        <path d="M159.5 210a7.4 7.4 0 1 0 14.7 0a7.4 7.4 0 1 0 -14.7 0" />
        <path d="M158.4 214.2h16.8v16.8h-16.8z" />
        <path d="M179.4 203.7h42v14.7h-42z" />
        <path d="M183.6 207.9h33.6M183.6 214.2h33.6" style="stroke-width:.9" />
        <path d="M225.6 203.7h8.4v6.7h-8.4z" />
        <path d="M225.6 214.2h8.4v6.3h-8.4z" />
        <path d="M192 28v8M192 237v8" />
        <path d="M222 72Q252 77 274 56M153.2 126Q140.6 104.7 116 102M166.8 210Q144.7 190.8 116 197M200.4 211.1Q188.9 234 200.4 257M229.8 207.1Q257.4 207.1 274 185M229.8 217.4Q250.5 231.2 274 223M166.8 226.8Q137.9 221.2 116 241" style="stroke-width:.9" />
        </g>
        <g style="fill:var(--tf-ink);stroke:none;font:500 12px var(--tf-mono)"><text x="278" y="60">10</text><text x="98" y="106">12</text><text x="98" y="201">14</text><text x="194.4" y="271">18</text><text x="278" y="189">16</text><text x="278" y="227">22</text><text x="98" y="245">20</text></g>
        <g style="fill:none;stroke:var(--tf-ink)"><path d="M256 42V231M253.5 48l2.5-6 2.5 6M253.5 225l2.5 6 2.5-6" style="stroke-width:.9" /><text x="261" y="139.5" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono)">90 MM</text><path d="M150 20H234M156 17.5l-6 2.5 6 2.5M228 17.5l6 2.5-6 2.5" style="stroke-width:.9" /><text x="192" y="16" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono);text-anchor:middle">40 MM</text></g>
        <text x="104" y="48" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono)">FRONT</text>
        <g style="fill:var(--tf-ink);stroke:none;font:500 11px var(--tf-mono)"><text x="150" y="290">SECTION A–A</text></g>
    - style: patent
      caption: "Elevation in use: clock (10), mattress plate (20) on its cable (22) between the mattress (30) and the frame (32). The sleeper (40) is shown asleep and is not included."
      svg: |-
        <g style="fill:none;stroke:var(--tf-ink);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round">
        <path d="M12 238H388" style="stroke-width:2.4" />
        <path d="M92 238V190M378 238V190" />
        <path d="M92 190h286v10h-286z" />
        <path d="M95 190v-40q0-8 8-8h264q8 0 8 8v40" />
        <path d="M364.7 142L375 152.3M354.8 142L375 162.2M344.9 142L375 172.1M335 142L375 182M325.1 142L373.1 190M315.2 142L363.2 190M305.3 142L353.3 190M295.4 142L343.4 190M285.5 142L333.5 190M275.6 142L323.6 190M265.7 142L313.7 190M255.8 142L303.8 190M245.9 142L293.9 190M236 142L284 190M226.1 142L274.1 190M216.2 142L264.2 190M206.3 142L254.3 190M196.4 142L244.4 190M186.5 142L234.5 190M176.6 142L224.6 190M166.7 142L214.7 190M156.8 142L204.8 190M146.9 142L194.9 190M137.1 142L185.1 190M127.2 142L175.2 190M117.3 142L165.3 190M107.4 142L155.4 190M97.5 142L145.5 190M95 149.4L135.6 190M95 159.3L125.7 190M95 169.2L115.8 190M95 179.1L105.9 190M95 189L96 190" style="stroke-width:.8" />
        <path d="M132 186.5h120v3.5h-120z" style="fill:var(--tf-surface);stroke-width:2.4" />
        <path d="M106 142q12-14 52-9" style="stroke-width:1;stroke-dasharray:5 3.5" />
        <path d="M124 132a10 10 0 1 1 20 0a10 10 0 1 1-20 0M146 128q44-14 100-3t116 8" style="stroke-width:1;stroke-dasharray:5 3.5" />
        <path d="M132 188.3H84q-8 0-8-8V176q0-8-8-8H68" />
        <path d="M22 238V168h50V238" />
        <path d="M26 105h42v63h-42z" style="stroke-width:2.4" />
        <path d="M30.2 109.2h33.6v23.8h-33.6z" />
        <path d="M34.4 162.4h25.2" style="stroke-width:.9" />
        <path d="M47 105Q58.5 98.3 60 85M192 190Q188.5 209.5 202 224M76 170Q74.5 203 100 224M292 166Q322 151 328 118M348 200Q335 208.5 334 224M202 122Q223.5 116.5 232 96" style="stroke-width:.9" />
        </g>
        <g style="fill:var(--tf-ink);stroke:none;font:500 12px var(--tf-mono)"><text x="64" y="81">10</text><text x="206" y="228">20</text><text x="104" y="228">22</text><text x="332" y="114">30</text><text x="320" y="228">32</text><text x="236" y="92">40</text></g>
        <g style="fill:var(--tf-ink);stroke:none;font:500 11px var(--tf-mono)"><text x="130" y="290">ELEVATION · IN USE</text></g>
    - style: patent
      caption: "What counts. The motion trace (40) runs from bedtime to the alarm (44); the hours recorded begin at the first sustained stillness (42). A stillness under three minutes (46) is not counted."
      svg: |-
        <g style="fill:none;stroke:var(--tf-ink);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round">
        <path d="M32 186H364M40 196V110" />
        <path d="M40 186l6 -20l6 20l6 -20l6 20l6 -20l6 20l6 -20l6 20l6 -8l6 8l6 -8l6 8h34l6 -18l6 18l6 -18l6 18l6 -18l6 18l6 -9l6 9l6 -9l6 9l6 -9l6 9l6 -3l6 3H352" style="stroke-width:2.4" />
        <path d="M352 196V116" />
        <path d="M344 112q0-16 8-16t8 16zM348 116h8" />
        <path d="M230 196V140" />
        <path d="M112 200v6h34v-6M120 198l18 12" style="stroke-width:.9" />
        <path d="M70 166Q94 140.5 88 106M348 94Q339 79.5 322 78M230 146Q227 122 206 110M146 206Q149 222.5 164 230" style="stroke-width:.9" />
        </g>
        <g style="fill:none;stroke:var(--tf-ink)"><path d="M230 130H352M236 127.5l-6 2.5 6 2.5M346 127.5l6 2.5-6 2.5" style="stroke-width:.9" /><text x="291" y="126" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono);text-anchor:middle">HOURS RECORDED · 7.4 H</text></g>
        <text x="32" y="216" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono)">23:10</text>
        <text x="364" y="216" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono);text-anchor:end">06:40</text>
        <text x="40" y="236" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono)">< 3 MIN · NOT COUNTED</text>
        <text x="235" y="216" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono)">FIRST STILLNESS</text>
        <text x="364" y="108" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono)">ALARM</text>
        <g style="fill:var(--tf-ink);stroke:none;font:500 12px var(--tf-mono)"><text x="82" y="102">40</text><text x="306" y="76">44</text><text x="188" y="108">42</text><text x="168" y="236">46</text></g>
        <g style="fill:var(--tf-ink);stroke:none;font:500 11px var(--tf-mono)"><text x="126" y="290">DIAGRAM · WHAT COUNTS</text></g>
  rewards:
    - id: ash-clock
      title: Ash Clock
      description: One Sleep Confirmation Clock in solid ash, oiled finish.
      price: 49
      claimed: 90
      shipsTo: [domestic, europe, world]
      delivery: +50d
    - id: walnut-clock
      title: Walnut Edition
      description: One Sleep Confirmation Clock in solid walnut, a darker grain than the Ash Clock. Limited to 150 units.
      price: 69
      claimed: 30
      stock: 150
      shipsTo: [domestic, europe, world]
      delivery: +50d
  addons:
    - { id: spare-plate, title: Spare mattress plate, price: 15, claimed: 25 }
  shipping: { domestic: 5, europe: 9, world: 15 }
---

Sleep is the only activity whose participants cannot confirm it happened. You
can be told you were asleep, by someone who was awake to see it, but you
cannot check your own account against anything. The Sleep Confirmation Clock
checks it for you.

## The verdict

An accelerometer under the mattress plate and a microphone in the base
monitor the bed through the night. At the alarm, the display reads either
Asleep or Not Asleep, with the number of hours behind whichever word it
shows. There is no sleep score. A score would be a judgement, and the clock
is not in a position to judge a night it did not live through. It only
confirms whether one happened.

## What counts

The hours shown run from the first sustained stillness the accelerometer
records to the moment the alarm sounds. A period of stillness under three
minutes does not count as sleep and is not counted; the Inventor has seen
enough three-minute stillnesses that turned out to be someone deciding
whether to get up.

## Two woods

The Ash Clock and the Walnut Edition are the same clock in different timber,
both 90 mm tall with an oiled finish that is meant to be touched in the dark
without looking. The Walnut Edition is limited to 150 units, the amount of
walnut the Inventor's supplier could commit to at this thickness before the
campaign ends.

## The Inventor

Tomasz Wróbel is the optics technician in Wrocław behind the Automatic Sheep
Counter. That clock counts sheep all night and prints a total. Backers keep
asking a different question: whether they slept at all. This is his answer
to that question, not an upgrade to the old one.
