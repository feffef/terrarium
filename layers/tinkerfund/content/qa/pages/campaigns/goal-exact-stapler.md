---
title: Goal-Exact Stapler
description: Live and exactly at its goal, with its early-bird Reward sold out.
campaign:
  registry: TF-9002
  inventor: test-inventor
  category: desk
  goal: 2500
  launch: -9d
  end: +21d
  backers: 110
  pledged: 2500
  specifications:
    - { label: Capacity, value: 1 staple }
  figures:
    - style: isometric
      caption: The stapler, loaded.
      svg: '<path d="M120 180l100-40 60 20-100 40z" style="fill:var(--tf-accent)" />'
    - style: patent
      caption: The single staple (4).
      svg: '<path d="M140 200h120v-20" style="fill:none;stroke:var(--tf-ink);stroke-width:2" />'
  rewards:
    - { id: early-bird, title: Early-bird stapler, price: 15, claimed: 50, stock: 50, shipsTo: [domestic, europe, world], delivery: +90d }
    - { id: stapler, title: One stapler, price: 25, claimed: 60, shipsTo: [domestic, europe, world], delivery: +90d }
  addons:
    - { id: staple, title: One more staple, price: 1, claimed: 30 }
  shipping: { domestic: 4, europe: 8, world: 15 }
---

A stapler that holds exactly one staple, and has raised exactly its goal.
