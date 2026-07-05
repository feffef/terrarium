#!/usr/bin/env bash
#
# Self-updating supervisor for the Terrarium PoC deployment (ADR-0011).
#
# The image is a thin runner+builder; all state lives in the /app volume. This
# script clones `main`, builds it, and serves a DECOUPLED COPY of the build
# output so the (multi-second) build never disturbs live traffic. It then polls
# origin/main and, on new commits, rebuilds in place and atomically swaps —
# the only downtime is the ~1-2s node restart. A failed build (bad commit)
# never touches the live server.
#
# Deliberately NOT `set -e`: this is a long-running supervisor, so a single
# failing command (e.g. a bad build) must never terminate the whole process and
# take the site down. Critical steps are checked explicitly instead.
set -uo pipefail

# ---- config (from env / compose env_file) ----------------------------------
: "${GIT_REPO_URL:?GIT_REPO_URL is required (e.g. https://github.com/feffef/terrarium.git)}"
: "${GITHUB_PAT:?GITHUB_PAT is required (fine-grained PAT, Contents:read on the repo)}"
BRANCH="${BRANCH:-main}"
POLL_INTERVAL="${POLL_INTERVAL:-120}"
PORT="${PORT:-3000}"

APP_DIR="/app"
REPO_DIR="$APP_DIR/repo"
SERVE_DIR="$APP_DIR/serve"
STORE_DIR="$APP_DIR/store"   # shared pnpm store: fast, hardlinked, disk-cheap

SERVER_PID=""

log() { printf '%s  %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }

# ---- git auth without persisting the PAT -----------------------------------
# The token is handed to git via GIT_ASKPASS (reads it from the env at call
# time) and the username is carried in the URL, so the PAT is never written into
# .git/config or a command line. The persisted remote stays credential-free.
ASKPASS="$APP_DIR/.git-askpass"
cat > "$ASKPASS" <<'EOF'
#!/bin/sh
printf '%s' "$GITHUB_PAT"
EOF
chmod 700 "$ASKPASS"
export GIT_ASKPASS="$ASKPASS"
export GIT_TERMINAL_PROMPT=0

# https://github.com/… -> https://x-access-token@github.com/… (username only)
AUTH_URL="${GIT_REPO_URL/https:\/\//https://x-access-token@}"

# ---- build / serve helpers -------------------------------------------------
lockhash() { sha1sum "$REPO_DIR/pnpm-lock.yaml" 2>/dev/null | cut -d' ' -f1; }

install_deps() {
  log "pnpm install (frozen lockfile)…"
  ( cd "$REPO_DIR" && pnpm install --frozen-lockfile --store-dir "$STORE_DIR" )
}

# Build into $REPO_DIR/.output. Returns non-zero on failure WITHOUT swapping,
# so the live server keeps running the previous good build.
build() {
  log "pnpm build…"
  ( cd "$REPO_DIR" && pnpm build )
}

# Copy the fresh, self-contained .output into the live serve dir. Nitro's
# .output bundles everything (incl. the baked Nuxt Content SQLite + node:sqlite
# runtime), so $SERVE_DIR runs standalone without the project node_modules.
publish() {
  log "publishing build -> $SERVE_DIR"
  rsync -a --delete "$REPO_DIR/.output/" "$SERVE_DIR/"
}

start_server() {
  log "starting server on :$PORT"
  HOST=0.0.0.0 PORT="$PORT" node "$SERVE_DIR/server/index.mjs" &
  SERVER_PID=$!
}

stop_server() {
  [ -n "$SERVER_PID" ] || return 0
  if kill -0 "$SERVER_PID" 2>/dev/null; then
    log "stopping server (pid $SERVER_PID)"
    kill "$SERVER_PID" 2>/dev/null
    wait "$SERVER_PID" 2>/dev/null
  fi
  SERVER_PID=""
}

restart_server() { stop_server; start_server; }

# Clean shutdown so `docker stop` doesn't orphan the node child.
trap 'log "SIGTERM — shutting down"; stop_server; exit 0' TERM INT

# ---- first boot ------------------------------------------------------------
mkdir -p "$SERVE_DIR" "$STORE_DIR"

if [ ! -d "$REPO_DIR/.git" ]; then
  log "cloning $GIT_REPO_URL ($BRANCH)…"
  rm -rf "$REPO_DIR"
  until git clone --branch "$BRANCH" "$AUTH_URL" "$REPO_DIR"; do
    log "clone failed — retrying in 15s"; sleep 15
  done
  # Persist a token-free remote that still carries the `x-access-token` username,
  # so git only ever asks GIT_ASKPASS for the password. The PAT never lands in
  # .git/config.
  git -C "$REPO_DIR" remote set-url origin "$AUTH_URL"
else
  log "existing checkout found — fetching latest"
  git -C "$REPO_DIR" fetch origin "$BRANCH" && \
    git -C "$REPO_DIR" reset --hard "origin/$BRANCH"
fi

install_deps || { log "FATAL: initial install failed"; exit 1; }
if build; then
  publish
  start_server
else
  log "FATAL: initial build failed — nothing to serve yet; will retry on next commit"
fi

# ---- poll loop -------------------------------------------------------------
log "entering poll loop (every ${POLL_INTERVAL}s, branch $BRANCH)"
while true; do
  sleep "$POLL_INTERVAL"

  # Self-heal: if the server died (crash, OOM), bring it back from the last
  # good published build without waiting for a new commit.
  if [ -n "$SERVER_PID" ] && ! kill -0 "$SERVER_PID" 2>/dev/null; then
    log "server process gone — restarting from last good build"
    start_server
  fi

  if ! git -C "$REPO_DIR" fetch origin "$BRANCH" 2>/dev/null; then
    log "fetch failed — will retry next tick"; continue
  fi
  local_rev="$(git -C "$REPO_DIR" rev-parse HEAD)"
  remote_rev="$(git -C "$REPO_DIR" rev-parse "origin/$BRANCH")"
  [ "$local_rev" = "$remote_rev" ] && continue

  log "new commit $remote_rev — updating"
  before="$(lockhash)"
  git -C "$REPO_DIR" reset --hard "origin/$BRANCH"

  if [ "$(lockhash)" != "$before" ]; then
    install_deps || { log "install failed — keeping previous build live"; continue; }
  fi

  if build; then
    publish
    restart_server
    log "update applied — now serving $remote_rev"
  else
    log "build FAILED for $remote_rev — keeping previous build live (will retry on next commit)"
  fi
done
