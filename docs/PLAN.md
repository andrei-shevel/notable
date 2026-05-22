# Notable — Tier 2 Implementation Plan

Goal: turn the `index.html` prototype into a working notes app with sync across devices. Self-hosted Postgres + Node/Fastify backend, all wired with Docker Compose. Single-user for v1 but the schema and auth model leave room for many users and sharing later.

## Stack

- **Frontend:** Vite + React 19 + TypeScript. Routing via `wouter` (tiny, fits a 3-route app). Server state via TanStack Query, persisted to IndexedDB. Local UI state via `useState`/`useReducer`; reach for `zustand` only if cross-tree sharing appears. Styling via Sass + CSS Modules (`*.module.scss`); design tokens (`--bg`, `--accent`, etc.) live as CSS custom properties in `styles/tokens.scss` so dark mode stays a single `@media` block.
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
   browser ───▶ │  caddy   │ ─── /          ───▶ static (apps/web/dist)
                │ (prod)   │ ─── /api/*      ───▶ api:3000
                └──────────┘
                              ┌────────┐
                       api ─▶ │   db   │  (postgres:16)
                              └────────┘
                       api ─▶ mailpit (dev) / SMTP relay (prod)
```

`docker-compose.yml` services:
- **db** — `postgres:16-alpine`, volume-mounted data dir, healthcheck, exposed only on the compose network in prod.
- **api** — built from `./apps/api/Dockerfile` (Node 22 + Fastify). Reads `DATABASE_URL`, `JWT_SECRET`, `SMTP_*`, `PUBLIC_URL` from env.
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

Migrations live in `apps/api/drizzle/` with `drizzle-kit` generating SQL from `apps/api/src/db/schema.ts`. Apply on boot via a one-shot `migrate` script (the `api` container runs `drizzle-kit migrate` before `node server.js`).

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

Every request/response validated with Zod via `fastify-type-provider-zod`. The Zod schemas (request/response shapes) live in `packages/shared/src/schemas/` so they're a single source of truth — both `@notable/api` and `@notable/web` import them directly (`import { NoteSchema } from '@notable/shared'`). Drizzle's DB schema is server-only and stays in `apps/api/src/db/schema.ts`.

## Frontend changes

Split `index.html` into a React app:

```
apps/web/src/
├── main.tsx                   # React root + providers (QueryClient, Router, persister)
├── App.tsx                    # router + auth gate
├── routes/
│   ├── Login.tsx              # email input → POST /api/auth/login
│   ├── Verify.tsx             # consumes ?token, calls /verify, redirects
│   └── Workspace.tsx          # the 3-pane app shell
├── components/
│   ├── Brand.tsx              # logo mark + wordmark
│   ├── Icon.tsx               # tiny SVG wrapper, one named icon per export
│   ├── IconButton.tsx         # 30×30 button used in toolbars
│   ├── Tag.tsx                # pill (Work, Planning, …)
│   ├── Avatar.tsx             # gradient initials circle
│   ├── NavItem.tsx            # sidebar row: icon + label + count + dot
│   ├── SearchInput.tsx        # search-icon + text input
│   ├── SavedPill.tsx          # green-dot "Saved 2m ago"
│   ├── Crumbs.tsx             # editor-toolbar breadcrumb
│   ├── NoteCard.tsx           # list row
│   ├── Sidebar.tsx            # composes Brand + NavItem groups + Avatar
│   ├── NoteList.tsx           # middle pane: header + SearchInput + NoteCards
│   ├── EditorToolbar.tsx      # composes Crumbs + SavedPill + IconButton
│   ├── Editor.tsx             # Tiptap via useEditor (added in step 10)
│   ├── TagPicker.tsx
│   └── SearchModal.tsx        # ⌘K palette
├── hooks/
│   ├── useNotes.ts            # TanStack Query queries + mutations
│   ├── useTags.ts
│   ├── useAutosave.ts         # debounced PATCH on editor updates
│   └── useAuth.ts             # session bootstrap, logout
├── lib/
│   ├── api.ts                 # typed fetch wrapper, throws on non-2xx
│   ├── queryClient.ts         # TanStack Query + persistQueryClient (idb-keyval)
│   ├── preview.ts             # body_json → snippet via generateHTML + stripper
│   └── tiptap.ts              # shared extension list (used by editor + preview)
└── styles/
    ├── tokens.scss            # :root custom properties + dark @media override
    ├── reset.scss             # box-sizing, margin/padding reset, body font
    ├── mixins.scss            # @mixin focus-ring, @mixin truncate, …
    └── global.scss            # entry: forwards reset + tokens, sets body
```

Each component has a colocated `Foo.module.scss`. Component styles reference design tokens via `var(--bg)` / `var(--accent)` directly — no Sass variables for theme colors, since the dark-mode override lives in `tokens.scss`. Use Sass `@use 'styles/mixins' as *;` only when a component needs a shared mixin.

State strategy:
- **Server state** lives in TanStack Query. `useQuery(['notes'])`, `useMutation` for create/patch/delete, `queryClient.setQueryData` for optimistic updates. Persisted to IndexedDB via `@tanstack/query-async-storage-persister` + `idb-keyval` — first paint is instant from cache, then it revalidates against the API.
- **UI state** (active note id, search modal open, sidebar collapsed) lives in component `useState` or URL search params. No global store needed for v1.

Tiptap extensions (in `lib/tiptap.ts`, exported once and reused by both `Editor.tsx` and `preview.ts`):
- `@tiptap/starter-kit` (paragraphs, headings, lists, blockquote, code, code block, bold/italic, history)
- `@tiptap/extension-task-list` + `@tiptap/extension-task-item`
- `@tiptap/extension-placeholder` for empty-state hint
- `@tiptap/extension-link` with autolink
- `@tiptap/html` for snippet generation in the list pane (called outside React, no editor instance needed)

The prototype's `.editor-body` CSS ports over essentially unchanged — Tiptap renders the same tag structure (`h1/h2/h3`, `p`, `ul`, `blockquote`, `pre code`). Replace the prototype's `.checklist` markup with Tiptap's `<ul data-type="taskList">`.

Editor wiring:
- `useEditor({ extensions, content: note.body_json, onUpdate })` inside `Editor.tsx`.
- `useAutosave` debounces 500ms after the last `onUpdate`, then fires a `PATCH /api/notes/:id` mutation with `{ body_json: editor.getJSON(), body_text: editor.getText() }`. Optimistic cache update on dispatch, rollback on error.
- When the active note id changes, call `editor.commands.setContent(newNote.body_json, false)` (the `false` flag suppresses an `onUpdate` so we don't autosave on load).
- "Saved 2m ago" pill driven by `note.updated_at` returned from the mutation, formatted with `Intl.RelativeTimeFormat`.
- Title is a separate `<input>` above the editor, not inside the Tiptap doc — keeps it indexable and easy to render in `NoteCard`.
- New-note button creates a row, navigates to it via `setLocation('/n/' + id)`.
- Trash = `PATCH` with `trashed_at: now()`. "Trash" view filters `trashed_at is not null`; hard-delete from there.

## Repo layout

```
notable/
├── docker-compose.yml
├── docker-compose.dev.yml
├── Caddyfile
├── .env.example
├── package.json                  # pnpm workspace root
├── pnpm-workspace.yaml           # packages: apps/*, packages/*
├── apps/
│   ├── api/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── drizzle.config.ts
│   │   ├── drizzle/              # generated migrations
│   │   └── src/
│   │       ├── server.ts         # Fastify bootstrap
│   │       ├── db/
│   │       │   ├── client.ts
│   │       │   └── schema.ts     # Drizzle schema
│   │       ├── routes/
│   │       │   ├── auth.ts
│   │       │   ├── notes.ts
│   │       │   ├── tags.ts
│   │       │   └── search.ts
│   │       ├── plugins/
│   │       │   ├── auth.ts       # preHandler that attaches request.user
│   │       │   ├── cookie.ts
│   │       │   └── ratelimit.ts
│   │       └── mail/
│   │           └── magicLink.ts
│   └── web/
│       ├── index.html
│       ├── vite.config.ts
│       ├── package.json
│       └── src/                  # see "Frontend changes"
└── packages/
    └── shared/                   # @notable/shared
        ├── package.json
        └── src/
            ├── index.ts          # barrel export
            └── schemas/          # Zod schemas — imported by both api and web
                ├── notes.ts
                ├── tags.ts
                └── auth.ts
```

All workspace packages use a `@notable/*` scoped name (`@notable/web`, `@notable/api`, `@notable/shared`). Cross-package imports go through the package name (`import { NoteSchema } from '@notable/shared'`), and workspace deps are declared as `"@notable/shared": "workspace:*"` in each consumer's `package.json`.

## Implementation steps

1. **Scaffold the empty skeleton.** `pnpm init` at root, `pnpm-workspace.yaml` with `apps/*` + `packages/*`. `pnpm create vite@latest apps/web --template react-ts`. Rename the generated package to `@notable/web` in `apps/web/package.json`. Add `sass` as a dev dep so `*.scss` files just work in Vite. Write a minimal `main.tsx` (React root only) and an `App.tsx` that renders a placeholder. No router, no data layer, no providers yet — those come in with the deps that need them. `pnpm --filter @notable/web dev` should boot a working empty app with no prototype content yet.
2. **Common components + design tokens.** Port the prototype's design tokens into `styles/tokens.scss` (`:root` block + the `@media (prefers-color-scheme: dark)` override) and `styles/reset.scss`. Import `styles/global.scss` once from `main.tsx`. Build the component library listed in "Frontend changes" — `Brand`, `Icon`, `IconButton`, `Tag`, `Avatar`, `NavItem`, `SearchInput`, `SavedPill`, `Crumbs`, `NoteCard` — each with a colocated `*.module.scss`. No data, no logic; just typed props and static markup. Verify each in isolation via a throwaway `/_kitchen-sink` route that renders one of each.
3. **Workspace page from prototype.** Build `Workspace.tsx` as the 3-pane shell (`.app` grid). Compose `Sidebar`, `NoteList`, and an editor pane (static prototype content rendered as plain JSX for now — Tiptap arrives in step 10). Feed the same hard-coded note data the prototype uses, sourced from a `lib/fixtures.ts` so it's easy to swap for API data in step 9. At the end of this step, the rendered React app is visually indistinguishable from the original `index.html`.
4. **Compose skeleton.** Write `docker-compose.yml` with `db` + `caddy` + `api` (empty), `docker-compose.dev.yml` with `mailpit` and source mounts. `.env.example` with `POSTGRES_PASSWORD`, `JWT_SECRET`, `SMTP_URL`, `PUBLIC_URL`. Verify `docker compose up db mailpit` boots.
5. **Fastify boot.** `pnpm --filter @notable/api add fastify @fastify/cookie @fastify/jwt @fastify/cors @fastify/rate-limit zod fastify-type-provider-zod postgres drizzle-orm` (dev: `drizzle-kit tsx`). Build a `/api/health` endpoint that returns `{ db: ok }` after a `SELECT 1`. Verify `docker compose up api` is healthy.
6. **Schema + migrations.** Define Drizzle schema, run `drizzle-kit generate`, commit migrations. Container entrypoint runs `drizzle-kit migrate` then starts the server.
7. **Auth.** Build login + verify + logout. Use nodemailer pointed at Mailpit in dev. Test the full flow in a browser, confirm cookie is set.
8. **Notes CRUD.** Implement the routes from the API surface. Add the `preHandler` that gates everything. Hand-test with `curl` + the auth cookie.
9. **Frontend wiring.** Install the data-layer deps: `pnpm --filter @notable/web add wouter @tanstack/react-query @tanstack/react-query-persist-client @tanstack/query-async-storage-persister idb-keyval`. Build the `App.tsx` router with `wouter` (`/login`, `/auth/verify`, `/`, `/n/:id`). Wire `QueryClientProvider` + `persistQueryClient` in `main.tsx`. Build `useNotes()` and replace the `lib/fixtures.ts` source in `NoteList.tsx` with `useQuery(['notes'])`. Build the `Login` route. Cookie session is automatic since it's `httpOnly`.
10. **Tiptap editor.** `pnpm --filter @notable/web add @tiptap/react @tiptap/starter-kit @tiptap/extension-task-list @tiptap/extension-task-item @tiptap/extension-placeholder @tiptap/extension-link @tiptap/html`. Build `Editor.tsx` with `useEditor`, mount the shared extensions from `lib/tiptap.ts`, wire `useAutosave` to a `PATCH` mutation with optimistic update of `['notes', id]`. Handle active-note switching with `editor.commands.setContent(...)` (suppress the `onUpdate` event with the second arg).
11. **Tags.** Tag CRUD + sidebar list with per-tag counts (one query: `SELECT t.*, COUNT(nt.note_id) FROM tags t LEFT JOIN note_tags nt ON nt.tag_id = t.id WHERE t.user_id = $1 GROUP BY t.id`). Tag picker in the editor toolbar.
12. **Search.** `GET /api/notes/search?q=...` runs `websearch_to_tsquery` against `search_tsv`, ranked, with a `pg_trgm` fallback if the query produces no FTS hits. Debounce client-side.
13. **Cache hardening.** The TanStack Query persister wired in step 9 already handles "render from cache on load, revalidate in background." This step is the polish: tune `staleTime` per query (notes list: 30s, single note: 0), set `maxAge` on the persister (7 days), wire mutation `onMutate`/`onError` for rollback on failed PATCH, and add a small "offline" indicator when fetches fail. Last-write-wins on the server is fine for a single user across devices.
14. **Caddy + production build.** Multi-stage Dockerfile for `api` (build TS → slim runtime). `web` builds static files into a volume Caddy serves. Caddyfile: `notable.example.com { reverse_proxy /api/* api:3000; root * /srv; file_server }`. Test with a real domain or `caddy.local` + `mkcert`.

## Scaling later

The architecture deliberately makes the future easy. New deployable services land in `apps/` (each with its own Dockerfile and compose service); new shared libraries land in `packages/` (each with a `@notable/*` name).
- **More API instances:** the API is stateless. Add `deploy: replicas: N` (or move to Kubernetes), put Caddy in front as the load balancer. Cookies are JWT so no shared session store needed.
- **More database load:** add **PgBouncer** as a sidecar container in transaction-pooling mode. The Fastify `postgres` driver opens fewer connections; PgBouncer multiplexes across instances.
- **Read scaling:** Postgres streaming replication to a read replica, route `GET` traffic to it.
- **Background work:** when we add things like embeddings generation or weekly digest emails, add `apps/worker` (a new compose service) that consumes a Postgres-based queue (`pg-boss`) — no new infra.
- **Realtime (Tier 3):** add `apps/collab` running `y-websocket`, persist Yjs doc snapshots in a new `note_yjs (note_id, doc bytea, updated_at)` table. Caddy reverse-proxies `/collab/*` to it.
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
