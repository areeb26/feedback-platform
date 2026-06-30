#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

create() {
  local title="$1"
  local body="$2"
  gh issue create --title "$title" --label "ready-for-agent,enhancement" --body "$body"
}

create "Foundation: monorepo scaffold, health API, Docker skeleton" "$(cat <<'EOF'
## Parent

#1

## What to build

Scaffold the npm workspaces monorepo with `web/` (Vite + React), `server/` (Express + TypeScript), `mobile/` (Expo placeholder), and `packages/shared/` (Zod schemas + shared types). Stand up a health-check API (`GET /api/health`) and a minimal web app that confirms connectivity. Add Docker Compose skeleton (nginx + api services) and `.env.example` documenting required env vars (MongoDB Atlas, Clerk keys). No auth or business logic yet — just the skeleton that all slices build on.

## Acceptance criteria

- [ ] Monorepo with npm workspaces boots via documented install commands
- [ ] `GET /api/health` returns 200 with version info
- [ ] Web app loads in dev and shows API health status
- [ ] `packages/shared` exports at least one Zod schema consumed by server
- [ ] `docker-compose.yml` starts nginx + api services locally
- [ ] `.env.example` lists all required environment variables

## Blocked by

None — can start immediately
EOF
)"

create "Auth & tenant isolation middleware" "$(cat <<'EOF'
## Parent

#1

## What to build

Integrate Clerk authentication on the API and web app. Create the `Tenant` Mongoose model (`slug`, `name`, `logoUrl`, `primaryColor`, `featureFlags`, `clerkOrgId`). Build middleware that verifies Clerk JWT, resolves the active Organization to a tenant document, and attaches `tenantId` to the request context. Add super-admin guard using allowlisted Clerk user IDs. Write API integration tests proving tenant A cannot access tenant B data.

## Acceptance criteria

- [ ] Unauthenticated requests to tenant routes return 401
- [ ] Authenticated user with valid org receives resolved `tenantId` on request
- [ ] Cross-tenant access attempt returns 403
- [ ] Super-admin allowlist middleware works independently of org membership
- [ ] Integration tests cover auth + tenant isolation using test MongoDB

## Blocked by

- #2

## User stories covered

10, 11
EOF
)"

create "Super-admin: onboard tenant end-to-end" "$(cat <<'EOF'
## Parent

#1

## What to build

Build the super-admin panel at `/admin/*` with a distinct layout. Implement tenant creation flow: form collects business name, slug, logo upload (Cloudinary), primary color, and admin email. On submit: create Clerk Organization, persist Tenant document, send admin invite, set default feature flags. Include tenant list, edit branding, suspend tenant, and usage snapshot (submission/survey/user counts — counts can be zero initially).

## Acceptance criteria

- [ ] Super-admin routes inaccessible to non-allowlisted users
- [ ] Create tenant form produces Clerk org + MongoDB tenant + admin invite
- [ ] Tenant list shows all tenants with status (active/suspended)
- [ ] Edit tenant updates branding fields
- [ ] Suspend tenant blocks tenant users from API access
- [ ] Usage snapshot displays per-tenant counts

## Blocked by

- #3

## User stories covered

1, 2, 3, 4, 5, 6, 7
EOF
)"

create "Tenant dashboard shell, navigation & locations" "$(cat <<'EOF'
## Parent

#1

## What to build

Build the tenant dashboard layout matching Harlyy screenshots: collapsible sidebar with Feedback, Reputation, and Platform sections, breadcrumbs, Settings and Contact Support links. Implement path-based routing at `/t/:slug/*`. Add Location CRUD (name, address, labels) in tenant Settings. Apply per-tenant branding (logo, primary color) to the shell. Guard routes so users only access their own tenant slug.

## Acceptance criteria

- [ ] Tenant user lands on `/t/:slug/overview` after login
- [ ] Sidebar navigation matches Harlyy IA from screenshots
- [ ] Tenant branding (logo, color) applied to shell
- [ ] Locations can be created, edited, and listed
- [ ] User cannot access another tenant's slug (403 or redirect)
- [ ] Contact Support opens WhatsApp link

## Blocked by

- #4

## User stories covered

8, 9, 10, 71, 72
EOF
)"

create "Surveys: create, list, and preview links" "$(cat <<'EOF'
## Parent

#1

## What to build

Implement survey management end-to-end: API + web UI for survey CRUD with name, optional location, and questions array (rating + text question types). Generate unique `previewSlug` per survey. Surveys table shows name, preview link, submission count, created date, and row actions. Include Survey Links and Refresh actions in page header matching screenshots.

## Acceptance criteria

- [ ] Tenant user can create, edit, and delete surveys
- [ ] Each survey has a working preview link (`/s/:previewSlug`)
- [ ] Surveys table matches screenshot layout (name, preview link, submissions, created at)
- [ ] Surveys scoped to tenant and optionally to a location
- [ ] API responses validated with shared Zod schemas

## Blocked by

- #5

## User stories covered

12, 13, 59, 60, 61
EOF
)"

create "Public survey form → submission + customer record" "$(cat <<'EOF'
## Parent

#1

## What to build

Build the unauthenticated public survey page at `/s/:previewSlug` showing tenant branding. Customer submits rating and answers; API creates Submission document linked to survey, tenant, and location, and upserts Customer record (name, email, phone, mostRecentLocationId). Customers table page shows resulting records with search and export. Write API integration test: public submit → submission persisted → customer visible.

## Acceptance criteria

- [ ] Public survey loads without auth and shows business branding
- [ ] Submit creates Submission with correct tenant/survey/location linkage
- [ ] Customer upserted or updated with most recent location
- [ ] Customers table displays records with filters and export
- [ ] Integration test covers full public submit → customer path

## Blocked by

- #6

## User stories covered

14, 16, 24, 25, 26, 27, 62, 63, 64
EOF
)"

create "Incidents: auto-create, list, timeline, and status updates" "$(cat <<'EOF'
## Parent

#1

## What to build

When a submission rating is at or below threshold (default 3), auto-create an Incident with code format `{PREFIX}-{YYMMDD}-{SEQ}` and initial timeline event. Build incidents list page matching screenshots: code, timeline visualization (created → reviewed → resolved), rating badge, survey, labels, metrics, location, filters, export, and manual "Create Submission" action. Support status updates and assignee management.

## Acceptance criteria

- [ ] Low-rating submission auto-creates incident with correct code format
- [ ] Incidents list matches screenshot columns and filter pills
- [ ] Timeline updates when status changes (reviewed, resolved)
- [ ] Filters work for survey, location, status, assignee, date
- [ ] Manual submission creation works from incidents page
- [ ] Integration test: low rating submit → incident created

## Blocked by

- #7

## User stories covered

15, 18, 19, 20, 21, 22, 23
EOF
)"

create "Overview dashboard with KPIs, charts, and filters" "$(cat <<'EOF'
## Parent

#1

## What to build

Build the Overview page matching screenshots: Smile Score KPI with trend, Submissions, Total Incidents, Resolved % cards; semi-circular Smile Score gauge with target; rating breakdown bars (5→1 star); 3rd-party reviews summary panel (Google/Foodpanda placeholders); submission ratings chart; industry benchmarks section. Global filter bar: date range, location, survey, labels.

## Acceptance criteria

- [ ] Overview renders all KPI cards with correct calculations from tenant data
- [ ] Smile Score gauge and rating breakdown reflect submission ratings
- [ ] Date range and location filters update all dashboard widgets
- [ ] Layout matches `screenshots/01-dashboard-home.png`
- [ ] Empty states handled gracefully for new tenants

## Blocked by

- #8

## User stories covered

28, 29, 30, 31, 32, 33
EOF
)"

create "Incident analytics with charts and staff performance" "$(cat <<'EOF'
## Parent

#1

## What to build

Build Incident Analytics page: KPI cards (total incidents, resolved, avg review time, avg resolve time) with trend indicators; "New Incidents" bar chart by severity over time; "Average Review & Resolve Times" area chart; Staff Performance table with per-member metrics and export. Filters: location search, date range.

## Acceptance criteria

- [ ] KPI cards calculate correctly from incident data
- [ ] Bar chart shows incidents by severity over selected period
- [ ] Area chart shows review/resolve time trends
- [ ] Staff performance table renders per-assignee metrics
- [ ] Layout matches `screenshots/05-incident-analytics.png`

## Blocked by

- #8

## User stories covered

34, 35, 36, 37, 38
EOF
)"

create "Reviews: CSV import, card grid, and manual reply" "$(cat <<'EOF'
## Parent

#1

## What to build

Build Reviews page matching screenshots: card grid with platform icon, reviewer name, status badge (Not Replied / Reply Not Supported), star rating, content, location, and reply action. Support CSV import for Foodpanda reviews. Implement bulk select, "Select all unreplied", and manual reply submission. Filter pills: listing, directory, rating, categories, content, created at. Export button.

## Acceptance criteria

- [ ] Reviews display in card grid matching screenshot layout
- [ ] CSV import creates review records with source badge
- [ ] Reply updates review status to replied
- [ ] Bulk selection and filters work correctly
- [ ] Foodpanda reviews show "Reply Not Supported" where applicable

## Blocked by

- #5

## User stories covered

39, 40, 43, 44, 47
EOF
)"

create "Review analytics dashboard" "$(cat <<'EOF'
## Parent

#1

## What to build

Build Review Analytics page: KPI cards (total reviews, average rating, reply rate, positive reviews %); stacked bar chart of ratings over time; Listings breakdown table with reviews, rating, positive/negative %, reply rate; tabs for Listings vs Listing Labels; sort and category toggle. Filters: labels, listings, directory, date range.

## Acceptance criteria

- [ ] KPI cards calculate from review data
- [ ] Stacked bar chart renders rating distribution over time
- [ ] Listings table shows per-location breakdown with sort
- [ ] Filters update all analytics widgets
- [ ] Layout matches `screenshots/07-review-analytics.png`

## Blocked by

- #11

## User stories covered

48, 49, 50, 51
EOF
)"

create "Google Business Profile: OAuth connect, sync, and reply" "$(cat <<'EOF'
## Parent

#1

## What to build

Implement "Connect Google Reviews" OAuth flow via Google Business Profile API. Sync reviews into Review collection with `externalId` deduplication. Enable live reply to Google reviews from the dashboard. Show Google rating and review count on Overview 3rd-party panel. Handle OAuth token refresh and error states.

## Acceptance criteria

- [ ] OAuth connect flow completes and stores tokens per tenant
- [ ] Review sync pulls new Google reviews without duplicates
- [ ] Reply submitted from dashboard posts to Google
- [ ] Overview shows live Google rating and count
- [ ] Graceful error UI when OAuth expires or quota exceeded

## Blocked by

- #11

## User stories covered

41, 42
EOF
)"

create "Listings management and Google sync" "$(cat <<'EOF'
## Parent

#1

## What to build

Build Listings page showing business listings across directories per location. Sync listings from Google Business Profile for connected tenants. Display directory name, rating, review count, and location linkage.

## Acceptance criteria

- [ ] Listings page renders per-location directory entries
- [ ] Google sync populates listing data for connected accounts
- [ ] Listings scoped to tenant and location
- [ ] Layout matches `screenshots/11-listings.png`

## Blocked by

- #13

## User stories covered

52, 53
EOF
)"

create "Competitor analytics with manual setup and Google Places" "$(cat <<'EOF'
## Parent

#1

## What to build

Build Competitor Analytics page UI. Allow tenant admin to add competitors manually. Fetch public rating and review count via Google Places API. Display comparison charts/tables. Respect tenant feature flag `competitorAnalytics`.

## Acceptance criteria

- [ ] Competitor CRUD works for tenant admins
- [ ] Google Places data populates competitor ratings
- [ ] Page hidden when feature flag disabled
- [ ] Layout matches `screenshots/08-competitor-analytics.png`

## Blocked by

- #5

## User stories covered

54, 55
EOF
)"

create "Social listening UI with setup empty state" "$(cat <<'EOF'
## Parent

#1

## What to build

Build Social Listening page matching screenshots: informational banner about data limitations, Mentions split-pane layout (list + detail), empty state ("No mentions found, contact support to get setup"). Respect tenant feature flag `socialListening`. No live social API integration in v1 — UI only.

## Acceptance criteria

- [ ] Page layout matches `screenshots/09-social-listening.png`
- [ ] Info banner displays and is dismissible
- [ ] Empty state shown when no mentions configured
- [ ] Page hidden when feature flag disabled

## Blocked by

- #5

## User stories covered

56, 57, 58
EOF
)"

create "AI reply generation and auto-reply rules" "$(cat <<'EOF'
## Parent

#1

## What to build

Implement "Generate Replies" using OpenAI GPT-4o-mini for bulk-selected unreplied reviews. Build Auto Reply Rules page: configure rules by rating threshold and template text; rule engine applies templated replies to matching incoming reviews. Respect feature flag `aiReplies`.

## Acceptance criteria

- [ ] Generate Replies produces draft replies for selected reviews
- [ ] User can edit and confirm before posting reply
- [ ] Auto-reply rules CRUD works
- [ ] Matching new reviews receive templated reply automatically
- [ ] Feature disabled when `aiReplies` flag off

## Blocked by

- #11

## User stories covered

45, 46
EOF
)"

create "Contabo deployment: Docker Compose + GitHub Actions" "$(cat <<'EOF'
## Parent

#1

## What to build

Production-ready deployment pipeline for Contabo VPS. Docker Compose runs nginx (serves web build, proxies `/api/*` to Express) and api service. GitHub Actions workflow builds and deploys on push to main via SSH. Certbot SSL configuration documented. Environment variables injected securely.

## Acceptance criteria

- [ ] `docker compose up` runs full stack locally
- [ ] nginx serves React build and proxies API correctly
- [ ] GitHub Actions deploys to Contabo on main push
- [ ] HTTPS works via Certbot
- [ ] Deployment documented in README

## Blocked by

- #3

## User stories covered

(infrastructure)
EOF
)"

create "Mobile app: auth, overview, and incidents" "$(cat <<'EOF'
## Parent

#1

## What to build

Expo mobile app with Clerk auth and organization picker. Screens: Overview (Smile Score + KPI cards), Incidents list, Incident detail with status update. Consume existing API endpoints. Basic navigation tab bar. Styled consistently with tenant branding where feasible.

## Acceptance criteria

- [ ] Login and org selection work via Clerk Expo SDK
- [ ] Overview shows KPIs from API
- [ ] Incidents list and detail render with status update
- [ ] App builds and runs on iOS simulator and Android emulator

## Blocked by

- #9
- #8

## User stories covered

65, 66, 67, 68
EOF
)"

create "Mobile app: reviews, reply, and push notifications" "$(cat <<'EOF'
## Parent

#1

## What to build

Add Reviews list and reply screens to Expo app. Register Expo push tokens per user. Send push notifications on new incident creation and unreplied review events from API. User receives notification and can navigate to relevant screen.

## Acceptance criteria

- [ ] Reviews list and reply flow work on mobile
- [ ] Push token registered and stored per user
- [ ] New incident triggers push to tenant staff
- [ ] Unreplied review triggers push notification
- [ ] Tapping notification opens correct screen

## Blocked by

- #11
- #18

## User stories covered

69, 70
EOF
)"

echo "All issues created."
