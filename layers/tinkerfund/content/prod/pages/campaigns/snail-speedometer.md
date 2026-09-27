---
title: Snail Speedometer
description: A garden radar gun calibrated for snails, reading in millimetres per minute.
campaign:
  registry: TF-0016
  inventor: gwen-ashdown
  category: garden
  goal: 18000
  launch: -16d
  end: +14d
  backers: 330
  pledged: 17460
  specifications:
    - { label: Radar module, value: "60 GHz, tip-mounted" }
    - { label: Resolution, value: 0.1 mm/min }
    - { label: Range, value: 2 m }
    - { label: Display, value: "Weatherproof e-paper, daily leaderboard" }
    - { label: Identification, value: "By shell marking, where visible" }
    - { label: Alert threshold, value: 50 mm/min }
    - { label: Battery, value: "72 hours, USB-C" }
    - { label: Mount, value: "Stake, 300 mm standard" }
  figures:
    - style: isometric
      caption: placeholder
      svg: |-
        <ellipse cx="200" cy="150" rx="80" ry="50" style="fill:var(--tf-accent)" />
    - style: patent
      caption: placeholder
      svg: |-
        <ellipse cx="200" cy="150" rx="80" ry="50" style="fill:none;stroke:var(--tf-ink);stroke-width:1.6" />
  rewards:
    - id: one-speedometer
      title: One speedometer
      description: One Snail Speedometer on its stake, with the leaderboard display.
      price: 39
      claimed: 230
      options:
        - id: stake
          name: Stake length
          choices:
            - { id: standard, label: 300 mm stake }
            - { id: long, label: "600 mm stake, for longer lawns" }
      shipsTo: [domestic, europe, world]
      delivery: +75d
    - id: two-speedometers
      title: Two speedometers
      description: Two units, for a garden with a front and back lawn, or a rivalry.
      price: 69
      claimed: 80
      options:
        - id: stake
          name: Stake length
          choices:
            - { id: standard, label: 300 mm stake }
            - { id: long, label: "600 mm stake, for longer lawns" }
      shipsTo: [domestic, europe, world]
      delivery: +75d
    - id: garden-set
      title: Garden set
      description: Three speedometers sharing one leaderboard display, for a bed with several beds to compare.
      price: 129
      claimed: 20
      stock: 60
      shipsTo: [domestic, europe, world]
      delivery: +90d
  addons:
    - { id: spare-stake, title: Spare stake, price: 9, claimed: 20 }
  stretchGoals:
    - { id: second-radar, amount: 20000, title: "A second radar module, for parallel races" }
    - { id: leaderboard-export, amount: 24000, title: "A weekly leaderboard export, emailed automatically" }
  shipping: { domestic: 4, europe: 8, world: 15 }
---

Most radar guns on the market read from 5 km/h upward, which is well above
anything found in a garden. The Snail Speedometer starts at zero and reads in
millimetres per minute.

## The problem with garden radar

The unit uses a 60 GHz radar module with a resolution of 0.1 mm/min and a
range of 2 m, mounted on a stake at the edge of the bed. Every pass is logged
with a timestamp, so a single snail's progress across an afternoon can be
reviewed later rather than watched live.

## Reading the leaderboard

The weatherproof display posts a daily leaderboard, identified by shell
marking where the marking is visible. Unmarked snails are logged as
unidentified and ranked separately, so as not to disqualify them.

## The alert

A top speed alert sounds above 50 mm/min. This has happened once, during an
early test, and the reading was confirmed against the log rather than taken
on trust.

## Shipping

The stake ships worldwide. A 72-hour battery covers a typical measurement
session regardless of which lawn it is measuring.
