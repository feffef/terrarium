---
title: Cat Flap Decision Timer
description: A cat flap frame that records how long the cat took to decide.
campaign:
  registry: TF-0020
  inventor: declan-murphy
  category: pets
  goal: 12000
  launch: -8d
  end: +22d
  backers: 210
  pledged: 8880
  specifications:
    - { label: Beams, value: "Two infrared beams, approach and flap" }
    - { label: Frame size, value: "165 x 170 mm, standard flap opening" }
    - { label: Display, value: "Indoor side, elapsed time and outcome" }
    - { label: Logged fields, value: "Direction, elapsed time, outcome" }
    - { label: Longest recorded decision, value: "14 minutes 20 seconds, in testing" }
    - { label: Battery, value: "4 AA cells, 6 months" }
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
    - id: decision-log-export
      title: Decision log export
      description: A monthly export of your cat's decision log, direction, elapsed time and outcome, as a spreadsheet.
      price: 19
      claimed: 50
      digital: true
      delivery: +5d
    - id: frame
      title: Frame
      description: One Decision Timer frame, fitted to a standard 165 x 170 mm flap opening, with the indoor display.
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
with the direction and the outcome. The frame fits standard 165 x 170 mm flap
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
