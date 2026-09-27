---
title: Occupied Sign for Litter Boxes
description: An illuminated OCCUPIED sign that lights above the litter box while a cat is inside.
campaign:
  registry: TF-0023
  inventor: beatrix-hollis
  category: pets
  goal: 9000
  launch: -160d
  end: -130d
  backers: 330
  pledged: 16740
  specifications:
    - { label: Sensor, value: "Infrared presence, mounted in the hood" }
    - { label: Panel, value: "120 mm, OCCUPIED in amber, VACANT in green" }
    - { label: Read distance, value: "6 m, low light" }
    - { label: Response time, value: "Under 2 seconds after the cat settles" }
    - { label: Language editions, value: "English, or multilingual across six languages" }
    - { label: Hood fitting, value: "Clip or adhesive, no drilling either way" }
    - { label: Chime, value: "Optional, sold separately" }
    - { label: Battery, value: "3 AAA cells, 5 months" }
  figures:
    - style: isometric
      caption: placeholder
      svg: |-
        <ellipse cx="200" cy="150" rx="90" ry="55" style="fill:var(--tf-accent)" />
    - style: patent
      caption: placeholder
      svg: |-
        <ellipse cx="200" cy="150" rx="90" ry="55" style="fill:none;stroke:var(--tf-ink);stroke-width:1.6" />
  rewards:
    - id: sign
      title: Occupied Sign
      description: One Occupied Sign, fitted to the hood by clip or adhesive, with the amber-to-green panel and your choice of language edition.
      price: 39
      claimed: 260
      options:
        - id: language
          name: Language edition
          choices:
            - { id: english, label: English }
            - { id: multilingual, label: "Multilingual, six languages" }
        - id: fitting
          name: Hood fitting
          choices:
            - { id: clip, label: Clip }
            - { id: adhesive, label: Adhesive }
      shipsTo: [domestic, europe, world]
      delivery: -95d
    - id: two-sign-pack
      title: Two-sign pack
      description: Two Occupied Signs, for a household with more than one hood, each set independently.
      price: 69
      claimed: 40
      shipsTo: [domestic, europe, world]
      delivery: -95d
    - id: care-guide
      title: Placement and care guide
      description: A short digital guide to hood placement, sensor angle, and battery care.
      price: 15
      claimed: 30
      digital: true
      delivery: -158d
  addons:
    - { id: spare-clip, title: Spare hood clip, price: 9, claimed: 50 }
    - { id: chime, title: Optional chime module, price: 12, claimed: 20 }
  stretchGoals:
    - { id: third-language-pair, amount: 12000, title: "A third language pair added to the multilingual edition" }
  shipping: { domestic: 5, europe: 9, world: 16 }
---

Three cats and one litter box was, in the Inventor's household, a settled
arrangement that nobody had thought to announce. The Occupied Sign fits to
the hood, watches the entrance with an infrared sensor, and lights a 120 mm
panel: amber for OCCUPIED, green for VACANT, readable from 6 m in low light.

## Amber to green

The sensor sits inside the hood, aimed at the entrance, and needs no
calibration beyond the fitting itself. While a cat is inside, the panel
shows OCCUPIED in amber. Within two seconds of the cat leaving, it switches
to VACANT in green. The panel holds whichever state is current; it does not
flash, count down, or otherwise editorialise.

## Two ways to fit it, six ways to read it

The hood fitting is a clip or an adhesive pad, chosen at checkout, and
changes nothing about the sensor or the panel. The language edition does the
same for the text: English on the standard panel, or a multilingual panel
that cycles OCCUPIED and VACANT through six languages, on a timer unrelated
to the cat.

## The chime

An optional chime module sounds once when the panel changes to OCCUPIED. It
is sold separately, on the grounds that a household already checking a
lit sign may not also want a sound.

## The cats

The Inventor's three cats have not yet altered their use of the litter box
in response to the sign, and were not asked to. The sign was built for the
household, not for them, and the Inventor considers this the correct
audience.

## Shipping

The Occupied Sign and the two-sign pack ship to any of the three zones. The
placement and care guide is a digital Reward and ships nowhere.
