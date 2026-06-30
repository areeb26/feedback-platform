# Babysit PR

Keep a pull request merge-ready: triage review comments, resolve merge conflicts, and fix quality-gate failures caused by the PR.

Use this doc for **local agent sessions**, **Cursor Automations (cloud)**, and **`/loop` babysit runs**. Cloud agents do not see `~/.cursor/skills-cursor/` — they read this committed file plus `AGENTS.md`.

## Goal

Get the triggered PR to a merge-ready state:

- Mergeable (no conflicts, or conflicts resolved)
- Quality gates pass (see below)
- Unresolved review comments triaged (including Bugbot)

Do **not** merge unless the user explicitly asks.

## Procedure

### 1. Load project context

1. Read `AGENTS.md` for stack, architecture, and hot files.
2. Read the PR diff — only change files this PR touches unless merging `main`.

### 2. Identify what changed

Classify PR changes:

| Area | Path | Notes |
|------|------|-------|
| Shared schemas | `packages/shared/` | Build first; server + web depend on it |
| API | `server/` | Express routes, services, models, middleware |
| Web | `web/` | React pages, API clients, tests |
| Mobile | `mobile/` | Expo placeholder — rarely touched |
| Infra | `docker/`, `docker-compose.yml` | Deploy config |

### 3. Quality gates (run from repo root)

| Area changed | Commands |
|--------------|----------|
| `packages/shared/` | `npm run build --workspace=packages/shared` |
| `server/` | `npm run build --workspace=server` && `npm run test --workspace=server` |
| `web/` | `npm run build --workspace=web` && `npm run test --workspace=web` |
| Any workspace | `npm test` |
| Release confidence | `npm run build` |

If GitHub CI checks exist on the PR, treat failing required checks the same as local gate failures.

### 4. Merge conflicts

Resolve intelligently, preserving intent on both the PR branch and `main`. If intents truly conflict, stop and report — do not guess.

If CI failures look unrelated to this PR, merge latest `main` into the branch and re-run gates.

### 5. Review comments

- Fetch unresolved PR review threads (including Bugbot).
- Fix valid bugs and change requests in scope.
- Skip or explain invalid / out-of-scope comments.
- Do not read entire raw API payloads — only comment bodies and locations needed to act.

### 6. Feedback Platform guardrails

- Filter all MongoDB queries on tenant data by `tenantId` from `req.tenant.id`.
- API contracts in `packages/shared` — add schemas there before implementing routes.
- Clerk session required on tenant/admin routes; slug routes verify org membership via `attachTenantFromSlug`.
- Public survey routes (`/api/public/*`) are the only unauthenticated write endpoints.
- OpenAI and external API keys are server-side only — never from `web/`.
- Build `packages/shared` before `server` or `web` when types change.
- Do not commit `.env` or secrets.
- Do not weaken CI workflows or skip tests to pass checks.
- Do not make unrelated refactors outside the PR scope.
- New tenant pages: register in `web/src/App.tsx` and `web/src/tenant/navigation.ts`.
- New API endpoints: wire in `server/src/routes/tenantSlug.ts` (or appropriate router) and add `web/src/api/` client.

### 7. Push and report

Push scoped fixes to the PR branch.

**Required:** leave a PR comment in this format:

```markdown
## Babysit report

- **Status:** ready to merge / still failing / blocked — needs human
- **Checks:** shared build, server build+test, web build+test (list what ran)
- **Fixed:** bullet list
- **Manual steps:** e.g. set env vars on server, run migration (N/A for Mongo — schema is Mongoose)
- **Blockers:** anything not fixed
```

## Stop conditions

**Done** when: mergeable + required checks green + review threads triaged (or explained).

**Stop and report** when: blocked on secrets, production DB access, ambiguous merge intent, or failures outside PR scope.
