# @notable/web

The Notable web app. Vite + React 19 + TypeScript. Styles via Sass + CSS Modules.

## Develop

From the repo root:

```sh
pnpm --filter @notable/web dev
```

Or from this directory:

```sh
pnpm dev
```

Vite serves on `http://localhost:5173` (or the next free port if 5173 is taken).

## Scripts

| Script           | What it does                         |
| ---------------- | ------------------------------------ |
| `pnpm dev`       | Vite dev server with HMR             |
| `pnpm build`     | `tsc -b` then `vite build` → `dist/` |
| `pnpm typecheck` | `tsc -b` only                        |
| `pnpm lint`      | ESLint                               |
| `pnpm preview`   | Serve the built `dist/` locally      |

## Architecture

See [`docs/PLAN.md`](../../docs/PLAN.md) at the repo root for the full implementation plan — stack choices, data model, API surface, component inventory, and step-by-step build order.
