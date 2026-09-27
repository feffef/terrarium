---
title: Grass Growth Notifier
description: A lawn stake that sends a push notification each time the grass grows a tenth of a millimetre.
campaign:
  registry: TF-0025
  inventor: gwen-ashdown
  category: garden
  goal: 20000
  launch: -80d
  end: -50d
  backers: 320
  pledged: 26400
  specifications:
    - { label: Sensor, value: "Laser displacement, single marked blade" }
    - { label: Resolution, value: 0.02 mm }
    - { label: Notification threshold, value: 0.1 mm growth }
    - { label: Typical interval, value: "~40 minutes, early summer" }
    - { label: Stake height, value: 200 mm }
    - { label: Mowing detection, value: "Automatic, resets the count" }
    - { label: Connectivity, value: "Bluetooth LE 5.0, companion app" }
    - { label: Battery, value: "Rechargeable, USB-C, 3 weeks typical" }
    - { label: Daily summary, value: "Optional, off by default" }
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
    - id: single-notifier
      title: One Notifier
      description: One Grass Growth Notifier on its stake, paired to the app.
      price: 39
      claimed: 220
      options:
        - id: stake-length
          name: Stake length
          choices:
            - { id: standard, label: "200 mm stake" }
            - { id: tall, label: "350 mm stake, for longer grass" }
      shipsTo: [domestic, europe, world]
      delivery: -10d
    - id: two-notifiers
      title: Two Notifiers
      description: Two units, for a lawn with a front and back to compare.
      price: 69
      claimed: 80
      options:
        - id: stake-length
          name: Stake length
          choices:
            - { id: standard, label: "200 mm stake" }
            - { id: tall, label: "350 mm stake, for longer grass" }
      shipsTo: [domestic, europe, world]
      delivery: -10d
    - id: garden-set
      title: Three-Notifier Garden Set
      description: Three notifiers sharing one app view, for a lawn with several distinct patches.
      price: 129
      claimed: 20
      stock: 60
      shipsTo: [domestic, europe, world]
      delivery: -5d
  addons:
    - { id: spare-blade-kit, title: "Spare marked-blade kit", description: "Replacement marking clips for the blade the sensor tracks.", price: 9, claimed: 45 }
    - { id: second-stake, title: "Second stake", description: "For repositioning without recalibrating the first.", price: 14, claimed: 35 }
  stretchGoals:
    - { id: second-channel, amount: 24000, title: "A second sensor channel, for tracking a rival blade on the same stake" }
    - { id: night-mode, amount: 30000, title: "A night mode that holds notifications until sunrise" }
  shipping: { domestic: 4, europe: 8, world: 14 }
---

Most garden sensors report on the day, or the week. The Grass Growth
Notifier reports on the tenth of a millimetre, as it happens.

## Measuring in tenths of a millimetre

A laser displacement sensor looks down from a 200 mm stake at a single
marked blade and measures its height to 0.02 mm. Each time the blade has
gained 0.1 mm, the app sends a notification. The Inventor considers this the
only way to see growth as it happens, rather than after it has already
finished happening.

## Forty minutes, on average

In early summer this comes to roughly one notification every 40 minutes.
Notifications can be grouped into a daily summary instead, though the
Inventor has left this off on her own stake and does not recommend changing
that.

## The mowing detector

A mowing detector watches for a sudden drop in blade height and resets the
count. It then sends exactly one message: the grass has been cut. No further
notifications follow until the blade begins growing again.

## Delivered

Every Pledge has shipped, including the Garden Sets, each paired to its
app account and tested against a blade before packing.
