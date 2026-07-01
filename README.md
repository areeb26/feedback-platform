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

Build and run the full stack without a host-side `npm run build`:

```bash
cp .env.example .env   # edit with real values for API
docker compose config  # validate compose file
docker compose up --build -d
```

Open http://localhost:8080 — nginx serves the React build and proxies `/api/*` to the API container.

## Deployment

Production deploys to a Contabo VPS via Docker Compose and GitHub Actions (push to `main`).

| Component | Path |
|-----------|------|
| Compose (local) | `docker-compose.yml` |
| Compose (production + SSL) | `docker-compose.prod.yml` |
| Deploy workflow | `.github/workflows/deploy.yml` |
| Full guide | [docs/deploy/contabo.md](docs/deploy/contabo.md) |

GitHub repository secrets required: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH`.

Manual deploy on the server:

```bash
COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml ./scripts/deploy.sh
```

## Monorepo layout

| Workspace | Purpose |
|-----------|---------|
| `packages/shared` | Zod schemas and shared types |
| `server` | Express API |
| `web` | Vite + React dashboard |
| `mobile` | Expo app (Phase 6 placeholder) |

See `PLAN.md` and `PRD.md` for full product requirements.
