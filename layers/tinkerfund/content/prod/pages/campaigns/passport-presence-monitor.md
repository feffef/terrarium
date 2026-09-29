---
title: Passport Presence Monitor
description: A pocket sensor that confirms, every 90 seconds, that your passport is still in the pocket you put it in.
campaign:
  registry: TF-0024
  inventor: priya-raman
  category: travel
  goal: 18000
  launch: -4d
  end: +26d
  backers: 310
  pledged: 18540
  specifications:
    - { label: Monitor, value: "42 × 28 × 9 mm, anodised aluminium" }
    - { label: Passport tag, value: "88 × 125 × 0.4 mm, fits inside the back cover" }
    - { label: Check interval, value: 90 seconds }
    - { label: Range, value: "40 mm, one pocket" }
    - { label: Confirmation, value: "One vibration, 120 ms" }
    - { label: Absence alert, value: None }
    - { label: Battery, value: "CR2032, about 14 months" }
    - { label: Weight, value: "11 g monitor, 3 g tag" }
    - { label: Finish, value: Graphite or sand }
  figures:
    - style: isometric
      caption: "The Passport Presence Monitor."
      svg: |-
        <path d="M150 150L200 121L250 150L200 179Z" style="fill:var(--tf-accent)" />
    - style: patent
      caption: "Plan view of the monitor."
      svg: |-
        <path d="M150 100h100v100h-100z" style="fill:none;stroke:var(--tf-ink)" />
  rewards:
    - id: early-bird
      title: Early-bird monitor
      description: One monitor and one passport tag, at the launch price.
      price: 39
      claimed: 100
      stock: 100
      options:
        - id: finish
          name: Finish
          choices:
            - { id: graphite, label: Graphite }
            - { id: sand, label: Sand }
      shipsTo: [domestic, europe, world]
      delivery: +120d
    - id: monitor
      title: Passport Presence Monitor
      description: One monitor and one passport tag.
      price: 49
      claimed: 190
      options:
        - id: finish
          name: Finish
          choices:
            - { id: graphite, label: Graphite }
            - { id: sand, label: Sand }
      shipsTo: [domestic, europe, world]
      delivery: +120d
    - id: family
      title: Family set
      description: Four monitors and four passport tags, each pair matched at the factory.
      price: 149
      claimed: 20
      shipsTo: [domestic, europe, world]
      delivery: +120d
  addons:
    - { id: battery, title: "Spare CR2032 cell", price: 6, claimed: 80 }
  stretchGoals:
    - { id: boarding-pass, amount: 22000, title: "A second tag, for the boarding pass" }
    - { id: pouch, amount: 30000, title: "A felt pouch, sized for the monitor and nothing else" }
  shipping: { domestic: 5, europe: 8, world: 14 }
---

The Passport Presence Monitor clips inside a jacket pocket and checks,
every 90 seconds, that the passport is still there. When it is, the monitor
vibrates once. When it is not, the monitor does nothing.

## The premise

On a four-day trip to Osaka the Inventor touched her jacket pocket 212
times to confirm that her passport was in it. It was in it every time. The
conclusion was not that she should check less. It was that the checking
could be done by something that does not get tired.

## How it checks

A 0.4 mm tag sits inside the passport's back cover. The monitor reads it
across 40 mm of fabric, which is one pocket and not the next. Every 90
seconds it takes a reading. If the tag answers, the monitor gives one 120 ms
vibration, felt against the ribs and not heard by anyone nearby.

## What it does not do

The monitor does not locate a passport. It does not alert, ring or send
anything to a phone. When the tag stops answering, the vibrations stop, and
the traveller will notice, in time, that nothing is being confirmed. Early
testers found this took between four and eleven minutes.

## Testing

Twelve prototypes have completed 1,800 hours of travel between them, on
trains, ferries and 64 flights. They confirmed the presence of a passport
72,000 times. They were never wrong, and they were never asked to be
anything else.

## Stretch goals

At €22,000 every Reward gains a second tag, for the boarding pass. The
monitor alternates between the two and confirms each every three minutes.
At €30,000 each monitor ships in a felt pouch cut to its exact size.
