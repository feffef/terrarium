# Deploying Terrarium (PoC)

A self-updating container that keeps the public site in sync with `main` without
rebuilding the image on every push. See **ADR-0011** for the *why* and the
trade-off against ADR-0001.

## How it works

The image (`deploy/Dockerfile`) is a thin **runner + builder** — Node 22 + git +
pnpm, no app source baked in. On start, `deploy/entrypoint.sh` clones `main` into
a persistent volume, builds it, and serves a **decoupled copy** of the build
output. It then polls `origin/main`; on a new commit it rebuilds *while the old
server keeps serving* and swaps atomically — the only downtime is a ~1–2s node
restart. A **failed build never swaps**, so a bad commit can't take the site
down; it self-heals on the next good commit.

```
/app/repo    git checkout of main (pull + build happen here)
/app/serve   copy of the last GOOD .output — node serves ONLY from here
/app/store   shared pnpm store
```

Because the image carries no app code, **pushing to `main` never rebuilds or
redeploys the image** — the container updates itself.

## On-VPS layout

```
/opt/terrarium/
  .env                        # secrets — NOT in git
  repo/                       # git clone of terrarium (source of the compose file)
    deploy/
      docker-compose.yml      # run `docker compose` from here
      Dockerfile
      entrypoint.sh
```

> The clone at `/opt/terrarium/repo` only provides the compose/Dockerfile/
> entrypoint used to **build the image**. The running container does its own
> clone into the `terrarium_app` volume — that is the live app. The two are
> independent.

## One-time bootstrap

1. **Fine-grained PAT.** GitHub → Settings → Developer settings → Fine-grained
   tokens. Repository access: **only `feffef/terrarium`**. Permissions:
   **Contents → Read-only**. Copy the token.

2. **Clone + configure.**
   ```sh
   sudo mkdir -p /opt/terrarium && cd /opt/terrarium
   git clone https://github.com/feffef/terrarium.git repo
   cp repo/deploy/.env.example .env
   # edit .env: paste GITHUB_PAT (GIT_REPO_URL is already correct)
   ```

3. **Shared proxy network.** Terrarium is reached by the existing Caddy over a
   shared network called `web`. Create it once:
   ```sh
   docker network create web
   ```
   Then attach the **existing Caddy service** to it (one-time edit to the *other*
   project's `docker-compose.yml`, e.g. `feffef-fotos`):
   ```yaml
   services:
     caddy:
       networks: [default, web]   # add web
   networks:
     web:
       external: true             # add this block
   ```
   Recreate that stack (`docker compose up -d`) so Caddy joins `web`.

4. **Caddyfile.** Add a site block to the shared Caddyfile and reload Caddy:
   ```caddy
   terrarium.feffef.de {
       encode zstd gzip
       reverse_proxy terrarium:3000
   }
   ```
   The site root `/` renders the Platform; the Journal is at `/t/journal/current`.

5. **DNS.** Point `terrarium.feffef.de` (A/AAAA) at the VPS. Caddy issues the TLS
   cert automatically on first request.

6. **Launch.**
   ```sh
   cd /opt/terrarium/repo/deploy
   docker compose up -d --build
   docker compose logs -f      # watch: clone -> install -> build -> serving
   ```
   The **first boot** clones and does a full build (a few minutes) before the
   server answers — the healthcheck stays `starting` until then.

## Operations

- **Logs / status:** `docker compose logs -f` · `docker compose ps`
- **Force an immediate update** (instead of waiting for the poll):
  `docker compose restart terrarium` (re-runs the boot path against latest `main`).
- **Rebuild from scratch** (rare — clears the volume):
  `docker compose down && docker volume rm terrarium_terrarium_app && docker compose up -d --build`
- **Update the runner image itself** (only when `deploy/*` changes): pull the
  repo at `/opt/terrarium/repo`, then `docker compose up -d --build`.
- **Rotate the PAT:** edit `/opt/terrarium/.env`, then
  `docker compose up -d` (recreates with the new token).
- **Tune cadence:** set `POLL_INTERVAL` in `.env` (seconds; default 120).

## Notes & caveats (PoC)

- Every update pays a **full rebuild** — content is baked into the app's SQLite
  at build time, not hot-reloaded. Fine for infrequent updates.
- A Nuxt build wants **~1–2 GB RAM**. Ensure the VPS has headroom or a swap file;
  an OOM-killed build simply doesn't swap (old build stays live) and retries.
- No Litestream: Terrarium's SQLite is **derived** from git content and rebuilt
  every deploy — disposable, nothing to replicate.
