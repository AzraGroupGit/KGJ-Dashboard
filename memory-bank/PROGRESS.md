# Progress Report

## Project Status: Live / In Production

The BMS-OPR-PRD ERP system is actively deployed and in daily use at the jewelry workshop. The following tracks implementation status of all features.

---

## Feature Completion

### Authentication & Authorization — ✅ Complete

| Feature | Status | Notes |
|---------|--------|-------|
| Form login (email + password) | ✅ Done | `/api/auth/login`, 3 roles |
| QR login (workshop) | ✅ Done | `/api/auth/qr-login` |
| PIN login (workshop, 6-digit bcrypt) | ✅ Done | `/api/auth/pin-login` |
| Role-based route protection | ✅ Done | `proxy.ts` middleware |
| Dual-session model (Supabase cookies + localStorage) | ✅ Done | |
| Session timeout handling | ✅ Done | Redirects to `/login` |
| Workshop PIN change | ✅ Done | `/workshop/settings/pin` |

### Order Management — ✅ Complete

| Feature | Status | Notes |
|---------|--------|-------|
| CS order creation form | ✅ Done | 2673-line form in `/dashboard/cs/input-order` |
| Order number auto-generation | ✅ Done | `CS-YYYYMMDD-NNN` format |
| Working-day calculation | ✅ Done | `lib/working-days.ts` with ID holidays |
| Order category recommendation | ✅ Done | Based on available working days |
| Slot availability check | ✅ Done | `lib/slot-check.ts` |
| Public order form (token-based) | ✅ Done | `/order-form/[token]`; includes instruction overlay with localStorage dismissal |
| Draft auto-save | ✅ Done | localStorage |
| Reference image upload | ✅ Done | Supabase Storage |
| Customer management | ✅ Done | Grup by WA number |

### Production Workflow — ✅ Complete

| Feature | Status | Notes |
|---------|--------|-------|
| 20-stage sequence enforcement | ✅ Done | `lib/stages.ts` |
| Worker stage submission | ✅ Done | `POST /api/stages/submit` |
| Dynamic form fields per stage | ✅ Done | `/api/stages/form-config` |
| Attempt number tracking | ✅ Done | Auto-increment per stage |
| 5 approval gates | ✅ Done | Operational + Production supervisors |
| Approve/reject with remarks | ✅ Done | `POST /api/supervisor/approve` |
| Rework loop (reject → return to worker) | ✅ Done | |
| Stage transition logging | ✅ Done | `order_stage_transitions` table |
| Per-stage deadline calculation | ✅ Done | `lib/stage-deadlines.ts` |
| Deadline warnings (green/yellow/red) | ✅ Done | In workshop UI |

### Monitoring & Analytics — Mostly Complete

| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard KPIs | ✅ Done | Active orders, cycle time, delays, WIP |
| Order monitoring with filters | ✅ Done | Stage/status filtering |
| Order detail timeline | ✅ Done | Transitions, submissions, approvals, scans |
| Bottleneck analysis | ✅ Done | By-stage wait time identification |
| Cycle time analytics | ✅ Done | `recharts` charts |
| Worker productivity | ✅ Done | Per-worker metrics |
| QC pass rate tracking | ✅ Done | |
| Bottleneck 90-day heatmap | ✅ Done | |
| BMS statistics (monthly/channel/branch) | ✅ Done | |

### Supervisor Tools — ✅ Complete

| Feature | Status | Notes |
|---------|--------|-------|
| Pending approvals list | ✅ Done | With stage-scoped filtering |
| Stage-scoped approval (operational vs production) | ✅ Done | |
| Approval remarks (required on reject) | ✅ Done | |
| Worker account management | ✅ Done | CRUD for workshop workers |
| QR code generation | ✅ Done | Per-role workstation QR |
| Slot management | ✅ Done | Capacity configuration |
| Personnel management | ✅ Done | Stage-to-person assignment CRUD; scoped by supervisor role (production/operational); Slot Management hidden for production_supervisor; requires `stage_personnel` table |
| Monitoring & bottleneck consistency | ✅ Done | Groups aligned (racik_bahan/qc_1/qc_2/laser → operational); stage ordering fixed; labels centralized to `lib/stages.ts` |
| Superadmin OPRPRD expert cards | ✅ Done | Updated ROLE_CONFIG with pemasangan_permata, pemolesan, laser_batik, laser_nama |

### Customer Service Tools — ✅ Complete

| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard pipeline | ✅ Done | pending/submitted/reviewed/converted |
| Daily lead input | ✅ Done | Per-branch lead/closing/omset |
| Customer grouping | ✅ Done | By WA number |
| Konfirmasi stage | ✅ Done | Customer confirmation |
| Reference image upload | ✅ Done | |

### Marketing Tools — ✅ Complete

| Feature | Status | Notes |
|---------|--------|-------|
| Marketing dashboard | ✅ Done | Conversion rate, CAC, channel perf |
| Marketing data input | ✅ Done | Per-channel with CS linking |
| Channel analysis | ✅ Done | Deep-dive analytics |

### Notifications & Realtime — ✅ Complete

| Feature | Status | Notes |
|---------|--------|-------|
| Supervisor notifications (approval needed) | ✅ Done | Pusher realtime |
| CS notifications (order completed) | ✅ Done | |
| Notification persistence (DB) | ✅ Done | `notifications` table |
| Read/unread state | ✅ Done | |
| Deep link navigation | ✅ Done | Notification → relevant page |

### Reports — In Progress

| Feature | Status | Notes |
|---------|--------|-------|
| BMS reports (monthly/quarterly/yearly) | ✅ Done | Generation + management |
| OPRPRD reports (production/quality/staff) | ✅ Done | |
| CSV export | ✅ Done | Via DataTable component |

### Laser Stage — ✅ Complete

| Feature | Status | Notes |
|---------|--------|-------|
| Batik/nama tukang split | ✅ Done | Two select fields with sub-type filtering from `stage_personnel` |
| Model Nusantara selection | ✅ Done | 25 batik patterns in grouped checkboxes (Jawa/Kalimantan/Bali/Papua/Sumatera) via new `multi_select` field type |
| Multi-select UI component | ✅ Done | `MultiSelectField` — collapsible region groups, toggle buttons, selected count |

### PDF — ✅ Complete

| Feature | Status | Notes |
|---------|--------|-------|
| Order worksheet PDF (Form Tukang) | ✅ Done | A5 landscape, @react-pdf/renderer |

---

## Known Gaps & Technical Debt

| Area | Issue | Priority |
|------|-------|----------|
| Database | `stage_personnel` table must be created via Supabase SQL Editor (SQL provided to developer) | High — blocks personnel feature |
| Testing | No test framework installed; no test scripts | Low (manual testing only) |
| State management | All state is `useState`/`useEffect`; no global state library | Low |
| Data fetching | Raw `fetch()` + `useEffect` everywhere; no React Query/SWR | Low |
| Component size | `StageInputForm.tsx` is 2184 lines (was 2183, +1 for `multi_select`); `input-order/page.tsx` is 2673 lines | Medium — could benefit from splitting |
| StageInputForm | 2184 lines with 23+ field types — monolithic | Medium |
| Stage constant duplication | Stage array defined in `lib/stages.ts` but also inlined in `stages/submit/route.ts` and `supervisor/approve/route.ts` | Low — import could be deduplicated |
| Stage label duplication | 6 files had hardcoded stage label maps — now centralized to `lib/stages.ts` imports in 4 files (supervisor API, bottleneck API, pending API, supervisor bottleneck page, supervisor monitoring page, superadmin monitoring page) | ✅ Resolved |
| Legacy tables | `orders` table exists alongside `cs_orders` with different stage sequence | Low — backward compat |
| Icon inconsistency | Mix of `lucide-react` and inline SVGs | Low — transition in progress |
| Chart inconsistency | Mix of raw Canvas 2D (`ChartCard`) and `recharts` | Low |

---

## Deployment

| Environment | URL | Status |
|-------------|-----|--------|
| Production | (deployed) | ✅ Live |
| Development | `http://localhost:3000` | ✅ `npm run dev` |

Env files (`.env*`) are in `.gitignore` and not tracked. All 8 env vars required.
