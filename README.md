# Feedback Platform

White-label customer feedback and reputation management platform.

## Prerequisites

- Node.js 22+
- npm 10+
- Docker & Docker Compose (for production-like local run)

## Install

```bash
npm install
npm run build --workspace=packages/shared
```

## Development

Terminal 1 — API:

```bash
npm run dev:server
```

Terminal 2 — Web (proxies `/api` to port 3001):

```bash
npm run dev:web
```

Open http://localhost:5173 — you should see `API: ok`.

Super-admin panel: http://localhost:5173/admin/tenants (requires Clerk session + `SUPER_ADMIN_USER_IDS` on API).

Tenant dashboard: http://localhost:5173/t/{slug}/overview (requires Clerk org membership for that tenant).

## Test

```bash
npm test
```

## Docker (local)

```bash
cp .env.example .env
npm run build
docker compose config   # validate compose file
docker compose up --build
```

Open http://localhost:8080

## Monorepo layout

| Workspace | Purpose |
|-----------|---------|
| `packages/shared` | Zod schemas and shared types |
| `server` | Express API |
| `web` | Vite + React dashboard |
| `mobile` | Expo app (Phase 6 placeholder) |

See `PLAN.md` and `PRD.md` for full product requirements.
