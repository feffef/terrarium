# Tinkerfund fonts

Committed woff2 files, never `@nuxt/fonts` or a CDN (issue #1361). Both faces
are SIL Open Font License 1.1; each license travels with its font.

- `archivo-latin-standard-normal.woff2` — Archivo, latin subset, variable
  weight (100–900) and width (62–125%), from `@fontsource-variable/archivo@5.3.0`.
  License: `Archivo-OFL.txt`.
- `ibm-plex-mono-latin-{400,500,600}-normal.woff2` — IBM Plex Mono, latin
  subset, from `@fontsource/ibm-plex-mono@5.3.0`. License: `IBMPlexMono-OFL.txt`.

Obtained with `npm pack`; neither package is a project dependency. Add a weight
or subset only when the UI uses it.
