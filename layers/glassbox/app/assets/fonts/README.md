# Glass Box fonts

Committed woff2 files, never a font service (issue #1989). Both faces are SIL
Open Font License 1.1; each license travels with its font.

- `instrument-sans-latin-wght-normal.woff2` — Instrument Sans, latin subset,
  variable weight (400–700), from `@fontsource-variable/instrument-sans@5.3.0`.
  License: `InstrumentSans-OFL.txt`.
- `jetbrains-mono-latin-{400,500}-normal.woff2` — JetBrains Mono, latin subset,
  from `@fontsource/jetbrains-mono@5.3.0`. License: `JetBrainsMono-OFL.txt`.

Obtained with `npm pack`; neither package is a project dependency. Add a weight
or subset only when the UI uses it.
