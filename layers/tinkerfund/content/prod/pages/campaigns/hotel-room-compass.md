---
title: Hotel Room Compass
description: A bedside compass that points at the door.
campaign:
  registry: TF-0018
  inventor: lucia-ferrer
  category: travel
  goal: 10000
  launch: -200d
  end: -170d
  backers: 450
  pledged: 23800
  specifications:
    - { label: Case diameter, value: 48 mm }
    - { label: Calibration, value: "10 seconds, held against the door" }
    - { label: Bearing memory, value: "Holds until re-calibrated" }
    - { label: Needle, value: Luminous }
    - { label: Second needle, value: "Optional, set to the bathroom" }
    - { label: Weight, value: 96 g }
    - { label: Battery, value: None }
  figures:
    - style: isometric
      caption: placeholder
      svg: |-
        <ellipse cx="200" cy="180" rx="80" ry="40" style="fill:var(--tf-accent)" />
    - style: patent
      caption: placeholder
      svg: |-
        <ellipse cx="200" cy="180" rx="80" ry="40" style="fill:none;stroke:var(--tf-ink);stroke-width:2" />
  rewards:
    - id: compass
      title: Hotel Room Compass
      description: One compass, calibrated to your door on arrival.
      price: 39
      claimed: 350
      options:
        - id: needles
          name: Needles
          choices:
            - { id: single, label: "One, at the door" }
            - { id: dual, label: "Two, door and bathroom" }
      shipsTo: [domestic, europe, world]
      delivery: -40d
    - id: compass-pair
      title: Two compasses
      description: Two compasses, for a travelling pair who keep separate rooms.
      price: 72
      claimed: 80
      shipsTo: [domestic, europe, world]
      delivery: -40d
    - id: founders-edition
      title: Founder’s edition
      description: Brass case, engraved with your name and your most-visited city.
      price: 129
      claimed: 20
      stock: 20
      shipsTo: [domestic, europe, world]
      delivery: -20d
  addons:
    - { id: pouch, title: "Leather travel pouch", price: 14, claimed: 60 }
  stretchGoals:
    - { id: second-needle, amount: 14000, title: "A second needle, for the bathroom" }
    - { id: luminous-strap, amount: 19000, title: "A luminous strap, for finding the compass in the dark" }
  shipping: { domestic: 5, europe: 9, world: 15 }
---

Hotel rooms are laid out differently every time, and a compass never learns.
The Hotel Room Compass is calibrated to the one fixed point in any room: the
door.

## Calibration

On arrival, hold the compass face against the door for ten seconds. An
internal bearing locks to that heading and holds it until you calibrate
again. From then on, in the dark, at any distance across the room, the
needle points at the door.

## The bathroom needle

At €14,000 a second, smaller needle was added to the case, set independently
to the bathroom door. The Inventor tested this personally in 140 hotel rooms
over six years and reports that the two doors were never in the same
direction twice.

## What it does not do

The compass does not point north. Backers who tried it outdoors report that
it continues to point at the last door it was shown, which is correct
behaviour and not a fault.

## Delivered

Every Pledge has shipped, including the brass Founder’s editions, each
engraved and checked against its Backer’s stated city before packing.
