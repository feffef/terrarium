---
title: Automatic Sheep Counter
description: A bedside unit that counts sheep for you through the night and shows the total in the morning.
campaign:
  registry: TF-0010
  inventor: tomasz-wrobel
  category: sleep
  goal: 16000
  launch: -29d
  end: +20h
  backers: 290
  pledged: 12160
  specifications:
    - { label: Projection rate, value: "1 sheep every 1.8 s" }
    - { label: Typical night, value: "16,000 sheep" }
    - { label: Recorded best, value: "19,412 sheep, one night" }
    - { label: Dimming, value: "0.5 lux after 20 minutes" }
    - { label: History kept, value: "30 nights" }
    - { label: Mount, value: "Bedside clamp, adjustable arm" }
    - { label: Power, value: "USB-C, 8 h on battery" }
  figures:
    - style: isometric
      caption: "The counter on its base on a bedside table, projecting its line of sheep toward the ceiling. The total so far is shown on the front."
      svg: |-
        <ellipse cx="200" cy="266" rx="122" ry="24" style="fill:var(--tf-line)" />
        <path d="M188 155L295.4 217L217.5 262L110.1 200Z" style="fill:color-mix(in srgb, var(--tf-line) 35%, var(--tf-surface))" />
        <path d="M110.1 210L217.5 272L217.5 262L110.1 200Z" style="fill:color-mix(in srgb, var(--tf-line) 70%, var(--tf-surface))" />
        <path d="M295.4 227L217.5 272L217.5 262L295.4 217Z" style="fill:var(--tf-line)" />
        <path d="M183.6 91.7L62 46M183.6 91.7L352 36" style="fill:none;stroke:var(--tf-muted);stroke-width:1.2;stroke-dasharray:4 3" />
        <path d="M80 41v6m4 -6v6m4 -6v6m4 -6v6M142 35v6m4 -6v6m4 -6v6m4 -6v6M204 31v6m4 -6v6m4 -6v6m4 -6v6M266 31v6m4 -6v6m4 -6v6m4 -6v6M328 33v6m4 -6v6m4 -6v6m4 -6v6" style="fill:none;stroke:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface));stroke-width:1.6;stroke-linecap:round" />
        <path d="M76 36a10 6.5 0 1 0 20 0a10 6.5 0 1 0 -20 0M138 30a10 6.5 0 1 0 20 0a10 6.5 0 1 0 -20 0M200 26a10 6.5 0 1 0 20 0a10 6.5 0 1 0 -20 0M262 26a10 6.5 0 1 0 20 0a10 6.5 0 1 0 -20 0M324 28a10 6.5 0 1 0 20 0a10 6.5 0 1 0 -20 0" style="fill:var(--tf-surface);stroke:var(--tf-line);stroke-width:1" />
        <path d="M92 33.5a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M154 27.5a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M216 23.5a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M278 23.5a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M340 25.5a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M169.3 205.6L196 221L171.2 235.3L144.5 219.9Z" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M144.5 246.3L171.2 261.7L171.2 235.3L144.5 219.9Z" style="fill:var(--tf-ink)" />
        <path d="M196 247.4L171.2 261.7L171.2 235.3L196 221Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M166.5 245.2V254A6.6 3.9 0 0 0 173.1 257.9V249.1A6.6 3.9 0 0 1 166.5 245.2Z" style="fill:var(--tf-ink)" />
        <path d="M173.1 249.1V257.9A6.6 3.9 0 0 0 179.7 254V245.2A6.6 3.9 0 0 1 173.1 249.1Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <ellipse cx="173.1" cy="245.2" rx="6.6" ry="3.9" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M172.2 156.7L181.7 162.2L172.2 167.7L162.6 162.2Z" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M162.6 219.4L172.2 224.9L172.2 167.7L162.6 162.2Z" style="fill:var(--tf-ink)" />
        <path d="M181.7 219.4L172.2 224.9L172.2 167.7L181.7 162.2Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M172.2 146.8L187.4 155.6L172.2 164.3L156.9 155.6Z" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M156.9 164.4L172.2 173.1L172.2 164.3L156.9 155.6Z" style="fill:var(--tf-ink)" />
        <path d="M187.4 164.4L172.2 173.1L172.2 164.3L187.4 155.6Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M160.7 76.4L236.9 120.4L183.6 151.2L107.4 107.2Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M107.4 149L183.6 193L183.6 151.2L107.4 107.2Z" style="fill:var(--tf-accent)" />
        <path d="M236.9 162.1L183.6 193L183.6 151.2L236.9 120.4Z" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" />
        <path d="M160.5 93.9V113.7A23.1 13.3 0 0 0 183.6 127.1V107.3A23.1 13.3 0 0 1 160.5 93.9Z" style="fill:var(--tf-ink)" />
        <path d="M183.6 107.3V127.1A23.1 13.3 0 0 0 206.7 113.7V93.9A23.1 13.3 0 0 1 183.6 107.3Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <ellipse cx="183.6" cy="93.9" rx="23.1" ry="13.3" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <ellipse cx="183.6" cy="93.9" rx="14.3" ry="8.3" style="fill:var(--tf-ink)" />
        <ellipse cx="183.6" cy="93.9" rx="7.7" ry="4.4" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <g transform="matrix(1 0.6 0 1.1 115 126.9)"><rect width="64" height="16" rx="1.5" style="fill:var(--tf-ink)" /><text x="4" y="12" style="fill:var(--tf-good);stroke:none;font:600 11px var(--tf-mono)">16 012</text></g>
    - style: isometric
      caption: "In use. The sheep cross the ceiling at one every 1.8 seconds; the sleeper is not required to watch. The bed is shown for context and is not included."
      svg: |-
        <ellipse cx="196" cy="268" rx="180" ry="22" style="fill:var(--tf-line)" />
        <path d="M88 92L193.7 153L20.5 253L-85.2 192Z" style="fill:color-mix(in srgb, var(--tf-line) 35%, var(--tf-surface))" />
        <path d="M-85.2 238L20.5 299L20.5 253L-85.2 192Z" style="fill:color-mix(in srgb, var(--tf-line) 70%, var(--tf-surface))" />
        <path d="M193.7 199L20.5 299L20.5 253L193.7 153Z" style="fill:var(--tf-line)" />
        <path d="M89.8 91L181.6 144L150.4 162L58.6 109Z" style="fill:var(--tf-surface)" />
        <path d="M58.6 117L150.4 170L150.4 162L58.6 109Z" style="fill:color-mix(in srgb, var(--tf-line) 45%, var(--tf-surface))" />
        <path d="M181.6 152L150.4 170L150.4 162L181.6 144Z" style="fill:color-mix(in srgb, var(--tf-line) 75%, var(--tf-surface))" />
        <path d="M89.8 91L181.6 144L150.4 162L58.6 109Z" style="fill:none;stroke:var(--tf-line);stroke-width:1" />
        <path d="M296.5 196L348.5 226L303.5 252L251.5 222Z" style="fill:color-mix(in srgb, var(--tf-line) 35%, var(--tf-surface))" />
        <path d="M251.5 252L303.5 282L303.5 252L251.5 222Z" style="fill:color-mix(in srgb, var(--tf-line) 70%, var(--tf-surface))" />
        <path d="M348.5 256L303.5 282L303.5 252L348.5 226Z" style="fill:var(--tf-line)" />
        <path d="M287.4 160.5L34 50M287.4 160.5L386 34" style="fill:none;stroke:var(--tf-muted);stroke-width:1.2;stroke-dasharray:4 3" />
        <path d="M54.9 48.3v5.1m3.4 -5.1v5.1m3.4 -5.1v5.1m3.4 -5.1v5.1M118.9 41.3v5.1m3.4 -5.1v5.1m3.4 -5.1v5.1m3.4 -5.1v5.1M182.9 36.3v5.1m3.4 -5.1v5.1m3.4 -5.1v5.1m3.4 -5.1v5.1M246.9 33.3v5.1m3.4 -5.1v5.1m3.4 -5.1v5.1m3.4 -5.1v5.1M310.9 32.3v5.1m3.4 -5.1v5.1m3.4 -5.1v5.1m3.4 -5.1v5.1" style="fill:none;stroke:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface));stroke-width:1.4;stroke-linecap:round" />
        <path d="M51.5 44a8.5 5.5 0 1 0 17 0a8.5 5.5 0 1 0 -17 0M115.5 37a8.5 5.5 0 1 0 17 0a8.5 5.5 0 1 0 -17 0M179.5 32a8.5 5.5 0 1 0 17 0a8.5 5.5 0 1 0 -17 0M243.5 29a8.5 5.5 0 1 0 17 0a8.5 5.5 0 1 0 -17 0M307.5 28a8.5 5.5 0 1 0 17 0a8.5 5.5 0 1 0 -17 0" style="fill:var(--tf-surface);stroke:var(--tf-line);stroke-width:1" />
        <path d="M65.1 41.9a3.4 3.4 0 1 0 6.8 0a3.4 3.4 0 1 0 -6.8 0M129.1 34.9a3.4 3.4 0 1 0 6.8 0a3.4 3.4 0 1 0 -6.8 0M193.1 29.9a3.4 3.4 0 1 0 6.8 0a3.4 3.4 0 1 0 -6.8 0M257.1 26.9a3.4 3.4 0 1 0 6.8 0a3.4 3.4 0 1 0 -6.8 0M321.1 25.9a3.4 3.4 0 1 0 6.8 0a3.4 3.4 0 1 0 -6.8 0" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M279.6 222.6L294.1 231L280.6 238.8L266.1 230.4Z" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M266.1 244.8L280.6 253.2L280.6 238.8L266.1 230.4Z" style="fill:var(--tf-ink)" />
        <path d="M294.1 245.4L280.6 253.2L280.6 238.8L294.1 231Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M275.9 230.1L281.1 233.1L281.1 201.9L275.9 198.9Z" style="fill:var(--tf-ink)" />
        <path d="M286.3 230.1L281.1 233.1L281.1 201.9L286.3 198.9Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M274.9 152.1L316.5 176.1L287.4 192.9L245.8 168.9Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M245.8 191.7L287.4 215.7L287.4 192.9L245.8 168.9Z" style="fill:var(--tf-accent)" />
        <path d="M316.5 198.9L287.4 215.7L287.4 192.9L316.5 176.1Z" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" />
        <path d="M274.8 161.7V172.5A12.6 7.3 0 0 0 287.4 179.8V169A12.6 7.3 0 0 1 274.8 161.7Z" style="fill:var(--tf-ink)" />
        <path d="M287.4 169V179.8A12.6 7.3 0 0 0 300 172.5V161.7A12.6 7.3 0 0 1 287.4 169Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <ellipse cx="287.4" cy="161.7" rx="12.6" ry="7.3" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <ellipse cx="287.4" cy="161.7" rx="7.8" ry="4.5" style="fill:var(--tf-ink)" />
        <g transform="matrix(0.5 0.3 0 0.6 249.9 179.7)"><rect width="64" height="16" rx="1.5" style="fill:var(--tf-ink)" /><text x="4" y="12" style="fill:var(--tf-good);stroke:none;font:600 11px var(--tf-mono)">9 481</text></g>
    - style: isometric
      caption: "The Twin Unit: one in charcoal, one in birch, so that two sleepers can compare totals in the morning."
      svg: |-
        <ellipse cx="200" cy="256" rx="150" ry="26" style="fill:var(--tf-line)" />
        <path d="M153.2 93L343.8 203L257.2 253L66.6 143Z" style="fill:color-mix(in srgb, var(--tf-line) 35%, var(--tf-surface))" />
        <path d="M66.6 153L257.2 263L257.2 253L66.6 143Z" style="fill:color-mix(in srgb, var(--tf-line) 70%, var(--tf-surface))" />
        <path d="M343.8 213L257.2 263L257.2 253L343.8 203Z" style="fill:var(--tf-line)" />
        <path d="M112.6 209.3L131.6 220.2L114 230.3L95.1 219.4Z" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M95.1 238.1L114 249.1L114 230.3L95.1 219.4Z" style="fill:var(--tf-ink)" />
        <path d="M131.6 238.9L114 249.1L114 230.3L131.6 220.2Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M107.9 219L114.7 222.9L114.7 182.4L107.9 178.5Z" style="fill:var(--tf-ink)" />
        <path d="M121.4 219L114.7 222.9L114.7 182.4L121.4 178.5Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M106.6 117.6L160.6 148.8L122.8 170.7L68.7 139.5Z" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M68.7 169.1L122.8 200.3L122.8 170.7L68.7 139.5Z" style="fill:var(--tf-ink)" />
        <path d="M160.6 178.5L122.8 200.3L122.8 170.7L160.6 148.8Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M106.4 130.1V144.2A16.4 9.5 0 0 0 122.8 153.6V139.6A16.4 9.5 0 0 1 106.4 130.1Z" style="fill:var(--tf-ink)" />
        <path d="M122.8 139.6V153.6A16.4 9.5 0 0 0 139.1 144.2V130.1A16.4 9.5 0 0 1 122.8 139.6Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <ellipse cx="122.8" cy="130.1" rx="16.4" ry="9.5" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <ellipse cx="122.8" cy="130.1" rx="10.1" ry="5.9" style="fill:var(--tf-ink)" />
        <g transform="matrix(0.7 0.4 0 0.8 74.1 153.5)"><rect width="64" height="16" rx="1.5" style="fill:var(--tf-ink)" /><text x="4" y="12" style="fill:var(--tf-good);stroke:none;font:600 11px var(--tf-mono)">16 012</text></g>
        <path d="M216.6 149.3L235.5 160.2L217.9 170.3L199 159.4Z" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M199 178.1L217.9 189.1L217.9 170.3L199 159.4Z" style="fill:var(--tf-ink)" />
        <path d="M235.5 178.9L217.9 189.1L217.9 170.3L235.5 160.2Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M211.8 159L218.6 162.9L218.6 122.4L211.8 118.5Z" style="fill:var(--tf-ink)" />
        <path d="M225.3 159L218.6 162.9L218.6 122.4L225.3 118.5Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M210.5 57.6L264.5 88.8L226.7 110.7L172.6 79.5Z" style="fill:var(--tf-surface)" />
        <path d="M172.6 109.1L226.7 140.3L226.7 110.7L172.6 79.5Z" style="fill:color-mix(in srgb, var(--tf-line) 45%, var(--tf-surface))" />
        <path d="M264.5 118.5L226.7 140.3L226.7 110.7L264.5 88.8Z" style="fill:color-mix(in srgb, var(--tf-line) 75%, var(--tf-surface))" />
        <path d="M210.5 57.6L264.5 88.8L226.7 110.7L172.6 79.5Z" style="fill:none;stroke:var(--tf-line);stroke-width:1" />
        <path d="M210.3 70.1V84.2A16.4 9.5 0 0 0 226.7 93.6V79.6A16.4 9.5 0 0 1 210.3 70.1Z" style="fill:var(--tf-ink)" />
        <path d="M226.7 79.6V93.6A16.4 9.5 0 0 0 243.1 84.2V70.1A16.4 9.5 0 0 1 226.7 79.6Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <ellipse cx="226.7" cy="70.1" rx="16.4" ry="9.5" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <ellipse cx="226.7" cy="70.1" rx="10.1" ry="5.9" style="fill:var(--tf-ink)" />
        <g transform="matrix(0.7 0.4 0 0.8 178.1 93.5)"><rect width="64" height="16" rx="1.5" style="fill:var(--tf-ink)" /><text x="4" y="12" style="fill:var(--tf-good);stroke:none;font:600 11px var(--tf-mono)">9 481</text></g>
        <g style="stroke:none;fill:var(--tf-muted);font:600 11px var(--tf-mono);letter-spacing:.06em;text-anchor:middle"><text x="118" y="290">CHARCOAL</text><text x="300" y="290">BIRCH</text></g>
    - style: patent
      caption: "Section A–A through the projector head: housing (10), projection lens (12), sheep disc (14) turned by the motor (16) at one sheep per 1.8 s, lamp (18), tally sensor (20), display board (22), USB-C (24) and the beam (26)."
      svg: |-
        <g style="fill:none;stroke:var(--tf-ink);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round">
        <path d="M110 60H290V252H110Z" style="stroke-width:2.4" />
        <path d="M122 72H172M228 72H278M122 72V240H278V72" />
        <path d="M272.8 60L278 65.2M284.8 72L290 77.2M262.9 60L274.9 72M278 75.1L290 87.1M253 60L265 72M278 85L290 97M243.1 60L255.1 72M278 94.9L290 106.9M233.2 60L245.2 72M278 104.8L290 116.8M228 64.7L235.3 72M278 114.7L290 126.7M278 124.6L290 136.6M278 134.5L290 146.5M278 144.4L290 156.4M278 154.3L290 166.3M278 164.2L290 176.2M163.9 60L172 68.1M278 174.1L290 186.1M154 60L166 72M278 184L290 196M144.1 60L156.1 72M278 193.9L290 205.9M134.2 60L146.2 72M278 203.8L290 215.8M124.3 60L136.3 72M278 213.7L290 225.7M122 67.6L126.4 72M278 223.6L290 235.6M116.5 72L122 77.5M278 233.5L284.5 240M284.5 240L290 245.5M110 75.4L122 87.4M274.6 240L286.6 252M110 85.3L122 97.3M264.7 240L276.7 252M110 95.2L122 107.2M254.8 240L266.8 252M110 105.1L122 117.1M244.9 240L256.9 252M110 114.9L122 126.9M235.1 240L247.1 252M110 124.8L122 136.8M225.2 240L237.2 252M110 134.7L122 146.7M215.3 240L227.3 252M110 144.6L122 156.6M205.4 240L217.4 252M110 154.5L122 166.5M195.5 240L207.5 252M110 164.4L122 176.4M185.6 240L197.6 252M110 174.3L122 186.3M175.7 240L187.7 252M110 184.2L122 196.2M165.8 240L177.8 252M110 194.1L122 206.1M155.9 240L167.9 252M110 204L122 216M146 240L158 252M110 213.9L122 225.9M136.1 240L148.1 252M110 223.8L122 235.8M126.2 240L138.2 252M110 233.7L116.3 240M116.3 240L128.3 252M110 243.6L118.4 252" style="stroke-width:.8" />
        <path d="M172 66q28-16 56 0q-28 16-56 0" />
        <path d="M130 150H188M212 150H270V156H212M188 156H130ZM188 150V156M212 150V156" />
        <path d="M270 151.4L265.4 156M265.8 150L259.8 156M260.1 150L254.1 156M254.5 150L248.5 156M248.8 150L242.8 156M243.2 150L237.2 156M237.5 150L231.5 156M231.8 150L225.8 156M226.2 150L220.2 156M220.5 150L214.5 156M214.9 150L208.9 156M209.2 150L203.2 156M203.6 150L197.6 156M197.9 150L191.9 156M192.2 150L186.2 156M186.6 150L180.6 156M180.9 150L174.9 156M175.3 150L169.3 156M169.6 150L163.6 156M164 150L158 156M158.3 150L152.3 156M152.6 150L146.6 156M147 150L141 156M141.3 150L135.3 156M135.7 150L130 155.7" style="stroke-width:.8" />
        <path d="M196 138h8v30h-8zM200 168v-12M236 160h32v24h-32zM204 172h32" />
        <path d="M264.7 160L268 163.3M259 160L268 169M253.3 160L268 174.7M247.7 160L268 180.3M242 160L266 184M236.4 160L260.4 184M236 165.3L254.7 184M236 170.9L249.1 184M236 176.6L243.4 184M236 182.3L237.7 184" style="stroke-width:.8" />
        <path d="M150 132a60 14 0 0 1 100 0M244 128l6 4-7 2" style="stroke-width:.9" />
        <path d="M188 214a12 12 0 1 0 24 0a12 12 0 1 0 -24 0" />
        <path d="M188 214h24M200 202v24M180 186q20-10 40 0q-20 10-40 0" />
        <path d="M192 222V72M208 222V72" style="stroke-width:1;stroke-dasharray:5 3.5" />
        <path d="M136 172h20v10h-20z" />
        <path d="M156 177L188 153" style="stroke-width:1;stroke-dasharray:5 3.5" />
        <path d="M122 228h60v6h-60zM290 200h10v10h-10z" />
        <path d="M116 84Q93 72.5 70 84M200 62Q207 48 200 34M266 152Q300 156.5 324 132M262 182Q290.5 202.5 324 192M206 222Q210.5 250.5 236 264M146 182Q104 178.5 76 210M152 231Q146.8 251.5 160 268M295 205Q311.3 226.3 338 226M192 112Q125 101 76 148" style="stroke-width:.9" />
        </g>
        <g style="fill:var(--tf-ink);stroke:none;font:500 12px var(--tf-mono)"><text x="48" y="88">10</text><text x="192" y="30">12</text><text x="328" y="136">14</text><text x="328" y="196">16</text><text x="240" y="268">18</text><text x="54" y="214">20</text><text x="148" y="272">22</text><text x="342" y="230">24</text><text x="54" y="152">26</text></g>
        <text x="216" y="124" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono)">1.8 s</text>
        <g style="fill:var(--tf-ink);stroke:none;font:500 11px var(--tf-mono)"><text x="80" y="290">SECTION A–A · PROJECTOR HEAD</text></g>
    - style: patent
      caption: "Elevation at the bedside: table (10), clamp (12), thumbscrew (14), post (16), knuckle (18), body (20), head (22), the projection (24) on the ceiling and the display (26). The post slides in the clamp to set the height."
      svg: |-
        <g style="fill:none;stroke:var(--tf-ink);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round">
        <path d="M30 214H190V232H30" style="stroke-width:2.4" />
        <path d="M172.7 214L190 224M160.7 214L190 230.9M148.7 214L179.8 232M136.7 214L167.8 232M124.7 214L155.8 232M112.7 214L143.8 232M100.7 214L131.8 232M88.7 214L119.8 232M76.7 214L107.8 232M64.7 214L95.8 232M52.7 214L83.8 232M40.7 214L71.8 232M30 214.8L59.8 232M30 221.7L47.8 232M30 228.6L35.8 232" style="stroke-width:.8" />
        <path d="M30 214h-6M30 232h-6" style="stroke-width:.9" />
        <path d="M150 214V204H214V250H180V232H196V214Z" style="stroke-width:2.4" />
        <path d="M188 250v12M180 262h16v8h-16z" />
        <path d="M176 204V132M190 204V132" style="stroke-width:2.4" />
        <path d="M174 124a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
        <path d="M180 124a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
        <path d="M118 116V72a4 4 0 0 1 4-4H244a4 4 0 0 1 4 4V116Z" style="stroke-width:2.4" />
        <path d="M162 68V56h42v12M170 56q13-6 26 0" />
        <path d="M128 96h80v12h-80z" />
        <path d="M176 132V88M190 132V88" style="stroke-width:1;stroke-dasharray:5 3.5" />
        <path d="M160 200V138M157.5 194l2.5 6 2.5-6M157.5 144l2.5-6 2.5 6" style="stroke-width:.9" />
        <path d="M20 24H380" />
        <path d="M183 56L44 24M183 56L322 24" style="stroke-width:1;stroke-dasharray:5 3.5" />
        <path d="M44 32H322M50 29.5l-6 2.5 6 2.5M316 29.5l6 2.5-6 2.5" style="stroke-width:.9" />
        <path d="M60 223Q50.3 242.5 60 262M208 246Q232 260.5 258 250M196 266Q221 283.5 250 274M190 170Q228.5 183 262 160M192 124Q228.5 138.5 262 118M248 90Q271 99 292 86M204 62Q236 70.5 262 50M100 44Q75.5 43 60 62M128 102Q95.5 97 72 120" style="stroke-width:.9" />
        </g>
        <g style="fill:var(--tf-ink);stroke:none;font:500 12px var(--tf-mono)"><text x="52" y="266">10</text><text x="262" y="254">12</text><text x="254" y="278">14</text><text x="266" y="164">16</text><text x="266" y="122">18</text><text x="296" y="90">20</text><text x="266" y="54">22</text><text x="44" y="66">24</text><text x="56" y="124">26</text></g>
        <text x="148" y="172" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono);text-anchor:end">ADJ.</text>
        <g style="fill:var(--tf-ink);stroke:none;font:500 11px var(--tf-mono)"><text x="70" y="290">ELEVATION · BEDSIDE CLAMP AND ARM</text></g>
    - style: patent
      caption: "The front on waking: last night’s total (10), the 30-night history (12), the 0.5 lux dimming sensor (14) and the record marker (16) on the best of the thirty nights."
      svg: |-
        <g style="fill:none;stroke:var(--tf-ink);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round">
        <path d="M60 70H340a6 6 0 0 1 6 6V232a6 6 0 0 1-6 6H60a6 6 0 0 1-6-6V76a6 6 0 0 1 6-6z" style="stroke-width:2.4" />
        <path d="M74 84H326V148H74zM74 162H326V220H74z" />
        <path d="M92 210V182M99.2 210V178M106.4 210V174M113.6 210V180M120.8 210V184M128 210V176M135.2 210V172M142.4 210V166M149.6 210V178M156.8 210V182M164 210V180M171.2 210V174M178.4 210V170M185.6 210V176M192.8 210V180M200 210V184M207.2 210V178M214.4 210V172M221.6 210V168M228.8 210V174M236 210V182M243.2 210V186M250.4 210V180M257.6 210V176M264.8 210V178M272 210V174M279.2 210V170M286.4 210V164M293.6 210V176M300.8 210V178" style="stroke-width:2.4" />
        <path d="M312 202V178M305 178l7-8 7 8" style="stroke-width:1" />
        <path d="M322 62a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
        <path d="M92 222V218M300.8 222V218" style="stroke-width:.9" />
        <path d="M92 232H300.8M98 229.5l-6 2.5 6 2.5M294.8 229.5l6 2.5-6 2.5" style="stroke-width:.9" /><text x="196.4" y="228" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono);text-anchor:middle">30 NIGHTS</text>
        <path d="M74 100Q59.5 86.5 40 90M88 176Q65 162 40 172M326 66Q347 66.5 360 50M316 194Q344 208 372 194" style="stroke-width:.9" />
        </g>
        <g style="fill:var(--tf-ink);stroke:none;font:600 30px var(--tf-mono);text-anchor:end"><text x="318" y="128">16 012</text></g>
        <text x="82" y="98" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono)">LAST NIGHT</text>
        <g style="fill:var(--tf-ink);stroke:none;font:500 12px var(--tf-mono)"><text x="26" y="94">10</text><text x="26" y="176">12</text><text x="356" y="46">14</text><text x="366" y="178">16</text></g>
        <g style="fill:var(--tf-ink);stroke:none;font:500 11px var(--tf-mono)"><text x="112" y="290">FRONT · DISPLAY, ON WAKING</text></g>
  rewards:
    - id: bedside-unit
      title: Bedside Unit
      description: One sheep counter, projector and clamp included.
      price: 29
      claimed: 200
      options:
        - id: finish
          name: Finish
          choices:
            - { id: charcoal, label: Charcoal }
            - { id: birch, label: Birch }
      shipsTo: [domestic, europe, world]
      delivery: +55d
    - id: twin-unit
      title: Twin Unit
      description: Two counters, so two sleepers can compare totals in the morning.
      price: 49
      claimed: 70
      options:
        - id: finish-1
          name: Finish, unit 1
          choices:
            - { id: charcoal, label: Charcoal }
            - { id: birch, label: Birch }
        - id: finish-2
          name: Finish, unit 2
          choices:
            - { id: charcoal, label: Charcoal }
            - { id: birch, label: Birch }
      shipsTo: [domestic, europe, world]
      delivery: +55d
    - id: founders-edition
      title: Founder's edition
      description: Charcoal finish, engraved with your best night on the base.
      price: 99
      claimed: 20
      stock: 20
      shipsTo: [domestic, europe, world]
      delivery: +40d
  addons:
    - { id: spare-lens, title: Spare projector lens, price: 12, claimed: 40 }
    - { id: headboard-bracket, title: Headboard mounting bracket, price: 9, claimed: 30 }
  shipping: { domestic: 5, europe: 9, world: 15 }
---

Counting sheep is supposed to help you sleep. In practice it keeps you awake:
you cannot stop counting, and you cannot fall asleep while you do. The
Automatic Sheep Counter does the counting instead, so you no longer have to.

## How it counts

A small projector casts a line of sheep across the ceiling, one every 1.8
seconds, and a counter beside it increments with each one. You watch, or you
don't. Either way the total keeps climbing until morning.

## Through the night

After twenty minutes the display dims to 0.5 lux, dark enough to sleep by and
bright enough to keep counting by. A typical night reaches around 16,000
sheep. The Inventor's own record, set during testing, is 19,412.

## In the morning

The total is shown on waking and kept in a rolling 30-night history, so a
restless week is visible against the nights around it rather than judged on
its own.

## The Inventor

Tomasz Wróbel is an optics technician in Wrocław. He built the first
prototype after losing count on the fourth night of trying to fall asleep the
old way.
