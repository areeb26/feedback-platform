# PRD: White-Label Feedback & Reputation Platform

## Problem Statement

Agencies serving local businesses (restaurants, retail chains) need a branded platform to collect customer feedback, track and resolve incidents, monitor online reputation, and act on reviews — without building custom software per client. Existing solutions like Harlyy provide this capability but are not owned or white-labeled for the agency's own client base.

The agency needs to onboard multiple client businesses (tenants), each with multiple branch locations, give them a professional dashboard matching industry-standard feedback tools, and provide mobile access for managers responding to incidents and reviews on the go — all while maintaining strict data isolation between clients.

## Solution

A self-hosted, multi-tenant SaaS platform that:

1. Lets the platform owner (super-admin) create and manage client tenants with custom branding
2. Gives each client's staff a web dashboard for the full feedback and reputation workflow (surveys → submissions → incidents → analytics → reviews)
3. Provides a public survey form for end-customers to submit feedback without logging in
4. Offers a mobile app (iOS/Android) for overview, incident management, review replies, and push alerts
5. Integrates with Google Business Profile where APIs exist, and provides full UI with phased/manual data for other sources

## User Stories

### Platform owner (super-admin)

1. As a platform owner, I want to create a new tenant with business name, logo, and brand color, so that each client sees their own branded experience.
2. As a platform owner, I want to invite a tenant admin via email, so that the client can access their dashboard without me managing their passwords.
3. As a platform owner, I want to view usage stats per tenant (submissions, surveys, users), so that I can monitor platform adoption.
4. As a platform owner, I want to enable or disable feature modules per tenant, so that I can control what each client accesses (e.g. Social Listening off until configured).
5. As a platform owner, I want to suspend a tenant, so that I can revoke access for non-paying or inactive clients.
6. As a platform owner, I want to edit tenant branding after creation, so that clients can rebrand without a new account.
7. As a platform owner, I want a separate admin layout from the tenant dashboard, so that I never confuse platform management with client operations.

### Tenant admin

8. As a tenant admin, I want to add and manage branch locations, so that feedback and incidents are attributed to the correct store.
9. As a tenant admin, I want to invite staff members to my organization, so that my team can access the dashboard.
10. As a tenant admin, I want to configure tenant settings (profile, locations), so that our data is accurate.
11. As a tenant admin, I want to see only my tenant's data, so that our business information is private from other clients.

### Tenant staff — Surveys & feedback

12. As a staff member, I want to create surveys with custom questions, so that I can collect targeted feedback (call centre, takeaway, delivery, packaging).
13. As a staff member, I want a preview link for each survey, so that I can test the form before sharing it.
14. As a staff member, I want to share a public survey URL with customers, so that they can submit feedback without an account.
15. As a staff member, I want submissions to automatically create incidents for low ratings, so that negative feedback is tracked and actionable.
16. As a staff member, I want to view all survey submissions, so that I can see raw customer feedback.
17. As a staff member, I want to filter submissions by location, survey, date, and labels, so that I can find relevant feedback quickly.

### Tenant staff — Incidents

18. As a staff member, I want to see a list of all incidents with code, rating, survey, location, and status, so that I can prioritize responses.
19. As a staff member, I want to view an incident timeline (created → reviewed → resolved), so that I can track progress.
20. As a staff member, I want to update incident status and assign team members, so that accountability is clear.
21. As a staff member, I want to filter incidents by code, survey, location, status, assignee, and date, so that I can manage workload.
22. As a staff member, I want to export incidents, so that I can share reports with management.
23. As a staff member, I want to manually create a submission/incident, so that I can log offline feedback.

### Tenant staff — Customers

24. As a staff member, I want to see a table of customers derived from submissions, so that I can identify repeat feedback providers.
25. As a staff member, I want to see each customer's most recent location, phone, and email, so that I can follow up.
26. As a staff member, I want to search and filter customers, so that I can find specific individuals.
27. As a staff member, I want to export customer data, so that I can use it in other tools.

### Tenant staff — Overview dashboard

28. As a staff member, I want to see a Smile Score KPI with trend vs previous period, so that I can gauge overall satisfaction at a glance.
29. As a staff member, I want to see submission count, total incidents, and resolution rate, so that I can monitor operational health.
30. As a staff member, I want a rating breakdown (5-star to 1-star distribution), so that I can understand sentiment shape.
31. As a staff member, I want to see 3rd-party review summaries (Google, Foodpanda), so that I have a unified reputation view.
32. As a staff member, I want to filter the dashboard by date range, location, survey, and labels, so that I can analyze specific periods or branches.
33. As a staff member, I want industry benchmark comparisons, so that I can contextualize our performance.

### Tenant staff — Incident analytics

34. As a staff member, I want to see total and resolved incident counts with trends, so that I can track improvement.
35. As a staff member, I want average review and resolve time metrics, so that I can measure response speed.
36. As a staff member, I want a chart of new incidents by severity over time, so that I can spot spikes.
37. As a staff member, I want a chart of average review and resolve times over time, so that I can track efficiency trends.
38. As a staff member, I want a staff performance table, so that I can see per-person incident handling metrics.

### Tenant staff — Reviews

39. As a staff member, I want to see all reviews from connected sources in a card grid, so that I can browse feedback visually.
40. As a staff member, I want to see review status (not replied, replied, reply not supported), so that I know what needs action.
41. As a staff member, I want to reply to Google reviews from the dashboard, so that I can manage reputation in one place.
42. As a staff member, I want to connect Google Reviews via OAuth, so that reviews sync automatically.
43. As a staff member, I want to import Foodpanda reviews via CSV, so that I can include non-API sources.
44. As a staff member, I want to filter reviews by listing, directory, rating, category, content, and date, so that I can focus on priorities.
45. As a staff member, I want to bulk-select unreplied reviews and generate AI reply drafts, so that I can respond faster.
46. As a staff member, I want to configure auto-reply rules, so that common review types get templated responses.
47. As a staff member, I want to export reviews, so that I can share with stakeholders.

### Tenant staff — Review analytics

48. As a staff member, I want total reviews, average rating, reply rate, and positive review percentage KPIs, so that I can measure reputation health.
49. As a staff member, I want a stacked bar chart of review ratings over time, so that I can see sentiment trends.
50. As a staff member, I want a listings breakdown table with reviews, rating, positive/negative %, and reply rate, so that I can compare branches.
51. As a staff member, I want to filter review analytics by labels, listings, directory, and date range, so that I can drill down.

### Tenant staff — Listings

52. As a staff member, I want to see my business listings across directories, so that I know where we're present online.
53. As a staff member, I want to sync listings from Google Business Profile, so that data stays current.

### Tenant staff — Competitor analytics

54. As a staff member, I want to add competitors manually, so that I can benchmark against local rivals.
55. As a staff member, I want to see competitor review counts and ratings via Google Places, so that I can compare performance.

### Tenant staff — Social listening

56. As a staff member, I want a social listening page with an informational banner about data limitations, so that I understand what the feature provides.
57. As a staff member, I want to see social mentions when configured, so that I can monitor public conversations about my business.
58. As a staff member, I want to select a mention and view details, so that I can investigate individual posts.

### Tenant staff — Surveys management

59. As a staff member, I want a surveys table with name, preview link, submission count, and created date, so that I can manage all surveys.
60. As a staff member, I want to access survey links for distribution, so that customers can find the form.
61. As a staff member, I want to view submissions per survey, so that I can analyze survey-specific feedback.

### End customer (public)

62. As a customer, I want to open a survey link on my phone without creating an account, so that giving feedback is frictionless.
63. As a customer, I want to rate my experience and answer survey questions, so that my feedback reaches the business.
64. As a customer, I want the survey page to show the business branding, so that I trust the form is legitimate.

### Mobile app user

65. As a mobile user, I want to log in with my organization credentials, so that I access my employer's data securely.
66. As a mobile user, I want to switch between organizations if I belong to multiple, so that I can manage different clients.
67. As a mobile user, I want to see overview KPIs on my phone, so that I can check satisfaction on the go.
68. As a mobile user, I want to view and update incident status from my phone, so that I can respond to issues in the field.
69. As a mobile user, I want to browse and reply to reviews from my phone, so that I can manage reputation away from my desk.
70. As a mobile user, I want push notifications for new incidents and unreplied reviews, so that I don't miss urgent items.

### Cross-cutting

71. As any authenticated user, I want to contact support via WhatsApp link, so that I can reach the platform owner for help.
72. As any user, I want the UI to match the Harlyy-style layout (sidebar, breadcrumbs, filter pills, KPI cards, data tables), so that the experience feels professional and familiar.

## Implementation Decisions

### Architecture

- **Monorepo** with npm workspaces: `web/` (Vite + React + React Router), `server/` (Express + Mongoose), `mobile/` (Expo), `packages/shared/` (Zod schemas, types, API client)
- **Multi-tenant isolation**: every MongoDB document scoped by `tenantId`; API middleware resolves tenant from Clerk Organization ID
- **Auth**: Clerk with Organizations; super-admin identified by allowlisted Clerk user IDs
- **Routing**: path-based tenant URLs (`/t/:slug/overview`); super-admin at `/admin/*`; public surveys at `/s/:previewSlug`

### Modules

| Module | Responsibility |
|--------|----------------|
| `server/middleware/auth` | Clerk JWT verification, org → tenant resolution |
| `server/middleware/tenant` | Enforce `tenantId` on all queries |
| `server/models/*` | Mongoose schemas for all entities |
| `server/routes/admin` | Super-admin tenant CRUD, feature flags, usage |
| `server/routes/tenant/*` | Per-module tenant-scoped endpoints |
| `server/routes/public` | Unauthenticated survey fetch + submit |
| `web/layouts` | AdminLayout, TenantLayout, PublicLayout |
| `web/pages/*` | One page per Harlyy screen from screenshots |
| `mobile/screens/*` | Overview, Incidents, Reviews, Auth |
| `packages/shared` | Shared validation and API types |

### Integrations (phased)

| Integration | v1 behavior |
|-------------|-------------|
| Google Business Profile API | Live OAuth connect, review sync, listing sync, reply |
| Foodpanda | CSV import + manual entry; UI shows source badge |
| Google Places API | Competitor public rating/review count |
| OpenAI GPT-4o-mini | AI reply draft generation |
| Social Listening | Full UI; empty state until provider configured |
| Expo Push | Mobile notifications for incidents and reviews |
| Cloudinary | Tenant logo upload |
| MongoDB Atlas | Managed database (remote from Contabo VPS) |

### Incident auto-creation

```
on submission.created:
  if submission.rating <= threshold (configurable, default 3):
    create incident with code format {TENANT_PREFIX}-{YYMMDD}-{SEQ}
    timeline: [created]
```

### Super-admin feature flags (per tenant)

```
features: {
  socialListening: boolean
  competitorAnalytics: boolean
  aiReplies: boolean
  googleReviews: boolean
}
```

### Deployment (Contabo)

- Docker Compose: `nginx` + `api` services
- nginx serves `web/dist` static files; proxies `/api/*` to Express on port 3001
- SSL via Certbot; GitHub Actions deploys on push to main
- MongoDB Atlas connection string in `.env`

## Testing Decisions

### What makes a good test

- Test **external behavior** at system boundaries: HTTP request → response, user-visible outcomes
- Do **not** test implementation details (internal function calls, Mongoose query shapes)
- Prefer **one primary seam** for integration tests: the **HTTP API** with a test MongoDB instance

### Primary test seam

**HTTP API integration tests** against Express routes with:

- In-memory or test MongoDB (mongodb-memory-server)
- Mocked Clerk JWT middleware (inject test user + org)
- Assert response status, body shape (Zod), and tenant isolation (tenant A cannot read tenant B data)

This is the highest seam that covers schema, business logic, auth, and tenant isolation without browser or device automation.

### Secondary seams (later phases)

| Seam | When | What |
|------|------|------|
| Playwright E2E | Phase 3+ | Public survey submit → incident created (critical user journey) |
| Expo component tests | Phase 6 | Screen renders with mocked API responses |

### Modules tested

| Module | Test type |
|--------|-----------|
| `server/routes/public` | API integration — survey submit creates submission + incident |
| `server/routes/tenant/incidents` | API integration — CRUD, tenant isolation |
| `server/routes/admin/tenants` | API integration — only super-admin can create tenant |
| `server/middleware/tenant` | API integration — cross-tenant access returns 403 |
| `web` | E2E (Phase 3+) — one happy-path journey per phase |
| `mobile` | Manual + mocked API in Phase 6 |

### Prior art

- Project currently has Playwright scripts for screenshot capture (`screenshot-*.mjs`) — reuse Playwright for E2E when web UI exists
- No existing test suite; API integration tests establish the pattern

## Out of Scope

- Stripe billing and subscription tiers
- Super-admin user impersonation
- Custom domains per tenant (subdomains)
- Audit logs and compliance exports
- Full mobile parity with web dashboard
- Live Foodpanda API integration
- Live social media streaming (Twitter/X, Facebook, Instagram)
- Real-time WebSocket updates
- Multi-language UI (English only v1)

## Further Notes

- **Reference UI**: 12 screenshots in `screenshots/` from `dashboard.harlyy.com` (Hafiz Sweets Enterprise) define the target layout, navigation IA, and component patterns
- **Clerk free tier**: sufficient for early clients (100 orgs, 50k MRU, 20 members/org)
- **Product name and domain**: TBD — does not block Phase 1
- **Issue tracker**: not yet configured; PRD published locally as `PRD.md`

### Testing seam confirmation

> **Proposed primary seam**: HTTP API integration tests with mocked Clerk auth and test MongoDB.  
> This single seam validates tenant isolation, business rules (incident auto-creation), and API contracts across all phases. E2E added only for the public survey → incident journey in Phase 3.
