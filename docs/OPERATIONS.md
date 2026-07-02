# Operations guide

How the Feedback Platform runs end-to-end — for agency operators, demos, and QA. Locked via grill session.

## Roles

| Role | Who | How they authenticate | Where they land |
|------|-----|----------------------|-----------------|
| **Super-admin** | Agency / platform owner | Clerk sign-in; user ID in `SUPER_ADMIN_USER_IDS` | `/admin/tenants` |
| **Tenant admin / staff** | Client business | Clerk sign-in with agency-provisioned email + password | `/t/{slug}/overview` |
| **End-customer** | Public survey respondent | No account — anonymous form | `/s/{previewSlug}` |

**No public sign-up.** Disable public registration in the Clerk dashboard. All client accounts are created when a super-admin provisions a tenant workspace.

---

## Super-admin flow

1. Open the app home (`/`).
2. Click **Sign in** → authenticate with your Clerk account.
3. If your Clerk user ID is in `SUPER_ADMIN_USER_IDS`, you are redirected to `/admin/tenants`.
4. From there:
   - **Tenants** — list all client workspaces
   - **New Tenant** — onboard a client (`/admin/tenants/new`)

### Create a client workspace

Fill in:

- Business name
- Slug (URL segment, e.g. `hafiz-sweets`)
- Primary brand color
- Client login email + password (min 8 characters)

On submit the platform creates:

1. A **MongoDB tenant** record
2. A **Clerk Organization** (1:1 with the tenant)
3. A **Clerk user** added to that org as `org:admin`

Hand over to the client (shown once on the success screen):

- **Entry URL:** `https://YOUR_DOMAIN/t/{slug}`
- **Login email**
- **Password** (not stored in the platform after you leave the page)

---

## Client (tenant) flow

1. Client opens their branded entry URL: `/t/{slug}` (not the generic home page).
2. Gate page shows their business name, logo, and brand color.
3. Client clicks **Sign in** and uses the credentials you provisioned.
4. Clerk attaches them to the correct organization.
5. App verifies `tenant.clerkOrgId === session.orgId`.
6. On success → `/t/{slug}/overview`.

If signed in to the wrong org, the gate page shows an organization switcher or prompts sign-out.

**Tell clients to bookmark their `/t/{slug}` URL.**

---

## Public survey flow (no login)

1. Tenant staff creates a survey under **Surveys**.
2. Copy the preview link: `/s/{previewSlug}`.
3. Share via QR code, WhatsApp, receipt, etc.
4. Customer submits name, phone, and rating (no account).
5. Submission is stored; customer record is created or updated.
6. **Low rating → incident auto-created** with status `open` and a timeline entry.

Staff then manually review, assign, update status, and follow up outside the app.

---

## Tenant dashboard map

### Feedback (built)

| Page | Purpose |
|------|---------|
| Overview | Smile score, submissions, incidents, resolution rate, rating breakdown |
| Customers | People who submitted surveys |
| Incidents | Low-rating issues, status, assignees, timeline |
| Incident Analytics | Trends, resolve times, staff performance |

### Reputation (built)

| Page | Status |
|------|--------|
| Reviews | List, import, manual entry, reply (Google OAuth if enabled) |
| Review Analytics | KPIs and charts |
| Listings | Google sync when connected |
| Competitor Analytics | Feature-flagged |
| Social Listening | Feature-flagged empty state |

### Platform (built)

| Page | Purpose |
|------|---------|
| Surveys | Create surveys, preview links, submission counts |
| Settings | Branch locations (name, address, labels) |

---

## Data isolation

Clients cannot see each other's data. Enforcement:

1. **Clerk org match** — slug routes require `session.orgId === tenant.clerkOrgId`.
2. **MongoDB `tenantId`** — every tenant-scoped query filters by resolved tenant ID.
3. **Suspended tenants** — status `suspended` → 403 on API; gate shows "workspace paused".

Super-admin is the only role that sees all tenants, via `/api/admin/*`.

---

## Suspend a client

**Soft offboard (recommended):** Set tenant `status` to `suspended`. Access revoked; data retained for reactivation.

**Hard delete:** Not a one-click v1 flow. Manual Clerk org + MongoDB cleanup if needed after a retention period.

---

## Local development

### One-time setup

```bash
cp .env.example .env
# Fill: MONGODB_URI, CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY, SUPER_ADMIN_USER_IDS
# Clerk dashboard: disable public sign-ups

npm install
npm run build --workspace=packages/shared
```

Find your Clerk user ID: Clerk dashboard → Users → copy ID into `SUPER_ADMIN_USER_IDS`.

### Run

```bash
npm run dev:server   # API :3001
npm run dev:web      # Vite :5173, proxies /api → :3001
```

### Full journey test

1. `http://localhost:5173` → sign in as super-admin → `/admin/tenants`
2. Create tenant → save handover credentials
3. Sign out → `/t/{slug}` → sign in as client → overview
4. Settings → add location → Surveys → create survey → copy `/s/{previewSlug}`
5. Incognito → submit low rating → check Incidents

Optional automated check: `npx tsx server/scripts/verify-full-flow.ts` (requires running servers + `.env`).

---

## Production

| Component | Where |
|-----------|-------|
| App (nginx + API + web) | Contabo VPS via Docker Compose |
| Database | MongoDB Atlas |
| Auth | Clerk (production `sk_live_` / `pk_live_` keys) |
| Domain | DNS A record → VPS; HTTPS via Certbot |

Deploy: push to `main` (GitHub Actions) or run `./scripts/deploy.sh` on the server.

See [deploy/contabo.md](./deploy/contabo.md) for full VPS setup.

**Production URLs:**

- Home: `https://YOUR_DOMAIN/`
- Client dashboard: `https://YOUR_DOMAIN/t/{slug}/overview`
- Public survey: `https://YOUR_DOMAIN/s/{previewSlug}`

---

## Implementation phases

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Foundation | Done |
| 2 | Super-admin + tenant shell | Done |
| 3 | Core feedback loop | Done |
| 4 | Overview + analytics dashboards | Done |
| 5 | Reputation module | Done |
| 6 | Mobile app (Expo) | Done |

Pilot-ready after Phase 3 (core survey → incident loop). Phases 4–6 add analytics, reputation tooling, and mobile — all complete for v1.

---

## Environment reference

Required:

- `MONGODB_URI`
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `SUPER_ADMIN_USER_IDS`

Optional (enable features as needed):

- Cloudinary — tenant logo uploads
- Google OAuth — live Google reviews sync
- Google Places — competitor ratings
- OpenAI — AI reply drafts

See `.env.example` for full list.
