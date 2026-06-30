# Plan: White-Label Feedback & Reputation Platform

_Locked via grill — by Claude + areebahmedkhan_

## Goal

Build a white-label, multi-tenant customer feedback and reputation management platform for agency-owned clients (e.g. restaurant chains like Hafiz Sweets). The product mirrors the Harlyy dashboard captured in project screenshots: surveys, submissions, incidents, analytics, reviews, listings, and supporting reputation modules — plus a super-admin panel for tenant onboarding and a mobile app for on-the-go incident and review management.

## Approach

1. **Phase 1 — Foundation**  
   Scaffold monorepo (`web/`, `mobile/`, `server/`, `packages/shared/`). Express API with Mongoose models. Clerk auth with Organizations mapped to tenants. Tenant isolation middleware on every API route. Shared Zod types and API client. Docker Compose skeleton for Contabo.

2. **Phase 2 — Super-admin + tenant shell**  
   Super-admin dashboard (separate layout): tenant CRUD, branding (logo, name, color, slug), Clerk org creation + admin invite, usage snapshot, per-tenant feature flags. Tenant dashboard shell: sidebar navigation matching Harlyy IA, multi-location CRUD, path-based routing (`/t/:slug/*`).

3. **Phase 3 — Core feedback loop**  
   Surveys CRUD with preview links. Public survey submission form (no auth). Submissions stored with location + customer linkage. Auto-create incidents on low ratings. Customers table. Incidents list with status timeline.

4. **Phase 4 — Dashboard + analytics**  
   Overview dashboard (Smile Score, KPIs, rating breakdown, 3rd-party review summary). Incident Analytics (charts, staff performance table). Review Analytics (KPIs, stacked bar chart, listings breakdown).

5. **Phase 5 — Reputation module**  
   Reviews page (Google Business Profile API + CSV import for Foodpanda). Listings sync via Google. Competitor Analytics UI with manual competitor setup + Google Places. Social Listening UI with empty/setup state. AI reply generation (OpenAI). Auto-reply rules engine.

6. **Phase 6 — Mobile app**  
   Expo app: Clerk auth, org picker, overview KPIs, incidents list/detail/status updates, reviews list/reply, push notifications via Expo Push.

## Key decisions & tradeoffs

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Product model | White-label for agency clients | Agency operates platform; clients get branded dashboards |
| Tenancy | Hybrid multi-tenant SaaS | One codebase/DB; `tenantId` on all documents; Clerk Org = tenant |
| Stack | React (Vite) + Express + MongoDB + Clerk | User preference; Clerk free tier sufficient for early scale (100 orgs, 50k MRU) |
| Mobile | Expo, medium scope | Overview + incidents + reviews + push; not full web parity |
| Scope | Full app (all Harlyy modules) | Every screen from screenshots ships |
| Integrations | Full UI now, phased data | Google API live; Foodpanda CSV; Social Listening empty state until provider wired |
| Super-admin | Full panel v1 | Tenant CRUD, branding, invites, usage, feature flags; billing/impersonation deferred |
| Locations | Multi-location per tenant from day one | Matches Harlyy filters and branch-specific reviews/surveys |
| Repo layout | Monorepo: web + mobile + server + shared | One API serves web and mobile |
| Hosting | Contabo VPS (web + API) | Self-hosted; MongoDB Atlas + Clerk remain managed |
| Deploy | Docker Compose + GitHub Actions → Contabo | nginx serves React build, proxies `/api` to Express, Certbot SSL |
| Tenant URLs | Path-based `/t/:slug/...` | Custom subdomains deferred |
| Build order | 6 phases, backend-first per phase | Pilot-ready after Phase 3 |

### Core schema (MongoDB)

```
Tenant       { slug, name, logoUrl, primaryColor, featureFlags, clerkOrgId }
Location     { tenantId, name, address?, labels? }
Survey       { tenantId, locationId?, name, questions[], previewSlug }
Submission   { tenantId, surveyId, locationId, customerId?, ratings, answers }
Customer     { tenantId, name, email?, phone?, mostRecentLocationId }
Incident     { tenantId, submissionId, code, status, timeline[], locationId, assignees[] }
Review       { tenantId, locationId, source, rating, content, reply?, externalId? }
Listing      { tenantId, locationId, directory, externalId, rating, reviewCount }
```

### API contract principles

- All tenant-scoped routes require Clerk session + org membership matching `tenant.clerkOrgId`
- Super-admin routes require platform-owner role (allowlisted Clerk user IDs)
- Public routes: `GET /public/surveys/:slug`, `POST /public/surveys/:slug/submit` (no auth)
- Responses use shared Zod schemas from `packages/shared`

## Risks / open questions

- **Foodpanda**: No public API — CSV import or manual entry until partner integration exists
- **Social Listening**: Third-party data providers are expensive/restricted — UI ships with setup empty state
- **Google OAuth**: Google Business Profile API approval process may delay live reviews
- **Contabo ops**: Self-hosted means manual SSL, backups, and monitoring responsibility
- **Clerk limits**: 20 members/org on free tier — upgrade to Pro when a client exceeds this
- **Product name / domain**: Not yet chosen

## Out of scope

- Stripe billing and subscription management (v1)
- Super-admin impersonation of tenant users
- Custom domains per tenant
- Audit logs
- Full web parity on mobile
- Real-time Foodpanda / social platform integrations (v1)
- Competitor Analytics live data beyond Google Places public data
