---
title: Last-Minute Lamp
description: Live, over its goal and ending within 48 hours of the pinned now.
campaign:
  registry: TF-9001
  inventor: test-inventor
  category: desk
  goal: 1000
  launch: -12d
  end: +36h
  backers: 40
  pledged: 1250
  specifications:
    - { label: Brightness, value: 1 lumen }
  figures:
    - style: isometric
      caption: The lamp.
      svg: '<path d="M160 120l40-20 40 20v100l-40 20-40-20z" style="fill:var(--tf-accent)" />'
    - style: patent
      caption: The switch (3).
      svg: '<rect x="150" y="80" width="100" height="160" style="fill:none;stroke:var(--tf-ink);stroke-width:2" />'
  rewards:
    - id: lamp
      title: One lamp
      price: 19
      claimed: 38
      stock: 40
      limit: 1
      options:
        - id: colour
          name: Colour
          choices:
            - { id: black, label: Black }
            - { id: white, label: White }
      shipsTo: [domestic]
      delivery: +60d
    - { id: manual, title: The manual (PDF), price: 5, claimed: 2, digital: true, delivery: +2d }
  addons:
    - { id: bulb, title: Spare bulb, price: 4, claimed: 10, stock: 10 }
  stretchGoals:
    - { id: dimmer, amount: 1200, title: A dimmer }
  shipping: { domestic: 5 }
---

A lamp that is almost out of time.

## Why the hurry

The switch took longer than the lamp.
