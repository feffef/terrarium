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

> **Run everything as your non-root Docker operator user** (`<deploy-user>` below — substitute your host's account): a member of the `docker` group, *not* `root`, and *not* merely a user with a GitHub SSH key. Outside the `docker` group, the first `docker compose` fails with `permission denied … /var/run/docker.sock`. `chown -R <deploy-user>:<deploy-user> /opt/terrarium`, then `sudo -iu <deploy-user>` and do the rest there.

1. **Fine-grained PAT.** <https://github.com/settings/personal-access-tokens/new>
   (Settings → Developer settings → **Fine-grained** tokens — *not* a classic
   token). Resource owner: your account. Repository access: **only
   `feffef/terrarium`**. Permissions: **Contents → Read-only** (Metadata
   auto-selects — that's required). Copy the `github_pat_…` value; it's shown once.

2. **Clone + configure.** The repo is **public**, so this host clone needs no
   auth:
   ```sh
   sudo mkdir -p /opt/terrarium && sudo chown <deploy-user>:<deploy-user> /opt/terrarium
   sudo -iu <deploy-user>; cd /opt/terrarium
   git clone https://github.com/feffef/terrarium.git repo
   cp repo/deploy/.env.example .env
   chmod 600 .env                       # holds the PAT
   # edit .env: paste GITHUB_PAT (GIT_REPO_URL is already correct)
   ```
   (The PAT is for a **different** clone: the container's own, made by `entrypoint.sh` in the `terrarium_app` volume, independent of the host clone above (see **On-VPS layout**). It is needed regardless of repo visibility — `entrypoint.sh` requires `GITHUB_PAT` unconditionally and passes it via `GIT_ASKPASS` (see `deploy/entrypoint.sh`), keeping it out of `.git/config`.)

3. **Shared proxy network.** Terrarium is reached by the existing Caddy over a
   shared network called `web`. Create it once:
   ```sh
   docker network create web
   ```
   Then attach the **existing Caddy service** to it (one-time edit to whichever
   *other* project on the host owns the shared Caddy `docker-compose.yml`):
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
   server answers — the healthcheck stays `starting` until then, then flips to
   `healthy` once `/` returns 200 (`docker compose ps` to check).

   > If `up` fails with **`network web declared as external, but could not be
   > found`**, you skipped `docker network create web` in step 3 — create it and
   > re-run. Confirm both containers share it:
   > `docker network inspect web --format '{{range .Containers}}{{.Name}} {{end}}'`
   > → should list the Caddy container **and** `deploy-terrarium-1` (Compose's
   > default project name is the compose file's directory basename —
   > `deploy` here, since step 6 `cd`s into `deploy/` first).

## Operations

- **Logs / status:** `docker compose logs -f` · `docker compose ps`
- **Force an immediate update** (instead of waiting for the poll):
  `docker compose restart terrarium` (re-runs the boot path against latest `main`).
- **Rebuild from scratch** (rare — clears the volume):
  `docker compose down && docker volume rm deploy_terrarium_app && docker compose up -d --build`
- **Update the runner image itself** (only when `deploy/*` changes): pull the
  repo at `/opt/terrarium/repo`, then `docker compose up -d --build`.
- **Rotate the PAT:** edit `/opt/terrarium/.env`, then
  `docker compose up -d` (recreates with the new token).
- **Tune cadence:** set `POLL_INTERVAL` in `.env` (seconds; default 120).

### Trying a branch before it merges

To smoke-test a feature branch in the real container before merging it, point the
supervisor at that branch — it drives both the initial clone and the poll loop:

```sh
# /opt/terrarium/.env
BRANCH=deploy/self-updating-container   # any branch
```
`docker compose up -d`, and the container serves (and keeps pulling) that branch.
After the PR merges, set `BRANCH=main` (or delete the line — `main` is the
default) and `docker compose up -d`; the volume checkout switches refs cleanly
(`fetch` + `reset --hard`), no volume wipe needed.

> For a quick look **without** wiring Caddy/DNS, temporarily add
> `ports: ["3080:3000"]` to the `terrarium` service and `curl -I
> http://localhost:3080/`. Remove it once Caddy fronts the site over `web` — no
> host port is needed in normal operation.

## Notes & caveats (PoC)

- Every update pays a **full rebuild** — content is baked into the app's SQLite
  at build time, not hot-reloaded. Fine for infrequent updates.
- A Nuxt build wants **~1–2 GB RAM**. Ensure the VPS has headroom or a swap file;
  an OOM-killed build simply doesn't swap (old build stays live) and retries.
- No Litestream: Terrarium's SQLite is **derived** from git content and rebuilt
  every deploy — disposable, nothing to replicate.
