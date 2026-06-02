# Notable API — single-stage image. Builds from the repo root so the
# pnpm workspace is visible (api depends on @notable/shared).
# Step 14 will replace this with a slim multi-stage prod build.

FROM node:22-alpine

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
COPY packages/ui/package.json packages/ui/package.json

# Install only what @notable/api needs (transitively pulls @notable/shared).
RUN pnpm install --frozen-lockfile --filter @notable/api...

# Source for the packages this image actually runs.
COPY apps/api apps/api
COPY packages/editor packages/editor
COPY packages/shared packages/shared

WORKDIR /repo/apps/api

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

# Apply pending migrations, then boot. pnpm propagates the child's exit code,
# so a failing migration aborts startup and the orchestrator's restart policy
# takes over. start-period above is generous enough to cover a cold migrate.
CMD ["sh", "-c", "pnpm run db:migrate && pnpm run start"]
