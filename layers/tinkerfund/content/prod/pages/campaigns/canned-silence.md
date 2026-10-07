---
title: Canned Silence
description: A 250 ml borosilicate jar of the silence of a named room, sealed in the room and opened once.
campaign:
  registry: TF-0029
  inventor: annika-sorensen
  category: sleep
  goal: 16000
  launch: -13d
  end: +17d
  backers: 249
  pledged: 13420
  alsoBacked: [snore-certificate-printer, sleep-confirmation-clock, pocket-sundial-with-snooze]
  recent:
    - { name: Jonas K., city: Hamburg, at: -3h }
    - { name: Fenna V., city: Utrecht, at: -9h }
    - { name: Linnea S., city: Gothenburg, at: -1d }
    - { name: Mathis R., city: Lyon, at: -2d }
  specifications:
    - { label: Volume, value: 250 ml }
    - { label: Vessel, value: "Borosilicate 3.3 jar, 2 mm wall, 72 mm diameter" }
    - { label: Lid, value: "Stainless steel or brass, silicone gasket" }
    - { label: Sealed, value: "In the room, at the logged time, with the room closed" }
    - { label: Noise floor, value: "Library 18 dB(A), stairwell 14 dB(A), church 21 dB(A)" }
    - { label: Anechoic edition, value: "−9 dB(A), recorded in a chamber in Aarhus" }
    - { label: Datasheet, value: "24-hour noise log and RT60 per octave band, numbered to the jar" }
    - { label: Shelf life, value: "Indefinite if unopened. The contents do not settle" }
    - { label: Opening, value: "Once" }
  figures:
    - style: isometric
      caption: placeholder
      svg: |-
        <circle cx="200" cy="150" r="20" style="fill:var(--tf-accent)" />
    - style: patent
      caption: placeholder
      svg: |-
        <circle cx="200" cy="150" r="20" style="fill:none;stroke:var(--tf-ink)" />
  rewards:
    - id: jar
      title: A Jar of Silence
      description: One sealed 250 ml jar with its numbered datasheet.
      price: 29
      claimed: 150
      options:
        - id: room
          name: Room
          choices:
            - { id: library, label: "Library, 03:10" }
            - { id: stairwell, label: "Stairwell, 04:40" }
            - { id: church, label: "Church, Monday 14:00" }
        - id: lid
          name: Lid
          choices:
            - { id: steel, label: Stainless steel }
            - { id: brass, label: Brass }
      shipsTo: [domestic, europe, world]
      delivery: +45d
    - id: three-rooms
      title: Three rooms
      description: One jar of each room, on a shelf card, with three datasheets.
      price: 79
      claimed: 55
      options:
        - id: lid
          name: Lid
          choices:
            - { id: steel, label: Stainless steel }
            - { id: brass, label: Brass }
      shipsTo: [domestic, europe, world]
      delivery: +45d
    - id: anechoic
      title: Anechoic edition
      description: One jar sealed in an anechoic chamber, numbered by hand, with its calibration record.
      price: 129
      claimed: 24
      stock: 40
      shipsTo: [domestic, europe, world]
      delivery: +60d
    - id: recording
      title: The datasheet recording
      description: The 24-hour noise log of one room as a four-minute audio file. It is quiet.
      price: 19
      claimed: 20
      digital: true
      delivery: +5d
  addons:
    - { id: spare-lid, title: Spare lid and gasket, price: 8, claimed: 60 }
    - { id: shelf-card, title: Shelf card, description: A printed card for the shelf the jar stands on., price: 6, claimed: 35 }
  stretchGoals:
    - { id: snowfall, amount: 18000, title: "A fourth room: a field after snowfall, 06:00" }
    - { id: handwriting, amount: 26000, title: "Labels in the Inventor's own handwriting" }
  shipping: { domestic: 6, europe: 11, world: 21 }
---

A room is quiet in a particular way. Until now there was no way to keep it.

## The recording

Each room is logged for 24 hours before it is sealed. The microphone is a
calibrated condenser capsule at 1.2 m. The log records the noise floor, the
reverberation time in six octave bands and every event above 30 dB(A). The
library at 03:10 has four. The stairwell at 04:40 has one, a pipe.

## The sealing

The jar is opened in the room, left until it has the room's air and then
closed with the room empty. The lid is torqued to 1.2 N·m. The time of closing
is written on the datasheet and nowhere else. Nothing is added to the jar.

## Opening

A jar can be opened once. The silence it holds is then released into the room
it is opened in, which then holds both. Backers who opened prototypes report that
the effect lasts between four and nine seconds, depending on the room.

## The rooms

The first run is three rooms: a municipal library, the stairwell of a 1960s
block and a church on a Monday. A field after snowfall is the first stretch
goal, at €18,000. The Anechoic edition is limited to forty jars and is the
quietest room we have been able to book.
