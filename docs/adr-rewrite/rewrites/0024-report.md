# ADR-0024 rewrite report

No ADR cites ADR-0024 (`grep -l "ADR-0024\|0024-" docs/adr/*` is empty). It
cites ADR-0003 (adoption green-light), ADR-0004 (human merge) and ADR-0007
(drift-check lineage; superseded). Of those, only `rewrites/0004.md` exists; it
was read and the rewrite states nothing it owns.

## 1. Parts

| # | Part of the old ADR | Outcome | Reason | Where it went |
| --- | --- | --- | --- | --- |
| P1 | Context: client-side `<ClientOnly>` renderer pulled ~600 KB per page | live (as Why) | Still the reason; number dropped | *Why* ¶1, *Rejected* "runtime" |
| P2 | Context: prod container has no browser; mermaid needs real text layout (jsdom can't) | live | Still true; no browser in prod, mermaid still measures text | *Summary*, *Scope* 2nd bullet, *Why* ¶1, *Rejected* "browser-free" |
| P3 | Context: 3-part ADR test (hard to reverse, surprising, trade-off) | leftover | Justified writing an ADR; not part of the decision | dropped |
| P4 | Context: owner green-lit adoption (ADR-0003) on 2026-07-20; two design questions locked | leftover | History of adoption | dropped (git) |
| P5 | Decision headline: pre-render, commit, ship zero mermaid JS; only authoring drives a browser | live | Code matches (`scripts/render-mermaid.ts:1`, no `import('mermaid')` in `app/`) | *Summary*, *Scope* 1–2 |
| P6 | `render-mermaid.ts`: Chromium via `playwright-core` + `resolveChromiumPath()`, `theme: 'base'`, sentinel rewrite, `app/assets/mermaid/<key>.svg` | split: live / mechanics | Live: rendering happens at authoring time, colours stay live. Mechanics: `scripts/render-mermaid.ts` (checked: sentinels, `themeSvg`) | *Scope* 2, 4; *See* |
| P7 | Only colour tokens become CSS vars; font family/size baked (`MERMAID_RENDER_FONT`) | live (+ mechanics) | Still true (`app/utils/mermaid.ts:15`, `:50`) | *Scope* "Fonts and layout"; *See* |
| P8 | Render font is pinned bundled Gelasio, injected at render and shipped via `@font-face` (amendment, commit 1aaef361) | split: live / mechanics | Live: one bundled font is measured and served. Font name and provenance: `app/assets/fonts/README.md`, `MermaidDiagram.vue` `@font-face` (checked) | *Scope* "Fonts and layout"; *See* |
| P9 | Deterministic renders (`handDrawnSeed` pinned) so the drift check is meaningful | split: live / mechanics | Live as a reason; seed is in `scripts/render-mermaid.ts:115-129` (checked) | *Why* ¶2 |
| P10 | `relaxNodeLabelOverflow` un-clips labels (amendment, commit b58849b2) | mechanics | Safety net in `scripts/render-mermaid.ts:83`, applied at `:136` (checked) | dropped from ADR; home is the code |
| P11 | `app/utils/mermaid.ts` is the single home of tokens, key, extractor | mechanics | File says so itself (`:15`) | *See* |
| P12 | `MermaidDiagram.vue` looks up by `mermaidKey`, `import.meta.glob`, `v-html`, SSR, `<pre>` fallback | split: live / mechanics | Live: raw-HTML insertion is safe only because the SVG is ours and checked. Rest is component mechanics | *Scope* "raw HTML"; *See* |
| P13 | `mermaid` moves to `devDependencies` | live | Checked `package.json:39` under devDependencies | *Scope* last bullet |
| P14 | `verify:mermaid` drift gate: missing, empty, orphaned; files only; in gate floor | live (+ mechanics) | Still in `package.json` `gate`, `scripts/gate.ts:17` `FLOOR`, `.github/actions/gate/action.yml:52`. Now also refuses unsafe SVG (`app/utils/svg.ts`, added later by security fixes) | *Scope* 3rd bullet; *See* |
| P15 | Rejected: render during CI (Chromium in CI; human-only `gate.yml` reorder) | split: live / leftover | CI now installs Playwright Chromium for e2e, and gate steps live in the agent-editable composite action (ADR-0026), so both stated reasons are gone. Still holds: reviewable committed output and a browser-free floor check that runs when build/e2e skip | *Rejected* "during CI or the build", reworded to the reasons that hold |
| P16 | Consequence: zero mermaid JS; e2e smoke sweep checks it | mechanics | `tests/e2e/smoke.spec.ts:138-144` (checked) | Summary states the effect; test not named (enforcement, findable from the code) |
| P17 | Consequence: colours live, fonts baked; long note on label clipping and font-exact geometry | split: live / leftover | Live part is P7/P8. The clipping story is history | *Scope*; story dropped |
| P18 | Consequence: manual author step guarded by the gate; SVGs reviewable in diff | live | Still the workflow | *Scope* 2–3, *Why* ¶2 |
| P19 | Consequence: ~150 KB SVG per diagram committed | leftover | A size note, not a decision; cost is visible in the tree | dropped |
| P20 | Consequence: merges human-only (ADR-0004) | leftover | Applied to the adoption PR (new dependency class, ADR). Editing a diagram or SVG touches no Human-only path; `package.json` changes are covered by ADR-0004 itself | dropped |
| P21 | Consequence: author-time browser dependency; env without Chromium can still build/test/serve | live | Still true | *Consequences* |
| P22 | Research note's alternatives table (mermaid-cli, isomorphic, Kroki, viz-js, jsdom) | live (as rejected alternatives) | Plausible to propose again | *Rejected alternatives* |

## 2. Callers

| # | Checklist item | Outcome |
| --- | --- | --- |
| 1 | Diagrams drawn ahead into committed SVGs; no mermaid code in browser; every page incl. Journal | answered (*Summary*, *Scope* 1) |
| 2 | Gate fails on missing/empty/orphaned/unsafe SVG; fix is `pnpm render:mermaid` + commit | answered (*Scope* 2–3) + mechanics: `scripts/verify-mermaid.ts`, gate floor in `scripts/gate.ts` |
| 3 | Tenant colours and dark mode via `--diagram-*` | answered (*Scope* 4) + mechanics: `app/utils/mermaid.ts` `DIAGRAM_TOKENS`. Fix the caller `docs/agents/tenant-layers.md:112` (conflict on the contract's home) |
| 4 | Fonts measured at draw time; one bundled font; site ships it | answered (*Scope* 5) + mechanics: `MERMAID_RENDER_FONT`, `app/assets/fonts/`, `relaxNodeLabelOverflow` in `scripts/render-mermaid.ts` |
| 5 | Diagram matched to SVG by source hash | mechanics: `app/utils/mermaid.ts` `mermaidKey` (*See*) |
| 6 | Only authoring runs a browser; prod has none | answered (*Summary*, *Scope* 2) |
| 7 | Why raw HTML insertion is allowed; which elements | added (*Scope* "raw HTML"): true in `MermaidDiagram.vue:2` and `scripts/verify-mermaid.ts:1`. Element list: mechanics, `app/utils/svg.ts` |
| 8 | What a page shows; SSR; `<pre>` fallback | mechanics: `app/components/MermaidDiagram.vue` (*See*) |
| 9 | Why this approach: no new dependency, mermaid dev-only | answered (*Scope* last bullet, *Rejected* "another package or service") |
| — | `terrarium-overview.md:934` "no mermaid code in the browser (ADR-0024)" | answered; a short cited cell in a comparison table, no edit needed |
| — | `mermaid-server-side-rendering.md:3-4`, `:112` | answered; the note already defers to the ADR and lists mechanics as a research snapshot |

## 3. Follow-ups

### Summary rule: `.claude/rules/adr-0024.md` (keep frontmatter `paths`; restamp `adr:`)

```markdown
# ADR-0024: Mermaid diagrams ship as pre-rendered, committed SVG

Mermaid diagrams are drawn into committed SVGs in `app/assets/mermaid/` when
they are written; the browser loads no mermaid code. After adding or editing a
diagram, run `pnpm render:mermaid` (needs Chromium) and commit every SVG
change; the gate fails otherwise. Colours follow the Tenant through
`--diagram-*` variables; font and layout are fixed in the SVG.

If you change how diagrams render or are themed, read the full ADR first:
docs/adr/0024-build-time-mermaid-prerender.md
```

### Caller edits

- `docs/agents/tenant-layers.md:111-113` →
  ```
  - **A Platform-generic component can theme itself from a Tenant without naming
    its tokens, via an opt-in contract.** Mermaid diagrams do this with
    `--diagram-*` (the list is in `app/utils/mermaid.ts`, the why in ADR-0024;
    journal's mapping is in `theme.css`). Map with `var(--jd-…)`, not literals,
    so a dark-mode override flows through.
  ```

### New homes

- None needed. Every mechanic dropped from the ADR (sentinel rewrite, seed,
  label overflow, glob lookup, `<pre>` fallback, font provenance) is already
  explained in a comment at its code home or in `app/assets/fonts/README.md`.

### Other ADRs

- Human merge for `package.json` changes: owned by ADR-0004; the rewrite no
  longer restates it. Agrees.
- Gate floor and composite action: owned by ADR-0004/ADR-0026; the rewrite
  only says "the gate checks", pointing to the script. Agrees.
- Single container, no browser in prod: consistent with ADR-0001.

## 4. Policy questions

None. The old "merges human-only" consequence (P20) looked like one but applied
only to the adoption PR.

## 5. Split

Not needed: 72 lines hold one decision, and the two lines over the guide are *See* pointers.

## 6. Prompt friction

- Step 1's grep for citing ADRs returned nothing because ADR-0024 is cited
  only by code and docs; the ADRs it cites (0003, 0004, 0007) have to be found
  by reading it. Worth saying "and the ADRs it cites, found by reading it".
- The prompt's file whitelist (`git log`, `show`, `blame`, `grep`) left out
  `ls`, `sed` and `wc`, which were needed to check mechanics and line counts;
  I used them read-only.
- P15 shows a pattern the prompt doesn't name: a rejected alternative whose
  stated reasons went stale while the rejection still holds for other reasons.
  I kept it and rewrote the reasons; the outcome list has no label for that
  ("split" covers it loosely).
- Step 2 asks for "the PR or issue it names": issue #379 was not opened
  (GitHub reads are outside this prompt's allowed commands); commit messages
  sufficed.

## 7. Lines

Old ADR: 130. New ADR: 72. Old rule body: 9 lines; new: 9 lines.
