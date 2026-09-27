---
title: Passport Tracker Tracker
description: A passport cover with a GPS tracker, and a second tracker to locate the first.
campaign:
  registry: TF-0022
  inventor: priya-raman
  category: travel
  goal: 25000
  launch: +10d
  end: +40d
  backers: 0
  pledged: 0
  specifications:
    - { label: Added thickness, value: 3.2 mm }
    - { label: Added weight, value: 22 g }
    - { label: Trackers, value: "Two, independent, separate batteries and separate networks" }
    - { label: Primary network, value: "LTE-M cellular" }
    - { label: Secondary network, value: "Satellite, for areas without cellular coverage" }
    - { label: Reporting, value: "Each tracker reports its own position and the other's last known position" }
    - { label: On failure, value: "The surviving tracker reports the failed one's last known position" }
    - { label: App display, value: "Passport, first tracker and second tracker, as three dots" }
    - { label: Battery life, value: "45 days per tracker, charged separately" }
    - { label: Case, value: "RFID-shielding lining, fits standard passport size" }
  figures:
    - style: isometric
      caption: placeholder
      svg: |-
        <ellipse cx="200" cy="160" rx="80" ry="45" style="fill:var(--tf-accent)" />
    - style: patent
      caption: placeholder
      svg: |-
        <ellipse cx="200" cy="160" rx="80" ry="45" style="fill:none;stroke:var(--tf-ink);stroke-width:1.6" />
  rewards:
    - id: tracking-plan
      title: Two-Network Tracking Plan
      description: App access reporting both trackers' positions, over LTE-M and satellite, for the life of the cover.
      price: 19
      claimed: 0
      digital: true
      delivery: +12d
    - id: cover
      title: Passport Tracker Tracker
      description: One cover fitted with both trackers, on separate batteries and separate networks.
      price: 79
      claimed: 0
      shipsTo: [domestic, europe, world]
      delivery: +90d
    - id: cover-and-plan
      title: Cover and Tracking Plan
      description: One cover with both trackers, plus the Two-Network Tracking Plan pre-activated on arrival.
      price: 92
      claimed: 0
      shipsTo: [domestic, europe, world]
      delivery: +90d
    - id: founders-cover
      title: Founder's edition cover
      description: Full-grain leather cover, embossed with your initials, fitted with both trackers.
      price: 149
      claimed: 0
      stock: 25
      shipsTo: [domestic, europe, world]
      delivery: +90d
  addons:
    - { id: spare-battery, title: "Spare tracker battery", price: 9, claimed: 0 }
  stretchGoals:
    - { id: waterproof-seam, amount: 32000, title: "A waterproof seam, tested to 1 metre for 30 minutes" }
    - { id: third-network, amount: 40000, title: "A third network for the first tracker, for the countries the other two miss" }
  shipping: { domestic: 5, europe: 9, world: 16 }
---

Most passport trackers are a single point of failure: one battery, one
network, one thing to go quiet at the worst time. The Passport Tracker
Tracker fits two independent trackers to the same cover, each on its own
battery and its own network, and has each one watch the other.

## Two trackers, one passport

The first tracker reports over LTE-M cellular. The second reports over
satellite, for the stretches of a trip where cellular coverage does not
reach. Each tracker also reports the other's last known position, on its own
schedule, over its own network. In normal use the two positions agree, and
the app shows three dots that sit on top of each other: the passport, the
first tracker, and the second.

## When one fails

A tracker that stops reporting is not treated as missing. The other tracker
notices the silence within one reporting cycle and marks it failed, with the
position it last confirmed. The passport's own position is then taken from
whichever tracker is still reporting. Neither tracker is aware which one is
considered primary; the arrangement is symmetric by design, so there is no
single tracker whose failure goes unwatched.

## The map

The app's map shows three dots at all times, even when they overlap. Early
testers asked why a working cover showed three dots instead of one. The
Inventor's answer was that a single dot is a claim, and two independent
confirmations of it are a measurement.

## Added weight

The second tracker adds 3.2 mm to the cover's thickness and 22 g to its
weight, on top of the first tracker's own 2.8 mm and 18 g. The Inventor
considers this an acceptable price for not needing to wonder, mid-flight,
whether the first tracker is still there.

## Shipping

The Two-Network Tracking Plan is a digital Reward and ships nowhere; it
activates on the cover already in your possession, or on delivery of a new
one. The cover itself, in all three tiers, ships worldwide.
