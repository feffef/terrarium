---
paths:
  - "layers/*/content/**/*.md"
---
# Mermaid: group lanes with `classDef`, not `subgraph`

In a ` ```mermaid ` diagram, a subgraph boundary clips any edge that crosses
into another subgraph, silently hiding cross-lane arrows. Give a lane's nodes a
shared `classDef` `stroke` (and/or `fill`) instead.
