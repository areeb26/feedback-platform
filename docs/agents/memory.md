# Cursor Automation Memory — Feedback Platform

Persistent context for cloud agents and PR babysit automations. Read with `AGENTS.md` and `docs/agents/babysit-pr.md`.

## Repo

- **Name:** feedback-platform
- **Remote:** `https://github.com/areeb26/feedback-platform.git`
- **Default branch:** `main`
- **Node:** 22+, npm 10+, workspaces monorepo

## Automation trigger prompt

Paste this as the Cursor Automation instruction (customize PR number if not auto-detected):

```
You are babysitting the GitHub PR that triggered this run for the feedback-platform repo.

READ FIRST (in order):
1. docs/agents/babysit-pr.md — full procedure
2. AGENTS.md — architecture and project rules
3. The PR diff and unresolved review threads

YOUR JOB:
Get this PR merge-ready. Do not merge unless explicitly asked.

EXECUTE:
1. Identify what this PR changed (shared, server, web, mobile, docker).
2. Run quality gates from repo root (only what applies):
   - packages/shared/: npm run build --workspace=packages/shared
   - server/: npm run build --workspace=server && npm run test --workspace=server
   - web/: npm run build --workspace=web && npm run test --workspace=web
   - Any change: npm test
3. If GitHub required checks are failing, fix causes in this PR's scope.
4. If failures look unrelated, merge latest main into the branch and re-check.
5. Resolve merge conflicts intelligently. Stop and report if intent conflicts.
6. Triage unresolved review comments (including Bugbot). Fix valid in-scope issues only.
7. Push scoped fixes to the PR branch.

FEEDBACK PLATFORM GUARDRAILS (never break these):
- tenantId on all MongoDB queries for tenant-scoped data
- Zod schemas in packages/shared for all API contracts
- Clerk org must match tenant.clerkOrgId on slug routes
- OpenAI / external APIs server-side only — never from web/
- Build shared package before server or web when types change
- Do not commit secrets or .env files
- Do not weaken CI or skip tests to pass checks
- No unrelated refactors

REQUIRED — PR COMMENT EVERY RUN (never finish silently):
## Babysit report
- **Status:** ready to merge / still failing / blocked — needs human
- **Checks:** what you ran
- **Fixed:** bullets
- **Manual steps:** env vars, deploy notes, etc.
- **Blockers:** what you could not fix

STOP when: mergeable + required checks green + review threads triaged.
STOP and report (no more pushes) when: blocked on secrets, prod DB, or ambiguous conflicts.
```

## Quick reference

### Dev ports

| Service | Port |
|---------|------|
| API | 3001 |
| Web (Vite) | 5173 |
| Docker (nginx) | 8080 |

### API route map

```
GET  /api/health
/api/public/surveys/:previewSlug          # public read
POST /api/public/surveys/:previewSlug/submit
/api/admin/tenants                        # super-admin CRUD
/api/tenant/me                            # org-based tenant profile
/api/tenant/by-slug/:slug/*               # tenant dashboard (locations, surveys, customers, incidents, overview, analytics, reviews)
```

### Hot files when debugging

| Symptom | Check |
|---------|-------|
| 403 on tenant page | `attachTenantFromSlug.ts`, Clerk org membership |
| Wrong tenant data | Missing `tenantId` filter in query |
| Type errors after schema change | Rebuild `packages/shared` |
| Test auth failures | `createApp({ getAuth })` in test setup |
| Page 404 | `App.tsx` route + `navigation.ts` entry |

### Test patterns

```bash
# Full suite
npm test

# Server only
npm run test --workspace=server

# Web only
npm run test --workspace=web

# Single server test file
npm run test --workspace=server -- server/tests/overview.test.ts
```

Server tests use `mongodb-memory-server` and `registerTestDbHooks()`.
Web tests use Vitest + Testing Library; mock `global.fetch`.

### Current build phases

Phases 1–3 complete. Phase 4 (overview + incident analytics) in active development. Phase 5 (reviews partial). Phase 6 (mobile) not started.

### What this repo does NOT have

- No Supabase, no PostgreSQL migrations
- No Chrome extension
- No Python backend
- No separate lint script (TypeScript compile + tests are gates)
- No TanStack Query yet (plain fetch in `web/src/api/`)

### Deploy notes

- Docker Compose: `docker compose up --build` after `npm run build`
- Env: copy `.env.example` → `.env`
- MongoDB Atlas URI required for production
