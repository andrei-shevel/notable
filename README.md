# Notable

A self-hosted notes app. Fast, keyboard-friendly, single-column reading. Multi-device sync via Postgres; rich-text editing via Tiptap; magic-link auth.

Monorepo (pnpm workspaces). One Docker Compose stack runs the whole thing.

---

## Architecture

One origin, three surfaces, served by Caddy:

```
                                  ┌──────────────────────────┐
   browser ───── https ──────────▶│        Caddy (edge)      │
                                  │                          │
                                  │  /          → landing    │  (static, Astro)
                                  │  /app, /app/*→ web SPA   │  (static, Vite + React)
                                  │  /api/*     → api:3000   │
                                  └────────────┬─────────────┘
                                               │
                                       ┌───────▼────────┐
                                       │  api (Fastify) │
                                       │  Node 22 + TS  │
                                       └──┬──────────┬──┘
                                          │          │
                                ┌─────────▼─┐    ┌───▼────────────┐
                                │ Postgres  │    │ SMTP relay     │
                                │  16       │    │ (mailpit / SES)│
                                └───────────┘    └────────────────┘
```

- **Caddy** terminates TLS (automatic Let's Encrypt in prod, internal CA on `localhost`) and routes by path prefix. Single image bakes in the SPA build, the static landing, and the Caddyfile.
- **api** is a stateless Fastify app. Sessions are JWT cookies — no shared session store, scales horizontally.
- **db** is Postgres with `pg_trgm` (typo-tolerant search) and a `tsvector` GIN index for full-text search. `pgvector` is staged for future semantic search.
- **mailpit** catches outbound mail in dev (UI on `:8025`); prod uses a real SMTP relay (Resend / Postmark / SES).

### Repo layout

```
notable/
├── apps/
│   ├── api/        @notable/api      — Fastify, Drizzle ORM, magic-link auth
│   ├── web/        @notable/web      — Vite + React 19 SPA, served under /app
│   ├── landing/    @notable/landing  — Astro static site, served at /
│   └── edge/                          — Caddy: TLS + routing
├── packages/
│   ├── shared/     @notable/shared   — Zod schemas shared by api & web
│   └── ui/         @notable/ui       — shared React components
├── docs/                              — PLAN.md, DESIGN.md, prototype HTML
├── docker-compose.yml                 — base stack (db, api, edge under `prod` profile)
└── docker-compose.dev.yml             — dev overrides (mailpit, source mounts, exposed ports)
```

---

## Setup

### Prerequisites

- Node ≥ 22, pnpm ≥ 9
- Docker + Docker Compose
- (Optional) `mkcert` if you want trusted HTTPS on `localhost`

### First run

```sh
cp .env.example .env
# fill in POSTGRES_PASSWORD and JWT_SECRET — both must be high-entropy
#   openssl rand -hex 24       # POSTGRES_PASSWORD
#   openssl rand -base64 48    # JWT_SECRET

pnpm install
pnpm up                         # docker compose up -d (db + api + mailpit)
pnpm --filter @notable/web dev  # Vite on http://localhost:5173/app
```

Then:

- **App:** http://localhost:5173/app
- **API:** http://localhost:3000 (proxied by Vite as `/api/*`)
- **Mailpit:** http://localhost:8025 (captured magic-link emails)
- **Postgres:** `psql postgres://notable:$POSTGRES_PASSWORD@localhost:5432/notable`

### Production build

```sh
docker compose --profile prod up -d --build
```

Caddy comes up on `:80` / `:443`, serves everything under `${PUBLIC_HOSTNAME}`. Set `PUBLIC_HOSTNAME` in `.env` to a real DNS name and Caddy provisions a Let's Encrypt cert automatically on first request.

### Common commands

| Command            | What it does                                          |
| ------------------ | ----------------------------------------------------- |
| `pnpm up`          | Bring up dev stack (db + api + mailpit)               |
| `pnpm down`        | Tear it down                                          |
| `pnpm logs`        | Tail all compose service logs                         |
| `pnpm rebuild`     | Rebuild images + restart                              |
| `pnpm dev`         | Vite dev server for the SPA                           |
| `pnpm build`       | Build every workspace package                         |
| `pnpm typecheck`   | `tsc --noEmit` across the workspace                   |
| `pnpm format`      | Prettier write                                        |

---

## Decisions

The choices that shaped the codebase. See [`docs/PLAN.md`](docs/PLAN.md) for the full rationale behind each.

- **Postgres over SQLite / Mongo.** `tsvector` + `pg_trgm` is a real full-text search engine that ships with the database. Migrations stay boring, replication is well-understood, and `pgvector` lets us add embeddings later without rewiring storage.
- **Drizzle over Prisma.** Schema-as-code in TypeScript, no separate `.prisma` DSL, no generated client to keep in sync. SQL stays inspectable.
- **Fastify over Express.** First-class TypeScript, Zod type-provider for end-to-end inferred request/response types, faster, and the plugin model maps cleanly to our middlewares (auth, rate-limit, cookie).
- **Zod schemas in `@notable/shared`.** One source of truth for request/response shapes, imported by both `api` and `web`. The DB schema (Drizzle) stays server-only — different concern, different layer.
- **JWT cookies over a session table.** Stateless, no shared store needed when we scale to multiple api replicas. Trade-off: revocation requires either short TTLs or a denylist (we use 30-day TTLs and accept it for v1).
- **Magic links over passwords.** No password storage, no reset flow, no breach surface. The trade-off — every login is an email round-trip — is acceptable for a notes app where sessions last weeks.
- **Tiptap (ProseMirror) over Lexical / Slate.** Most mature plugin ecosystem, well-documented schema, easy to render headlessly (`@tiptap/html`) for list-pane snippets.
- **Tiptap JSON in `body_json`; plain text mirror in `body_text`.** JSON is the source of truth; `body_text` is what the generated `tsvector` column reads. HTML is never stored — derived on demand.
- **Zustand + hand-rolled fetch hooks, not TanStack Query.** Started with TanStack and removed it — the surface (notes, tags, search) is small enough that a typed `ky` wrapper plus per-action hooks (`useSignIn`, `useLoadUser`, …) is less indirection than configuring queries, mutations, and a cache. Zustand holds the small slice of client state that survives route changes (current user, theme). UI state stays in `useState` / URL params.
- **Wouter over React Router.** Three routes, ~1 KB router, no surprises.
- **Sass + CSS Modules over Tailwind.** Design tokens as CSS custom properties (`--bg`, `--accent`) so dark mode is a single `@media` block in `tokens.scss`. Components own their CSS in colocated `*.module.scss` files.
- **Caddy over Nginx + certbot.** Automatic ACME, one config file, zero cert plumbing.
- **Single Caddy image, not separate web/landing/edge containers.** Static assets and reverse-proxy config travel together — one artifact to deploy for the entire web tier.
- **Authorization in the query layer, not RLS.** Every query filters by `user_id`; an audit grep is sufficient. RLS adds friction with no payoff when the API owns the database end-to-end. Easy to layer on later if we hand out direct DB access.

---

## Tradeoffs

Where we're deliberately leaving value on the table for v1:

- **Online-first, no client cache.** Reads hit the API on every navigation; writes are optimistic in the editor's local state and reconciled on response. Real offline editing (queued writes, conflict resolution) and any persistent client cache are Tier 3. CRDT-based sync (Yjs) was scoped out — too much complexity for a single-user app.
- **Last-write-wins on the server.** Single user across devices is the target. Concurrent edits on the same note from two tabs can stomp each other. Acceptable; collaborative editing is Tier 3.
- **No RLS.** See "Decisions." Means a missing `where user_id = ...` clause is a vulnerability rather than a defense-in-depth failure. Mitigated by typed query helpers — there is no untyped path to the database.
- **JWT cookies, no revocation list.** Logging out clears the cookie locally, but a stolen token is valid until expiry. 30-day TTL is the v1 stance; if this matters, add a `session_jti` denylist.
- **Single Postgres, no read replica.** Fine for hundreds-to-low-thousands of active users. Scaling story below.
- **No queue.** Magic-link emails send synchronously inside the request. At our scale, fine. A worker + queue is in the scaling section.
- **No tests yet.** v1 priority is shipping the surface. Integration tests against a real Postgres come before the first external user; mocked tests are not on the path.

---

## Scaling concerns

The architecture is meant to stay this shape for a long time. When pressure shows up:

- **More API instances.** API is stateless (JWT cookies, no in-memory session). Add `deploy: replicas: N`, put Caddy in front as the LB. Done.
- **Connection pressure on Postgres.** Add **PgBouncer** as a sidecar in transaction-pooling mode. The `postgres` driver opens fewer connections; PgBouncer multiplexes across api replicas.
- **Read scaling.** Postgres streaming replication to a read replica, route `GET /api/notes*` traffic to it. Writes stay on the primary.
- **Background work.** New service in `apps/worker/` consuming a `pg-boss` queue (Postgres-backed, no new infra). Targets: outbound email, weekly digests, embeddings backfill.
- **Real-time collab (Tier 3).** New service `apps/collab/` running `y-websocket`; persist Yjs doc snapshots into a `note_yjs (note_id, doc bytea, updated_at)` table. Caddy reverse-proxies `/collab/*` to it.
- **Semantic search.** `CREATE EXTENSION vector;` adds a `body_embedding vector(1536)` column. Worker backfills via the embedding provider of choice. Same Postgres, no new storage.
- **Backups.** WAL-G or pgBackRest container, ship base backups + WAL to S3-compatible storage (Backblaze B2 is cheapest).
- **Search at scale.** `tsvector` + `pg_trgm` comfortably handles millions of notes. If query latency starts to bite, the next move is a Postgres-driven secondary index (Tantivy, Meilisearch) — not a replacement.

Cost shape at the small end: a 2 vCPU / 4 GB VPS (~€7/mo) runs the whole stack for hundreds to low thousands of active users. Object-storage backups add ~€1–2/mo.

---

## Roadmap

### v1 — single-user notes (in progress)

- [x] Compose stack: db + api + edge + mailpit
- [x] React SPA shell (sidebar / list / editor panes)
- [x] Design system + dark mode (tokens in `styles/tokens.scss`)
- [x] Magic-link auth (login + verify + logout, hashed tokens, rate-limited)
- [x] Postgres schema + Drizzle migrations
- [ ] Notes CRUD (server routes + `ky` service hooks)
- [ ] Tiptap editor with debounced autosave + optimistic local updates
- [ ] Tags (CRUD, sidebar counts, per-note picker)
- [ ] Full-text search (`websearch_to_tsquery` + `pg_trgm` fallback)
- [ ] Persistent client cache (IndexedDB) + offline indicator

### v2 — polish + power-user

- [ ] Command palette (`⌘K`), `⌘N`, `⌘F`
- [ ] Markdown import / export
- [ ] Attachments (images, files) via S3-compatible storage
- [ ] Sharing — public read-only note links

### v3 — collaboration

- [ ] Real offline editing (queued writes, conflict resolution)
- [ ] Multi-user editing on shared notes (Yjs + `y-websocket`)
- [ ] Per-note permissions (owner / editor / viewer)
- [ ] Semantic search via `pgvector` + embedding worker

### Out of scope (no plans)

- Mobile app
- Self-service billing / multi-tenant SaaS
- Plugins / extension marketplace

---

## Docs

- [`docs/PLAN.md`](docs/PLAN.md) — full implementation plan: stack, data model, API surface, build order
- [`docs/DESIGN.md`](docs/DESIGN.md) — visual language, layout, components
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — tokens and primitives in detail
- [`docs/index.html`](docs/index.html) — static HTML prototype of the final UI
- [`docs/landing.html`](docs/landing.html) — marketing landing prototype
