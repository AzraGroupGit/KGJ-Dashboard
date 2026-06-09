# Product Requirements Document (PRD)

## BMS-OPR-PRD ERP System

**Version:** 1.0
**Last Updated:** 2026-06-08

---

## 1. Product Overview

### 1.1 Purpose

A custom ERP system for managing custom ring orders from intake to delivery at a jewelry workshop (PT KodaGede Jewellery). Replaces paper-based and spreadsheet tracking with a digital system providing real-time visibility, role-based access, and data-driven analytics.

### 1.2 Target Users

| User Group | Roles | Auth Method | Access Level |
|-----------|-------|-------------|--------------|
| Management | Superadmin | Email + password | Full system access, analytics, reports |
| Operational Staff | Customer Service, Marketing | Email + password | Order input, customer management, marketing data |
| Supervisors | Operational Supervisor, Production Supervisor | Email + password | Approvals, monitoring, bottleneck analysis, worker/QR management |
| Production Workers | Racik Bahan, Lebur, Pembentukan, Microsetting, Poles, Cek Kadar, QC, Laser, Finishing, Packing, Pengiriman | QR scan or 6-digit PIN | Stage-specific work orders, submission |

### 1.3 Key Metrics

- **20** production stages (5 approval gates, 10 production, 5 operational)
- **3** login roles (superadmin, customer_service, marketing)
- **31** API endpoint directories
- **33** UI components
- **7** order categories (reguler, cepat, kilat, kilat_laser_batik, vvip, revisi, marketplace)

---

## 2. Features & Requirements

### 2.1 Authentication & Authorization

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F-01 | Form Login | Email/password login for dashboard users (superadmin, CS, marketing) | P0 |
| F-02 | QR Login | QR code scan for workshop workers — auto-fills role + stage | P0 |
| F-03 | PIN Login | 6-digit PIN as backup for workshop workers (bcrypt hashed) | P0 |
| F-04 | Role-Based Access | Proxy middleware enforces role-specific route access | P0 |
| F-05 | Dual Session | Supabase cookies (server auth) + localStorage (client UI state) | P0 |
| F-06 | Session Timeout | Automatic redirect to login on session expiry | P1 |

### 2.2 Order Management

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F-10 | Order Creation | CS creates orders with full specs (pria + wanita rings) | P0 |
| F-11 | Order Form (CS) | ~2673-line form: customer data, ring specs, materials, engraving, pricing, delivery, reference images | P0 |
| F-12 | Public Order Form | Token-based public form for customers to fill specs via link | P1 |
| F-13 | Draft Auto-Save | Auto-save order form drafts in localStorage | P1 |
| F-14 | Slot Availability Check | Real-time check of production slot capacity before order placement | P1 |
| F-15 | Working Day Calculation | Automatic calculation of available working days (excl. weekends + ID holidays) | P0 |
| F-16 | Stage Classification | Auto-recommend order category based on available working days | P1 |
| F-17 | Order Number Generation | Auto-generated CS-YYYYMMDD-NNN format | P0 |

### 2.3 Production Workflow

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F-20 | Stage Progression | Orders advance through 20-stage sequence enforced by system | P0 |
| F-21 | Worker Stage Submission | Workshop workers submit stage results with form data | P0 |
| F-22 | Dynamic Form Fields | Stage-specific form configurations loaded from API | P0 |
| F-23 | Attempt Tracking | Auto-increment attempt number per stage per order | P0 |
| F-24 | 5 Approval Gates | Supervisor approval required between specific production stages | P0 |
| F-25 | Approve/Reject | Supervisor can approve (advance) or reject (return with notes) | P0 |
| F-26 | Rework Loop | Rejected orders return to worker for resubmission | P0 |
| F-27 | Stage Transitions | Every stage change logged with user, timestamp, reason | P0 |
| F-28 | Deadline Tracking | Per-stage deadlines with working-day scaling | P1 |
| F-29 | Deadline Warnings | Color-coded indicators: green (on track), yellow, red (overdue) | P1 |

### 2.4 Monitoring & Analytics

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F-30 | Dashboard KPIs | Active orders, cycle time, delay risks, WIP value | P0 |
| F-31 | Order Monitoring | Real-time view of all orders with stage/status filters | P0 |
| F-32 | Order Detail Timeline | Full history: transitions, submissions, approvals, scans | P0 |
| F-33 | Bottleneck Analysis | Identify stages with longest wait times | P1 |
| F-34 | Cycle Time Analytics | Per-stage average, median, P95 duration | P2 |
| F-35 | Worker Productivity | Per-worker metrics: scan count, completion rate, avg duration | P2 |
| F-36 | QC Pass Rates | Quality control pass/fail tracking per stage | P2 |
| F-37 | Bottleneck History | 90-day heatmap of bottleneck stages | P2 |
| F-38 | BMS Statistics | Monthly/channel/branch stats with charts | P1 |

### 2.5 Supervisor Tools

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F-40 | Pending Approvals | List of orders waiting for supervisor decision | P0 |
| F-41 | Stage-Scoped Approval | Operational supervisor vs production supervisor permissions | P0 |
| F-42 | Approval Remarks | Required notes when rejecting, optional when approving | P0 |
| F-43 | Worker Account Management | CRUD for workshop worker accounts | P0 |
| F-44 | QR Code Generation | Generate workstation QR codes per role | P0 |
| F-45 | Slot Management | Configure production slot capacity per category | P1 |

### 2.6 Customer Service Tools

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F-50 | Dashboard Overview | Pipeline: pending/submitted/reviewed/converted | P0 |
| F-51 | Lead Input | Daily lead masuk/closing/omset per branch | P0 |
| F-52 | Customer Management | Group orders by customer (by WA number) | P0 |
| F-53 | Order Review Alerts | Flag orders needing attention | P1 |
| F-54 | Konfirmasi Stage | CS confirms with customer that ring is ready | P0 |
| F-55 | Reference Image Upload | Upload ring reference images to Supabase Storage | P0 |

### 2.7 Marketing Tools

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F-60 | Marketing Dashboard | Conversion rate, CAC, channel performance | P1 |
| F-61 | Input Marketing Data | Per-channel marketing input with CS user linking | P1 |
| F-62 | Channel Analysis | Deep-dive analytics per channel | P2 |

### 2.8 Notifications & Realtime

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F-70 | Supervisor Notifications | Real-time push when order needs approval | P0 |
| F-71 | CS Notifications | Notify CS when order completed | P0 |
| F-72 | Notification Persistence | Notifications stored in DB + pushed via Pusher | P0 |
| F-73 | Read/Unread State | Mark notifications as read | P1 |
| F-74 | Deep Links | Notification links navigate to relevant page | P1 |

### 2.9 Reports

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F-80 | BMS Reports | Monthly/quarterly/yearly report generation | P2 |
| F-81 | OPRPRD Reports | Production, quality, staff, and complete exports | P2 |
| F-82 | CSV Export | Data table CSV export | P2 |

### 2.10 PDF

| ID | Feature | Description | Priority |
|----|---------|-------------|----------|
| F-90 | Order Worksheet PDF | A5 landscape "Form Tukang" with ring specs, images, measurements | P1 |

---

## 3. User Roles & Permissions

### 3.1 Login Roles (Form-based auth)

| Role | Dashboard | Can Access | Key Actions |
|------|-----------|------------|-------------|
| `superadmin` | `/dashboard/superadmin` | All except supervisor dashboard | Account management, QR management, BMS & OPRPRD modules, reports, analytics |
| `customer_service` | `/dashboard/cs` | CS dashboard + API | Order creation, lead input, customer management, konfirmasi |
| `marketing` | `/dashboard/marketing` | Marketing dashboard + API | Input marketing data, channel analysis |

### 3.2 Supervisor Roles (Form-based auth)

| Role | Dashboard | Approval Scope |
|------|-----------|----------------|
| `operational_supervisor` | `/dashboard/supervisor` | `approval_penerimaan_order`, `approval_racik_bahan`, `approval_qc_1`, `approval_qc_2` |
| `production_supervisor` | `/dashboard/supervisor` | `approval_produksi` |

### 3.3 Workshop Roles (QR/PIN-based auth, DB-driven)

Any role name that is not a login role. Examples include `racik_bahan`, `lebur_bahan`, `pembentukan_cincin`, `pemasangan_permata`, `pemolesan`, `cek_kadar`, `qc_1`, `laser`, `finishing`, `qc_2`, `packing`, `pengiriman`, `konfirmasi`, etc.

---

## 4. Order Categories

| Kategori | Min Working Days | Description |
|----------|-----------------|-------------|
| `reguler` | 25 | Regular (25-30 working days) |
| `cepat` | 14 | Express (14 working days) |
| `kilat` | 7 | Rush (7 working days) |
| `kilat_laser_batik` | 10 | Rush with laser batik (10 working days) |
| `vvip` | 3 | VVIP (3 working days) |
| `revisi` | 14 | Revision (14 working days) |
| `marketplace` | 14 | Marketplace (14 working days) |

---

## 5. Stage Sequence (20 Stages)

### 5.1 Stage Flow

```
Operational:    penerimaan_order → konfirmasi → packing → pengiriman → selesai
Management:     approval_penerimaan_order → approval_racik_bahan → approval_qc_1 →
                approval_produksi → approval_qc_2
Production:     racik_bahan → lebur_bahan → pembentukan_cincin → pemasangan_permata →
                pemolesan → cek_kadar → qc_1 → laser → finishing → qc_2
```

### 5.2 Approval Gates

| Gate | Production Stage | Approval Stage | Supervisor |
|------|-----------------|----------------|------------|
| 1 | `penerimaan_order` | `approval_penerimaan_order` | Operational |
| 2 | `racik_bahan` | `approval_racik_bahan` | Operational |
| 3 | `qc_1` | `approval_qc_1` | Operational |
| 4 | `finishing` | `approval_produksi` | Production |
| 5 | `qc_2` | `approval_qc_2` | Operational |

---

## 6. Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| N-01 | Page Load Time | < 2s for dashboard pages |
| N-02 | Real-time Lag | < 1s for notifications via Pusher |
| N-03 | Auth Response | < 1s for login/PIN verification |
| N-04 | Concurrent Users | Support 50+ concurrent workshop workers |
| N-05 | Data Freshness | Auto-refresh every 30s on monitoring pages |
| N-06 | Browser Support | Chrome, Firefox, Safari (modern versions) |
| N-07 | Mobile Support | Responsive design for phone browsers |
| N-08 | Audit Trail | All stage transitions, approvals, and scan events logged with user + timestamp |

---

## 7. Constraints & Assumptions

- All env vars are required and tracked in `.env.local` (not committed)
- No test framework installed — manual testing only
- Indonesian working day calendar (weekends + national holidays excluded)
- Stage sequence is enforced by application logic, not database constraints
- Supabase manages backups automatically
- Workshop role names are DB-driven and cannot be enumerated statically
