# Add a `verify:mermaid` step to the CI safety gate

## Origin

`#630` — discovered during a scheduled `/audit-docs` sweep: CLAUDE.md claimed
"CI... runs the full `pnpm gate` on every PR," but that wasn't true.

## Target

`.github/workflows/gate.yml`

ADR-0024 added `verify:mermaid` to `package.json`'s `gate` script and to
`scripts/gate.ts`'s `FLOOR` (the always-run local floor), alongside
`verify:skills-lock`, with the stated intent that it "is wired into the
always-run gate floor... alongside `verify:skills-lock`" (ADR-0024,
Decision section). `scripts/verify-mermaid.ts` reads committed files only —
it never launches a browser — so it's safe to run in CI exactly like
`verify:skills-lock` is. The workflow file itself was never updated to add
the matching step, so CI currently skips it.

Add a step immediately after the existing `'L0 · skills-lock integrity'`
step (mirroring its shape):

```yaml
      - name: 'L0 · mermaid drift'
        run: pnpm verify:mermaid
```

## Rationale

`package.json`'s `gate` script (the sequence CLAUDE.md documents CI as
running in full) includes `verify:mermaid`; `.github/workflows/gate.yml`
does not. That means a PR that lands a Mermaid diagram whose committed SVG
doesn't match its source content-hash (missing, empty, or orphaned) would
currently pass CI's safety gate even though `pnpm gate` — and a
contributor's own local `pnpm gate:scoped`, whose floor now includes this
step — would catch it. This is the same companion-change gap this
directory's README documents for `validate:content`'s L1 step: an
agent-landed `package.json`/`scripts/gate.ts` change with no matching
human-applied `gate.yml` edit, so CI ran (and here, still runs) a stale
subset of `pnpm gate`.

## Companion change

None — this proposal stands alone. It doesn't need to land in the same
sitting as any other pending agent PR; `#630`'s own changes are docs-only
and already merged independently of this workflow edit.
