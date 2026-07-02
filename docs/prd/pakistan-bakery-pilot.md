# PRD: Pakistan Bakery & Restaurant Pilot (Feedback Intake v2)

## Problem Statement

Multi-branch bakery and restaurant chains in Pakistan (e.g. Hafiz Sweets, Qasr e Sheeren) collect feedback across **in-store counter** and **delivery** channels, but cannot act fast enough when something goes wrong. Customers complain about specific issues — cold samosas, stale barfi, poor packaging — yet generic star ratings do not tell branch managers what failed or where. Unhappy customers often leave public reviews on Google or Foodpanda before staff know there was a problem.

The platform already supports surveys, submissions, auto-created incidents, Google and Foodpanda reviews, and mobile push — but public surveys are static (rating + text only), carry no **channel** context, do not branch on low ratings, are English-only, alert every tenant user on new incidents, and do not nudge satisfied customers to leave Google reviews.

For a **direct chain pilot** (not agency resale first), the product must prove: *capture channel-specific feedback in Urdu or English, alert the right branch within minutes, and turn happy customers into Google reviews.*

## Solution

Extend the public **feedback intake** flow and downstream **incident** pipeline for a Pakistan hybrid bakery/restaurant pilot:

1. **Channel-aware entry** — QR codes on counter bags and delivery packaging open the same survey with `channel` (in-store, takeaway, delivery) and `location` pre-set from the URL.
2. **One-level branching** — after overall rating ≤3, show a single **follow-up question** with **channel-aware issue categories** (e.g. delivery: packaging, temperature, wrong item; in-store: food quality, service, wait time).
3. **Bilingual surveys** — customer picks **survey locale** (English or Urdu) at the start; question labels stored per locale; staff dashboard stays English.
4. **Location-scoped alerts** — **location assignees** receive push notifications for new incidents at their branch only (not all org members).
5. **Review nudge** — customers rating 4–5 stars see a **review nudge** thank-you screen with a Google review link for that location.

Existing Foodpanda CSV import and Google Reviews integration remain the primary third-party review sources for Pakistan. Incident threshold stays **≤3 stars**.

## User Stories

### End customer (public survey)

1. As a customer, I want to scan a QR code on my bag or delivery packaging, so that I can give feedback without creating an account.
2. As a customer, I want the survey to know whether I ordered in-store or by delivery, so that I am not asked irrelevant questions.
3. As a customer, I want to choose English or Urdu before answering, so that I can read questions in my preferred language.
4. As a customer, I want a short survey when I am satisfied, so that giving feedback takes under 30 seconds.
5. As a customer who had a bad experience, I want follow-up questions specific to my channel (e.g. packaging for delivery), so that I can explain what went wrong precisely.
6. As a satisfied customer, I want to be invited to leave a Google review after submitting, so that I can share my positive experience publicly.
7. As a customer, I want the survey to show the business branding, so that I trust the form is legitimate.

### Tenant staff — Surveys & distribution

8. As a tenant staff member, I want to copy survey links pre-set for in-store and delivery channels per location, so that I can print QR codes for bags and packaging without manual configuration.
9. As a tenant staff member, I want to configure bilingual labels on survey questions, so that Urdu-speaking customers see translated text.
10. As a tenant staff member, I want to configure channel-aware follow-up options on a survey, so that low ratings capture meaningful **issue categories**.
11. As a tenant staff member, I want submissions to show channel and issue category, so that I can filter feedback by how the customer ordered and what failed.

### Tenant staff — Incidents & alerts

12. As a location assignee, I want a push notification when a new incident is created at my branch, so that I can respond before the customer posts publicly.
13. As a location assignee, I want to NOT receive push notifications for incidents at other branches, so that I am not overwhelmed by irrelevant alerts.
14. As a tenant staff member, I want incidents to show channel and issue category from the submission, so that I can prioritize and report accurately.
15. As a tenant staff member, I want incidents auto-created when rating is ≤3 stars, so that mediocre and poor feedback is tracked consistently.
16. As a tenant admin, I want to assign staff members to locations, so that the right people receive branch alerts.

### Tenant staff — Reviews & reputation (existing, pilot context)

17. As a tenant staff member, I want to import Foodpanda reviews via CSV, so that delivery feedback on Foodpanda appears alongside survey data.
18. As a tenant staff member, I want to connect and reply to Google reviews, so that I manage Pakistan's primary public reputation surface in one dashboard.
19. As a tenant staff member, I want each location's Google listing available for review nudge links, so that satisfied survey respondents land on the correct branch page.

### Tenant admin — Locations

20. As a tenant admin, I want each location to optionally store a Google Place ID for review links, so that review nudges deep-link to the correct branch (synced from listings or entered manually).

### Mobile app user

21. As a mobile user who is a location assignee, I want push notifications only for my branch's incidents, so that the app is actionable on the shop floor.
22. As a mobile user, I want incident detail to show channel and issue category, so that I know what to fix before calling the customer.

### Platform owner

23. As a platform owner, I want the pilot features to work within existing tenant isolation, so that no cross-tenant data leaks.
24. As a platform owner, I want feature flags to remain available, so that I can disable pilot modules per tenant if needed.

### Cross-cutting

25. As a tenant staff member, I want the staff dashboard to remain English-only in the pilot, so that internal operations stay simple while public surveys are bilingual.

## Implementation Decisions

### Pilot constraints (from grill session)

- **Buyer**: direct bakery/restaurant chain pilot, not agency resale first.
- **Vertical**: hybrid bakery + restaurant under one tenant (not separate products).
- **Geography**: Pakistan/MENA; Foodpanda + Google as review sources.
- **Channels**: in-store and delivery from day one; delivery triggered via packaging QR (not SMS in pilot).
- **Branching depth**: one follow-up question only when overall rating ≤3.
- **Follow-up logic**: channel-aware **issue category** choices, not a product menu picker.
- **Alerts**: push to **location assignees** only on new incidents.
- **Incident threshold**: ≤3 stars (unchanged).
- **Positive flow**: review nudge with Google review link when rating ≥4.

### Shared contracts

Extend survey question model:

```ts
surveyQuestionSchema = {
  id: string,
  type: "rating" | "text" | "single_select",
  label: Record<"en" | "ur", string>,  // bilingual labels
  required: boolean,
  // single_select only:
  options?: Array<{ id: string; label: Record<"en" | "ur", string> }>,
}

surveyFollowUpSchema = {
  trigger: { maxRating: 3 },  // show when overall rating <= 3
  choicesByChannel: {
    in_store: string[],      // issue category option ids
    takeaway: string[],
    delivery: string[],
  },
}
```

Extend submission payload and persisted submission:

```ts
channelSchema = z.enum(["in_store", "takeaway", "delivery"])
submitSurveyRequestSchema += {
  channel: channelSchema,
  locale: z.enum(["en", "ur"]),
  locationId?: string,  // from URL when preset
}
submission += { channel, locale, issueCategory?: string }
incident += { channel?, issueCategory? }  // denormalized from submission for list views
```

Public survey URL parameters (validated, optional):

- `channel` — pre-selects channel on submit
- `location` — location ID pre-set on submit
- `locale` — optional initial locale (customer can still switch)

### Channel-aware issue categories (pilot defaults)

Tenant-configurable in v2; ship seeded defaults per channel:

| Channel | Default issue categories |
|---------|-------------------------|
| in_store | food_quality, service, wait_time, cleanliness, other |
| takeaway | food_quality, packaging, wait_time, order_accuracy, other |
| delivery | packaging, temperature, wrong_item, delivery_time, driver, other |

Labels provided in English and Urdu on the public form.

### Location assignees

- New association: Clerk `userId` ↔ `locationId` within a tenant (many-to-many).
- Tenant admin manages assignees from the locations UI.
- Push notification routing: on `notifyNewIncident`, resolve assignees for `incident.locationId` and send only to their registered push tokens; if no assignees configured, fall back to all tenant push tokens (documented behaviour for pilot onboarding).

### Review nudge

- On successful submit with rating ≥4, public thank-you screen shows review nudge copy in selected survey locale.
- Google review URL built from location's Google Place ID (`writereview?placeid=...`).
- Place ID sourced from synced Google listing or manual field on location; if missing, thank-you screen omits nudge (no error).

### Survey authoring

- Tenant survey editor: bilingual label fields per question; follow-up section with channel-tagged category pickers (pilot defaults pre-populated).
- Link generator on surveys page: copies `/s/{previewSlug}?channel=delivery&location={id}` variants for QR printing.

### Modules touched

- **Shared package** — survey, submission, incident, location schemas; new location-assignee types.
- **Server** — public survey fetch/submit, submission intake, incident creation, push notification routing, location assignee CRUD on tenant slug routes.
- **Web** — public survey page (locale picker, branching UI, thank-you nudge), surveys page (bilingual editor, link generator), submissions/incidents lists (channel + category columns), locations page (assignee management, place ID).
- **Mobile** — incident detail shows channel/category; push behaviour inherits server routing (no client filter change beyond existing token registration).

### Architectural notes

- Channel and issue category are captured at **feedback intake** and flow to incident — single write path via existing `recordFeedback` service.
- Branching is evaluated client-side on the public form for pilot (server validates submitted answers match survey schema and channel rules).
- Staff dashboard i18n remains out of scope; only **survey locale** is bilingual.

## Testing Decisions

### Primary seam

**HTTP API integration tests** on the public submit and tenant read paths — same seam as existing `pushToken.test.ts`, `incidents.test.ts`, and `submissionIntake.test.ts`:

- `POST /api/public/surveys/:slug/submit` with channel, locale, location, low rating + follow-up answer → submission persisted with `channel`, `issueCategory` → incident created at ≤3 → push sent only to location assignee tokens.
- `POST .../submit` with rating ≥4 → no incident → response includes review nudge payload when location has Place ID.
- Tenant `GET` submissions/incidents lists return channel and issue category.
- Location assignee CRUD and push routing: assignee at branch A does not receive branch B incident push.

This is the highest seam covering schema, business rules, tenant isolation, and push routing without browser automation.

### What makes a good test

- Assert HTTP status, response body shape (Zod parse), and user-visible outcomes.
- Do not assert internal Mongoose query shapes or component state.
- Use independent test literals for bilingual labels; verify both locales appear on public survey fetch.

### Secondary seam (optional, one journey)

- Web page test for public survey: locale toggle swaps labels; rating 2 shows follow-up; rating 5 shows review nudge — mocked `fetch` only.

### Prior art

- `server/tests/pushToken.test.ts` — incident push on low-rating submit
- `server/tests/submissionIntake.test.ts` — incident policy and rating extraction
- `server/tests/incidents.test.ts` — auto-create on low rating
- `web/tests/SurveyPreviewPage.test.tsx` (if present) or public page pattern from tenant gate tests

## Out of Scope

- SMS/WhatsApp post-delivery survey triggers (packaging QR only for delivery channel in pilot)
- Guest recovery outreach to customers (alert staff only; no auto-apology or vouchers)
- Full multi-level branching survey trees (Harlyy-depth)
- Product/menu picker follow-up (issue categories only)
- Urdu staff dashboard UI
- UK delivery platforms (Deliveroo, Uber Eats, Just Eat)
- Tenant-configurable incident rating threshold
- Push only on ≤2 with incident on ≤3 (deferred alert-fatigue tuning)
- Agency billing, custom domains, branded PDF reports
- Real-time WebSockets
- Mobile survey authoring or full web parity on mobile

## Further Notes

- Domain glossary: `CONTEXT.md` at repo root (Channel, Follow-up question, Survey locale, Location assignee, Issue category, Review nudge).
- Reference chains: Hafiz Sweets, Qasr e Sheeren — hybrid bakery/restaurant, Pakistan multi-branch.
- Existing `INCIDENT_RATING_THRESHOLD = 3` unchanged.
- Issue tracker not yet configured via `/setup-matt-pocock-skills`; child issues published locally under `.scratch/pakistan-bakery-pilot/` pending tracker setup.
- Parent PRD remains `PRD.md`; this document scopes pilot v2 only.
