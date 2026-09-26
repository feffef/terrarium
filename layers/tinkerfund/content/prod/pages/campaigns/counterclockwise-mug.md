---
title: Counterclockwise Mug
description: A self-stirring mug that stirs in one direction only, as intended.
campaign:
  registry: TF-0001
  inventor: henrik-aalto
  category: kitchen
  goal: 8000
  launch: -12d
  end: +18d
  backers: 612
  pledged: 27200
  specifications:
    - { label: Capacity, value: 330 ml }
    - { label: Stir rate, value: 40 rpm }
    - { label: Direction, value: Counterclockwise only }
  figures:
    - style: isometric
      caption: The mug at rest, stirring.
      svg: '<path d="M140 110l80-40 80 40v110l-80 40-80-40z" style="fill:var(--tf-accent)" /><path d="M140 110l80 40 80-40" style="fill:none;stroke:var(--tf-ink);stroke-width:3" /><path d="M300 140c30 0 30 50 0 50" style="fill:none;stroke:var(--tf-ink);stroke-width:8" /><ellipse cx="220" cy="270" rx="90" ry="14" style="fill:var(--tf-line)" />'
    - style: patent
      caption: Section A–A, showing the stirring gear (12).
      svg: '<rect x="120" y="60" width="160" height="190" style="fill:none;stroke:var(--tf-ink);stroke-width:2" /><circle cx="200" cy="220" r="18" style="fill:none;stroke:var(--tf-ink);stroke-width:2;stroke-dasharray:6 4" /><path d="M218 220h90" style="stroke:var(--tf-ink);stroke-width:1" /><text x="314" y="224" style="fill:var(--tf-ink);font:12px monospace">12</text>'
  rewards:
    - id: one-mug
      title: One mug
      price: 29
      claimed: 540
      options:
        - id: colour
          name: Colour
          choices:
            - { id: slate, label: Slate }
            - { id: signal, label: Signal orange }
      shipsTo: [domestic, europe, world]
      delivery: +120d
  addons:
    - { id: coaster, title: Matching coaster, price: 6, claimed: 88 }
  stretchGoals:
    - { id: saucer, amount: 16000, title: A saucer that also turns }
    - { id: lid, amount: 24000, title: A lid for the steam }
  shipping: { domestic: 5, europe: 9, world: 18 }
---

Most mugs leave the stirring to you. This one stirs itself, steadily, at
forty turns a minute, and always counterclockwise.
