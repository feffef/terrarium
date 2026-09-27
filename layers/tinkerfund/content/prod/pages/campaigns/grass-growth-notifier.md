---
title: Grass Growth Notifier
description: A lawn stake that sends a push notification each time the grass grows a tenth of a millimetre.
campaign:
  registry: TF-0022
  inventor: gwen-ashdown
  category: garden
  goal: 20000
  launch: -80d
  end: -50d
  backers: 320
  pledged: 26400
  specifications:
    - { label: Sensor, value: "Laser displacement, single marked blade" }
    - { label: Resolution, value: 0.02 mm }
    - { label: Notification threshold, value: 0.1 mm growth }
    - { label: Typical interval, value: "~40 minutes, early summer" }
    - { label: Stake height, value: 200 mm }
    - { label: Mowing detection, value: "Automatic, resets the count" }
    - { label: Connectivity, value: "Bluetooth LE 5.0, companion app" }
    - { label: Battery, value: "Rechargeable, USB-C, 3 weeks typical" }
    - { label: Daily summary, value: "Optional, off by default" }
  figures:
    - style: isometric
      caption: "The Notifier on its 200 mm stake, with the marked blade under the arm. The sensor looks down the dashed line; the blade is shown at mid-morning."
      svg: |-
        <ellipse cx="200" cy="224" rx="118" ry="48" style="fill:var(--tf-line)" />
        <path d="M111.2 214V222.4A80.8 46.7 0 0 0 192 269.1V260.7A80.8 46.7 0 0 1 111.2 214Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M192 260.7V269.1A80.8 46.7 0 0 0 272.8 222.4V214A80.8 46.7 0 0 1 192 260.7Z" style="fill:var(--tf-ink)" />
        <ellipse cx="192" cy="214" rx="80.8" ry="46.7" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M232.4 215q-0.9 -10.1 -6 -16.8M127.2 204q-0.9 -10.1 -6 -16.8M152.3 200.3q0 -13 0 -21.6M152.2 188.5q0.9 -15.8 6 -26.4M175.2 193.8q-0.9 -18.7 -6 -31.2M184.3 184.1q0 -10.1 0 -16.8M201.6 176.4q0.9 -13 6 -21.6M211.6 190.2q-0.9 -15.8 -6 -26.4M231.8 188.5q0 -18.7 0 -31.2M226 202.4q0.9 -10.1 6 -16.8M243.8 206.2q-0.9 -13 -6 -21.6" style="fill:none;stroke:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface));stroke-width:2.88;stroke-linecap:round;stroke-linejoin:round" />
        <path d="M243.8 223.8q0 -13 0 -21.6M248.8 236.1q0.9 -15.8 6 -26.4M222.9 235.6q-0.9 -18.7 -6 -31.2M217.3 246.9q0 -10.1 0 -16.8M197.8 238.1q0.9 -13 6 -21.6M184.3 245.9q-0.9 -15.8 -6 -26.4M163.9 250.5q0 -18.7 0 -31.2M161.1 235.6q0.9 -10.1 6 -16.8M140.9 234q-0.9 -13 -6 -21.6M153.2 221.6q0 -15.8 0 -26.4M138 215q0.9 -18.7 6 -31.2" style="fill:none;stroke:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface));stroke-width:2.88;stroke-linecap:round;stroke-linejoin:round" />
        <path d="M192 49.9L205.9 58L192 66.1L178.1 58Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M178.1 214L192 222.1L192 66.1L178.1 58Z" style="fill:var(--tf-accent)" />
        <path d="M205.9 214L192 222.1L192 66.1L205.9 58Z" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" />
        <path d="M196 25.8L243.8 53.4L217.9 68.4L170.1 40.8Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M170.1 60.3L217.9 87.9L217.9 68.4L170.1 40.8Z" style="fill:var(--tf-accent)" />
        <path d="M243.8 72.9L217.9 87.9L217.9 68.4L243.8 53.4Z" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" />
        <path d="M202.9 79.3L214.9 86.2L214.9 82.7L202.9 75.8Z" style="fill:var(--tf-ink)" />
        <path d="M233.8 71.8L227.9 75.3L227.9 70.7L233.8 67.2Z" style="fill:var(--tf-ink)" />
        <circle cx="176.1" cy="52" r="2.8" style="fill:var(--tf-good)" />
        <path d="M221.9 75.3L221.9 173.3" style="fill:none;stroke:var(--tf-link);stroke-width:1.4949999999999999;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:3 2.5" />
        <path d="M221.9 231.3q0 -34.8 0 -58" style="fill:none;stroke:var(--tf-ink);stroke-width:3.9099999999999997;stroke-linecap:round;stroke-linejoin:round" />
        <path d="M216.7 195.3V201A5.2 3 0 0 0 221.9 204V198.3A5.2 3 0 0 1 216.7 195.3Z" style="fill:var(--tf-accent)" />
        <path d="M221.9 198.3V204A5.2 3 0 0 0 227.1 201V195.3A5.2 3 0 0 1 221.9 198.3Z" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" />
        <ellipse cx="221.9" cy="195.3" rx="5.2" ry="3" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <circle cx="221.9" cy="173.3" r="2.5" style="fill:var(--tf-link)" />
        <path d="M185.5 17.5a9 9 0 0 0 0 15M181 11.5a16.5 16.5 0 0 0 0 27" style="fill:none;stroke:var(--tf-link);stroke-width:2.4000000000000004;stroke-linecap:round;stroke-linejoin:round" />
    - style: isometric
      caption: "In use. The stake reports over Bluetooth LE; the phone shows the current notification and the one before it, 41 minutes earlier. The daily summary is off."
      svg: |-
        <ellipse cx="108" cy="218" rx="78" ry="30" style="fill:var(--tf-line)" />
        <ellipse cx="290" cy="240" rx="66" ry="22" style="fill:var(--tf-line)" />
        <path d="M50.1 206V211.6A53.9 31.1 0 0 0 104 242.7V237.1A53.9 31.1 0 0 1 50.1 206Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M104 237.1V242.7A53.9 31.1 0 0 0 157.9 211.6V206A53.9 31.1 0 0 1 104 237.1Z" style="fill:var(--tf-ink)" />
        <ellipse cx="104" cy="206" rx="53.9" ry="31.1" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M74.7 200.4q0 -6.7 0 -11.2M82.1 187.3q0.6 -8.6 4 -14.4M105.5 191.5q-0.6 -10.6 -4 -17.6M126.8 190.9q0 -12.5 0 -20.8M147.6 200.4q0.6 -6.7 4 -11.2M125.9 226.7q-0.6 -6.7 -4 -11.2M102.5 222.5q0 -8.6 0 -14.4M81.2 223.1q0.6 -10.6 4 -17.6M60.4 213.6q-0.6 -12.5 -4 -20.8M133.3 213.6q-0.6 -8.6 -4 -14.4" style="fill:none;stroke:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface));stroke-width:1.92;stroke-linecap:round;stroke-linejoin:round" />
        <path d="M104 96.4L113.7 102L104 107.6L94.3 102Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M94.3 206L104 211.6L104 107.6L94.3 102Z" style="fill:var(--tf-accent)" />
        <path d="M113.7 206L104 211.6L104 107.6L113.7 102Z" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" />
        <path d="M106.8 79.6L140 98.8L122 109.2L88.8 90Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M88.8 103.6L122 122.8L122 109.2L88.8 90Z" style="fill:var(--tf-accent)" />
        <path d="M140 112.4L122 122.8L122 109.2L140 98.8Z" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" />
        <path d="M124.8 114L124.8 182" style="fill:none;stroke:var(--tf-link);stroke-width:1.04;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:3 2.5" />
        <path d="M124.8 218q0 -21.6 0 -36" style="fill:none;stroke:var(--tf-ink);stroke-width:2.72;stroke-linecap:round;stroke-linejoin:round" />
        <ellipse cx="124.8" cy="195.7" rx="3.2" ry="1.8" style="fill:var(--tf-accent)" />
        <circle cx="124.8" cy="182" r="1.8" style="fill:var(--tf-link)" />
        <path d="M100.6 70a6.6 6.6 0 0 0 0 11M97.3 65.6a12.1 12.1 0 0 0 0 19.8" style="fill:none;stroke:var(--tf-link);stroke-width:1.7600000000000002;stroke-linecap:round;stroke-linejoin:round" />
        <path d="M252.6 77L311.4 111L306.2 114L247.4 80Z" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M247.4 204L306.2 238L306.2 114L247.4 80Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M311.4 235L306.2 238L306.2 114L311.4 111Z" style="fill:var(--tf-ink)" />
        <path d="M249.9 200.5L303.6 231.5L303.6 117.5L249.9 86.5Z" style="fill:var(--tf-surface)" />
        <path d="M252.5 125L301 153L301 129L252.5 101Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M252.5 125L254.3 126L254.3 102L252.5 101Z" style="fill:var(--tf-accent)" />
        <text transform="matrix(.866 .5 0 1 256.9 112.5)" style="stroke:none;fill:var(--tf-ink);font:600 7.5px var(--tf-mono)">GRASS +0.1 MM</text>
        <text transform="matrix(.866 .5 0 1 256.9 121.5)" style="stroke:none;fill:var(--tf-muted);font:500 6px var(--tf-mono)">NOTIFIER · NOW</text>
        <path d="M252.5 159L301 187L301 163L252.5 135Z" style="fill:var(--tf-line)" />
        <path d="M252.5 159L254.3 160L254.3 136L252.5 135Z" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <text transform="matrix(.866 .5 0 1 256.9 146.5)" style="stroke:none;fill:var(--tf-ink);font:600 7.5px var(--tf-mono)">GRASS +0.1 MM</text>
        <text transform="matrix(.866 .5 0 1 256.9 155.5)" style="stroke:none;fill:var(--tf-muted);font:500 6px var(--tf-mono)">41 MIN AGO</text>
    - style: isometric
      caption: "The two stake lengths: 200 mm, and 350 mm for longer grass. Both track one blade to 0.02 mm."
      svg: |-
        <ellipse cx="112" cy="236" rx="62" ry="24" style="fill:var(--tf-line)" />
        <ellipse cx="294" cy="246" rx="70" ry="26" style="fill:var(--tf-line)" />
        <path d="M59 226V231.6A49 28.3 0 0 0 108 259.9V254.3A49 28.3 0 0 1 59 226Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M108 254.3V259.9A49 28.3 0 0 0 157 231.6V226A49 28.3 0 0 1 108 254.3Z" style="fill:var(--tf-ink)" />
        <ellipse cx="108" cy="226" rx="49" ry="28.3" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M93.8 215.5q0.6 -10.6 4 -17.6M121.6 209.8q-0.6 -12.5 -4 -20.8M148.8 224.8q0 -6.7 0 -11.2M96.1 242q-0.6 -6.7 -4 -11.2M71.3 229q0 -8.6 0 -14.4M124.6 240.5q0.6 -8.6 4 -14.4" style="fill:none;stroke:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface));stroke-width:1.92;stroke-linecap:round;stroke-linejoin:round" />
        <path d="M108 110.1L118.3 116L108 122L97.7 116Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M97.7 226L108 232L108 122L97.7 116Z" style="fill:var(--tf-accent)" />
        <path d="M118.3 226L108 232L108 122L118.3 116Z" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" />
        <path d="M110.9 92.2L146.3 112.6L127.1 123.7L91.8 103.2Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M91.8 117.7L127.1 138.1L127.1 123.7L91.8 103.2Z" style="fill:var(--tf-accent)" />
        <path d="M146.3 127.1L127.1 138.1L127.1 123.7L146.3 112.6Z" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" />
        <path d="M130.1 128.8L130.1 208.8" style="fill:none;stroke:var(--tf-link);stroke-width:1.105;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:3 2.5" />
        <path d="M130.1 238.8q0 -18 0 -30" style="fill:none;stroke:var(--tf-ink);stroke-width:2.8899999999999997;stroke-linecap:round;stroke-linejoin:round" />
        <ellipse cx="130.1" cy="220.2" rx="3.4" ry="2" style="fill:var(--tf-accent)" />
        <circle cx="130.1" cy="208.8" r="1.9" style="fill:var(--tf-link)" />
        <path d="M231.7 236V245.8A56.3 32.5 0 0 0 288 278.3V268.5A56.3 32.5 0 0 1 231.7 236Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M288 268.5V278.3A56.3 32.5 0 0 0 344.3 245.8V236A56.3 32.5 0 0 1 288 268.5Z" style="fill:var(--tf-ink)" />
        <ellipse cx="288" cy="236" rx="56.3" ry="32.5" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M267.7 222.1q0 -15.1 0 -25.2M303.8 214.3q1.1 -18.5 7 -30.8M315.9 234.7q-1 -21.8 -7 -36.4M241.4 240.8q-1 -11.8 -7 -19.6M311.2 254.1q0 -11.8 0 -19.6M270.4 262.2q1.1 -15.1 7 -25.2" style="fill:none;stroke:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface));stroke-width:3.36;stroke-linecap:round;stroke-linejoin:round" />
        <path d="M288 38.1L298.3 44L288 49.9L277.7 44Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M277.7 236L288 242L288 49.9L277.7 44Z" style="fill:var(--tf-accent)" />
        <path d="M298.3 236L288 242L288 49.9L298.3 44Z" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" />
        <path d="M290.9 20.2L326.3 40.6L307.1 51.7L271.8 31.3Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M271.8 45.7L307.1 66.1L307.1 51.7L271.8 31.3Z" style="fill:var(--tf-accent)" />
        <path d="M326.3 55.1L307.1 66.1L307.1 51.7L326.3 40.6Z" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" />
        <path d="M310.1 56.8L310.1 162.8" style="fill:none;stroke:var(--tf-link);stroke-width:1.105;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:3 2.5" />
        <path d="M310.1 248.8q0 -51.6 0 -86" style="fill:none;stroke:var(--tf-ink);stroke-width:2.8899999999999997;stroke-linecap:round;stroke-linejoin:round" />
        <ellipse cx="310.1" cy="195.4" rx="3.4" ry="2" style="fill:var(--tf-accent)" />
        <circle cx="310.1" cy="162.8" r="1.9" style="fill:var(--tf-link)" />
        <g style="stroke:none;fill:var(--tf-muted);font:600 11px var(--tf-mono);letter-spacing:.06em;text-anchor:middle"><text x="104" y="282">200 MM</text><text x="292" y="294">350 MM · LONGER GRASS</text></g>
    - style: patent
      caption: "Elevation, in the lawn: stake (10), sensor head (12), beam (14), marked blade (16), marking clip (18), LED (20), USB-C port (22), spike (24), the rest of the lawn (26) and the lens window (28). The stake stands 200 mm above the turf."
      svg: |-
        <g style="fill:none;stroke:var(--tf-ink);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round">
        <path d="M40 232H360" />
        <path d="M327.5 232L340 244.5M314.7 232L340 257.3M302 232L338 268M289.3 232L325.3 268M276.5 232L312.5 268M263.8 232L299.8 268M251.1 232L287.1 268M238.4 232L274.4 268M225.6 232L261.6 268M212.9 232L248.9 268M208 239.8L236.2 268M187.5 232L192 236.5M208 252.5L223.5 268M174.7 232L192 249.3M204.8 262L210.7 268M162 232L198 268M149.3 232L185.3 268M136.5 232L172.5 268M123.8 232L159.8 268M111.1 232L147.1 268M98.4 232L134.4 268M85.6 232L121.6 268M72.9 232L108.9 268M60.2 232L96.2 268M60 244.6L83.4 268M60 257.3L70.7 268" style="stroke-width:.8" />
        <path d="M192 232V258L200 268L208 258V232" style="stroke-width:1;stroke-dasharray:5 3.5" />
        <path d="M192 232V56M208 232V56" style="stroke-width:2.4" />
        <path d="M178 56V42q0-4 4-4H258q4 0 4 4V56H178" style="stroke-width:2.4" />
        <path d="M182 53H258" style="stroke-width:0.9" />
        <path d="M243 56v-4h14v4" />
        <path d="M246 55h8" style="stroke-width:0.9" />
        <path d="M187.4 47a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0" />
        <path d="M262 45h4v6h-4" />
        <path d="M250 56V186" style="stroke-width:1;stroke-dasharray:5 3.5" />
        <path d="M247 232C247 218 249 200 250 186" style="stroke-width:2.4" />
        <path d="M245 206h7v6h-7z" />
        <path d="M70 232q-1 -8 -3 -14M84 232q0 -8 3 -17M98 232q1 -8 -3 -20M112 232q-1 -8 3 -23M126 232q0 -8 -3 -14M140 232q1 -8 3 -17M154 232q-1 -8 -3 -20M168 232q0 -8 3 -23M224 232q1 -8 -3 -14M236 232q-1 -8 3 -17M274 232q0 -8 -3 -20M290 232q1 -8 3 -23M306 232q-1 -8 -3 -14M322 232q0 -8 3 -17M336 232q1 -8 -3 -20" style="stroke-width:1.2" />
        <path d="M170 30a10 10 0 0 0 0 14M164 25a17 17 0 0 0 0 24" style="stroke-width:.9" />
        <path d="M228 56V232M225.5 62l2.5-6 2.5 6M225.5 226l2.5 6 2.5-6" style="stroke-width:.9" />
        <text x="224" y="148" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono);text-anchor:end">200</text>
        <path d="M208 56H232M208 232H232" style="stroke-width:.9" />
        <path d="M92 116Q141 143 192 120M118 60Q151.5 68 178 46M304 130Q278 115.8 251 128M296 200Q273.5 188.8 251 200M214 214Q230.8 219.3 245 209M150 90Q180 80 190 50M316 70Q296.5 46.5 266 48M128 260Q162.5 271 192 250M330 252Q318 238.5 300 240M232 24Q230 41.8 243 54" style="stroke-width:.9" />
        </g>
        <g style="fill:var(--tf-ink);stroke:none;font:500 12px var(--tf-mono)"><text x="76" y="120">10</text><text x="102" y="62">12</text><text x="308" y="134">14</text><text x="300" y="204">16</text><text x="218" y="218">18</text><text x="134" y="92">20</text><text x="320" y="74">22</text><text x="112" y="264">24</text><text x="334" y="256">26</text><text x="236" y="26">28</text></g>
        <text x="154" y="40" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono);text-anchor:end">BLE</text>
        <g style="fill:var(--tf-ink);stroke:none;font:500 11px var(--tf-mono)"><text x="104" y="290">ELEVATION · STAKE IN LAWN · 200 MM</text></g>
    - style: patent
      caption: "Detail B, section through the head: laser emitter (30), receiver (32), window (34), battery (36), Bluetooth module (38) and USB-C port (22). The marked blade (16) with its clip (18) is shown before and, dashed, after 0.1 mm of growth, measured on the height axis (40). Growth exaggerated ×400."
      svg: |-
        <g style="fill:none;stroke:var(--tf-ink);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round">
        <path d="M60 104V50q0-6 6-6H334q6 0 6 6V104H304M220 104H60" style="stroke-width:2.4" />
        <path d="M64 100V48H336V100H304M220 100H64" />
        <path d="M328.3 44L332.3 48M336 51.7L340 55.7M319.8 44L323.8 48M336 60.2L340 64.2M311.3 44L315.3 48M336 68.7L340 72.7M302.8 44L306.8 48M336 77.2L340 81.2M294.3 44L298.3 48M336 85.7L340 89.7M285.8 44L289.8 48M336 94.2L340 98.2M277.3 44L281.3 48M333.3 100L337.3 104M268.9 44L272.9 48M324.9 100L328.9 104M260.4 44L264.4 48M316.4 100L320.4 104M251.9 44L255.9 48M307.9 100L311.9 104M243.4 44L247.4 48M234.9 44L238.9 48M226.4 44L230.4 48M217.9 44L221.9 48M209.5 44L213.5 48M201 44L205 48M192.5 44L196.5 48M184 44L188 48M175.5 44L179.5 48M167 44L171 48M158.6 44L162.6 48M214.6 100L218.6 104M150.1 44L154.1 48M206.1 100L210.1 104M141.6 44L145.6 48M197.6 100L201.6 104M133.1 44L137.1 48M189.1 100L193.1 104M124.6 44L128.6 48M180.6 100L184.6 104M116.1 44L120.1 48M172.1 100L176.1 104M107.6 44L111.6 48M163.6 100L167.6 104M99.2 44L103.2 48M155.2 100L159.2 104M90.7 44L94.7 48M146.7 100L150.7 104M82.2 44L86.2 48M138.2 100L142.2 104M73.7 44L77.7 48M129.7 100L133.7 104M65.2 44L69.2 48M121.2 100L125.2 104M60 47.3L64 51.3M112.7 100L116.7 104M60 55.8L64 59.8M104.2 100L108.2 104M60 64.2L64 68.2M95.8 100L99.8 104M60 72.7L64 76.7M87.3 100L91.3 104M60 81.2L64 85.2M78.8 100L82.8 104M60 89.7L64 93.7M70.3 100L74.3 104M60 98.2L65.8 104" style="stroke-width:.8" />
        <path d="M220 102H304" style="stroke-width:1.2" />
        <path d="M220 100H304" style="stroke-width:.9" />
        <path d="M72 60h96v34h-96z" />
        <path d="M168 70h5v14h-5" />
        <path d="M84 66h24M84 74h24M84 82h24" style="stroke-width:.9" />
        <path d="M72 96H336" />
        <path d="M184 58h30v22h-30z" />
        <path d="M190 64h18M190 70h18M190 76h18" style="stroke-width:.9" />
        <path d="M340 68h6v10h-6" />
        <path d="M224 78h16v16h-16z" />
        <path d="M278 78h28v16h-28z" />
        <path d="M282 82h20M282 90h20" style="stroke-width:.9" />
        <path d="M232 94V226" style="stroke-width:1" />
        <path d="M232 226L292 94M232 216L286 94" style="stroke-width:1;stroke-dasharray:5 3.5" />
        <path d="M228 272C228 256 231 242 232 226" style="stroke-width:2.4" />
        <path d="M232 226C232 222 232 219 232 216" style="stroke-width:1;stroke-dasharray:5 3.5" />
        <path d="M226 250h10v7h-10z" />
        <path d="M232 226H310M232 216H310" style="stroke-width:.9" />
        <path d="M306 216V226M303.5 222l2.5-6 2.5 6M303.5 220l2.5 6 2.5-6" style="stroke-width:.9" /><text x="311" y="224" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono)">0.1</text>
        <path d="M202 256H262" style="stroke-width:1" />
        <path d="M202 256V196" style="stroke-width:1;stroke-dasharray:5 3.5" />
        <path d="M199 200l3-6 3 6" style="stroke-width:.9" />
        <path d="M130 128Q186.5 132.5 224 90M330 130Q326 103 302 90M180 132Q228.5 137.5 262 102M52 130Q85 124 100 94M210 30Q198 41.5 200 58M330 30Q328 54 346 70M174 250Q199.3 264.5 226 253M180 200Q196.5 230.8 231 236M270 246Q238.5 236.5 212 256" style="stroke-width:.9" />
        </g>
        <g style="fill:var(--tf-ink);stroke:none;font:500 12px var(--tf-mono)"><text x="114" y="132">30</text><text x="334" y="134">32</text><text x="164" y="136">34</text><text x="36" y="134">36</text><text x="214" y="28">38</text><text x="334" y="28">22</text><text x="158" y="254">18</text><text x="164" y="204">16</text><text x="274" y="250">40</text></g>
        <text x="246" y="262" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono)">h</text>
        <text x="60" y="262" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono)">GROWTH ×400</text>
        <g style="fill:var(--tf-ink);stroke:none;font:500 11px var(--tf-mono)"><text x="80" y="290">DETAIL B · SECTION THROUGH THE HEAD</text></g>
    - style: patent
      caption: "One day recorded: a step and a notification per 0.1 mm (42), the cut detected (44) and announced once, the pause with no notifications (46), and growth resuming (48)."
      svg: |-
        <g style="fill:none;stroke:var(--tf-ink);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round">
        <path d="M56 60V236H356" />
        <path d="M350 233.5l6 2.5-6 2.5M53.5 66l2.5-6 2.5 6" style="stroke-width:.9" />
        <path d="M56 236v5M128 236v5M200 236v5M272 236v5M344 236v5" style="stroke-width:.9" />
        <path d="M56 190h8v-3.4h8v-3.4h8v-3.4h8v-3.4h8v-3.4h8v-3.4h8v-3.4h8v-3.4h8v-3.4h8v-3.4h8v-3.4h8v-3.4h8v-3.4h8v-3.4h8v-3.4h8v-3.4h8v-3.4h8v-3.4h8v-3.4h8v-3.4h8v-3.4h4.8V222h36h8v-3.4h8v-3.4h8v-3.4h8v-3.4h8v-3.4h8v-3.4h8" style="stroke-width:2.4" />
        <path d="M64 236v-5M72 236v-5M80 236v-5M88 236v-5M96 236v-5M104 236v-5M112 236v-5M120 236v-5M128 236v-5M136 236v-5M144 236v-5M152 236v-5M160 236v-5M168 236v-5M176 236v-5M184 236v-5M192 236v-5M200 236v-5M208 236v-5M216 236v-5M224 236v-5M280.8 236v-5M288.8 236v-5M296.8 236v-5M304.8 236v-5M312.8 236v-5M320.8 236v-5" style="stroke-width:1.2" />
        <path d="M228.8 236v-6l-4 4 8 0-4-4" style="stroke-width:1.2" />
        <path d="M56 190H228.8M56 222H228.8" style="stroke-width:1;stroke-dasharray:5 3.5" />
        <path d="M46 190v32M43.5 196l2.5-6 2.5 6M43.5 216l2.5 6 2.5-6" style="stroke-width:.9" />
        <path d="M150 140Q141.3 145 140 155M258 110Q220.7 147.6 228.4 200M230 190Q231.4 210.7 248.8 222M318 150Q296.3 176 304 209" style="stroke-width:.9" />
        </g>
        <g style="fill:var(--tf-ink);stroke:none;font:500 12px var(--tf-mono)"><text x="136" y="142">42</text><text x="244" y="112">44</text><text x="214" y="194">46</text><text x="322" y="154">48</text></g>
        <text x="40" y="209" style="fill:var(--tf-ink);stroke:none;font:500 8px var(--tf-mono);text-anchor:end">2.1</text>
        <text x="52" y="62" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono);text-anchor:end">h</text>
        <text x="56" y="250" style="fill:var(--tf-ink);stroke:none;font:500 8px var(--tf-mono);text-anchor:middle">0:00</text>
        <text x="128" y="250" style="fill:var(--tf-ink);stroke:none;font:500 8px var(--tf-mono);text-anchor:middle">6:00</text>
        <text x="200" y="250" style="fill:var(--tf-ink);stroke:none;font:500 8px var(--tf-mono);text-anchor:middle">12:00</text>
        <text x="272" y="250" style="fill:var(--tf-ink);stroke:none;font:500 8px var(--tf-mono);text-anchor:middle">18:00</text>
        <text x="344" y="250" style="fill:var(--tf-ink);stroke:none;font:500 8px var(--tf-mono);text-anchor:middle">24:00</text>
        <text x="80" y="209" style="fill:var(--tf-ink);stroke:none;font:500 8px var(--tf-mono)">ONE NOTIFICATION PER STEP</text>
        <text x="198.8" y="270" style="fill:var(--tf-ink);stroke:none;font:500 8px var(--tf-mono)">"THE GRASS HAS BEEN CUT." · ONCE</text>
        <g style="fill:var(--tf-ink);stroke:none;font:500 11px var(--tf-mono)"><text x="96" y="290">RECORD · ONE DAY · 0.1 MM PER STEP</text></g>
  rewards:
    - id: single-notifier
      title: One Notifier
      description: One Grass Growth Notifier on its stake, paired to the app.
      price: 39
      claimed: 220
      options:
        - id: stake-length
          name: Stake length
          choices:
            - { id: standard, label: "200 mm stake" }
            - { id: tall, label: "350 mm stake, for longer grass" }
      shipsTo: [domestic, europe, world]
      delivery: -10d
    - id: two-notifiers
      title: Two Notifiers
      description: Two units, for a lawn with a front and back to compare.
      price: 69
      claimed: 80
      options:
        - id: stake-length
          name: Stake length
          choices:
            - { id: standard, label: "200 mm stake" }
            - { id: tall, label: "350 mm stake, for longer grass" }
      shipsTo: [domestic, europe, world]
      delivery: -10d
    - id: garden-set
      title: Three-Notifier Garden Set
      description: Three notifiers sharing one app view, for a lawn with several distinct patches.
      price: 129
      claimed: 20
      stock: 60
      shipsTo: [domestic, europe, world]
      delivery: -5d
  addons:
    - { id: spare-blade-kit, title: "Spare marked-blade kit", description: "Replacement marking clips for the blade the sensor tracks.", price: 9, claimed: 45 }
    - { id: second-stake, title: "Second stake", description: "For repositioning without recalibrating the first.", price: 14, claimed: 35 }
  stretchGoals:
    - { id: second-channel, amount: 24000, title: "A second sensor channel, for tracking a second blade on the same stake" }
    - { id: night-mode, amount: 30000, title: "A night mode that holds notifications until sunrise" }
  shipping: { domestic: 4, europe: 8, world: 14 }
---

Most garden sensors report on the day, or the week. The Grass Growth
Notifier reports on the tenth of a millimetre, as it happens.

## Measuring in tenths of a millimetre

A laser displacement sensor looks down from a 200 mm stake at a single
marked blade and measures its height to 0.02 mm. Each time the blade has
gained 0.1 mm, the app sends a notification. The Inventor considers this the
only way to see growth as it happens, rather than after it has already
finished happening.

## Forty minutes, on average

In early summer this comes to roughly one notification every 40 minutes.
Notifications can be grouped into a daily summary instead, though the
Inventor has left this off on her own stake and does not recommend changing
that.

## The mowing detector

A mowing detector watches for a sudden drop in blade height and resets the
count. It then sends exactly one message: the grass has been cut. No further
notifications follow until the blade begins growing again.

## Delivered

Every Pledge has shipped, including the Garden Sets, each paired to its
app account and tested against a blade before packing.
