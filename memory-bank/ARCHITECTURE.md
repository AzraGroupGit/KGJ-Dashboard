# System Architecture

## Overview

BMS-OPR-PRD is a custom ERP for managing custom ring orders at a jewelry workshop. It tracks orders through 20 production stages from intake to delivery, with role-based dashboards for Customer Service, Marketing, Supervisors, Production Workers, and Superadmin.

The system follows a **Next.js 16 App Router** architecture with **Supabase** for database and auth, **Pusher** for realtime notifications, and **dual-session** model (Supabase cookies for server auth + localStorage for client UI state).

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Client Browser                                   │
│                                                                             │
│  /dashboard/cs/*      /dashboard/supervisor/*    /workshop/input           │
│  /dashboard/marketing/*  /dashboard/superadmin/*   /order-form/[token]     │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                   Next.js 16 (App Router, React 19)                  │   │
│  │                                                                       │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐    │   │
│  │  │  Pages/Routes│  │  Components  │  │  lib/ (utils, auth,      │    │   │
│  │  │  app/        │  │  components/ │  │  supabase, pusher, etc)  │    │   │
│  │  └──────┬───────┘  └──────────────┘  └─────────────┬────────────┘    │   │
│  │         │                                           │                 │   │
│  │         ▼                                           ▼                 │   │
│  │  ┌──────────────────────────────────────────────────────────────┐     │   │
│  │  │                    proxy.ts (Middleware)                     │     │   │
│  │  │  Auth checks + role-based redirects for all non-API routes  │     │   │
│  │  └──────────────────────────────────────────────────────────────┘     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│         ┌────────────────────┼────────────────────┐                         │
│         ▼                    ▼                    ▼                         │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐                │
│  │  Supabase    │   │   Pusher     │   │  LocationIQ      │                │
│  │  (DB + Auth) │   │  (Realtime   │   │  (Address        │                │
│  │  + Storage)  │   │  Notif)      │   │  Autocomplete)   │                │
│  └──────────────┘   └──────────────┘   └──────────────────┘                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
root/
├── app/                          # Next.js App Router pages & API routes
│   ├── api/                      # 31 API endpoint directories
│   │   ├── auth/                 # Login, logout, QR login, PIN login
│   │   ├── cs/                   # CS order CRUD, stats, pelanggan
│   │   ├── supervisor/           # Approvals, accounts, QR codes, monitoring
│   │   ├── workshop/             # Worker orders, history, workers
│   │   ├── slots/                # Production slot capacity management
│   │   ├── stages/               # Stage form config + stage submission
│   │   ├── analytics/            # Cycle time, productivity, bottleneck history
│   │   ├── notifications/        # User notifications CRUD
│   │   ├── pusher/               # Pusher channel auth
│   │   ├── marketing/            # Marketing data & analytics
│   │   ├── order-form/           # Public order form (token-based)
│   │   └── ...                   # reports, stats, users, roles, etc.
│   ├── dashboard/                # Dashboard pages
│   │   ├── cs/                   # CS: input-order, input-leads, pelanggan
│   │   ├── marketing/            # Marketing: input, analisis
│   │   ├── superadmin/           # Superadmin: BMS & OPRPRD modules
│   │   └── supervisor/           # Supervisor: approval, monitoring, bottleneck
│   ├── workshop/                 # Workshop QR/PIN login + stage input
│   ├── login/                    # Form login page
│   ├── order-form/[token]/       # Public customer order form
│   ├── layout.tsx                # Root layout (Geist fonts)
│   └── globals.css               # Tailwind v4 + @font-face + animations
├── components/                   # All UI components (33 files, 8 dirs)
│   ├── ui/                       # Primitives: Button, Input, Modal, Alert, etc.
│   ├── layout/                   # Sidebar, Header, Mobile variants
│   ├── dashboard/                # StatCard, DataTable, KpiCard
│   ├── analytics/                # CycleTimeTab, WorkerProductivityTab, etc.
│   ├── order/                    # Order form widgets: MaterialSelect, FontPicker
│   ├── orders/                   # StageTimeline, CustomerTimeline
│   ├── qr/                       # LoginForm, PinPad, StageInputForm
│   └── pdf/                      # OrderFormPDF (@react-pdf/renderer)
├── lib/                          # Shared utilities & services
│   ├── supabase/                 # 3 clients: client.ts, server.ts, admin.ts
│   ├── auth/                     # session.ts (localStorage), supervisor.ts
│   ├── pusher/                   # client.ts, server.ts
│   ├── stages.ts                 # Canonical 20-stage sequence & helpers
│   ├── routes.ts                 # Route defs, role type system, auth helpers
│   ├── notifications.ts          # DB insert + Pusher push orchestration
│   ├── working-days.ts           # Indonesian working-day + holiday calc
│   ├── stage-deadlines.ts        # Per-stage deadline calculation
│   └── slot-check.ts             # Client-side slot availability check
├── types/                        # TypeScript type definitions
│   └── cs-orders.ts              # CsOrder interface
├── proxy.ts                      # Next.js middleware (auth + role-based ACL)
└── package.json
```

---

## Data Flow

### Order Lifecycle

```
CS Input Order
  │
  ▼  POST /api/cs/orders
penerimaan_order (operational)
  │
  ▼  POST /api/supervisor/approve  (operational_supervisor)
approval_penerimaan_order ✓ or ✗
  │
  ▼  (if approved)
racik_bahan (production — worker submits via POST /api/stages/submit)
  │
  ▼
approval_racik_bahan → lebur_bahan → pembentukan_cincin → pemasangan_permata
→ pemolesan → cek_kadar → qc_1
  │
  ▼  POST /api/supervisor/approve
approval_qc_1 ✓ or ✗
  │
  ▼  (if approved)
laser → finishing
  │
  ▼  POST /api/supervisor/approve (production_supervisor)
approval_produksi ✓ or ✗
  │
  ▼  (if approved)
qc_2
  │
  ▼  POST /api/supervisor/approve
approval_qc_2 ✓ or ✗
  │
  ▼  (if approved)
konfirmasi (CS confirms with customer)
  │
  ▼
packing → pengiriman → ✅ selesai
```

### Stage Submission Flow (Worker)

```
1. Worker authenticates via QR scan or PIN at /workshop/login
2. POST /api/auth/pin-login → Supabase session created
3. GET /api/workshop/orders → fetch orders at worker's allowed stages
4. Worker submits stage data via StageInputForm
5. POST /api/stages/submit → validates access, inserts stage_result
6. If stage needs approval → advance to approval stage, set status=waiting_approval
   → notifySupervisors() via Pusher
7. If stage is final → advance to next production stage, status=in_progress
```

### Approval Flow (Supervisor)

```
1. Supervisor logs in via /login → Supabase session + localStorage session
2. GET /api/supervisor/pending → fetch orders waiting for supervisor's approval
3. POST /api/supervisor/approve { order_id, stage, action, remarks }
4. Server:
   a. Verifies supervisor role + stage authorization
   b. Inserts approval record (approved/rejected)
   c. If approved: advance order to next stage, insert transition
   d. If rejected: return order to previous stage, insert transition
   e. Notifications sent via sendNotification()
```

---

## Auth Architecture

### Dual Session Model

```
┌────────────────────────────────────────────────────────────────────┐
│                        Auth Architecture                           │
│                                                                    │
│  ┌──────────────────────────────┐  ┌───────────────────────────┐  │
│  │  Supabase Auth Session       │  │  localStorage Session     │  │
│  │  (cookie-based via @supabase │  │  (lib/auth/session.ts)    │  │
│  │  /ssr)                       │  │                           │  │
│  ├──────────────────────────────┤  ├───────────────────────────┤  │
│  │  Managed by Supabase SDK     │  │  Managed manually:        │  │
│  │  Read server-side via        │  │  getClientUser()          │  │
│  │  createClient().auth.getUser │  │  setClientUser()          │  │
│  │  Used by proxy.ts + route    │  │  clearClientUser()        │  │
│  │  handlers for auth checks    │  │  Used by dashboard pages  │  │
│  └──────────────────────────────┘  │  for UI rendering         │  │
│                                    └───────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

### Role Hierarchy

```
                  ┌──────────────┐
                  │  Superadmin  │  (management — full access)
                  └──────┬───────┘
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
  │   Customer   │ │  Marketing   │ │  Operational     │
  │   Service    │ │              │ │  Supervisor      │
  └──────────────┘ └──────────────┘ └────────┬─────────┘
                                             │
                                    ┌────────┴────────┐
                                    ▼                 ▼
                            ┌──────────────┐ ┌──────────────────┐
                            │  Production  │ │  Workshop        │
                            │  Supervisor  │ │  Workers (DB-    │
                            └──────────────┘ │  driven roles)   │
                                             └──────────────────┘
```

---

## Supabase Client Architecture

| Client | Module | Key | RLS | Session | Used In |
|--------|--------|-----|-----|---------|---------|
| **Client** | `lib/supabase/client.ts` | Anon key | Subject to RLS | Browser cookies | `"use client"` components |
| **Server** | `lib/supabase/server.ts` | Anon key | Subject to RLS | SSR cookies (async) | Server components, route handlers (auth checks) |
| **Admin** | `lib/supabase/admin.ts` | Service role | **Bypasses RLS** | None (autoRefresh: false) | Route handlers (DB writes) |

### Dual-Client Pattern (Route Handlers)

```typescript
// 1. Create SSR client for auth
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

// 2. Create admin client for DB writes (bypass RLS)
const admin = createAdminClient();
const { data } = await admin.from("cs_orders").insert({ ... });
```

---

## Realtime Notification Architecture

```
┌──────────┐     POST /api/stages/submit     ┌──────────────┐
│  Worker  │ ──────────────────────────────►  │  API Route   │
└──────────┘                                  └──────┬───────┘
                                                     │
                                                     ▼
                                            ┌──────────────────┐
                                            │ sendNotification │
                                            │ (lib/notific-    │
                                            │  ations.ts)      │
                                            └────────┬─────────┘
                                                     │
                            ┌────────────────────────┼──────────────┐
                            ▼                        ▼              ▼
                   ┌──────────────┐         ┌──────────────┐  ┌───────────┐
                   │  INSERT INTO │         │   Pusher     │  │ Supervisor│
                   │  notifica-   │         │  trigger on  │  │  receives │
                   │  tions (DB)  │         │  private-    │  │ realtime  │
                   └──────────────┘         │  user-{id}   │  │ notifica- │
                                            └──────────────┘  │ tion      │
                                                              └───────────┘
```

---

## Key Design Decisions

1. **No state management library** — all component state is local `useState`/`useReducer`; data fetching is raw `fetch()` + `useEffect`
2. **No UI component library** — all 33 components hand-crafted with raw Tailwind CSS utilities
3. **No server components in components/** — all 33 components are `"use client"` due to hooks usage
4. **Working days as time model** — all deadlines calculated in Indonesian working days (excl. weekends + national holidays), not calendar days
5. **Stage as state machine** — orders follow the 20-stage sequence strictly; no skipping stages
6. **Charting** — all charts use `recharts` (bar, line, area charts in dashboard and analytics views)
