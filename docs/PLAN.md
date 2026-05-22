# Notable — Tier 2 Implementation Plan

Goal: turn the `index.html` prototype into a working notes app with sync across devices. Self-hosted Postgres + Node/Fastify backend, all wired with Docker Compose. Single-user for v1 but the schema and auth model leave room for many users and sharing later.

## Stack

- **Frontend:** the existing `index.html`, progressively split into a small Vite + vanilla-TS app (no framework needed at this size).
- **Editor:** Tiptap (ProseMirror under the hood). Storage format is the Tiptap JSON document; HTML is derived on read for previews.
- **Backend:** Node 22 + Fastify 5 in TypeScript. Validation via `fastify-type-provider-zod`. Postgres driver: `postgres` (porsager/postgres). Migrations + schema-as-code via Drizzle.
- **Database:** Postgres 16 in its own container. `pg_trgm` enabled now; `pgvector` left as a no-op extension for future semantic search.
- **Email (magic-link auth):** SMTP. `nodemailer` in the backend. Mailpit in dev (catches all mail in a local UI); a real provider (Resend, Postmark, SES) in prod.
- **Edge / TLS:** Caddy reverse-proxy in front of the API and static frontend in prod. Vite dev server in dev.
- **Sync model:** online-first with optimistic local writes. IndexedDB cache via `idb-keyval` so the UI is instant on reload; Postgres is the source of truth. Full offline editing is a Tier 3 problem.
- **Search:** Postgres `tsvector` with a GIN index, plus `pg_trgm` for typo tolerance. Exposed via a `GET /api/notes/search?q=...` endpoint.

## Architecture

```
                ┌──────────┐
   browser ───▶ │  caddy   │ ─── /          ───▶ static (web/dist)
                │ (prod)   │ ─── /api/*      ───▶ api:3000
                └──────────┘
                              ┌────────┐
                       api ─▶ │   db   │  (postgres:16)
                              └────────┘
                       api ─▶ mailpit (dev) / SMTP relay (prod)
```

`docker-compose.yml` services:
- **db** — `postgres:16-alpine`, volume-mounted data dir, healthcheck, exposed only on the compose network in prod.
- **api** — built from `./api/Dockerfile` (Node 22 + Fastify). Reads `DATABASE_URL`, `JWT_SECRET`, `SMTP_*`, `PUBLIC_URL` from env.
- **web** — static build of the Vite app. Either served by Caddy directly from a shared volume, or baked into a tiny Nginx image. (In dev this service is omitted; Vite dev server runs on the host.)
- **caddy** — `caddy:2-alpine`, single Caddyfile reverse-proxies to `api` and serves static files. Handles HTTPS via automatic ACME.
- **mailpit** — `axllent/mailpit`, dev-only profile, captures all outbound mail at `localhost:8025`.

Two compose files:
- `docker-compose.yml` — base services (`db`, `api`, `caddy`, `web`)
- `docker-compose.dev.yml` — overrides + `mailpit`, mounts source for hot reload, exposes db on `127.0.0.1:5432` for psql access.

## Data model

```sql
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;   -- gen_random_uuid

create table users (
  id            uuid primary key default gen_random_uuid(),
  email         citext not null unique,
  created_at    timestamptz not null default now()
);

create table auth_tokens (
  token_hash    bytea primary key,           -- sha256 of the magic-link token
  user_id       uuid not null references users(id) on delete cascade,
  expires_at    timestamptz not null,
  consumed_at   timestamptz
);

create table notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  title       text not null default '',
  body_json   jsonb not null default '{"type":"doc","content":[]}'::jsonb,  -- Tiptap doc
  body_text   text not null default '',          -- plain-text snapshot, written by client on save
  starred     boolean not null default false,
  trashed_at  timestamptz,                       -- soft delete
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  search_tsv  tsvector generated always as (
                to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body_text,''))
              ) stored
);
create index notes_user_updated_idx on notes (user_id, updated_at desc);
create index notes_search_idx       on notes using gin (search_tsv);
create index notes_trgm_idx         on notes using gin (body_text gin_trgm_ops);

create table tags (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references users(id) on delete cascade,
  name     text not null,
  color    text not null default 'slate',
  unique (user_id, name)
);

create table note_tags (
  note_id uuid not null references notes(id) on delete cascade,
  tag_id  uuid not null references tags(id)  on delete cascade,
  primary key (note_id, tag_id)
);
```

Notes on the schema:
- `body_json` is the source of truth. `body_text` is a plain-text snapshot the client writes via `editor.getText()` on save; the generated `search_tsv` column derives from it. HTML is never stored — derived on demand via `generateHTML` from `@tiptap/html`.
- Tokens are stored hashed (`sha256(token)`); the raw token only ever lives in the email link. Lookup by hash on verify.
- `citext` for emails so lookups are case-insensitive without surprising users.

Migrations live in `api/drizzle/` with `drizzle-kit` generating SQL from `api/src/db/schema.ts`. Apply on boot via a one-shot `migrate` script (the `api` container runs `drizzle-kit migrate` before `node server.js`).

## Auth & access

Magic-link only for v1. Flow:

1. `POST /api/auth/login { email }`
   - Find or create user.
   - Generate 32-byte token, store `sha256(token)` with 15-minute TTL.
   - Email link to `PUBLIC_URL/auth/verify?token=...`.
   - Always return 200 (don't leak whether the email exists).
2. `GET /api/auth/verify?token=...`
   - Look up by `sha256(token)`, check `expires_at` and `consumed_at`.
   - Mark consumed.
   - Issue a session JWT (HS256, 30-day expiry, `sub = user_id`), set as `httpOnly`, `Secure`, `SameSite=Lax` cookie.
   - Redirect to `/`.
3. `POST /api/auth/logout` — clear cookie.

Every other endpoint uses a Fastify `preHandler` that:
- Reads the JWT from the cookie via `@fastify/jwt`.
- Decodes it, attaches `request.user = { id }`.
- Returns 401 if missing/invalid.

**Authorization** is enforced at the query layer: every query filters by `user_id = $userId`. Drizzle makes this trivial because all queries go through typed helpers; an audit grep for `user_id` is enough to verify coverage. We're explicitly not using RLS in v1 — it's strictly less ergonomic when you control the API layer end-to-end and the database is single-tenant. If we later add multi-tenant isolation or hand out direct DB access, we can layer RLS on top without schema changes.

Rate-limit `POST /api/auth/login` to 5 requests / 15 min per IP via `@fastify/rate-limit`.

## API surface

All routes under `/api`, JSON only, cookie-authed.

```
POST   /api/auth/login                 { email }
GET    /api/auth/verify?token=...      → redirect, sets cookie
POST   /api/auth/logout
GET    /api/me

GET    /api/notes?view=all|starred|trash&tag=<id>
POST   /api/notes                      { title?, body_json? }
GET    /api/notes/:id
PATCH  /api/notes/:id                  { title?, body_json?, body_text?, starred?, trashed_at? }
DELETE /api/notes/:id                  → hard delete (used from Trash)
GET    /api/notes/search?q=...

GET    /api/tags
POST   /api/tags                       { name, color? }
PATCH  /api/tags/:id
DELETE /api/tags/:id
POST   /api/notes/:id/tags/:tagId
DELETE /api/notes/:id/tags/:tagId
```

Every request/response validated with Zod via `fastify-type-provider-zod`. The schemas live in `api/src/schemas/` and are imported by the frontend for shared types (via a small `shared/` package or path alias).

## Frontend changes

Split `index.html` into:
- `web/index.html` — shell
- `web/src/main.ts` — bootstrap, router (hash-based, no framework)
- `web/src/api.ts` — typed fetch wrapper, reads/writes JSON, throws on non-2xx
- `web/src/cache.ts` — IndexedDB cache for notes + tags (idb-keyval)
- `web/src/notes.ts` — list/load/save/delete, optimistic updates
- `web/src/editor.ts` — Tiptap setup, extensions, save bridge
- `web/src/preview.ts` — `body_json` → HTML for the list pane via `@tiptap/html`
- `web/src/search.ts` — debounced API search
- `web/src/auth.ts` — login form, verify-redirect handler, session bootstrap

Tiptap extensions:
- `@tiptap/starter-kit` (paragraphs, headings, lists, blockquote, code, code block, bold/italic, history)
- `@tiptap/extension-task-list` + `@tiptap/extension-task-item` for the checklist style already in the prototype
- `@tiptap/extension-placeholder` for empty-state hint
- `@tiptap/extension-link` with autolink
- `@tiptap/html` for server-free preview rendering

The prototype's `.editor-body` CSS ports over essentially unchanged — Tiptap renders the same tag structure (`h1/h2/h3`, `p`, `ul`, `blockquote`, `pre code`). Replace the prototype's `.checklist` markup with Tiptap's `<ul data-type="taskList">`.

Editor behavior:
- Debounced autosave (500ms after last `editor.on('update')`) → `PATCH /api/notes/:id` with `{ body_json, body_text }`.
- "Saved 2m ago" pill driven by real `updated_at` from the server response.
- Title is a separate `<input>` above the editor (not part of the Tiptap doc) — keeps it indexable and easy to render in the list pane.
- New-note button creates a row, navigates to it.
- Trash = `PATCH` with `trashed_at: now()`. "Trash" view filters `trashed_at is not null`; hard-delete from there.

## Repo layout

```
notable/
├── docker-compose.yml
├── docker-compose.dev.yml
├── Caddyfile
├── .env.example
├── api/
│   ├── Dockerfile
│   ├── package.json
│   ├── drizzle.config.ts
│   ├── drizzle/                  # generated migrations
│   └── src/
│       ├── server.ts             # Fastify bootstrap
│       ├── db/
│       │   ├── client.ts
│       │   └── schema.ts         # Drizzle schema
│       ├── routes/
│       │   ├── auth.ts
│       │   ├── notes.ts
│       │   ├── tags.ts
│       │   └── search.ts
│       ├── schemas/              # Zod schemas (shared with web)
│       ├── plugins/
│       │   ├── auth.ts           # preHandler that attaches request.user
│       │   ├── cookie.ts
│       │   └── ratelimit.ts
│       └── mail/
│           └── magicLink.ts
├── web/
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   └── src/                      # see "Frontend changes"
└── shared/
    └── types.ts                  # re-exports Zod schemas from api/src/schemas
```

## Implementation steps

1. **Scaffold the monorepo.** `pnpm init` at root with workspaces for `api`, `web`, `shared`. `pnpm create vite@latest web --template vanilla-ts`. Drop the prototype's HTML/CSS into `web/index.html` and verify it still renders via `pnpm --filter web dev`.
2. **Compose skeleton.** Write `docker-compose.yml` with `db` + `caddy` + `api` (empty), `docker-compose.dev.yml` with `mailpit` and source mounts. `.env.example` with `POSTGRES_PASSWORD`, `JWT_SECRET`, `SMTP_URL`, `PUBLIC_URL`. Verify `docker compose up db mailpit` boots.
3. **Fastify boot.** `pnpm --filter api add fastify @fastify/cookie @fastify/jwt @fastify/cors @fastify/rate-limit zod fastify-type-provider-zod postgres drizzle-orm` (dev: `drizzle-kit tsx`). Build a `/api/health` endpoint that returns `{ db: ok }` after a `SELECT 1`. Verify `docker compose up api` is healthy.
4. **Schema + migrations.** Define Drizzle schema, run `drizzle-kit generate`, commit migrations. Container entrypoint runs `drizzle-kit migrate` then starts the server.
5. **Auth.** Build login + verify + logout. Use nodemailer pointed at Mailpit in dev. Test the full flow in a browser, confirm cookie is set.
6. **Notes CRUD.** Implement the routes from the API surface. Add the `preHandler` that gates everything. Hand-test with `curl` + the auth cookie.
7. **Frontend wiring.** Replace the hard-coded note cards with `GET /api/notes`. Build the login screen. Persist session via cookie automatically. Hash-route between notes.
8. **Tiptap editor.** Install extensions, mount onto the editor pane, port the prototype's CSS, wire autosave to `PATCH /api/notes/:id`.
9. **Tags.** Tag CRUD + sidebar list with per-tag counts (one query: `SELECT t.*, COUNT(nt.note_id) FROM tags t LEFT JOIN note_tags nt ON nt.tag_id = t.id WHERE t.user_id = $1 GROUP BY t.id`). Tag picker in the editor toolbar.
10. **Search.** `GET /api/notes/search?q=...` runs `websearch_to_tsquery` against `search_tsv`, ranked, with a `pg_trgm` fallback if the query produces no FTS hits. Debounce client-side.
11. **IndexedDB cache.** On load, render from cache immediately; fetch from API in background and reconcile by `updated_at`. Last-write-wins is fine for a single user across devices.
12. **Caddy + production build.** Multi-stage Dockerfile for `api` (build TS → slim runtime). `web` builds static files into a volume Caddy serves. Caddyfile: `notable.example.com { reverse_proxy /api/* api:3000; root * /srv; file_server }`. Test with a real domain or `caddy.local` + `mkcert`.

## Scaling later

The architecture deliberately makes the future easy:
- **More API instances:** the API is stateless. Add `deploy: replicas: N` (or move to Kubernetes), put Caddy in front as the load balancer. Cookies are JWT so no shared session store needed.
- **More database load:** add **PgBouncer** as a sidecar container in transaction-pooling mode. The Fastify `postgres` driver opens fewer connections; PgBouncer multiplexes across instances.
- **Read scaling:** Postgres streaming replication to a read replica, route `GET` traffic to it.
- **Background work:** when we add things like embeddings generation or weekly digest emails, add a `worker` service to compose that consumes a Postgres-based queue (`pg-boss`) — no new infra.
- **Realtime (Tier 3):** add a `collab` service running `y-websocket`, persist Yjs doc snapshots in a new `note_yjs (note_id, doc bytea, updated_at)` table. Caddy reverse-proxies `/collab/*` to it.
- **Semantic search later:** `CREATE EXTENSION vector;` adds a `body_embedding vector(1536)` column. A worker backfills via OpenAI/local embedding. Same Postgres.
- **Backups:** WAL-G or pgBackRest container, ship base backups + WAL to S3-compatible storage (Backblaze B2 is cheapest).

None of these change the data model or the API contract.

## Out of scope (Tier 3)

- Real offline editing with conflict resolution
- Shared cursors / multi-user editing on the same note
- Attachments / images in notes
- Mobile app
- Export / import (JSON / Markdown)

## Cost estimate

Two realistic shapes:

- **Single small VPS** (Hetzner CPX21 or Vultr equivalent — 2 vCPU, 4GB, ~€7/month): runs the whole stack comfortably for hundreds to low-thousands of active users. Add €1–2/month for object-storage backups. **Total: ~€10/month.**
- **Managed Postgres + small app host** (Hetzner managed PG when available, or Neon/Supabase-as-DB-only + a Fly.io machine for the API): higher floor (~$25/month) but trivial scaling and zero DBA work.

Email at low volume is free across Resend / Postmark / SES free tiers. Domain is a few dollars a year. Caddy's automatic TLS is free.
