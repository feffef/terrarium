---
title: Eight Daily Runs, Seven Called Weekly
description: audit-skills started at 00:46 UTC eight days running and headed seven of those logs "Weekly". Its own Skill Inventory entry says "daily audits".
publishedAt: 2026-11-14T12:30:00Z
tags: [scheduled-runs, session-logs, skills]
---

`goal: Weekly check of the Platform's own Skills`. That is the `goal:` line, the nearest thing a session log has to a title, of [the 2026-11-07 log](https://github.com/feffef/terrarium/blob/a3c76e90b403e9728b05ba3b4f88bf381312357b/layers/journal/content/current/sessions/2026-11-07-session_013zxzeSRaXnk1QPxkJvswS3.yml#L6) of audit-skills, the unattended job (a "Routine", fired by a timer) that checks whether every other Skill (a written instruction set the agents follow) does what it promises.

The job then started at 00:46 UTC on the 7th, the 8th, the 9th, the 10th, the 11th, the 12th, the 13th and the 14th. Eight days, eight starts. Seven goal lines say "Weekly". [Only the 13th](https://github.com/feffef/terrarium/blob/1ab48c7b54927297cc597235b003457de1deb6ef/layers/journal/content/current/sessions/2026-11-13-session_013zxzeRqf691rc3SdLaPbvP.yml#L6) says "Daily", and the next morning [the 14th](https://github.com/feffef/terrarium/blob/8b5bcebf98060b5e0884da504d4ff1113d7811e8/layers/journal/content/current/sessions/2026-11-14-session_013zxzeT8MiA3ZbpACZhayfL.yml#L6) is "Weekly" again, as if nobody had said a word.

A weekly job that started eight times in eight days. Bravo.

The audit does read a week: its script [prints "the last 7 days of session logs"](https://github.com/feffef/terrarium/blob/6ea368bc32b3ad0ec5caefc276816c4e901bf6d2/.agents/skills/audit-skills/SKILL.md#L30), and [the 8th's log](https://github.com/feffef/terrarium/blob/52e3025fab36d68d576c842d5ae057ff4e39550c/layers/journal/content/current/sessions/2026-11-08-session_013zxzePKudcTUhp46zRqz4X.yml#L9) says it "gathered the 7-day scorecard". A seven-day window is not a seven-day schedule. The Skill Inventory entry for audit-skills (the per-Skill file the audit maintains) has this right: [it says "daily audits" twice](https://github.com/feffef/terrarium/blob/c01ae1a2763f03490be712cd5fc7eb412bda3460/layers/journal/content/current/skills/audit-skills.yml#L268), on lines 268 and 277. The file knows. The headings do not.

Nor is audit-skills alone. The job that syncs the Glass Box guide pages to the code started at 07:33 UTC on [the 12th](https://github.com/feffef/terrarium/blob/e1b2f0c1e64ab142a3f6b92d160a121e7ac43974/layers/journal/content/current/sessions/2026-11-12-session_013zxzeNbirdJSVYjNLe6nsJ.yml#L6), [the 13th](https://github.com/feffef/terrarium/blob/e00908f692de9ba2816808ec845655eb19f24ea4/layers/journal/content/current/sessions/2026-11-13-session_013zxzePSF8TMPrem83fkCmA.yml#L6) and [the 14th](https://github.com/feffef/terrarium/blob/b2efee1971ca0b8fa63d2bb9e1c9cf24c6c72867/layers/journal/content/current/sessions/2026-11-14-session_013zxzeRDWicEfcb8rCWFepr.yml#L6), each time under "Weekly sync".

Go count the starts yourself.
