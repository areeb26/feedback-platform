# Feedback Platform — Agent Context

White-label, multi-tenant customer feedback and reputation management platform (Harlyy-style). Agency-owned SaaS: super-admin onboards client tenants; each tenant gets a branded web dashboard for surveys, incidents, analytics, and reviews.

**Repo:** `https://github.com/areeb26/feedback-platform.git`

## Monorepo layout

| Workspace | Path | Stack | Purpose |
|-----------|------|-------|---------|
| Shared types | `packages/shared/` | Zod + TypeScript | API request/response schemas; build before server/web |
| API | `server/` | Express 5, Mongoose, Clerk, Vitest | REST API, tenant isolation, MongoDB |
| Web | `web/` | Vite, React 19, React Router 7, Vitest | Super-admin + tenant dashboards, public survey form |
| Mobile | `mobile/` | Expo (placeholder) | Phase 6 — not yet implemented |

Root scripts (`package.json`):

```bash
npm install
npm run build          # shared → server → web
npm test               # shared build + server tests + web tests
npm run dev:server     # API on :3001
npm run dev:web        # Vite on :5173, proxies /api → :3001
```

## Architecture

### Multi-tenancy

- One MongoDB database; every tenant-scoped document has `tenantId`.
- Clerk Organizations map 1:1 to tenants via `tenant.clerkOrgId`.
- Super-admin: allowlisted Clerk user IDs in `SUPER_ADMIN_USER_IDS` env var.

### Auth & routing

| Surface | URL pattern | API prefix |
|---------|-------------|------------|
| Home | `/` | — |
| Public survey | `/s/:previewSlug` | `GET/POST /api/public/surveys/:slug` |
| Super-admin | `/admin/*` | `/api/admin/*` |
| Tenant dashboard | `/t/:slug/*` | `/api/tenant/by-slug/:slug/*` |

### API middleware chain

**Tenant slug routes** (`server/src/routes/tenantSlug.ts`):

1. `requireAuth` — Clerk session via `getAuth`
2. `attachTenantFromSlug` — resolve tenant by `:slug`, verify `clerkOrgId` matches session org, reject suspended tenants

**Org-based routes** (`/api/tenant/me`):

1. `requireAuth`
2. `resolveTenant` — resolve tenant by `req.auth.orgId`

**Admin routes**:

1. `requireAuth`
2. `requireSuperAdmin`

### Key server files

| File | Role |
|------|------|
| `server/src/app.ts` | Express app factory; mounts public, tenant, admin routers |
| `server/src/routes/tenantSlug.ts` | All tenant dashboard endpoints (locations, surveys, customers, incidents, overview, analytics, reviews) |
| `server/src/routes/admin.ts` | Tenant CRUD, Clerk org creation, admin invites |
| `server/src/routes/submissions.ts` | Public survey submit + customer list |
| `server/src/middleware/attachTenantFromSlug.ts` | Slug → tenant + org membership check |
| `server/src/models/*.ts` | Mongoose models (Tenant, Location, Survey, Submission, Customer, Incident, Review) |
| `server/src/services/*.ts` | Aggregation logic (overview, incident analytics, incidents, reviews) |

### Shared package

All API contracts live in `packages/shared/src/`. Export from `index.ts`. Server parses responses with Zod before sending; web parses fetch responses with the same schemas.

When adding an endpoint:

1. Add Zod schemas + types in `packages/shared/src/<module>.ts`
2. Export from `packages/shared/src/index.ts`
3. Implement route in `server/src/routes/` or service in `server/src/services/`
4. Add `web/src/api/<module>.ts` fetch helpers
5. Add page in `web/src/pages/tenant/` or `web/src/pages/admin/`
6. Register route in `web/src/App.tsx` and `web/src/tenant/navigation.ts` if tenant-facing
7. Tests: `server/tests/<module>.test.ts` and `web/tests/<Page>.test.tsx`

### Web patterns

- Tenant pages live under `web/src/pages/tenant/`; admin under `web/src/pages/admin/`.
- API clients in `web/src/api/` — plain `fetch` + Zod parse (no TanStack Query yet).
- `TenantLayout` loads shell branding via `fetchTenantShell(slug)`.
- Placeholder pages use `PlaceholderPage` for unbuilt modules (Listings, Review Analytics, etc.).

### Data model (MongoDB)

```
Tenant       { slug, name, logoUrl, primaryColor, featureFlags, clerkOrgId, status }
Location     { tenantId, name, address?, labels? }
Survey       { tenantId, locationId?, name, questions[], previewSlug }
Submission   { tenantId, surveyId, locationId, customerId?, ratings, answers }
Customer     { tenantId, name, email?, phone?, mostRecentLocationId }
Incident     { tenantId, submissionId, code, status, timeline[], locationId, assignees[] }
Review       { tenantId, locationId, source, rating, content, reply?, externalId? }
```

### Environment

See `.env.example`. Required for production: `MONGODB_URI`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `SUPER_ADMIN_USER_IDS`. Optional: Cloudinary (logos), OpenAI (AI replies, Phase 5).

### Testing

- **Server:** Vitest + supertest + mongodb-memory-server. Use `registerTestDbHooks()` from `server/tests/db.ts`. Inject auth via `createApp({ getAuth: () => ({ userId, orgId }) })`.
- **Web:** Vitest + Testing Library (jsdom). Mock `fetch` in page tests.
- Always build shared first: `npm run build --workspace=packages/shared`.

### Docker / deploy

- `docker-compose.yml` — nginx serves web build, proxies `/api` to Express.
- Target: Contabo VPS via GitHub Actions (see `PLAN.md`).

## Implementation phases (current status)

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Monorepo, auth, tenant isolation | Done |
| 2 | Super-admin, tenant shell, locations | Done |
| 3 | Surveys, submissions, customers, incidents | Done |
| 4 | Overview + incident/review analytics dashboards | Done |
| 5 | Reviews, listings, competitors, social listening, AI replies | Done (social listening = empty-state UI by design) |
| 6 | Mobile app (Expo) | Done (core flows + tests; EAS release pipeline optional) |

## Agent rules (never break)

1. **Tenant isolation** — every MongoDB query on tenant data MUST filter by `tenantId` from `req.tenant.id` (or equivalent). Never return cross-tenant data.
2. **Shared schemas** — request/response shapes defined in `packages/shared`; validate on both server output and web input.
3. **Clerk org match** — tenant slug routes verify `tenant.clerkOrgId === req.auth.orgId` in `attachTenantFromSlug`.
4. **No secrets in code** — use env vars; never commit `.env`.
5. **Build order** — `packages/shared` before `server` or `web`.
6. **No unrelated refactors** — stay in PR scope during babysit runs.
7. **Do not weaken tests or CI** to make checks pass.
8. **OpenAI / external APIs** — server-side only; never call from `web/` directly.
9. **Suspended tenants** — middleware returns 403; do not bypass.

## Quality gates (from repo root)

| Area changed | Commands |
|--------------|----------|
| `packages/shared/` | `npm run build --workspace=packages/shared` |
| `server/` | `npm run build --workspace=server` && `npm run test --workspace=server` |
| `web/` | `npm run build --workspace=web` && `npm run test --workspace=web` |
| Any | `npm test` (full suite) |
| Full release check | `npm run build` |

There is no separate lint script yet; TypeScript strict compile + tests are the gates.

## Product docs

- `PRD.md` — user stories and requirements
- `PLAN.md` — phased build plan and schema
- `README.md` — local dev setup
