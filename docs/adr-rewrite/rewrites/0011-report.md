# ADR-0011 rewrite report

## 1. Parts

The ADR has one content commit (`0edd8078`, the PR that added `deploy/`); no
amendments. Later `deploy/` commits (`ad3f6387`, `31c2233f`, issue #1701)
changed install retry only, not the ADR.

| Part of the old ADR | Outcome | Reason | Where it went |
|---|---|---|---|
| Title and framing as a "PoC" | policy question | `README.md:32` calls it the public deployment; unclear if a move back is still planned | Title drops "PoC"; see policy question 1 |
| Context: site must be public from one VPS that already runs other apps behind one Caddy | live (reason) | Still the setting the owner chose for | Why, last paragraph |
| Context: ADR-0001's "tag a release, redeploy the image" is too heavy for every content edit | live (reason) | Still why no CI image pipeline | Why; Rejected alternatives |
| Context: owner's constraint "a container, but no image rebuild per push" | live | Core decision | Summary |
| Context: content is baked, so staying current means building; the question is where | live (reason) | Still true (ADR-0001) | Why, first paragraph |
| Decision: thin runner+builder container, not a CI-built image | live | Core decision | Summary; Scope "The image holds tools" |
| Decision: image has no app source; Node 22, git, pnpm; state in a named volume | split: live / mechanics | "Tools, not the app; rebuilt only when `deploy/` changes" is live; versions and volume are mechanics in `deploy/Dockerfile` and `deploy/docker-compose.yml` (checked) | Scope; See |
| Decision: supervisor clones, builds, serves a separate copy, polls, swaps; 1-2 s restart | split: live / mechanics | "Build beside the live copy, switch on success" is live; poll interval, paths, restart time are mechanics in `deploy/entrypoint.sh` and `deploy/.env.example` (checked: `POLL_INTERVAL`, `/app/serve`, `rsync` publish) | Summary; See |
| Decision: a failed build never swaps; self-heals on next good commit | live | Still enforced (`entrypoint.sh:150,158`), and now covers a failed install too | Scope "A failed install or build changes nothing" |
| Decision: no host port; reached via shared Caddy on external network | mechanics | Held in `deploy/docker-compose.yml:27-35,52-56` (checked) | See |
| Decision: fine-grained read-only PAT via out-of-tree `.env` and `GIT_ASKPASS`, never in `.git/config` | mechanics | Held in `deploy/.env.example` and `entrypoint.sh:33-47` (checked) | See |
| "Deliberately relaxes ADR-0001": build runs at runtime; content model unchanged, nothing creates Tenants at runtime | live | Callers rely on it (ADR-0001 banner, guest-intake Skill) | Scope "What moves to runtime" |
| Consequence: always current, near-zero effort, one poll interval | live (reason) | It is the benefit | Why |
| Consequence: robust to bad commits | live (reason) | Benefit of switch-on-success | Why, second paragraph |
| Consequence: container no longer immutable; state depends on runtime git and build | live | Not obvious to a reader who expects an image to define the release | Consequences |
| Consequence: "scoped PoC trade-off, not a precedent for how Terrarium ships at scale" | policy question | Same as the PoC framing | When to revisit (second bullet); policy question 1 |
| Consequence: every update is a full rebuild; ~1-2 GB RAM; won't scale to frequent pushes or many Tenants | split: live / mechanics | Scaling limit is a revisit condition; the RAM figure lives in `deploy/README.md:145` | When to revisit |
| Consequence: does not touch the human-only gate; adds only `deploy/` files; CI gates every merge | leftover | Described how the PR landed. ADR-0004 owns the gate and the Human-only list (`deploy/**` is not on it) | Dropped |
| Consequence: migration path to CI-built immutable images, no app change | live | A plausible proposal today; the "no app change" fact makes it cheap | Rejected alternatives |
| Not in the old ADR: merge to `main` is where code reaches the server | added | Callers (ADR-0020:36,63, ADR-0023, guest-contributions) rely on it; true in `entrypoint.sh:139-159` | Scope "A merge is where code reaches the server" |
| Not in the old ADR: a change to `deploy/` reaches the server only after the operator rebuilds the image | added | In the current summary rule and `deploy/README.md:116`; true (Dockerfile copies `entrypoint.sh` at image build) | Scope "The image holds tools" |

## 2. Callers

Checklist from `docs/adr-rewrite/expectations/0011.md`.

| # | Item | Outcome |
|---|---|---|
| 1 | One container downloads, builds, serves `main`; a push never needs a new image | answered (Summary, Scope) |
| 2 | Merge to `main` runs code on the server; merge is the boundary | added (Scope "A merge is where code reaches the server") |
| 3 | How far this bends ADR-0001's "nothing created at runtime" | answered (Scope "What moves to runtime") |
| 4 | Update cycle: poll, build beside, swap, failed build untouched, supervisor survives failures | mechanics: `deploy/entrypoint.sh` (the decision part, switch on success, is answered in Scope) |
| 5 | Temporary trial, and the way back to a CI-built image | answered in part (Rejected alternatives, When to revisit); whether it is still a trial is policy question 1 |
| 6 | Which files make up the deploy | mechanics: `deploy/README.md` and the See list |
| 7 | Secrets: token only in server `.env`, never in `.git/config` | mechanics: `deploy/.env.example`, `deploy/entrypoint.sh` |
| 8 | Does the install run package scripts? | mechanics: `deploy/entrypoint.sh:60` (it does: `--frozen-lockfile`, no `--ignore-scripts`); see policy question 2 |
| 9 | Network: only via shared Caddy, no host port | mechanics: `deploy/docker-compose.yml` |
| 10 | Base image Node 22, pnpm from corepack | mechanics: `deploy/Dockerfile` |

Repoint and fix items from the expectations:

| Reference | Outcome |
|---|---|
| `docs/adr/0001-single-container-baked-multitenancy.md:6-13` (dated banner restating ADR-0011) | fix the caller (edit below) |
| `docs/adr/0001-single-container-baked-multitenancy.md:12` ("migration path") | fix the caller; the way back survives as a rejected alternative, so the pointer stays valid either way |
| `deploy/README.md:1,4` ("PoC", "trade-off against ADR-0001") | fix the caller |
| `docs/agents/guest-contributions.md:27-28` (cites ADR-0011 for "human-only") | fix the caller |
| `docs/research/public-readiness-review.md:52` | leave: dated research note, still accurate |
| `.agents/skills/guest-intake/SKILL.md:88-89` | answered; optional simplification below |
| `SECURITY.md:26-27` ("PoC deploy") | fix the caller if policy question 1 goes as recommended |
| `README.md:32-34`, `docs/diagrams/interactive-map/terrarium-overview.md:872` | answered; no edit |
| `deploy/Dockerfile:3`, `deploy/docker-compose.yml:1`, `deploy/.env.example:1`, `deploy/entrypoint.sh:3` | answered; drop "PoC" only if policy question 1 goes as recommended |
| `docs/adr/0020-requester-trust-tiers.md:36,63` | answered; consistent, leave until ADR-0020's rewrite |

## 3. Follow-ups (drafts, none applied)

### Summary rule: `.claude/rules/adr-0011.md`

Re-stamp the `adr:` hash with `scripts/validate-adr-rules.ts`.

```markdown
---
adr: <new hash>
paths:
  - "deploy/**"
---
# ADR-0011: The live site's container builds and serves `main` itself

The live site runs one container that clones `main`, builds it and serves it.
It switches to a new build only when that build succeeds, so every merge to
`main` runs its code on the server. A merged change to `deploy/` reaches the
server only when the operator rebuilds the image by hand. Content is still
baked at build time (ADR-0001).

If this touches your task, read the full ADR first:
docs/adr/0011-poc-self-updating-deploy-container.md
```

### Caller edits

- `docs/adr/0001-single-container-baked-multitenancy.md:6-13` → replace the
  banner with:
  `> The build runs inside the live container rather than in CI; see ADR-0011.`
  (ADR-0001's own rewrite should drop the banner and fix line 25-26, "tag
  release → redeploy the single updated image", which no longer describes how
  a change ships.)
- `deploy/README.md:1` → `# Deploying Terrarium`
- `deploy/README.md:3-5` → `A container that keeps the public site in sync
  with \`main\` without rebuilding the image on every push. ADR-0011 says why.`
- `deploy/README.md:141` → `## Notes & caveats`
- `docs/agents/guest-contributions.md:27-28` → `Public input is an untrusted,
  prompt-injection-capable surface. A merge is where its code reaches the
  server (ADR-0011), so a human merges every Public PR (ADR-0020).`
- `SECURITY.md:26-27` → `- The **deploy** path: the container that builds
  and serves \`main\` (ADR-0011). Anything that lets untrusted code reach a
  build or run step.`
- `.agents/skills/guest-intake/SKILL.md:88-89` (optional) → `build-time-baked
  with nothing created at runtime (ADR-0001).` The runner's own build is not
  a feature a visitor's idea can use.
- `deploy/Dockerfile:3`, `deploy/docker-compose.yml:1`, `deploy/.env.example:1`,
  `deploy/entrypoint.sh:3` → drop "PoC" from the comment, keep `(ADR-0011)`.

### New homes

None needed. Every mechanic that left the ADR (versions, paths, poll
interval, restart time, RAM, token scope, network) already lives in
`deploy/` and was checked there.

### Other ADRs

- **ADR-0001** owns "content baked at build time; nothing creates Tenants or
  collections at runtime". The rewrite states it the same way and points
  there. ADR-0001's own text still describes "tag release → redeploy the
  image" as how a change ships; stale, fix in its rewrite.
- **ADR-0004** owns who merges and the Human-only list. `deploy/**` is not on
  it, which matches the rewrite (a `deploy/` change does nothing until the
  operator rebuilds). Agrees.
- **ADR-0020** owns "a human merges every Public PR". Its lines 36 and 63
  state that a merge to `main` runs on the server; agrees.
- **ADR-0023** (rewrite) owns "the owner merges every guest PR" and cites
  ADR-0011 for "a merge to `main` runs on the server". Agrees.

## 4. Policy questions

1. **Is this still a trial with a planned move back to a CI-built image?**
   The old ADR calls it a PoC and a "scoped trade-off, not a precedent";
   `README.md` calls it the public deployment, and it has run since July.
   Recommendation: state it as the current deployment (as the rewrite does),
   keep the CI-built image as the rejected alternative and way back, and drop
   "PoC" from callers. Keep the file name for now: renaming would repoint
   every caller (first pass is 1:1).
2. **Should the deploy install skip package install scripts?**
   `docs/research/public-readiness-review.md:56` suggested
   `pnpm install --frozen-lockfile --ignore-scripts`; nothing decided it, and
   `entrypoint.sh` runs scripts. Recommendation: no change, and leave it out of
   the ADR. `pnpm build` runs repo code anyway, so the merge stays the point
   where code reaches the server; new dependencies already need a human merge
   because `package.json` is Human-only. If the owner agrees, add it as a
   rejected alternative.

## 5. Split

Not needed; the rewrite is 60 lines.

## 6. Prompt friction

- Step 2's outcomes have no slot for a decision only callers state; step 3's
  "added" covers it, so two "added" rows sit in the Parts table.
- The old ADR had no amendments, so "trace each amendment via `git log
  --follow -p`" found only the creating commit; the deploy history lives under
  `deploy/`, not the ADR.
- The template's title rule ("the same heading its summary rule uses") and the
  file name (`0011-poc-...`) disagree once "PoC" leaves the title. The prompt
  does not say whether file renames are in scope.

## 7. Lines

Old: 74. New: 60.
