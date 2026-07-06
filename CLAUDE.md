# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Notable is a note-taking app: a Fastify/Postgres API, a React SPA, a Tiptap-based
editor, and a static marketing landing — all in one pnpm + workspace monorepo
(`@notable/*`). Everything is served under a single origin in production by a
Caddy "edge" image: landing at `/`, SPA under `/app`, API at `/api/*`.

## Workspace layout

| Package            | Path              | What it is                                                                                               |
| ------------------ | ----------------- | -------------------------------------------------------------------------------------------------------- |
| `@notable/api`     | `apps/api`        | Fastify 5 API, Drizzle ORM + Postgres, JWT-cookie auth, S3/MinIO uploads                                 |
| `@notable/web`     | `apps/web`        | React 19 SPA (Vite, wouter, zustand, react-hook-form, ky)                                                |
| `@notable/landing` | `apps/landing`    | Next.js marketing site (static export, coming-soon page)                                                 |
| `@notable/editor`  | `packages/editor` | Tiptap editor: client `Editor` component + server `renderNoteHtml`                                       |
| `@notable/ui`      | `packages/ui`     | Radix-based primitives, design tokens (SCSS), icons (lucide)                                             |
| `@notable/shared`  | `packages/shared` | Zod schemas + inferred types shared by API and web (`apps/edge` is build-only: a Dockerfile + Caddyfile) |

`@notable/shared` is the contract layer: request/response shapes are Zod schemas
there, consumed by the API (Fastify validates and serializes against them via
`fastify-type-provider-zod`) and by the web client (typed `ky` calls). When
changing an API shape, edit the schema in `packages/shared/src/schemas/` first —
both sides derive from it.

Workspace packages ship **raw TypeScript** (no build step; `exports` point at
`.ts`). Consumers compile them (Vite for web, esbuild for the API prod build).

## Commands

Run from the repo root unless noted.

```bash
# Local dev: bring up Postgres + Redis + MinIO + mailpit + API in Docker, then
# run the Vite dev server on the host (proxies /api to the container).
pnpm up            # docker compose up (base + dev overrides), runs db:migrate then api
pnpm dev           # vite dev server for @notable/web -> http://localhost:5173/app/
pnpm logs          # tail compose logs
pnpm down          # stop the stack
pnpm rebuild       # rebuild + restart containers

pnpm -r build      # build every package
pnpm -r typecheck  # typecheck every package
pnpm format        # prettier --write .
```

API-specific (in `apps/api`):

```bash
pnpm --filter @notable/api test            # vitest run (spins up Postgres via Testcontainers)
pnpm --filter @notable/api test:watch
pnpm --filter @notable/api db:generate     # drizzle-kit: generate a migration from schema.ts
pnpm --filter @notable/api db:migrate      # apply migrations
```

Run a single test file / test:

```bash
pnpm --filter @notable/api exec vitest run test/services/auth.service.test.ts
pnpm --filter @notable/api exec vitest run -t 'name of the test'
```

There is **no top-level `lint`**; only `apps/web` has eslint (`pnpm --filter @notable/web lint`).

## Environment

Copy `.env.example` to `.env` at the repo root; compose reads it automatically.
The API validates all env via Zod in `apps/api/src/config.ts` and **throws at
startup** on anything missing/invalid — add new config there, not via ad-hoc
`process.env` reads. `REDIS_URL` is **optional** — when set the rate limiter
uses a shared Redis store, otherwise it falls back to per-process in-memory
counters (compose wires it automatically; see "Rate limiting" below). Dev URLs
of note: SPA `localhost:5173/app/`, mailpit (catches magic-link mail)
`localhost:8025`, MinIO console `localhost:9001`.

## API architecture

Layered, with a single composition root. Per HTTP resource there is a trio:
**route → service → repository**.

- **`server.ts`** builds the Fastify app and registers plugins in a load-bearing
  order (cookie → jwt → rate-limit → multipart), then routes.
- **`container.ts`** is the composition root: `createServices(logger)` wires
  repositories and services and returns them; `server.ts` just registers the
  resulting routes. Services and repositories are plain factory functions
  (`createXService(deps)`), not classes — dependencies are passed in, which is
  what makes them unit-testable with fakes. Note the deliberate dependency
  shape: `notesService → filesService → notes *repository*` (no service cycle).
- **Routes** (`routes/*.routes.ts`) are thin: declare Zod `schema` for
  params/body/query/response, call the service. A route plugin gates its whole
  group with `app.addHook('preHandler', requireUser)` so new handlers in that
  file are protected by default. `request.user.id` comes from the JWT.
- **Services** (`services/*.service.ts`) hold business logic and map DB rows to
  the API shape (Drizzle returns `Date`/`unknown`; the contract is ISO strings /
  typed JSON — see `toApiShape`). Throw `AppError` subclasses (`errors/AppError.ts`);
  `errors/handler.ts` turns them into HTTP responses.
- **Repositories** (`repositories/*.repository.ts`) own all Drizzle queries.
  Every query is scoped by `userId` for tenant isolation.

**Auth** is passwordless: 6-digit codes emailed via SMTP (`mail/`), hashed
(sha256, bound to `userId`) into `auth_tokens`. A verified code mints a JWT
(`{ sub: userId }`) set as the `session` httpOnly cookie; `plugins/jwt.ts`
reads it from the cookie and reshapes the payload to `request.user.id`. See the
brute-force notes at the top of `auth.service.ts` before touching that flow.

**Rate limiting** (`plugins/ratelimit.ts`) registers `@fastify/rate-limit` with
`global: false`, so routes opt in via `config.rateLimit` (today only the auth
routes, to slow magic-link/code flooding). The store is in-memory by default —
correct for a single api container — but switches to a shared Redis store when
`REDIS_URL` is set, so per-IP windows hold across replicas and survive restarts.
The client is created with a short `connectTimeout`/`maxRetriesPerRequest` and
the plugin's `skipOnError` (default) is left on, so a Redis outage degrades to
_unthrottled_ rather than failing requests; the plugin closes the client on app
shutdown via an `onClose` hook. Compose runs a `redis` service (persistence
disabled — the windows are throwaway) and wires `REDIS_URL` to it. Tests leave
`REDIS_URL` unset, so the suite never needs Redis.

**Schema** lives in `apps/api/src/db/schema.ts` (Drizzle). It relies on
Postgres-specific features: `citext` emails, a generated `tsvector` column +
GIN index for full-text search, trigram (`gin_trgm_ops`) search, FK cascades.
After editing it, run `db:generate` then `db:migrate`.

**Prod build** (`apps/api/build.js`): esbuild bundles `src/` to ESM, inlining
the `@notable/*` workspace TS but keeping the API's own declared npm deps
external. Two entrypoints: `server.js` and `db/migrate.js` (the container runs
the migrator first).

**Metrics** are Prometheus-format, exposed at `GET /metrics`.
`plugins/metrics.ts` registers `fastify-metrics` (default Node metrics + a
per-route `http_request_duration_seconds` histogram keyed by the
low-cardinality route pattern). Custom domain counters/histograms live in
`lib/metrics.ts` on prom-client's global registry and are incremented directly
by the services (`auth`/`notes`/`files`), mirroring how they import `mail/*`.
Two load-bearing constraints: the plugin is **skipped under `NODE_ENV=test`**
(it registers process-wide default metrics on the global registry, and
`buildApp` runs many times per test process — re-registration throws); and
`/metrics` is deliberately **not** proxied by the Caddyfile (`/api/*` only), so
it stays private to the deployment network. There's no bundled scraper —
point a Prometheus-compatible collector at the endpoint to graph the data.

**OpenAPI docs** are served at `/api/docs` (Swagger UI; raw spec at
`/api/docs/json`). `plugins/swagger.ts` registers `@fastify/swagger` +
`@fastify/swagger-ui`, using `jsonSchemaTransform` from
`fastify-type-provider-zod` to derive the spec from each route's Zod `schema` —
no second source of truth, so the docs can't drift from the contract. Two
constraints mirror the metrics plugin: it must register **before** the routes
(its `onRoute` hook only sees routes added afterward), and it's **skipped under
`NODE_ENV=test`** (pure overhead for the HTTP tests). Unlike `/metrics`, the
`/api/docs` path _is_ reachable through the Caddy `/api/*` proxy in production.

## Web architecture

- Routing: **wouter**, mounted under base `/app` (`App.tsx`, Vite `base: '/app/'`).
- Server state lives in **zustand** stores (`stores/`). Hooks are split by intent:
  `hooks/data/*` read from the store; `hooks/services/*` perform an API call and
  update the store. `lib/api/*` are the thin typed `ky` wrappers (always
  same-origin `/api/...` — Vite proxies in dev, Caddy in prod, so no CORS).
- `@` is an import alias for `apps/web/src` (configured in both `vite.config.ts`
  and tsconfig).
- The design-system route (`routes/_design/`) is dev-only (lazy-loaded under
  `import.meta.env.DEV`) at `/app/_design`.

## Conventions

- ESM everywhere (`"type": "module"`); Node 22+.
- Prettier: single quotes, semicolons, trailing commas, 100 col, 2-space.
- The API uses the `@/*` → `src/*` path alias (tsconfig `paths`, mirrored in
  `vitest.config.ts` and resolved by esbuild at build).
- Styling is SCSS modules (`*.module.scss`) consuming tokens/mixins from
  `@notable/ui` (`@notable/ui/tokens`, `@notable/ui/mixins`).

## Testing

API tests (vitest) run against a **real Postgres** via Testcontainers — one
container started in `test/globalSetup.ts`, shared across files, truncated
between tests. Files run serially (`fileParallelism: false`) because they share
that one database. Repository/service tests connect directly via
`test/helpers/db.ts` (bypassing app config); HTTP tests in `test/http/` boot the
Fastify app with faked services. A cold run pulls the Postgres image, so first
invocation is slow.
