# API Specification

**Base URL:** (deployment-dependent)
**Auth:** Supabase cookie session (all endpoints except public ones)
**Admin client:** Service role key bypasses RLS for writes (dual-client pattern)

---

## Authentication

### `POST /api/auth/login`
Form login for dashboard users.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ✅ | User email |
| `password` | string | ✅ | User password |
| `role` | string | ✅ | Must be a valid AppRole: `superadmin`, `customer_service`, `marketing` |

**Response 200:** Sets Supabase session cookie + returns user data (id, email, full_name, role detail, branch).
**Response 400:** Missing fields.
**Response 401:** Invalid credentials, unconfirmed email, or rate-limited.

### `POST /api/auth/logout`
Sign out current user.

**Response 200:** Clears Supabase session.

### `POST /api/auth/qr-login`
QR-based login for workshop supervisors.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | ✅ | Username |
| `password` | string | ✅ | Password |

**Response 200:** Sets Supabase session + returns user data.

### `POST /api/auth/pin-login`
PIN-based login for workshop workers.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | ✅ | Username |
| `pin` | string | ✅ | 6-digit PIN |

**Response 200:** Sets Supabase session + returns user data.
**Response 401:** Invalid PIN.

### `POST /api/auth/workshop-pin`
Set or change workshop PIN.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `currentPin` | string | ✅ | Current PIN for verification |
| `newPin` | string | ✅ | New 6-digit PIN |

**Response 200:** PIN updated (bcrypt hashed).
**Response 401:** Current PIN incorrect.

---

## Customer Service

### `GET /api/cs/orders`
List CS orders. CS users see only their own orders; superadmin sees all.

| Query | Type | Description |
|-------|------|-------------|
| *(none required)* | | Returns all orders filtered by role scope |

**Response 200:** `{ data: CsOrder[] }` — ordered by `created_at DESC`.
**Response 401/403:** Auth errors.

### `POST /api/cs/orders`
Create a new order.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `customer_name` | string | ✅ | |
| `customer_wa` | string | ✅ | |
| `tgl_chat` | string | ✅ | Date |
| `tgl_order` | string | ✅ | Date |
| *(plus all other CsOrder fields)* | | | |

**Response 200:** `{ success: true, data: { id, order_number } }`
**Response 400:** Validation error.

### `PUT /api/cs/orders/[id]`
Update an existing order.

| Field | Type | Description |
|-------|------|-------------|
| *(any CsOrder field)* | | Partial update allowed |

**Response 200:** `{ success: true }`

### `POST /api/cs/orders/[id]/image`
Upload reference ring image.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | file | ✅ | Image file |
| `gender` | string | ✅ | `pria` or `wanita` |

**Response 200:** `{ url: "..." }` — Supabase Storage URL.

### `GET /api/cs/inputs`
List CS daily lead inputs.

**Response 200:** `{ data: [...] }`

### `POST /api/cs/inputs`
Create daily lead input entry.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `branch_id` | string | ✅ | |
| `lead_masuk` | number | ✅ | |
| `closing` | number | ✅ | |
| `omset` | number | ✅ | |

**Response 200:** `{ success: true }`

### `GET /api/cs/stats`
CS dashboard statistics.

**Response 200:** `{ data: { lead_masuk, closing, cr, ... } }` — aggregated per branch.

### `GET /api/cs/pelanggan`
Customer list grouped by orders.

**Response 200:** `{ data: [{ customer_wa, customer_name, orders: [...], total_orders, total_spent }] }`

### `GET /api/cs/users`
List active CS users.

**Response 200:** `{ data: [{ id, full_name, ... }] }`

---

## Marketing

### `GET /api/marketing/inputs`
List marketing input data.

**Response 200:** `{ data: [...] }`

### `POST /api/marketing/inputs`
Create marketing input.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `channel_id` | string | ✅ | |
| `cs_user_id` | string | ❌ | |
| `inputs` | object | ✅ | Channel-specific data |

**Response 200:** `{ success: true }`

### `GET /api/marketing/analytics`
Marketing analytics data.

| Query | Type | Description |
|-------|------|-------------|
| `period` | string | Filter period |

**Response 200:** `{ data: { summary, channel_metrics, recommendations } }`

### `GET /api/marketing/channels`
List marketing channels.

**Response 200:** `{ data: [{ id, name }] }`

---

## Superadmin / Overview

### `GET /api/overview`
Superadmin dashboard snapshot (BMS + OPRPRD combined).

**Response 200:** `{ data: { kpis, alerts, activity, ... } }`

### `GET /api/stats`
Monthly/channel/branch aggregations.

| Query | Type | Description |
|-------|------|-------------|
| `month` | string | Filter by month |
| `year` | string | Filter by year |

**Response 200:** `{ data: { monthly, channel, branch } }`

### `GET /api/daily-stats-1`
BMS daily stats per branch.

**Response 200:** `{ data: { lead_masuk, closing, omset, trend_7day, ... } }`

### `GET /api/daily-stats-2`
OPRPRD dashboard stats.

**Response 200:** `{ data: { active_orders, cycle_time, trend, operational, production, ... } }`

### `GET /api/analyst-oprprd`
OPRPRD analyst data.

**Response 200:** `{ data: { production_roles, susut, qc_stats, ... } }`

---

## Branches & Users (Superadmin)

### `GET /api/branches`
List all branches.

**Response 200:** `{ data: [{ id, name, code }] }`

### `POST /api/branches`
Create a branch.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | |
| `code` | string | ✅ | |

**Response 200:** `{ success: true, data: { id } }`

### `PUT /api/branches/[id]`
Update a branch (superadmin only).

**Response 200:** `{ success: true }`

### `GET /api/users`
List all users.

| Query | Type | Description |
|-------|------|-------------|
| `role_group` | string | Filter by role group |

**Response 200:** `{ data: [...] }`

### `POST /api/users`
Create a new user.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ✅ | |
| `full_name` | string | ✅ | |
| `username` | string | ❌ | |
| `pin` | string | ❌ | For workshop users |
| `role_id` | string | ✅ | FK to roles table |
| `branch_id` | string | ❌ | |

**Response 200:** `{ success: true, data: { id } }`

### `GET /api/users/[id]`
Get user detail.

**Response 200:** `{ data: { ... } }`

### `PUT /api/users/[id]`
Update user.

**Response 200:** `{ success: true }`

### `DELETE /api/users/[id]`
Soft-delete user.

**Response 200:** `{ success: true }`

### `GET /api/roles`
List all roles.

| Query | Type | Description |
|-------|------|-------------|
| `role_group` | string | Filter by group (management/operational/production) |

**Response 200:** `{ data: [{ id, name, role_group, description, permissions }] }`

---

## Reports (BMS)

### `GET /api/reports`
List reports.

**Response 200:** `{ data: [...] }`

### `POST /api/reports`
Generate a report.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | ✅ | Report type |
| `period` | string | ✅ | monthly/quarterly/yearly |

**Response 200:** `{ success: true, data: { id } }`

### `DELETE /api/reports/[id]`
Delete a report.

**Response 200:** `{ success: true }`

### `GET /api/reports/export`
Export report as CSV.

| Query | Type | Description |
|-------|------|-------------|
| `id` | string | Report ID |

**Response 200:** CSV file download.

---

## OPRPRD Reports & Monitoring

### `GET /api/reports-oprprd`
OPRPRD report data.

| Query | Type | Description |
|-------|------|-------------|
| `type` | string | production/quality/staff/complete |

**Response 200:** `{ data: [...] }`

### `GET /api/operational`
Operational monitoring data.

**Response 200:** `{ data: [...] }`

### `GET /api/production`
Production monitoring data.

**Response 200:** `{ data: { jewelry_experts, micro_setting, ... } }`

### `GET /api/rework-overview`
Rework/rejection overview.

**Response 200:** `{ data: { total_rework, by_stage, ... } }`

### `GET /api/bottleneck`
Bottleneck detection data.

**Response 200:** `{ data: { stuck_orders, stage_metrics, ... } }`

### `GET /api/order-detail`
Full order detail.

| Query | Type | Required | Description |
|-------|------|----------|-------------|
| `order_id` | string | ✅ | Order UUID |

**Response 200:** `{ data: { order, transitions, stage_results, approvals, deliveries, scan_events } }`

---

## Analytics

### `GET /api/analytics/cycle-time`
Cycle time per stage.

**Response 200:** `{ data: { summary, stages: [{ stage, samples, avg, median, p95, min, max }], monthly_trend } }`

### `GET /api/analytics/worker-productivity`
Worker productivity metrics.

**Response 200:** `{ data: { summary, workers: [{ name, role, scans, completions, avg_duration, susut }] } }`

### `GET /api/analytics/stage-durations`
Per-stage duration averages.

**Response 200:** `{ data: { stages: [{ stage, avg_duration, p75_duration }] } }`

### `GET /api/analytics/bottleneck-history`
90-day bottleneck history.

| Query | Type | Description |
|-------|------|-------------|
| `days` | number | Lookback period (default 90) |

**Response 200:** `{ data: { summary, heatmap: [{ date, stage, count }] } }`

---

## Supervisor

### `GET /api/supervisor`
Supervisor monitoring data.

**Response 200:** `{ data: { active_orders, stats, ... } }`

### `GET /api/supervisor/pending`
Pending approval submissions.

| Query | Type | Description |
|-------|------|-------------|
| `role_name` | string | Filter by supervisor role |

**Response 200:** `{ data: [{ order_id, stage, submitted_by, submitted_at, data }] }`

### `POST /api/supervisor/approve`
Approve or reject a stage submission.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `order_id` | string | ✅ | Order UUID |
| `stage` | string | ✅ | Must start with `approval_` |
| `action` | string | ✅ | `approve` or `reject` |
| `remarks` | string | ❌ | Required on reject |
| `stage_result_id` | string | ❌ | Link to submission |

**Response 200:** `{ success: true, message, nextStage }`
**Response 403:** Not authorized for this stage.
**Response 409:** Order already moved past this stage.

### `GET /api/supervisor/accounts`
List workshop worker accounts (scoped to supervisor's group).

**Response 200:** `{ data: [...] }`

### `POST /api/supervisor/accounts`
Create a worker account.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `full_name` | string | ✅ | |
| `username` | string | ✅ | |
| `pin` | string | ✅ | 6-digit PIN |
| `role_id` | string | ✅ | |

**Response 200:** `{ success: true, data: { id } }`

### `GET /api/supervisor/accounts/[userId]`
Get worker detail.

**Response 200:** `{ data: { ... } }`

### `PUT /api/supervisor/accounts/[userId]`
Update worker account.

**Response 200:** `{ success: true }`

### `DELETE /api/supervisor/accounts/[userId]`
Soft-delete worker.

**Response 200:** `{ success: true }`

### `GET /api/supervisor/qr-codes`
List supervisor-scoped QR codes.

**Response 200:** `{ data: [...] }`

### `POST /api/supervisor/qr-codes`
Create a QR code.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Workstation name |
| `role_id` | string | ✅ | Links to role |

**Response 200:** `{ success: true, data: { id, token } }`

### `GET /api/me`
Get current authenticated user profile.

**Response 200:** `{ data: { id, email, full_name, role, roleDetail, branch } }`

---

## Workshop

### `GET /api/workshop/orders`
Orders at worker's allowed stages.

| Query | Type | Description |
|-------|------|-------------|
| `user_id` | string | Worker UUID |

**Response 200:** `{ data: [{ order, stage, deadline, ... }] }`

### `GET /api/workshop/workers`
List workers for a given QR token.

| Query | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | ✅ | QR token |

**Response 200:** `{ data: [{ id, full_name, username }] }`

### `GET /api/workshop/history`
Worker's own scan/submission history.

| Query | Type | Description |
|-------|------|-------------|
| `user_id` | string | Worker UUID |

**Response 200:** `{ data: [{ stage, order, submitted_at, ... }] }`

---

## Stages

### `GET /api/stages/form-config`
Dynamic form field configuration per stage.

| Query | Type | Required | Description |
|-------|------|----------|-------------|
| `stage` | string | ✅ | Stage key |
| `role_name` | string | ✅ | Worker's role |
| `role_group` | string | ✅ | Worker's role group |

**Response 200:** `{ data: { fields: [...], can_submit, can_edit, can_reject } }`

### `POST /api/stages/submit`
Submit stage result data.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `order_id` | string | ✅ | Order UUID |
| `stage` | string | ✅ | Stage key |
| `data` | object | ✅ | Stage-specific form data (varies by stage) |
| `notes` | string | ❌ | Worker notes |

**Response 200:** `{ success: true, nextStage, status }`
**Response 403:** Worker not authorized for this stage.
**Response 409:** Order not at expected stage.

---

## QR Codes (Superadmin)

### `GET /api/qr-codes`
List all QR codes.

**Response 200:** `{ data: [...] }`

### `POST /api/qr-codes`
Create a new QR code.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Workstation name |
| `role_id` | string | ✅ | |

**Response 200:** `{ success: true, data: { id, token } }`

### `GET /api/qr-scan`
Handle QR scan.

| Query | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | ✅ | QR token |

**Response 200:** `{ data: { role, workstation, ... } }`

### `POST /api/qr-scan`
Start or complete a stage via QR.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `order_id` | string | ✅ | |
| `action` | string | ✅ | `start` or `complete` |

**Response 200:** `{ success: true }`

### `GET /api/scan-events`
List scan events (paginated).

| Query | Type | Description |
|-------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `order_id` | string | Filter by order |

**Response 200:** `{ data: [...], total, page, limit }`

### `GET /api/scan-events/[id]`
Single scan event detail.

**Response 200:** `{ data: { ... } }`

---

## Slots (Production Capacity)

### `GET /api/slots/slot-check`
Check slot availability.

| Query | Type | Required | Description |
|-------|------|----------|-------------|
| `kategori` | string | ✅ | Order category |
| `tgl_order` | string | ✅ | Order date (YYYY-MM-DD) |

**Response 200:** `{ success: true, data: { kategori, tgl_order, label, max_slots, used, available, is_full } }`

### `GET /api/slots/slot-categories`
List slot categories with usage for a date.

| Query | Type | Required | Description |
|-------|------|----------|-------------|
| `date` | string | ✅ | Date (YYYY-MM-DD) |

**Response 200:** `{ data: [{ id, kategori, label, max_slots, used, available }] }`

### `PATCH /api/slots/slot-categories/[id]`
Update slot category settings.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `max_slots` | number | ✅ | |

**Response 200:** `{ success: true }`

### `GET /api/slots/slot-overrides`
List slot overrides.

**Response 200:** `{ data: [...] }`

### `POST /api/slots/slot-overrides`
Create a slot override.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slot_category_id` | string | ✅ | |
| `date` | string | ✅ | Date (YYYY-MM-DD) |
| `override_max_slots` | number | ✅ | |

**Response 200:** `{ success: true }`

### `DELETE /api/slots/slot-overrides/[id]`
Delete a slot override.

**Response 200:** `{ success: true }`

---

## Notifications

### `GET /api/notifications`
List notifications for current user.

| Query | Type | Description |
|-------|------|-------------|
| `unread_only` | boolean | Filter unread only |

**Response 200:** `{ data: [{ id, title, message, type, link, is_read, created_at }] }`

### `PATCH /api/notifications/[id]`
Mark notification as read.

**Response 200:** `{ success: true }`

---

## Pusher

### `POST /api/pusher/auth`
Authenticate Pusher private channel subscription.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `channel_name` | string | ✅ | e.g., `private-user-{userId}` |
| `socket_id` | string | ✅ | Pusher socket ID |

**Response 200:** `{ auth: "..." }`

---

## Webhooks

### `POST /api/webhooks/pusher`
Supabase webhook → Pusher bridge for realtime notifications.

**(Internal — triggered by Supabase database webhook)**

---

## Public

### `GET /api/order-form/[token]`
Get order by public token (no auth required).

**Response 200:** `{ data: CsOrder }`
**Response 404:** Token not found.

### `POST /api/order-form/[token]`
Submit public order form data.

| Field | Type | Description |
|-------|------|-------------|
| *(CsOrder fields)* | | Customer fills specs |

**Response 200:** `{ success: true }`

---

## Common Error Responses

| Status | Meaning |
|--------|---------|
| 401 | Unauthorized — missing or invalid session |
| 403 | Forbidden — role lacks permission for this action |
| 404 | Resource not found |
| 409 | Conflict — order not at expected stage |
| 422 | Validation error |
| 500 | Internal server error |

Error body format:
```json
{ "error": "Human-readable error message" }
```

In development mode, debug info may be appended:
```json
{ "error": "...", "debug": "..." }
```
