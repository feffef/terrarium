# 11. PoC deployment: a self-updating container (git-pull + rebuild + atomic swap)

Date: 2026-07-05
Status: Accepted

## Context

Terrarium needs to be **publicly browsable** — the `journal` Tenant today, future
Tenants later — from the operator's single Hetzner VPS, which already runs a
Docker host with other apps behind one shared **Caddy** front door.

ADR-0001 frames the production deployment as immutable: a change is a feature
branch → review → merge → **tag a release → redeploy the single updated image**,
and "nothing is created at runtime." That is the right long-term shape, but for
this **proof-of-concept** it imposes a CI-build-and-publish pipeline and a manual
(or automated) redeploy on every content edit — heavy machinery for a site whose
whole point right now is to *show the thing working and stay current*.

The operator's stated constraint: a container as the deployment artifact, but
**without rebuilding/redeploying the image on every push to `main`**. Nuxt Content
v3 is build-time and static (ADR-0001), so "stay current" unavoidably means "run
a build when content changes" — the only question is *where and when* that build
runs.

## Decision

For the PoC, deploy a **thin runner+builder container that keeps itself current**,
rather than a CI-built immutable image.

- The image (`deploy/Dockerfile`) carries **no application source** — only Node 22
  (required for `@nuxt/content`'s native `node:sqlite`), git, and pnpm. All state
  lives in a named volume, so the image is rebuilt only when the deploy tooling
  itself changes, **never on a push to `main`**.
- A supervisor (`deploy/entrypoint.sh`) clones `main` into the volume, builds it,
  and **serves a decoupled copy of the build output** (`/app/serve`). It polls
  `origin/main` and, on a new commit, rebuilds *while the old server keeps
  serving* and swaps atomically. The only downtime is the ~1–2s node restart; the
  multi-second build runs with no impact on live traffic.
- **A failed build never swaps** — a bad commit cannot take the site down; it
  keeps serving the last good build and self-heals on the next good commit.
- The container publishes **no host port**; it is reached only via the existing
  Caddy over a shared external Docker network (`reverse_proxy terrarium:3000`),
  consistent with how the other apps on the host are fronted.
- Repo access is a **fine-grained, read-only PAT** (Contents:read on this repo
  only), supplied via an out-of-tree `.env` and handed to git via `GIT_ASKPASS`
  so the token is never persisted in `.git/config`.

This **deliberately relaxes ADR-0001's** "tag a release → redeploy the image /
nothing at runtime" assumption: here the build *does* run at runtime, inside the
serving container. It does **not** relax ADR-0001's content model — collections
are still declared and baked at build time; nothing creates Tenants/collections
at runtime.

## Consequences

- **Always-current with near-zero operator effort:** merges to `main` appear on
  the site within one poll interval, with a ~1–2s swap and no manual redeploy.
- **Robust to bad commits:** the atomic-swap-on-success rule means the public site
  only ever moves between *building* revisions.
- **The container is no longer immutable.** Its running state depends on runtime
  git + build success, not solely on a pinned image digest — the exact thing
  ADR-0001 avoids for production. Accepted as a scoped PoC trade-off, not a
  precedent for how Terrarium ships at scale.
- **Every update pays a full rebuild** (content is baked, not hot-reloaded) and a
  build needs ~1–2 GB RAM. Fine for infrequent updates on a VPS with headroom;
  it would not scale to frequent pushes or many Tenants.
- **This does not touch the human-only safety gate** (generator, routing,
  isolation, `gate.yml` — ADR-0004): it adds only new `deploy/` files. CI still
  gates every merge to `main`; this decision only changes what happens *after* a
  merge, on the host.
- **Migration path:** when the PoC graduates, replace the self-updating runner
  with CI-built, tagged, immutable images plus a redeploy step — the original
  ADR-0001 model — with **no change to the application itself**. Reverting this
  decision is a deployment-topology change only.
