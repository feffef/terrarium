# syntax=docker/dockerfile:1.7
#
# Terrarium PoC deployment image (ADR-0011): a thin RUNNER + BUILDER, not a baked
# app image. No application source is copied in — the supervisor clones `main`
# and builds it at runtime into the /app volume, so pushing to `main` never
# requires rebuilding or redeploying this image. The image only changes when the
# base tooling here does.
#
# node:22 (>= 22.5) is required for @nuxt/content's native `node:sqlite`
# connector (see nuxt.config.ts). pnpm comes from corepack, pinned by the repo's
# `packageManager` field.

ARG NODE_VERSION=22.16-bookworm-slim
FROM node:${NODE_VERSION}

# git: pull the repo. rsync: publish .output -> serve dir. ca-certificates:
# HTTPS clone. (curl/wget intentionally omitted — the healthcheck uses node.)
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       git \
       rsync \
       ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /app

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Served by the Nitro node server; reached only via the shared Caddy network.
EXPOSE 3000

CMD ["/usr/local/bin/entrypoint.sh"]
