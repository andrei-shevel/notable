# Notable API — single-stage image for step 5. Step 14 will replace this with
# a slim multi-stage build (TS → compiled JS) for production deploys. Until
# then `tsx` is fine: the binary is small and dev hot-reload uses the same
# image with source bind-mounted.

FROM node:22-alpine

WORKDIR /app

# pnpm via corepack — same version family the workspace uses on the host.
RUN corepack enable && corepack prepare pnpm@11.1.2 --activate

# Install deps first so a source-only change doesn't bust the layer cache.
# pnpm-workspace.yaml carries allowBuilds so esbuild's postinstall (used by
# tsx) is permitted inside the container.
COPY package.json pnpm-workspace.yaml ./
RUN pnpm install --prod=false

# Copy the rest of the source. In dev, docker-compose.dev.yml bind-mounts
# ./apps/api over /app and keeps node_modules via an anonymous volume.
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

# Apply pending migrations, then boot. pnpm propagates the child's exit code,
# so a failing migration aborts startup and the orchestrator's restart policy
# takes over. start-period above is generous enough to cover a cold migrate.
CMD ["sh", "-c", "pnpm run db:migrate && pnpm run start"]
