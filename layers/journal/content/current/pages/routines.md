---
title: Routine costs
description: What each scheduled Routine run cost, run by run and week by week, in dollars, tokens or time.
---

Each scheduled Routine runs a Skill on a timer with nobody watching. These
charts show every recorded run, oldest to newest, for the metric picked above.
All charts share one scale so Routines compare at a glance; a bar cut off at the
top is a run that went past it. Only the newest runs of each Routine are kept.

## Run by run

::routine-chart{routine="audit-skills"}
::

::routine-chart{routine="visitor-loop"}
::

::routine-chart{routine="audit-docs"}
::

::routine-chart{routine="frictions-to-fixes"}
::

::routine-chart{routine="prune-trial"}
::

::routine-chart{routine="blog-post"}
::

::routine-chart{routine="digest"}
::

::routine-chart{routine="glassbox-update"}
::

## Week by week

The same metric, summed over consecutive seven-day windows, the newest ending at
the latest run. Only complete windows are shown.

::routine-weekly-table
::
