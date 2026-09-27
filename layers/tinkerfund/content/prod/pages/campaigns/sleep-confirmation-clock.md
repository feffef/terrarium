---
title: Sleep Confirmation Clock
description: A bedside clock that tells you, in the morning, that you slept.
campaign:
  registry: TF-0024
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
      caption: placeholder
      svg: |-
        <ellipse cx="200" cy="150" rx="80" ry="55" style="fill:var(--tf-accent)" />
    - style: patent
      caption: placeholder
      svg: |-
        <ellipse cx="200" cy="150" rx="80" ry="55" style="fill:none;stroke:var(--tf-ink);stroke-width:1.6" />
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
Counter. That clock counted sheep all night and printed a total. Backers kept
asking a different question: whether they had slept at all. This is his
answer to that question, not an upgrade to the old one.
