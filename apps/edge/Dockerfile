# Notable edge — single self-contained image that builds the SPA + marketing
# landing, ships the Caddyfile, and runs Caddy. One artifact fronts the whole
# web tier; only `api` and `db` are separate containers.
#
# Build context: repo root (both web and landing builds need the full pnpm
# workspace).

# ---------------------------------------------------------------------------
# Stage 1 — Install pnpm workspace and build both static surfaces.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS web-builder
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@11.1.2 --activate

# Workspace plumbing first — changes to source don't bust this layer.
# Only the package.json files in the filter graphs below are needed:
#   @notable/web + workspace dep @notable/ui
#   @notable/landing (no workspace deps)
# apps/api is unreachable from either filter, so it's omitted.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json     ./apps/web/
COPY apps/landing/package.json ./apps/landing/
COPY packages/ui/package.json  ./packages/ui/

# `--filter` installs the dependency graphs for the two surfaces we build
# here. Frozen lockfile so a stale lock fails the build loudly.
RUN pnpm install --frozen-lockfile \
      --filter @notable/web... \
      --filter @notable/landing...

# Sources for the workspaces this build touches.
COPY packages/ui    ./packages/ui
COPY apps/web       ./apps/web
COPY apps/landing   ./apps/landing

# Build both in parallel — they have no cross-deps.
RUN pnpm --filter @notable/web --filter @notable/landing -r build


# ---------------------------------------------------------------------------
# Stage 2 — Caddy runtime with both static surfaces baked in.
# ---------------------------------------------------------------------------
FROM caddy:2-alpine

# Astro-built marketing landing (multi-page HTML + hashed assets).
COPY --from=web-builder /repo/apps/landing/dist /srv-landing

# Vite-built SPA bundle.
COPY --from=web-builder /repo/apps/web/dist /srv-app

# Routing config. Iterating on routes requires a rebuild — the tradeoff for
# a fully self-contained, reproducible edge image.
COPY apps/edge/Caddyfile /etc/caddy/Caddyfile
