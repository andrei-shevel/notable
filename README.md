# Notable

A note-taking app with a rich-text editor, full-text search, and image uploads.
Built as a pnpm monorepo and served from a single origin in production: a
Fastify/Postgres API, a React SPA, a Tiptap-based editor, and an Astro
marketing landing page behind a Caddy edge.

## Architecture

```
                         ┌─────────────────────────┐
   browser  ───────────► │  Caddy edge (one origin) │
                         └────────────┬─────────────┘
                /                     │  /app                /api/*
        ┌───────────────┐    ┌────────────────┐    ┌──────────────────┐
        │ landing (Astro)│    │   web (React)  │    │   api (Fastify)  │
        └───────────────┘    └────────────────┘    └────────┬─────────┘
                                                            │
                                              ┌─────────────┴─────────────┐
                                              │  Postgres        S3/MinIO │
                                              └───────────────────────────┘
```

## Workspace

| Package            | Path              | Description |
|--------------------|-------------------|-------------|
| `@notable/api`     | `apps/api`        | Fastify 5 API — Drizzle ORM + Postgres, JWT-cookie auth, S3/MinIO uploads, Prometheus metrics |
| `@notable/web`     | `apps/web`        | React 19 SPA — Vite, wouter, zustand, react-hook-form, ky |
| `@notable/landing` | `apps/landing`    | Astro marketing site (near-zero JS) |
| `@notable/editor`  | `packages/editor` | Tiptap editor — client `Editor` component + server-side HTML rendering |
| `@notable/ui`      | `packages/ui`     | Radix-based primitives, design tokens (SCSS), icons (lucide) |
| `@notable/shared`  | `packages/shared` | Zod schemas + inferred types shared by the API and web |

`@notable/shared` is the contract layer: request/response shapes are Zod schemas
consumed by the API (validated and serialized via `fastify-type-provider-zod`)
and by the typed `ky` client on the web. Workspace packages ship raw TypeScript;
consumers compile them (Vite for web, esbuild for the API).

## Requirements

- Node.js 22+
- pnpm
- Docker (for Postgres, MinIO, and mailpit)

## Getting started

```bash
# 1. Install dependencies
pnpm install

# 2. Configure the environment
cp .env.example .env   # then fill in real values

# 3. Start the backing services + API in Docker (runs migrations first)
pnpm up

# 4. Run the web dev server (proxies /api to the container)
pnpm dev
```

Then open <http://localhost:5173/app/>.

Auth is passwordless — sign in with a magic link. In dev, mailpit catches all
outbound mail at <http://localhost:8025>. The MinIO console is at
<http://localhost:9001>.

## Common commands

```bash
pnpm up            # start the stack (Postgres + MinIO + mailpit + API)
pnpm down          # stop the stack
pnpm logs          # tail container logs
pnpm rebuild       # rebuild + restart containers

pnpm dev           # web dev server -> http://localhost:5173/app/
pnpm -r build      # build every package
pnpm -r typecheck  # typecheck every package
pnpm format        # prettier --write .
```

API package (`apps/api`):

```bash
pnpm --filter @notable/api test          # vitest (spins up Postgres via Testcontainers)
pnpm --filter @notable/api db:generate   # generate a migration from schema.ts
pnpm --filter @notable/api db:migrate    # apply migrations
```

## Configuration

All configuration is via environment variables in `.env` (see `.env.example`
for the full list and notes). The API validates every variable through Zod at
startup and throws on anything missing or invalid.

## Testing

API tests run against a real Postgres started with Testcontainers — one
container is shared across files and truncated between tests, so the first run
is slow while it pulls the image. Repository and service tests connect to the
database directly; HTTP tests boot the Fastify app with faked services.

## Observability

The API exposes Prometheus-format metrics at `/metrics`: default Node runtime
metrics, a per-route request-duration histogram (RED — rate, errors, duration),
and custom domain metrics (auth outcomes, notes created, uploads). The endpoint
is internal-only — it is not proxied by the Caddy edge, so it stays private to
the deployment network. Point any Prometheus-compatible scraper at it to collect
and graph the data.
