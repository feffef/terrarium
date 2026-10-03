---
title: Cat Flap Decision Timer
description: A cat flap frame that records how long the cat took to decide.
campaign:
  registry: TF-0018
  inventor: declan-murphy
  category: pets
  goal: 12000
  launch: -8d
  end: +22d
  backers: 210
  pledged: 8880
  alsoBacked: [pausable-hourglass, cat-acknowledgement-button]
  recent:
    - { name: Oskar V., city: Tallinn, at: -4h }
    - { name: Freya N., city: Aarhus, at: -9h }
    - { name: Lotte B., city: Münster, at: -1d }
  specifications:
    - { label: Beams, value: "Two infrared beams, approach and flap" }
    - { label: Frame size, value: "165 × 170 mm, standard flap opening" }
    - { label: Display, value: "Indoor side, elapsed time and outcome" }
    - { label: Logged fields, value: "Direction, elapsed time, outcome" }
    - { label: Longest recorded decision, value: "14 minutes 20 seconds, in testing" }
    - { label: Battery, value: "4 AA cells, 6 months" }
  figures:
    - style: isometric
      caption: "The frame, set into the lower part of a door, from the outdoor side: the flap hinged in its opening, the flap beam across it, and the approach beam between its two posts. The display is on the indoor side."
      svg: |-
        <ellipse cx="184.6" cy="242.8" rx="104.4" ry="38.3" style="fill:var(--tf-line)" />
        <path d="M136.4 14.3L289.6 102.7L269.5 114.3L116.3 25.9Z" style="fill:color-mix(in srgb, var(--tf-ink) 22%, var(--tf-surface))" />
        <path d="M116.3 194.1L269.5 282.5L269.5 114.3L116.3 25.9Z" style="fill:color-mix(in srgb, var(--tf-ink) 32%, var(--tf-surface))" />
        <path d="M289.6 270.9L269.5 282.5L269.5 114.3L289.6 102.7Z" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M148.5 103.6L237.4 154.9L234.4 156.7L145.5 105.3Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M145.5 210.9L234.4 262.2L234.4 156.7L145.5 105.3Z" style="fill:var(--tf-accent)" />
        <path d="M237.4 260.5L234.4 262.2L234.4 156.7L237.4 154.9Z" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" />
        <path d="M158.5 206.3L221.3 242.5L221.3 164.2L158.5 128Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M160 205.4L219.8 239.9L219.8 165.7L160 131.1Z" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" />
        <path d="M157 129.4L222.8 167.4L222.8 163.3L157 125.4Z" style="fill:var(--tf-ink)" />
        <path d="M153.5 168L157.5 170.3L157.5 165.7L153.5 163.3Z" style="fill:var(--tf-ink)" />
        <path d="M222.3 207.7L226.3 210L226.3 205.4L222.3 203.1Z" style="fill:var(--tf-ink)" />
        <path d="M157.5 168L222.3 205.4" style="fill:none;stroke:color-mix(in srgb, var(--tf-link) 45%, var(--tf-surface));stroke-width:0.96;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:4 3" />
        <path d="M148.5 212.6L156.5 217.3L114.3 241.6L106.3 237Z" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M106.3 240.5L114.3 245.1L114.3 241.6L106.3 237Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M156.5 220.8L114.3 245.1L114.3 241.6L156.5 217.3Z" style="fill:var(--tf-ink)" />
        <path d="M223.3 255.9L231.4 260.5L189.2 284.8L181.1 280.2Z" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M181.1 283.7L189.2 288.3L189.2 284.8L181.1 280.2Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M231.4 264L189.2 288.3L189.2 284.8L231.4 260.5Z" style="fill:var(--tf-ink)" />
        <path d="M110.3 211.5V237A4.1 2.3 0 0 0 114.3 239.3V213.8A4.1 2.3 0 0 1 110.3 211.5Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M114.3 213.8V239.3A4.1 2.3 0 0 0 118.4 237V211.5A4.1 2.3 0 0 1 114.3 213.8Z" style="fill:var(--tf-ink)" />
        <ellipse cx="114.3" cy="211.5" rx="4.1" ry="2.3" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M185.1 254.7V280.2A4.1 2.3 0 0 0 189.2 282.6V257A4.1 2.3 0 0 1 185.1 254.7Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M189.2 257V282.6A4.1 2.3 0 0 0 193.2 280.2V254.7A4.1 2.3 0 0 1 189.2 257Z" style="fill:var(--tf-ink)" />
        <ellipse cx="189.2" cy="254.7" rx="4.1" ry="2.3" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M117.3 219L186.1 258.8" style="fill:none;stroke:var(--tf-link);stroke-width:0.84;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:4 3" />
    - style: isometric
      caption: "In use. The approach beam is broken; the flap beam is not. Indoors, the display is counting."
      svg: |-
        <ellipse cx="184.6" cy="242.8" rx="104.4" ry="38.3" style="fill:var(--tf-line)" />
        <path d="M136.4 14.3L289.6 102.7L269.5 114.3L116.3 25.9Z" style="fill:color-mix(in srgb, var(--tf-ink) 22%, var(--tf-surface))" />
        <path d="M116.3 194.1L269.5 282.5L269.5 114.3L116.3 25.9Z" style="fill:color-mix(in srgb, var(--tf-ink) 32%, var(--tf-surface))" />
        <path d="M289.6 270.9L269.5 282.5L269.5 114.3L289.6 102.7Z" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M148.5 103.6L237.4 154.9L234.4 156.7L145.5 105.3Z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M145.5 210.9L234.4 262.2L234.4 156.7L145.5 105.3Z" style="fill:var(--tf-accent)" />
        <path d="M237.4 260.5L234.4 262.2L234.4 156.7L237.4 154.9Z" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" />
        <path d="M158.5 206.3L221.3 242.5L221.3 164.2L158.5 128Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M160 205.4L219.8 239.9L219.8 165.7L160 131.1Z" style="fill:color-mix(in srgb, var(--tf-accent) 72%, var(--tf-ink))" />
        <path d="M157 129.4L222.8 167.4L222.8 163.3L157 125.4Z" style="fill:var(--tf-ink)" />
        <path d="M153.5 168L157.5 170.3L157.5 165.7L153.5 163.3Z" style="fill:var(--tf-ink)" />
        <path d="M222.3 207.7L226.3 210L226.3 205.4L222.3 203.1Z" style="fill:var(--tf-ink)" />
        <path d="M157.5 168L222.3 205.4" style="fill:none;stroke:color-mix(in srgb, var(--tf-link) 45%, var(--tf-surface));stroke-width:0.96;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:4 3" />
        <path d="M148.5 212.6L156.5 217.3L114.3 241.6L106.3 237Z" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M106.3 240.5L114.3 245.1L114.3 241.6L106.3 237Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M156.5 220.8L114.3 245.1L114.3 241.6L156.5 217.3Z" style="fill:var(--tf-ink)" />
        <path d="M223.3 255.9L231.4 260.5L189.2 284.8L181.1 280.2Z" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M181.1 283.7L189.2 288.3L189.2 284.8L181.1 280.2Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M231.4 264L189.2 288.3L189.2 284.8L231.4 260.5Z" style="fill:var(--tf-ink)" />
        <path d="M110.3 211.5V237A4.1 2.3 0 0 0 114.3 239.3V213.8A4.1 2.3 0 0 1 110.3 211.5Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M114.3 213.8V239.3A4.1 2.3 0 0 0 118.4 237V211.5A4.1 2.3 0 0 1 114.3 213.8Z" style="fill:var(--tf-ink)" />
        <ellipse cx="114.3" cy="211.5" rx="4.1" ry="2.3" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M185.1 254.7V280.2A4.1 2.3 0 0 0 189.2 282.6V257A4.1 2.3 0 0 1 185.1 254.7Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M189.2 257V282.6A4.1 2.3 0 0 0 193.2 280.2V254.7A4.1 2.3 0 0 1 189.2 257Z" style="fill:var(--tf-ink)" />
        <ellipse cx="189.2" cy="254.7" rx="4.1" ry="2.3" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M117.3 219L131.4 227.1" style="fill:none;stroke:var(--tf-link);stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:4 3" />
        <ellipse cx="152.5" cy="264.5" rx="26.4" ry="8.8" style="fill:var(--tf-line)" />
        <path d="M133.8 262.5q0 -39.6 18.7 -44.7q18.7 5.1 18.7 44.7z" style="fill:var(--tf-ink)" />
        <path d="M167.9 254.9q22 -6.6 17.6 -30.9" style="fill:none;stroke:var(--tf-ink);stroke-width:4.4079999999999995;stroke-linecap:round;stroke-linejoin:round;fill:none" />
        <circle cx="152.5" cy="207.6" r="14.3" style="fill:var(--tf-ink)" />
        <path d="M139.3 200.9L137.1 185.5L149.2 195.4Z" style="fill:var(--tf-ink)" />
        <path d="M165.7 200.9L167.9 185.5L155.8 195.4Z" style="fill:var(--tf-ink)" />
        <g style="stroke:none;fill:var(--tf-muted);font:600 10px var(--tf-mono);letter-spacing:.06em;text-anchor:middle"><text x="202.7" y="56.2">INDOORS · 03:41 · IN · DECIDING</text></g>
    - style: isometric
      caption: "The spare beam pair, for a second flap covered later, and the decision log export, which has no address."
      svg: |-
        <ellipse cx="138.2" cy="196.9" rx="73.5" ry="33.6" style="fill:var(--tf-line)" />
        <path d="M120 145.8L129.7 151.4L78.8 180.8L69.1 175.2Z" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M69.1 179.4L78.8 185L78.8 180.8L69.1 175.2Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M129.7 155.6L78.8 185L78.8 180.8L129.7 151.4Z" style="fill:var(--tf-ink)" />
        <path d="M210.3 198L220 203.6L169.1 233L159.4 227.4Z" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M159.4 231.6L169.1 237.2L169.1 233L159.4 227.4Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M220 207.8L169.1 237.2L169.1 233L220 203.6Z" style="fill:var(--tf-ink)" />
        <path d="M73.9 144.4V175.2A4.9 2.8 0 0 0 78.8 178V147.2A4.9 2.8 0 0 1 73.9 144.4Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M78.8 147.2V178A4.9 2.8 0 0 0 83.7 175.2V144.4A4.9 2.8 0 0 1 78.8 147.2Z" style="fill:var(--tf-ink)" />
        <ellipse cx="78.8" cy="144.4" rx="4.9" ry="2.8" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M164.2 196.6V227.4A4.9 2.8 0 0 0 169.1 230.2V199.4A4.9 2.8 0 0 1 164.2 196.6Z" style="fill:color-mix(in srgb, var(--tf-ink) 70%, var(--tf-surface))" />
        <path d="M169.1 199.4V230.2A4.9 2.8 0 0 0 174 227.4V196.6A4.9 2.8 0 0 1 169.1 199.4Z" style="fill:var(--tf-ink)" />
        <ellipse cx="169.1" cy="196.6" rx="4.9" ry="2.8" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" />
        <path d="M82.4 153.5L165.5 201.5" style="fill:none;stroke:var(--tf-link);stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:4 3" />
        <g transform="matrix(.866 .5 -.866 .5 290 130)"><path d="M0 0h86.4v115.2h-86.4z" style="fill:var(--tf-surface);stroke:var(--tf-line);stroke-width:1.2" />
        <path d="M0 0h86.4v14.4h-86.4z" style="fill:color-mix(in srgb, var(--tf-accent) 45%, var(--tf-surface))" />
        <path d="M0 14.4H86.4M0 28.8H86.4M0 43.2H86.4M0 57.6H86.4M0 72H86.4M0 86.4H86.4M0 100.8H86.4M25.9 0V115.2M53.6 0V115.2" style="fill:none;stroke:var(--tf-line);stroke-width:0.8;stroke-linecap:round;stroke-linejoin:round" />
        <path d="M3.5 18h15.6v7.2h-15.6zM29.4 18h12.1v7.2h-12.1zM57 18h22.5v7.2h-22.5zM3.5 32.4h15.6v7.2h-15.6zM29.4 32.4h12.1v7.2h-12.1zM57 32.4h15.6v7.2h-15.6zM3.5 46.8h15.6v7.2h-15.6zM29.4 46.8h20.7v7.2h-20.7zM57 46.8h22.5v7.2h-22.5zM3.5 61.2h15.6v7.2h-15.6zM29.4 61.2h12.1v7.2h-12.1zM57 61.2h15.6v7.2h-15.6zM3.5 75.6h15.6v7.2h-15.6zM29.4 75.6h12.1v7.2h-12.1zM57 75.6h22.5v7.2h-22.5zM3.5 90h15.6v7.2h-15.6zM29.4 90h20.7v7.2h-20.7zM57 90h15.6v7.2h-15.6zM3.5 104.4h15.6v7.2h-15.6zM29.4 104.4h12.1v7.2h-12.1zM57 104.4h22.5v7.2h-22.5z" style="fill:color-mix(in srgb, var(--tf-ink) 45%, var(--tf-surface))" /></g>
        <g style="stroke:none;fill:var(--tf-muted);font:600 10px var(--tf-mono);letter-spacing:.06em;text-anchor:middle"><text x="120" y="272">SPARE BEAM PAIR</text><text x="290" y="272">LOG EXPORT</text></g>
    - style: patent
      caption: "Elevation, indoor side: frame (10), hinge (14), flap (12), flap beam (18), battery rail with four AA cells (24) and display (16), showing the longest recorded decision."
      svg: |-
        <g style="fill:none;stroke:var(--tf-ink);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round">
        <path d="M64 60h173.3v178.5h-173.2z" style="stroke-width:2.4" />
        <path d="M85 81h131.3v141.8h-131.2z" />
        <path d="M88 84h125.3v135.8h-125.2z" />
        <path d="M88 90H213.3" />
        <path d="M105 86.5v2M196.3 86.5v2M150.6 86.5v2" />
        <path d="M77 147.9h8v8h-8zM216.3 147.9h8v8h-8z" />
        <path d="M85 151.9H216.3" style="stroke-width:1;stroke-dasharray:5 3.5" />
        <path d="M106 224.9h21v10.5h-21zM133.3 224.9h21v10.5h-21zM160.6 224.9h21v10.5h-21zM187.9 224.9h21v10.5h-21z" style="stroke-width:1;stroke-dasharray:5 3.5" />
        <path d="M123.9 62h54.6v16h-54.6z" />
        <path d="M74 70Q63 54.5 44 54M91 90Q62 84.3 40 104M81 153.9Q62.5 139.7 40 146M111 202.8Q77.7 180.6 40 194M127 230.5Q80.1 215.5 40 244M178.5 70Q225.7 79.9 262 48" style="stroke-width:.9" />
        <path d="M64 256.5H237.3M70 254l-6 2.5 6 2.5M231.3 254l6 2.5-6 2.5" style="stroke-width:.9" /><text x="150.6" y="252.5" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono);text-anchor:middle">165 mm</text>
        <path d="M253.3 60V238.5M250.8 66l2.5-6 2.5 6M250.8 232.5l2.5 6 2.5-6" style="stroke-width:.9" /><text x="258.3" y="152.3" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono)">170 mm</text>
        </g>
        <text x="129.1" y="74" style="fill:var(--tf-ink);stroke:none;font:500 10px var(--tf-mono)">14:20 IN</text>
        <circle cx="174.3" cy="70" r="1.8" style="fill:var(--tf-good)" />
        <g style="fill:var(--tf-ink);stroke:none;font:500 12px var(--tf-mono)"><text x="28" y="56">10</text><text x="24" y="108">14</text><text x="24" y="150">18</text><text x="24" y="198">12</text><text x="24" y="248">24</text><text x="266" y="52">16</text></g>
        <g style="fill:var(--tf-ink);stroke:none;font:500 11px var(--tf-mono)"><text x="64" y="290">ELEVATION · INDOOR SIDE</text></g>
    - style: patent
      caption: "Plan through the door (26): frame (10), flap (12) in section with its swing shown dashed, flap beam (18), approach beam (20) between its posts (22), and the cat (28), at the approach, undecided."
      svg: |-
        <g style="fill:none;stroke:var(--tf-ink);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round">
        <path d="M60 120H117M60 160H117M283 120H340M283 160H340" />
        <path d="M327.9 120L340 132.1M319.4 120L340 140.6M310.9 120L340 149.1M302.4 120L340 157.6M293.9 120L333.9 160M285.5 120L325.5 160M283 126L317 160M283 134.5L308.5 160M283 143L300 160M283 151.5L291.5 160M115.8 120L117 121.2M107.3 120L117 129.7M98.8 120L117 138.2M90.3 120L117 146.7M81.8 120L117 155.2M73.3 120L113.3 160M64.8 120L104.8 160M60 123.6L96.4 160M60 132.1L87.9 160M60 140.6L79.4 160M60 149.1L70.9 160M60 157.6L62.4 160" style="stroke-width:.8" />
        <path d="M117 120h166v40h-166z" style="stroke-width:2.4" />
        <path d="M117 120h20v40h-20zM263 120h20v40h-20z" />
        <path d="M283 155.4L278.4 160M283 149.7L272.7 160M283 144.1L267.1 160M283 138.4L263 158.4M283 132.8L263 152.8M283 127.1L263 147.1M283 121.5L263 141.5M278.8 120L263 135.8M273.2 120L263 130.2M267.5 120L263 124.5M137 154.3L131.3 160M137 148.7L125.7 160M137 143L120 160M137 137.4L117 157.4M137 131.7L117 151.7M137 126L117 146M137 120.4L117 140.4M131.7 120L117 134.7M126.1 120L117 129.1M120.4 120L117 123.4" style="stroke-width:.8" />
        <path d="M137 138.5h126v3h-126z" />
        <path d="M137 128.5h126v3h-126zM137 148.5h126v3h-126z" style="stroke-width:1;stroke-dasharray:5 3.5" />
        <path d="M137 129h4v4h-4zM259 129h4v4h-4z" />
        <path d="M141 131H259" style="stroke-width:1;stroke-dasharray:5 3.5" />
        <path d="M117 160h14v80h-14zM269 160h14v80h-14z" />
        <path d="M117 233a7 7 0 1 0 14 0a7 7 0 1 0 -14 0M269 233a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
        <path d="M121.5 233a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0M273.5 233a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0" />
        <path d="M131 233H269" style="stroke-width:1;stroke-dasharray:5 3.5" />
        <path d="M186 233a14 14 0 1 0 28 0a14 14 0 1 0 -28 0" style="stroke-width:1;stroke-dasharray:5 3.5" />
        <path d="M165 205V105M161 111l4 -6 4 6M235 105V205M231 199l4 6 4 -6" />
        <path d="M70 122Q61 107.5 44 106M121 122Q113 106.8 96 104M200 138Q205 128 200 118M261 133Q264.8 169.3 296 188M271 237Q278.3 253.8 296 258M150 232Q125 224.5 104 240M210 244Q212.5 256.5 224 262" style="stroke-width:.9" />
        <path d="M117 82H283M123 79.5l-6 2.5 6 2.5M277 79.5l6 2.5-6 2.5" style="stroke-width:.9" /><text x="200" y="78" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono);text-anchor:middle">165 mm</text>
        </g>
        <g style="fill:var(--tf-ink);stroke:none;font:500 12px var(--tf-mono)"><text x="36" y="110">26</text><text x="92" y="100">10</text><text x="194" y="114">12</text><text x="300" y="192">18</text><text x="300" y="262">22</text><text x="92" y="244">20</text><text x="226" y="272">28</text></g>
        <text x="366" y="112" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono);text-anchor:end">INDOOR</text>
        <text x="366" y="178" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono);text-anchor:end">OUTDOOR</text>
        <text x="165" y="98" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono);text-anchor:middle">IN</text>
        <text x="235" y="218" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono);text-anchor:middle">OUT</text>
        <g style="fill:var(--tf-ink);stroke:none;font:500 11px var(--tf-mono)"><text x="60" y="290">PLAN · TWO BEAMS</text></g>
    - style: patent
      caption: "Detail B: the display (16) and the timing. The approach beam (20) breaks, the flap beam (18) breaks, and the interval between is the decision. Below, an approach that withdrew: logged as no passage, not discarded."
      svg: |-
        <g style="fill:none;stroke:var(--tf-ink);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round">
        <path d="M110 36h180a8 8 0 0 1 8 8v58a8 8 0 0 1-8 8H110a8 8 0 0 1-8-8V44a8 8 0 0 1 8-8z" style="stroke-width:2.4" />
        <path d="M112 46h176v56h-176z" />
        <path d="M70 150h270M70 190h270" />
        <path d="M70 150H120v10H132v-10H340" />
        <path d="M70 190H290v10H302v-10H340" />
        <path d="M70 230H120v10H132v-10H176v10H188v-10H340" />
        <path d="M120 140V240M290 180V200" style="stroke-width:1;stroke-dasharray:5 3.5" />
        <path d="M290 60Q309 59.5 320 44M70 150Q64 150 58 150M70 190Q64 190 58 190M70 230Q64 230 58 230" style="stroke-width:.9" />
        <path d="M120 210H290M126 207.5l-6 2.5 6 2.5M284 207.5l6 2.5-6 2.5" style="stroke-width:.9" /><text x="205" y="206" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono);text-anchor:middle">t = 14:20</text>
        <path d="M120 250H176M126 247.5l-6 2.5 6 2.5M170 247.5l6 2.5-6 2.5" style="stroke-width:.9" />
        </g>
        <text x="200" y="82" style="fill:var(--tf-ink);stroke:none;font:500 24px var(--tf-mono);text-anchor:middle;font-weight:600">14:20</text>
        <text x="200" y="96" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono);text-anchor:middle">IN · PASSAGE</text>
        <circle cx="282" cy="52" r="1.8" style="fill:var(--tf-good)" />
        <g style="fill:var(--tf-ink);stroke:none;font:500 12px var(--tf-mono)"><text x="324" y="48">16</text><text x="40" y="154">20</text><text x="40" y="194">18</text><text x="40" y="234">20</text></g>
        <text x="236" y="266" style="fill:var(--tf-ink);stroke:none;font:500 9px var(--tf-mono);text-anchor:middle">NO PASSAGE · t = 00:56</text>
        <g style="fill:var(--tf-ink);stroke:none;font:500 11px var(--tf-mono)"><text x="70" y="290">DETAIL B · DISPLAY, AND TIMING</text></g>
  rewards:
    - id: decision-log-export
      title: Decision log export
      description: A monthly export of your cat's decision log, direction, elapsed time and outcome, as a spreadsheet.
      price: 19
      claimed: 50
      digital: true
      delivery: +95d
    - id: frame
      title: Frame
      description: One Decision Timer frame, fitted to a standard 165 × 170 mm flap opening, with the indoor display.
      price: 39
      claimed: 120
      shipsTo: [domestic, europe, world]
      delivery: +90d
    - id: frame-and-spare-beams
      title: Frame and spare beam kit
      description: One frame plus a spare pair of infrared beams, for a household that wants a second flap covered later.
      price: 59
      claimed: 40
      shipsTo: [domestic, europe, world]
      delivery: +90d
  addons:
    - { id: spare-beam-pair, title: Spare infrared beam pair, price: 9, claimed: 30 }
  stretchGoals:
    - { id: weekly-summary, amount: 15000, title: "A weekly summary of the slowest decisions, added to the export" }
  shipping: { domestic: 5, europe: 9, world: 15 }
---

Most cat flaps record nothing. This one records the interval between arrival
and passage, in both directions, and shows it on a small display fitted to
the indoor side. A decision that ends without the cat going through is
recorded as such, not discarded.

## The two beams

One infrared beam sits at the approach, the other at the flap itself. The
frame times the interval between the two, in either direction, and logs it
with the direction and the outcome. The frame fits standard 165 × 170 mm flap
openings without modification to the door.

## No passage

Not every approach ends in a crossing. When the cat breaks the approach beam
and then withdraws without reaching the flap beam, the frame logs the
interval up to the withdrawal and records the outcome as no passage. These
are kept in the log alongside completed crossings, not removed from it.

## The longest decision

The longest interval recorded in testing was 14 minutes 20 seconds, timed
from the approach beam to the flap beam, and ended with the cat returning
indoors rather than going out. The frame logged this as a completed passage
in the indoor direction, which is technically correct.

## Shipping

The frame ships worldwide. The decision log export is a digital Reward and
ships nowhere, since a spreadsheet has no address to send it to.
