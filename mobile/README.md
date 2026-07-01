# Feedback Platform — Mobile App

Expo mobile client for tenant dashboards: overview KPIs, incidents, reviews, and push notifications.

## Prerequisites

- Node.js 20+
- Expo Go app on a physical device (push notifications require a device)
- API server running locally (`npm run dev:server` from repo root)
- Clerk app with Organizations enabled (same app as web)

## Setup

From the monorepo root:

```bash
npm install
npm run build --workspace=packages/shared
```

Create `mobile/.env` (or export env vars):

```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:3001
```

Use your machine's LAN IP for `EXPO_PUBLIC_API_URL` when testing on a physical device — `localhost` won't work from the phone.

## Run

```bash
npm run start --workspace=@feedback-platform/mobile
```

Then scan the QR code with Expo Go, or press `a` / `i` for Android / iOS simulators.

## Features

- **Auth** — Clerk sign-in with organization picker
- **Overview** — Smile Score and KPI cards from `/api/tenant/by-slug/:slug/overview`
- **Incidents** — List, detail, and status updates
- **Reviews** — List unreplied reviews and post replies
- **Push** — Registers Expo push token via `POST /api/tenant/me/push-token`; tap navigates to incident or review detail

## API auth

All authenticated requests send `Authorization: Bearer <Clerk session token>`. The active Clerk organization must match the tenant's `clerkOrgId`.
