# Feedback Platform

White-label, multi-tenant customer feedback and reputation management for agency-owned SaaS tenants.

## Language

**Feedback intake**:
The act of recording a customer's survey response — customer identity, answers, and optional downstream incident creation.
_Avoid_: Submission handler, survey submit

**Incident**:
A tracked case opened when feedback signals a problem (typically a low rating), with a code, status timeline, and assignees.
_Avoid_: Ticket, case

**Incident policy**:
Whether feedback must produce an incident (`required`) or may produce one only when the rating qualifies (`optional`).
_Avoid_: Incident mode, severity flag

**Channel**:
How the customer experienced the business when they gave feedback — in-store, takeaway, or delivery.
_Avoid_: Order type, service mode, touchpoint

**Follow-up question**:
A conditional survey step shown only when a prior answer matches a rule (e.g. low overall rating). One level deep in the pilot.
_Avoid_: Branching logic, child question, conditional step

**Survey locale**:
The language a customer chooses when starting a public survey (e.g. English or Urdu). Question labels are stored per locale; staff dashboard stays English.
_Avoid_: UI language, i18n, translation

**Location assignee**:
A staff member responsible for a specific location who receives incident alerts for that branch.
_Avoid_: Branch manager, location admin, store lead

**Issue category**:
The reason for dissatisfaction captured in the channel-aware follow-up step (e.g. packaging, food quality, wait time).
_Avoid_: Complaint type, problem area, tag

**Review nudge**:
A post-survey prompt on the thank-you screen inviting satisfied customers to leave a Google review.
_Avoid_: Review generation, review request, CTA
