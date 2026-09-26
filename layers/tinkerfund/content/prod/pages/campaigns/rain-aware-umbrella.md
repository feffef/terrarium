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
      caption: The umbrella open in the rain, with its paired phone.
      svg: |-
        <ellipse cx="206" cy="262" rx="112" ry="22" style="fill:var(--tf-line)" />
        <path d="M197 180h3v70h-3z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M200 180h3v70h-3z" style="fill:var(--tf-ink)" />
        <path d="M200 248v10a13 13 0 0 1-26 0v-3" style="fill:none;stroke:var(--tf-ink);stroke-width:7;stroke-linecap:round" />
        <path d="M200 62L60 142Q94.8 118.1 101 109.5Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" /><path d="M200 62L101 109.5Q156.4 97.8 200 96Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" /><path d="M200 62L200 96Q243.6 97.8 299 109.5Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" /><path d="M200 62L299 109.5Q305.2 118.1 340 142Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M200 62L340 142Q305.2 146.7 299 174.5Z" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" /><path d="M200 62L299 174.5Q243.6 167 200 188Z" style="fill:var(--tf-accent)" /><path d="M200 62L200 188Q156.4 167 101 174.5Z" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" /><path d="M200 62L101 174.5Q94.8 146.7 60 142Z" style="fill:var(--tf-accent)" />
        <path d="M196 48h4v15h-4z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M200 48h4v15h-4z" style="fill:var(--tf-ink)" />
        <ellipse cx="200" cy="48" rx="4" ry="1.8" style="fill:var(--tf-muted)" />
        <path d="M212 38a10 10 0 0 1 0 14M218 33a17 17 0 0 1 0 24" style="fill:none;stroke:var(--tf-accent);stroke-width:2;stroke-linecap:round" />
        <g style="fill:var(--tf-link)"><path d="M58 28q5 8 0 12q-5-4 0-12z" /><path d="M96 16q5 8 0 12q-5-4 0-12z" /><path d="M132 32q5 8 0 12q-5-4 0-12z" /><path d="M250 20q5 8 0 12q-5-4 0-12z" /><path d="M292 34q5 8 0 12q-5-4 0-12z" /><path d="M340 18q5 8 0 12q-5-4 0-12z" /><path d="M40 64q5 8 0 12q-5-4 0-12z" /><path d="M362 66q5 8 0 12q-5-4 0-12z" /><path d="M26 118q5 8 0 12q-5-4 0-12z" /><path d="M374 112q5 8 0 12q-5-4 0-12z" /><path d="M150 6q5 8 0 12q-5-4 0-12z" /><path d="M312 4q5 8 0 12q-5-4 0-12z" /></g>
        <path d="M268 222L312 246V252L268 228z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M312 246L362 220V226L312 252z" style="fill:var(--tf-ink)" />
        <path d="M268 222L318 196L362 220L312 246z" style="fill:var(--tf-ink)" />
        <path d="M277 222L318 201L353 220L312 241z" style="fill:var(--tf-muted)" />
        <path d="M291 218L318 204L334 212L307 226z" style="fill:var(--tf-surface)" />
        <path d="M296 217L306 212L309 214L299 219z" style="fill:var(--tf-accent)" />
    - style: patent
      caption: Elevation, open, showing the rain sensor (14) and the paired phone (20).
      svg: |-
        <g style="fill:none;stroke:var(--tf-ink);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round"><path d="M58 28l-3 9M96 16l-3 9M132 32l-3 9M250 20l-3 9M292 34l-3 9M340 18l-3 9M40 64l-3 9M362 66l-3 9M26 118l-3 9M374 112l-3 9M150 6l-3 9M312 4l-3 9" style="stroke-width:.9" />
        <path d="M201.5 58.5L201.9 58.1M205.1 59.9L206.7 58.3M208.5 61.5L211.4 58.6M211.7 63.3L215.9 59.1M214.8 65.2L220.4 59.6M217.7 67.3L224.6 60.4M220.5 69.5L228.8 61.2M223.1 71.9L232.9 62.1M225.7 74.3L236.9 63.1M228.1 76.9L240.8 64.2M230.5 79.5L244.6 65.4M232.7 82.3L248.4 66.6M234.8 85.2L252.1 67.9M236.9 88.1L255.6 69.4M238.9 91.1L259.2 70.8M240.9 94.1L262.7 72.3M242.7 97.3L266 74M244.5 100.5L269.4 75.6M246.3 103.7L272.7 77.3M248 107L275.9 79.1M249.7 110.3L279 81M251.3 113.7L282.1 82.9M252.8 117.2L285.1 84.9M254.3 120.7L288.1 86.9M255.8 124.2L290.9 89.1M257.2 127.8L293.7 91.3M258.6 131.4L296.4 93.6M259.9 135.1L299.1 95.9M261.3 138.7L301.6 98.4M262.5 142.5L304.2 100.8M263.8 146.2L306.6 103.4M265 150L308.9 106.1M272.4 147.6L311.2 108.8M279 146L313.4 111.6M285.1 144.9L315.4 114.6M290.7 144.3L317.4 117.6M296 144L319.3 120.7M300.9 144.1L321 124M305.6 144.4L322.8 127.2M310.1 144.9L324.3 130.7M314.4 145.6L325.7 134.3M318.5 146.5L327 138M322.4 147.6L328.1 141.9M326.3 148.7L329.1 145.9" style="stroke-width:.8" />
        <path d="M70 150C80 90 150 58 200 58S320 90 330 150Q297.5 138 265 150Q232.5 138 200 150Q167.5 138 135 150Q102.5 138 70 150Z" style="stroke-width:2.4" />
        <path d="M200 58Q160 70 135 150M200 58V150M200 58Q240 70 265 150" />
        <path d="M203.5 60V150" style="stroke-width:1;stroke-dasharray:5 3.5" />
        <path d="M195 58V46h10v12M195 46a5 5 0 0 1 10 0" />
        <path d="M212 36a11 11 0 0 1 0 16M218 31a18 18 0 0 1 0 26" style="stroke-width:.9" />
        <path d="M197 150V252h6V150" />
        <path d="M197 252v12a15 15 0 0 1-30 0v-5h6v5a9 9 0 0 0 18 0v-12" />
        <path d="M222 44C300 40 336 100 318 166" style="stroke-width:1;stroke-dasharray:5 3.5" />
        <path d="M291 168h46a9 9 0 0 1 9 9v94a9 9 0 0 1-9 9h-46a9 9 0 0 1-9-9v-94a9 9 0 0 1 9-9z" />
        <path d="M291 180h46v88h-46zM295 190h38v24h-38zM299 199h28M299 206h18" style="stroke-width:.9" />
        <path d="M112 112Q86 96 60 88M234 106Q262 92 268 70M198 42Q176 30 164 22M198 206Q178 212 160 214M170 272Q150 282 138 284M346 244Q362 250 370 258M336 202Q356 196 370 186M308 64Q324 56 340 52" style="stroke-width:.9" /></g>
        <g style="fill:var(--tf-ink);font:500 12px var(--tf-mono)"><text x="42" y="88">10</text><text x="262" y="66">12</text><text x="146" y="22">14</text><text x="142" y="218">16</text><text x="120" y="288">18</text><text x="372" y="266">20</text><text x="372" y="186">22</text><text x="342" y="54">24</text></g>
    - style: patent
      caption: The umbrella furled, with detail A of the rain sensor.
      svg: |-
        <g style="fill:none;stroke:var(--tf-ink);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round"><path d="M105 44V32h10v12M105 32a5 5 0 0 1 10 0" />
        <path d="M110 45L111 44M110 50L116 44M110 55L116.3 48.7M110 60L116.5 53.5M110 65L116.8 58.2M110 70L117 63M110 75L117.3 67.7M110 80L117.6 72.4M110 85L117.8 77.2M110 90L118.1 81.9M110 95L118.3 86.7M110 100L118.6 91.4M110 105L118.9 96.1M110 110L119.1 100.9M110 115L119.4 105.6M110 120L119.6 110.4M110 125L119.9 115.1M110 130L120.2 119.8M110 135L120.4 124.6M110 140L120.7 129.3M110 145L120.9 134.1M110 150L121.2 138.8M110 155L121.5 143.5M110 160L121.7 148.3M110 165L122 153M110 170L122.2 157.8M110 175L122.5 162.5M110 180L122.8 167.2M110 185L123 172M110 190L123.3 176.7M111.4 193.6L123.5 181.5M118.4 191.6L123.8 186.2" style="stroke-width:.8" />
        <path d="M104 44L96 190Q110 198 124 190L116 44Z" style="stroke-width:2.4" />
        <path d="M108 50L103 188M112 50L117 189" style="stroke-width:.9" />
        <path d="M100 118h20a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-20a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z" />
        <path d="M114 123a2 2 0 1 0 4 0a2 2 0 1 0-4 0" style="stroke-width:.9" />
        <path d="M107 194V238h6V194" />
        <path d="M107 238v12a14 14 0 0 1-28 0v-5h6v5a8 8 0 0 0 16 0v-12" />
        <path d="M64 27H102M64 264H90M60 27V264M60 27l-3 8M60 27l3 8M60 264l-3-8M60 264l3-8" style="stroke-width:.9" />
        <path d="M92 36a18 18 0 1 0 36 0a18 18 0 1 0-36 0" style="stroke-width:.9" />
        <path d="M127 30L196 76M121 51L214 208" style="stroke-width:.9" />
        <path d="M192 132a94 94 0 1 0 188 0a94 94 0 1 0-188 0" />
        <path d="M256 124V221M316 124V221M256 124a30 30 0 0 1 60 0" style="stroke-width:2.4" />
        <path d="M286 129L291 124M286 134L296 124M286 139L301 124M286 144L306 124M286 149L311 124M286 154L316 124M286 159L316 129M286 164L316 134M286 169L316 139M286 174L316 144M286 179L316 149M286 184L316 154M286 189L316 159M286 194L316 164M286 199L316 169M286 204L316 174M286 209L316 179M286 214L316 184M286 219L316 189M286 224L316 194M289.3 225.7L316 199M294.7 225.3L316 204M300.1 224.9L316 209M307.2 222.8L316 214M314.5 220.5L316 219" style="stroke-width:.8" />
        <path d="M263 150a3 3 0 1 0 6 0a3 3 0 1 0-6 0M275 150a3 3 0 1 0 6 0a3 3 0 1 0-6 0M287 150a3 3 0 1 0 6 0a3 3 0 1 0-6 0M299 150a3 3 0 1 0 6 0a3 3 0 1 0-6 0M263 166a3 3 0 1 0 6 0a3 3 0 1 0-6 0M275 166a3 3 0 1 0 6 0a3 3 0 1 0-6 0M287 166a3 3 0 1 0 6 0a3 3 0 1 0-6 0M299 166a3 3 0 1 0 6 0a3 3 0 1 0-6 0M263 182a3 3 0 1 0 6 0a3 3 0 1 0-6 0M275 182a3 3 0 1 0 6 0a3 3 0 1 0-6 0M287 182a3 3 0 1 0 6 0a3 3 0 1 0-6 0M299 182a3 3 0 1 0 6 0a3 3 0 1 0-6 0" style="stroke-width:.9;fill:var(--tf-surface)" />
        <path d="M281 108a5 5 0 1 0 10 0a5 5 0 1 0-10 0" />
        <path d="M286 96v-6M296 100l4-4M276 100l-4-4" style="stroke-width:.9" />
        <path d="M320 88q6 10 0 14q-6-4 0-14z" />
        <path d="M268 166Q246 176 234 176M290 108Q316 70 336 60M322 96Q346 100 362 110M300 212Q316 236 326 246" style="stroke-width:.9" /></g>
        <text x="52" y="164" transform="rotate(-90 52 164)" style="fill:var(--tf-ink);font:500 12px var(--tf-mono)">880</text>
        <g style="fill:var(--tf-ink);font:500 12px var(--tf-mono)"><text x="84" y="16">A</text><text x="206" y="180">14a</text><text x="338" y="60">14b</text><text x="364" y="114">26</text><text x="328" y="254">10</text></g>
        <g style="fill:var(--tf-ink);font:500 11px var(--tf-mono)"><text x="250" y="292">DETAIL A · 5:1</text></g>
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
