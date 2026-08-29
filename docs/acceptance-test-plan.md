# Advancia Portfolio Demo — Acceptance Test Plan

## 1. Product contract

Advancia prevents avoidable client loss caused by unnoticed or unmanaged contract and licence expiry. Its required loop is:

> detect expiry risk → assign a responsible employee → record contact/follow-up → renew or record loss

This document is the acceptance contract for the portfolio-demo rebuild. It takes precedence over `README.md`, `IMPLEMENTATION.md`, and the generated replacement implementation when they conflict with the frozen scope agreed in the conversation.

The demo is accepted only when all **P0** scenarios pass. **P1** scenarios should pass unless a documented technical blocker remains. A scenario is executable when its Given/When/Then steps can be automated through API integration tests or browser tests.

### Definitions

- **Owned client:** a client whose `assignedAgent` or `assignedConsultant` is the current user, as appropriate to that user's role.
- **Owned item:** a licence assigned to the current Agent, or a contract managed by the current Consultant.
- **Renewal status:** `not_contacted`, `contacted`, `waiting`, `renewed`, or `declined`.
- **Operational item status:** `active`, `expiring`, `expired`, `renewed`, or `declined`.
- **Open item:** an active/expiring/expired item not resolved as renewed or declined.
- **Overdue follow-up:** an open item with `nextFollowUpAt` before today and no later follow-up completion/action.
- **At-risk client:** a client with at least one open expired item, critical item, or overdue follow-up.
- **Today:** a single application date derived consistently by the API. Expiry comparisons are calendar-day based; tests freeze the clock and avoid browser timezone-dependent results.

## 2. Authoritative role and scope matrix

| Capability | Agent | Consultant | Admin | Executive |
|---|---:|---:|---:|---:|
| Sign in to the application | Yes | Yes | Yes | **No** |
| View clients | Assigned only | Assigned only | All | No |
| Create/edit/archive clients | Assigned client workflow only | Assigned client workflow only | All | No |
| View licences | Owned licences only | No | All | No |
| Create/edit/renew licences | Owned licences only | No | Supervisory access; may reassign/archive, not impersonate ownership | No |
| View contracts | No | Owned contracts only | All | No |
| Create/edit/renew contracts | No | Owned contracts only | Supervisory access; may reassign/archive, not impersonate ownership | No |
| Record contact/follow-up/decline | Owned items | Owned items | Any item for supervision | No |
| Reassign responsibility | No | No | Yes | No |
| View operational dashboard | Own licence risk | Own contract risk | Organisation-wide | No |
| Receive 15-day email | Owned licence | Owned contract | No | No |
| Receive 10-day email | Owned licence | Owned contract | Yes | No |
| Receive 6-day email | Owned licence | Owned contract | Yes | Yes, email only |

Notes:

- Domain separation is strict: Agents cannot read contract data; Consultants cannot read licence data. Hiding a navigation item is insufficient—the API must return `403`.
- Admin is a supervisor. The frozen scope explicitly requires full visibility, filtering, identifying unassigned/no-follow-up items, and reassignment. Domain record creation remains the Agent/Consultant responsibility.
- Executive recipients are configured email addresses, not application users. No Executive credential, route, token, or dashboard may exist.
- Public self-registration is not part of the product. Demo users are seeded or provisioned administratively.

## 3. Acceptance scenarios

### A. Authentication, authorization, and client scoping

**AUTH-01 — Seeded operational roles can sign in (P0)**
Given seeded Agent, Consultant, and Admin users, when each submits valid credentials, then the API issues a token and the UI opens that role's permitted dashboard.

**AUTH-02 — Invalid credentials do not disclose account existence (P0)**
Given an existing email or an unknown email, when an incorrect password is submitted, then both receive `401` with the same generic error and no password/token data.

**AUTH-03 — Executive has no system access (P0)**
Given an executive email is configured for notifications, when login or any authenticated application route is attempted for that address, then no Executive account/token exists and access is denied.

**AUTH-04 — Users cannot self-select a privileged role (P0)**
Given an unauthenticated caller, when registration is attempted with `admin`, `executive`, `agent`, or `consultant`, then no privileged user is created. Prefer no public registration endpoint.

**AUTH-05 — Cross-domain access is blocked at the API (P0)**
Given an Agent token, when any contract list/detail/write endpoint is called, then it returns `403`; given a Consultant token, the equivalent licence calls return `403`.

**AUTH-06 — Ownership scoping is enforced server-side (P0)**
Given Agent A and Agent B own different licences/clients, when Agent A lists, searches, filters, or requests Agent B's identifiers directly, then B's data is absent from lists and direct access returns `404` or `403`. Repeat for Consultants and contracts.

**AUTH-07 — Admin sees organisation-wide data and can reassign (P0)**
Given items belonging to multiple employees and one unassigned item, when Admin filters and reassigns an item, then the new owner is stored, appears in activity history, disappears from the old owner's actions, and appears for the new owner.

**AUTH-08 — Token and request protections (P1)**
Missing, malformed, expired, and invalidly signed tokens return `401`; protected responses never include password hashes; configured CORS does not allow arbitrary production origins; write endpoints are rate limited.

### B. Clients

**CLI-01 — Create a usable client (P0)**
Given an authorized operational user, when valid name, unique email/contact details, assigned Agent, assigned Consultant, notes, and status are submitted, then a client is created and visible only to assigned employees and Admin.

**CLI-02 — Client validation is actionable (P0)**
When required name/email is absent, email is malformed, identifiers are invalid, or an unsupported status is sent, then the API returns `400`/`422` with field-level errors and stores nothing.

**CLI-03 — Client detail is an operational summary (P0)**
Given a client with both domains, when an assigned employee or Admin opens the client detail, then contact information, responsible employees, notes, latest contact date, status, and all permitted related items are shown. An Agent cannot receive contract payload; a Consultant cannot receive licence payload.

**CLI-04 — Client risk is derived consistently (P0)**
Given an expired/open item or overdue follow-up, when the client is listed or opened, then the client is `at_risk`; when no such risk exists it is `active`; an archived/inactive client remains `inactive`.

**CLI-05 — Archive preserves history (P1)**
When a client is archived, then it is hidden from default active lists but its contracts, licences, renewal history, and activity history are retained. Hard deletion must not create orphan records.

### C. Contract and licence lifecycle

The following scenarios run twice: once for a Licence owned by an Agent and once for a Contract managed by a Consultant. Contracts additionally support a non-negative monetary `value`; licences support a positive quantity/licence count.

**LIFE-01 — Create a domain item (P0)**
Given an owned client, when the responsible role submits a name/title, start date, expiry date, owner, and domain fields, then an active item is created and activity history records actor and timestamp.

**LIFE-02 — Lifecycle validation (P0)**
When expiry is not after start, required fields are blank, value is negative, quantity is not positive, client does not exist, owner has the wrong role, or the client is outside the caller's scope, then the API returns field-level `400`/`422` errors and stores nothing.

**LIFE-03 — Date-derived operational status (P0)**
Given unresolved items with days-to-expiry of `16`, `15`, `10`, `6`, `0`, and `-1`, then statuses/buckets are respectively safe/active, upcoming/expiring, urgent/expiring, critical/expiring, critical/expiring, and expired. `renewed` and `declined` resolution states take precedence over date-derived labels.

**LIFE-04 — Renewal retains history (P0)**
Given an open item, when the owner renews it with a new start/expiry date, then the previous dates and prior item identity remain in renewal history, the renewal is timestamped with actor, the current record becomes `renewed` or links to the new active term, and the old expiry no longer generates open actions/alerts.

**LIFE-05 — Decline records a reason (P0)**
Given an open item, when `declined` is selected without a loss reason, then validation fails; when a reason is supplied, then the item is resolved, history records it, and no future open alerts are generated.

**LIFE-06 — Archive/deactivate is non-destructive (P1)**
When an item is archived/deactivated, then it leaves default actionable lists but remains accessible to Admin through history/audit views.

### D. Renewal follow-up workflow

**REN-01 — Required workflow states are supported (P0)**
Given an open item, when its renewal status changes through `not_contacted` → `contacted` → `waiting` → `renewed` or `declined`, then each transition stores actor, timestamp, note if provided, and last-action time.

**REN-02 — Contact updates client recency (P0)**
When the owner records `contacted`, then the item and activity timeline update and the client's latest contact date equals that action time.

**REN-03 — Waiting requires a next follow-up (P0)**
When `waiting` is submitted without a future `nextFollowUpAt`, then validation fails; with a valid date it succeeds and creates a My Actions entry for that date.

**REN-04 — Overdue follow-up remains visible (P0)**
Given an open waiting item whose follow-up date has passed, when the owner opens My Actions or Admin opens the overview, then it appears as overdue until another contact/follow-up or terminal resolution is recorded.

**REN-05 — Every open risk has accountable ownership (P0)**
Given an open expiring/expired item with no valid owner, then it appears in Admin's `Unassigned` queue and cannot silently disappear; Admin can assign it to an employee of the correct role.

### E. Expiry alerts, escalation, and deduplication

The checker runs daily. Threshold messages are sent once per item, expiry term, threshold, channel, and recipient set; "daily" describes checking cadence, not duplicate email frequency. In-app alerts remain visible/actionable until superseded or resolved.

**NOT-01 — 15-day first alert (P0)**
Given an open owned item is exactly 15 calendar days from expiry and its 15-day notification was not sent, when the checker runs, then one email goes only to the responsible Agent/Consultant and one notification-history record is stored.

**NOT-02 — 10-day escalation (P0)**
At exactly 10 days, one email goes to the responsible employee plus all configured Admin recipients, with history stored.

**NOT-03 — 6-day critical escalation (P0)**
At exactly 6 days, one email goes to the responsible employee, Admin recipients, and configured Executive email recipients, with deduplicated addresses and history stored.

**NOT-04 — No duplicate threshold email (P0)**
Given the checker already successfully recorded a threshold notification, when it is retried on the same day or process restarts, then no second email is sent. A failed send is not recorded as successful and can be retried safely.

**NOT-05 — Action suppresses stale escalation (P0)**
Given an item was renewed, declined, or archived before a later threshold, when the checker runs, then no expiry email or open in-app alert is generated for the resolved old term.

**NOT-06 — Inaction is escalated (P0)**
Given no renewal action was recorded after an earlier alert, when the item enters the next threshold, then recipient escalation occurs. Prior notification records remain visible to Admin.

**NOT-07 — Boundary/timezone behavior is stable (P1)**
Given a frozen application date and an expiry stored with any supported timezone representation, when days-to-expiry is calculated, then the threshold classification is the same in API, cron, and UI.

### F. Dashboard, My Actions, and Admin overview

**DASH-01 — Mutually exclusive expiry buckets (P0)**
Every unresolved item appears in exactly one bucket: `Expired` (<0 days), `Critical` (0–6), `Urgent` (7–10), `Upcoming` (11–15), or `Safe` (>15). Terminal renewed/declined items do not appear in open-risk buckets.

**DASH-02 — Role-scoped metrics (P0)**
Agent metrics/actions contain only owned licences; Consultant metrics/actions contain only owned contracts; Admin totals include all permitted organisation data. Counts equal the filtered records shown.

**DASH-03 — Required risk indicators (P0)**
Dashboard shows clients at risk, contracts requiring action, licences requiring action, overdue follow-ups, and estimated renewal value. Estimated value is clearly limited to contracts with valid values and must not invent licence revenue.

**DASH-04 — My Actions is actionable (P0)**
The employee page lists items requiring attention today, overdue follow-ups, and upcoming renewals, ordered by overdue/urgency/date, with quick actions for contacted, schedule follow-up, renew, and decline.

**DASH-05 — Admin oversight filters (P0)**
Admin can filter all clients/items by employee, domain, urgency, status, unassigned ownership, and missing/overdue follow-up; reassign from the result; and see renewal success/loss summary.

**DASH-06 — Search and CSV support (P1)**
Client/item search and filtering return scoped results. Existing clients/items can be imported from a validated CSV with a preview/error report, and expiring items can be exported to CSV without leaking out-of-scope data.

### G. Activity and audit history

**AUD-01 — Material actions are traceable (P0)**
Create, edit, owner reassignment, contact, follow-up scheduling, renew, decline, and archive actions append immutable activity records containing actor, action, subject, timestamp, and relevant before/after values.

**AUD-02 — Notification history is inspectable (P0)**
Admin can inspect threshold, channel, intended recipients, send outcome, attempt/success time, and related expiry term without exposing SMTP credentials.

### H. Demo data and portfolio flow

**DEMO-01 — Idempotent realistic seed (P0)**
Running the demo seed/reset produces known Agent, Consultant, and Admin credentials plus realistic clients and both domains covering: expired, 6-day, 10-day, 15-day, safe, waiting/overdue, renewed, declined, and unassigned cases. Re-running does not duplicate records.

**DEMO-02 — Agent story (P0)**
Sign in as Agent → see owned licence risks → open an at-risk client → mark contacted → schedule follow-up → renew a licence → observe dashboard/history update and no contract data.

**DEMO-03 — Consultant story (P0)**
Sign in as Consultant → see owned contract risks and estimated renewal value → follow up → decline one contract with reason and renew another → observe metrics/history and no licence data.

**DEMO-04 — Admin story (P0)**
Sign in as Admin → view organisation risk → filter overdue/unassigned → reassign correct-role ownership → inspect activity and notification histories → verify Executive exists only as a configured critical email recipient.

### I. UI quality, responsiveness, and accessibility

**UI-01 — Frozen frontend stack (P0)**
The client uses React + TypeScript + Vite, Tailwind CSS, shadcn/ui, React Hook Form + Zod, and TanStack Query. MUI and Create React App are absent.

**UI-02 — Responsive core flows (P0)**
At 360px mobile, 768px tablet, and 1440px desktop widths, login, dashboards, lists, filters, client detail, forms, My Actions, and Admin overview have no horizontal page overflow, clipped controls, or inaccessible actions. Dense tables become cards or usable horizontal regions on small screens.

**UI-03 — Keyboard and semantic access (P0)**
All interactive controls are keyboard reachable with visible focus; dialogs trap and restore focus; form labels and errors are programmatically associated; buttons have discernible names; status is not communicated by colour alone.

**UI-04 — Async/error states are professional (P1)**
Pages provide loading, empty, recoverable error, disabled/submitting, and success feedback; failed mutations do not falsely update final state; destructive/terminal actions request confirmation.

**UI-05 — Demo does not depend on external email delivery (P0)**
With SMTP unset, notification events are safely captured/logged for demonstration and visible through notification history; the core demo remains functional.

## 4. Endpoint and UI coverage matrix

Exact route names may change, but each capability must exist and preserve the role/scoping contract.

| Capability | Expected API surface | Required UI | Primary scenarios |
|---|---|---|---|
| Authentication/profile | `POST /auth/login`, `GET /auth/profile`; no public privileged registration | Login, logout, protected shell | AUTH-01–05 |
| Clients | `GET/POST /clients`, `GET/PATCH /clients/:id`, `POST /clients/:id/archive` | Client list, form, detail summary | CLI-01–05, AUTH-06 |
| Licences | Scoped `GET/POST /licenses`, `GET/PATCH /licenses/:id`, archive | Licence list/detail/form | LIFE-01–06, AUTH-05–07 |
| Contracts | Scoped `GET/POST /contracts`, `GET/PATCH /contracts/:id`, archive | Contract list/detail/form | LIFE-01–06, AUTH-05–07 |
| Renewal actions | `POST /{domain}/:id/actions`, `POST /{domain}/:id/renew`, `POST /{domain}/:id/decline` | Quick-action dialogs, history | REN-01–05, LIFE-04–05 |
| My Actions | `GET /actions/mine` with urgency/status/date filters | My Actions page | REN-03–04, DASH-04 |
| Dashboard | `GET /dashboard/summary` scoped by role | Role dashboard and bucket drill-down | DASH-01–04 |
| Admin oversight | `GET /admin/overview`, reassignment action | Admin overview, filters, reassignment | AUTH-07, DASH-05 |
| Activity history | `GET /activity` and/or resource history | Client/item timeline | AUD-01 |
| Notifications | Idempotent checker/service, `GET /notifications/history` for Admin | In-app alerts, Admin history | NOT-01–07, AUD-02 |
| CSV import/export | Validated import preview/commit; scoped export | Import dialog/report, export action | DASH-06 |
| Demo reset | Protected/non-production seed/reset command or endpoint | Optional demo reset control | DEMO-01–04 |

## 5. Explicit non-goals for today's portfolio demo

- Production readiness, formal compliance certification, or multi-tenant SaaS isolation.
- Client-facing portal or direct client notifications.
- Payments, invoicing, billing, or accounting workflows.
- Contract document storage, electronic signatures, or document generation.
- Complex analytics/BI, forecasting, or configurable report builders.
- AI features, recommendations, chatbots, or automated client outreach.
- Native mobile applications.
- Production email campaigns or dependency on paid SMTP services.
- Full employee/user administration beyond seeded demo identities and required owner reassignment.
- Real-time collaboration, websockets, or offline mode.

## 6. Current repository drift and hallucination warnings

The current `main` implementation was generated after the original nested repositories became unavailable. It is a scaffold, not evidence of the original product. The following claims/behaviors must not be accepted as requirements merely because they exist in source or documentation:

| Current claim/behavior | Evidence | Conflict with frozen scope / required correction |
|---|---|---|
| “All requirements ... fully implemented” | `IMPLEMENTATION.md` | False: there is no renewal workflow, My Actions, history, dedupe, assignment-based client scoping, operational dashboard, CSV flow, or complete UI. |
| MUI/Create React App is the chosen frontend | `IMPLEMENTATION.md`, `client/package.json` | Rejected explicitly; required stack is Vite + Tailwind + shadcn/ui. |
| Public registration accepts caller-supplied role | `authController.register` | Privilege escalation; remove public registration or restrict provisioning. |
| Executive is a `UserRole` and any authenticated user can read clients | model/types and `routes/clients.ts` | Executive must be email-only with no login or direct access. |
| Agents/Consultants can list all records in their domain | list controllers use an empty global filter | Must scope by owner and assigned clients; Admin alone sees organisation-wide data. |
| Client is globally shared and has only contact fields | `Client` model/controllers | Missing assigned Agent/Consultant, status/risk, notes, latest contact, and archival behavior. |
| Licence/Contract is only `isActive` plus dates | models/controllers | Missing renewal status, next follow-up, last action, loss reason, history, operational status, quantity where relevant, and explicit ownership workflow. |
| Cron sends at exact thresholds with no persistence | `expiryChecker.ts` | Missing dedupe, outcome/history, retry safety, stale-alert suppression, and actionable in-app alerts. |
| “15/10/6 ... Daily” means repeat email daily | README wording is ambiguous; code sends only on exact day | Frozen interpretation: daily checker, one deduplicated email per threshold/term/recipient set. |
| Admin “cannot directly manage ... read-only + delete” | `IMPLEMENTATION.md` | Not authoritative. Admin must at least supervise all data, reassign responsibility, manage follow-up oversight, and archive safely. Domain creation remains with Agent/Consultant. |
| Hard delete is sufficient | current controllers | Conflicts with renewal/audit history; prefer archive and prevent or deliberately handle dependent records. |
| Generic dashboard constitutes the complete client | only `Login.tsx` and `Dashboard.tsx` exist | False; all operational pages and end-to-end role flows remain required. |
| Build success implies demo readiness | docs/test script | Insufficient; P0 role, workflow, notification, responsive, and seeded browser stories must pass. |

## 7. Release gate

Before the final portfolio-demo branch is accepted:

1. API build/typecheck and frontend build/typecheck pass.
2. Automated API tests cover role/domain/ownership denial, lifecycle validation, renewal/decline, bucket boundaries, alert escalation, dedupe, and resolved-item suppression.
3. Browser tests cover DEMO-02 through DEMO-04 at desktop and at least one mobile viewport.
4. No P0 scenario is skipped without a clearly recorded blocker.
5. Seed/reset works from a clean database and README commands match reality.
6. No secrets/default production JWT secret are committed; SMTP is optional for the demo.
7. A manual smoke test confirms the product story can be demonstrated in under five minutes.
