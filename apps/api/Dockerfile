# Notable API — slim multi-stage prod image. All build stages run from the repo
# root so the pnpm workspace is visible (api bundles @notable/shared).
#
#   builder: full workspace install + source. Has pnpm, tsx and devDeps — this
#            is also the stage the dev compose override runs (tsx hot-reload),
#            so it must stay self-sufficient for `pnpm run dev`.
#   bundler: esbuild compile (src/ -> dist/) + `pnpm deploy` to materialize a
#            self-contained prod-only node_modules.
#   runtime: just node + the compiled output + that pruned node_modules. No
#            pnpm, no tsx, no devDependencies, no TypeScript at boot.
#
# `docker build` / `docker compose up` default to the last stage (runtime).
# The dev override selects `builder` via build.target.

# ---------------------------------------------------------------------------
# Stage 1 — builder (also the dev image)
# ---------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /repo

# pnpm via corepack — same version family the workspace uses on the host.
RUN corepack enable && corepack prepare pnpm@11.1.2 --activate

# Workspace + manifest layer first so source-only edits don't bust the cache.
# All workspace package.jsons are copied because pnpm needs to see the full
# workspace shape to resolve `--filter ...` correctly against the lockfile.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/landing/package.json apps/landing/package.json
COPY packages/editor/package.json packages/editor/package.json
COPY packages/shared/package.json packages/shared/package.json

# Full install (incl. devDeps: esbuild, tsx) for @notable/api and the workspace
# packages it depends on. The `...` suffix pulls in @notable/shared + the
# type-only @notable/editor (a devDep) the dev hot-reload mounts.
RUN pnpm install --frozen-lockfile --filter @notable/api...

# Source for the packages the api builds against / dev mounts. @notable/editor
# is type-only for the prod bundle, but the dev override bind-mounts it, so it's
# copied here too to keep the builder image dev-complete.
COPY apps/api apps/api
COPY packages/editor packages/editor
COPY packages/shared packages/shared

WORKDIR /repo/apps/api

# ---------------------------------------------------------------------------
# Stage 2 — bundler (compile + prune; prod only)
# ---------------------------------------------------------------------------
FROM builder AS bundler

# Compile src/ -> dist/ (server.js + db/migrate.js) via esbuild.
RUN pnpm --filter @notable/api run build

# Materialize a deployable copy at /app: package.json + a flattened, prod-only
# node_modules with no symlinks pointing outside the directory. --legacy is
# required because the workspace doesn't opt into injected dependencies.
RUN pnpm --filter @notable/api --legacy deploy --prod /app

# ---------------------------------------------------------------------------
# Stage 3 — runtime
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Prod-only deps + the package manifest from the deploy, plus the compiled
# output and the SQL migrations (migrate.js reads ./drizzle relative to cwd).
COPY --from=bundler --chown=node:node /app/node_modules ./node_modules
COPY --from=bundler --chown=node:node /app/package.json ./package.json
COPY --from=bundler --chown=node:node /repo/apps/api/dist ./dist
COPY --from=bundler --chown=node:node /repo/apps/api/drizzle ./drizzle

USER node

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

# Apply pending migrations, then boot. `sh -c` with `&&` propagates the child
# exit code, so a failing migration aborts startup and the orchestrator's
# restart policy takes over. start-period above covers a cold migrate.
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/server.js"]
