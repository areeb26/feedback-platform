# PRD: Tenant-Branded Entry & Smart Home Hub

## Problem Statement

Agency clients receive a white-label feedback platform configured with their own branding (name, logo, colors). Today, the root home page asks every visitor to manually type a tenant slug to reach their dashboard. That flow exposes internal multi-tenant mechanics, conflicts with self-branding, and does not work before sign-in because tenant branding is only available from authenticated API routes.

Client staff should open a link their agency sends (e.g. `/t/hafiz-sweets`), see their brand immediately, sign in, and land in their workspace. The agency homepage should route signed-in users intelligently instead of acting as a generic slug portal.

## Solution

Introduce a **branded tenant gate** at `/t/{slug}` that loads public branding without authentication, handles sign-in, resolves Clerk organization membership (auto-switch when possible), and redirects to the tenant overview. Return suspended tenants' branding with a pause message and no sign-in. Transform `/` into a **smart hub**: super-admins go to the admin panel, signed-in tenant staff go to their overview via org resolution, and unsigned visitors see agency marketing without a slug form.

## User Stories

1. As a tenant staff member, I want to open a branded link from my agency invite, so that I immediately recognize my company's workspace without knowing technical details like a slug.
2. As a tenant staff member, I want to see my tenant's logo and colors before I sign in, so that the login experience feels trustworthy and on-brand.
3. As a tenant staff member, I want to sign in on my branded page and land directly in my overview dashboard, so that I do not need extra navigation steps.
4. As a tenant staff member, I want the platform to switch me to the correct Clerk organization automatically when I am a member, so that I am not blocked after signing in with the wrong org active.
5. As a tenant staff member signed into the wrong organization, I want a clear branded message and a way to switch orgs or sign out, so that I can recover without contacting support.
6. As a tenant staff member on a suspended account, I want to see my brand with a clear pause message, so that I understand the workspace is unavailable rather than thinking the link is broken.
7. As a tenant staff member on a suspended account, I should not be able to sign in or access dashboard APIs, so that suspension is enforced.
8. As a platform owner (super-admin), I want the root homepage to send me to the admin panel when I am signed in, so that I can manage tenants without hunting for the admin URL.
9. As a platform owner, I want the root homepage to remain an agency marketing landing for unsigned visitors, so that the product is presentable to prospects.
10. As a platform owner, I want the tenant slug form removed from the homepage, so that clients are not confused by internal routing mechanics.
11. As a platform owner, I want to share `/t/{slug}` links in tenant invite emails, so that each client has a stable branded entry URL.
12. As a tenant staff member who bookmarks `/t/{slug}`, I want that URL to remain my entry point on return visits, so that I always start from my branded login when signed out.
13. As a signed-in tenant staff member who visits `/`, I want to be redirected to my tenant overview automatically, so that I do not need to remember my slug link.
14. As an unsigned visitor who mistypes a tenant slug URL, I want a neutral not-found experience, so that I am not shown another tenant's data.
15. As a tenant staff member, I want authenticated dashboard routes to continue requiring org membership matching the slug, so that tenant isolation is preserved.

## Implementation Decisions

- Add a **public tenant branding contract** in the shared package:

```ts
tenantPublicBrandingSchema = {
  slug: string,
  name: string,
  logoUrl: string | null,
  primaryColor: string,
  status: "active" | "suspended",
}
```

- Expose `GET /api/public/tenants/:slug` (no auth). Unknown slug → `404`. Known slug (active or suspended) → `200` with branding payload.
- Keep authenticated `GET /api/tenant/by-slug/:slug/shell` unchanged for full dashboard shell including feature flags.
- Add a **tenant gate page** at `/t/:slug` (index route) that consumes public branding, renders branded sign-in for active tenants, and renders pause UI for suspended tenants.
- Nest existing tenant dashboard routes under `/t/:slug/*` behind the existing tenant layout; gate is only the index route.
- After sign-in on the gate page, verify access by calling the authenticated shell endpoint. On success → navigate to `/t/:slug/overview`. On `403` wrong org → attempt Clerk org auto-switch when the user belongs to the tenant org; otherwise show branded recovery UI with organization switcher and sign out.
- Update homepage: remove tenant slug form and related navigation logic. On load, if signed in: try super-admin access first (`GET /api/admin/tenants` → redirect to `/admin/tenants` on success), else `GET /api/tenant/me` → redirect to `/t/{slug}/overview`. If unsigned, show existing agency marketing and super-admin card only.
- Clerk `afterSignOutUrl` for tenant gate should remain `/t/{slug}` so users return to branded entry.
- Custom domains per tenant remain out of scope (deferred per product plan).

## Testing Decisions

**Primary seam:** HTTP API boundaries — one public contract (`GET /api/public/tenants/:slug`) and existing authenticated contracts (`/api/tenant/me`, `/api/tenant/by-slug/:slug/shell`, `/api/admin/tenants`). Web tests exercise routes through rendered pages and mocked `fetch`, not internal component state.

**What makes a good test:** Assert status codes and response bodies from supertest for server; assert visible user-facing text and navigation outcomes for web. Use independent literals for expected branding values seeded in tests. Do not test CSS class names or private helpers.

**Modules tested:**
- Shared schema parse/export
- Server public tenant route (integration, mongodb-memory-server)
- Web tenant gate page (active, suspended, not found)
- Web homepage (slug form removed, redirect behavior with mocked auth + fetch)

**Prior art:** `server/tests/tenant-auth.test.ts`, `server/tests/locations.test.ts` (shell branding), `web/tests/HomePage.test.tsx`, public survey route in `server/src/routes/surveys.ts`.

## Out of Scope

- Custom domains or subdomains per tenant
- Changing super-admin onboarding or tenant CRUD flows
- Embedding full Clerk custom sign-in UI theming beyond logo/colors/name
- Mobile app entry flow changes (may consume public branding later)
- Removing or redesigning the agency marketing hero beyond removing the slug card

## Further Notes

- Product plan already specifies path-based `/t/:slug/*` with custom domains deferred.
- Public branding exposes only non-secret fields; slug is already in the URL.
- Suspended tenants return branding on the public endpoint so the pause screen can remain on-brand; all authenticated tenant routes continue to return `403`.
