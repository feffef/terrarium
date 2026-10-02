---
title: Pigeon Arrival Board
description: A split-flap arrivals board for the garden feeder, announcing each pigeon at its scheduled time.
campaign:
  registry: TF-0026
  inventor: edmund-clegg
  category: outdoors
  goal: 24000
  launch: -22d
  end: +8d
  backers: 380
  pledged: 35800
  specifications:
    - { label: Display, value: "3 rows × 20 split-flap characters" }
    - { label: Flap height, value: 38 mm }
    - { label: Housing, value: "62 × 24 × 9 cm, powder-coated aluminium, IP54" }
    - { label: Timetable, value: "41 scheduled arrivals a day, compiled 2019–2025" }
    - { label: Status flaps, value: "On time, Expected, Delayed, Cancelled" }
    - { label: Refresh, value: "Once a minute, on the minute" }
    - { label: Power, value: "12 V mains adapter, 6 W turning, 0.4 W idle" }
    - { label: Sensors, value: None }
    - { label: Finish, value: "Station green or slate grey" }
  figures: []
  rewards:
    - id: board
      title: The Arrival Board
      description: One board with its wall bracket, mains adapter and the Inventor's own timetable.
      price: 89
      claimed: 260
      options:
        - id: finish
          name: Finish
          choices:
            - { id: station-green, label: Station green }
            - { id: slate-grey, label: Slate grey }
      shipsTo: [domestic, europe, world]
      delivery: +120d
    - id: board-and-feeder
      title: Board and feeder
      description: The board with a matching hanging feeder, so the arrivals have somewhere to arrive.
      price: 129
      claimed: 80
      options:
        - id: finish
          name: Finish
          choices:
            - { id: station-green, label: Station green }
            - { id: slate-grey, label: Slate grey }
      shipsTo: [domestic, europe, world]
      delivery: +120d
    - id: regional-timetable
      title: Regional timetable
      description: A timetable for your region, compiled from observers' notebooks, for a board you already own or have pledged for.
      price: 19
      claimed: 40
      digital: true
      delivery: +100d
  addons:
    - { id: spare-flaps, title: "Spare flap set (one character)", price: 15, claimed: 60 }
    - { id: post-bracket, title: "Post bracket, for mounting beside the feeder", price: 12, claimed: 45 }
  stretchGoals:
    - { id: departures, amount: 30000, title: "Departures mode, on the same flaps" }
    - { id: chime, amount: 40000, title: "A two-tone chime before each arrival" }
  shipping: { domestic: 6, europe: 12, world: 22 }
---

A garden feeder receives around forty pigeons a day. Until now, none of them
has been announced.

## The timetable

From 2019 to 2025 the Inventor recorded every pigeon to land on his feeder in
York: the time, the direction it came from, and whether it stayed. The
notebook holds 9,612 arrivals. Averaged by quarter-hour, they settle into 41
scheduled arrivals a day, each with an origin: "Roof, No. 14", "Church
tower", "Unknown". This timetable ships on every board.

## Announcement, not detection

The board has no camera and no sensor. It does not detect pigeons. It
announces them. A pigeon that lands at the time shown has arrived on time.
If none has landed five minutes after the scheduled time, the status turns
to Delayed; after twenty minutes, Cancelled. The board cannot tell one pigeon
from another. In six years of testing, neither could the Inventor.

## The flaps

Each character is a module of 52 flaps on its own stepper motor, and a full
turn takes 1.8 seconds. The board refreshes once a minute, on the minute, at
34 dB at one metre. A silent version was tried for a week. Nobody in the
household believed it.

## Regional timetables

Not every Backer has six years of notebooks. The Regional timetable Reward
replaces the Inventor's York schedule with one compiled from 212 notebooks
kept by other observers, across 14 regions of the UK and Europe. It loads
over USB and applies from the next minute.

## Stretch goals

At €30,000 the board gained a Departures mode, selected by a switch on the
back. It uses the same flaps and the same timetable, offset by the average
stay of 11 minutes. At €40,000, a two-tone chime will sound before each
arrival.
