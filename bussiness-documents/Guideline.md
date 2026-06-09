
# BMS-OPR-PRD ERP System — Presentation & Demo Framework

> Use this guide to walk through the system with each stakeholder group.
> Each section is self-contained — present only the relevant parts to each audience.

---

## 1. How to Use This Framework

### Recommended format
- **Live demo** — open the actual system and click through each flow
- **Screen share** with split view: browser (system) + this guide
- **30–45 minutes per stakeholder group**

### Demo preparation checklist
- [ ] Seed a test order through all stages (or have real data ready)
- [ ] Create test accounts for each role
- [ ] Generate a QR code for at least one workstation
- [ ] Have the Supabase SQL Editor open for any live queries
- [ ] Open the monitoring dashboard on a separate screen

### Agenda template
1. **Opening** (5 min) — What is this system? Why build it?
2. **Live demo** (20 min) — Walk through the relevant flow
3. **Deep dive** (10 min) — Key features for this stakeholder
4. **Q&A** (10 min)

---

## 2. Executive Summary — For All Stakeholders

Use this as the opening slide for every session.

### What is this system?
A **custom ERP** for managing custom ring orders from intake to delivery — built specifically for BMS jewelry production.

### Before the system (the old way)
- Orders tracked on paper or scattered spreadsheets
- No real-time visibility into production status
- Supervisor approvals were manual (chasing people)
- No audit trail for quality or rework
- Hard to know which stages are backlogged

### After the system
- **Every order** tracked through 22 production stages
- **Real-time** status visible to all roles
- **QR code** login for workshop workers (no account needed)
- **Supervisor approvals** happen in-system with push notifications
- **Analytics** — cycle time, bottlenecks, worker productivity, QC pass rates
- **Public order form** — customers can fill specs via a link

### Key numbers
| Metric | Detail |
|--------|--------|
| Stages | 22 (production + approvals + shipping) |
| Role groups | 3 (Operational, Production, Management) |
| Auth methods | Email/password (dashboard) + QR code or PIN (workshop) |
| Realtime | Pusher notifications for approvals |
| Data tables | 15+ (orders, stage_results, transitions, approvals, scan_events, etc.) |

---

## 3. Demo Flow — End-to-End Order Lifecycle

Use this for the **owner** or a **cross-functional** demo.
Walk through one complete order from creation to delivery.

### Step 1 — CS Creates an Order

**System path:** `/dashboard/cs/input-order`  
**Show:**
1. Login page (`/login`) — select "Customer Service"
2. Dashboard overview — stats cards
3. Click "Input Order" — show the order form
4. Fill in: customer name, WA, ring specs (pria + wanita), acara, deadline
5. Submit → order created with `current_stage = penerimaan_order`

**Key talking points:**
- All ring specifications captured in one form
- Customer data saved for future orders
- Order automatically enters the production pipeline

### Step 2 — Operational Supervisor Approves

**System path:** `/dashboard/supervisor/approval`  
**Show:**
1. Logout from CS, login as `operational_supervisor`
2. Approval page shows pending items — 1 order waiting
3. Click to review — see customer data, ring specs, deadline
4. **Approve** → order advances to `racik_bahan`
5. Show the notification that worker would receive

**Key talking points:**
- Supervisor reviews before any material is touched
- Reject returns to CS with notes (rework loop)
- Approval is timestamped and logged for audit

### Step 3 — Production Worker (QR Login)

**System path:** `/workshop/login` → `/workshop/input`  
**Show:**
1. Logout from supervisor
2. Navigate to `/workshop/login`
3. Show both login methods:
   - **QR scan** — scan a workstation QR code → auto-fills role + stage
   - **PIN login** — select name from dropdown, enter 6-digit PIN
4. Dashboard shows assigned orders with deadline timers
5. Click an order — see full ring specifications
6. **Submit** stage `racik_bahan` with measurement data
7. Order advances to `approval_racik_bahan` (waiting for supervisor)

**Key talking points:**
- No email/password needed — simple QR or PIN
- Deadline warnings (green = on track, red = overdue)
- Each submission logged with timestamp + worker identity

### Step 4 — Approval Loop (Racik Bahan → QC 1)

**System path:** `/dashboard/supervisor/approval`  
**Show:**
1. Switch back to supervisor view
2. New pending item for `approval_racik_bahan`
3. Review the submitted data from the worker
4. **Approve** → advances to `lebur_bahan`
5. Show how this repeats for each production → approval cycle

**Key talking points:**
- 5 approval gates in the full flow
- Bottleneck dashboard shows where orders wait longest
- Production supervisor handles `approval_produksi` only

### Step 5 — QC Stage

**System path:** `/workshop/input` (worker view)  
**Show:**
1. Worker logs in, sees order at `qc_1`
2. QC checklist appears — multiple check items with pass/fail
3. Fill in checklist, notes, submit
4. Advances to `approval_qc_1`

**Key talking points:**
- QC pass rate tracked per stage
- Failed items visible in analytics

### Step 6 — Finishing & Final QC

**System path:** `/dashboard/supervisor/approval`  
**Show:**
1. `approval_qc_1` → approved → `laser` → `finishing`
2. `approval_produksi` — **production supervisor** approves final look
3. `qc_2` → `approval_qc_2`

### Step 7 — CS Confirmation, Packing, Shipping

**System path:** `/dashboard/cs/pelanggan`  
**Show:**
1. CS logs in, sees order at `konfirmasi` stage
2. Confirms with customer that ring is ready
3. Worker packs and records delivery details
4. Order reaches `selesai` — status = `completed`

### Step 8 — Monitoring & Analytics

**System path:** `/dashboard/superadmin/oprprd/monitoring`, `/dashboard/superadmin/oprprd/analisis`  
**Show:**
1. Monitoring page — all orders with filters by stage/status
2. Click an order — see full timeline:
   - Stage transitions (who, when, reason)
   - Approvals (who decided, remarks)
   - Worker submissions (data, attempt #)
   - Scan events
3. Analytics page:
   - Overview: completion rate, QC pass %, active staff
   - Cycle Time: avg duration per stage
   - Worker Productivity: per-worker metrics

---

## 4. Stakeholder-Specific Sessions

### 👤 Owner Demo (30 min)
**Focus:** Big picture, ROI, decision-making

| Topic | What to show | Why it matters |
|-------|-------------|----------------|
| Dashboard overview | Monitoring page with all orders | See everything at a glance |
| Bottleneck analysis | Bottleneck page — wait times per stage | Know where production is stuck |
| Analytics | Cycle time, worker productivity | Data-driven decisions |
| QC metrics | QC pass rate visualization | Quality control insights |
| Audit trail | Any order detail — full timeline | Complete accountability |

**Key message:** "You now have real-time visibility into every order, every worker, every delay — no more guesswork."

### 👷 Production Workers Demo (20 min)
**Focus:** How to use the system day-to-day

| Topic | What to show | Why it matters |
|-------|-------------|----------------|
| QR login | Scan QR code at workstation | Fast, no typing |
| PIN login | Name + PIN | Backup if QR is damaged |
| Find my order | Search + filter at `/workshop/input` | Find orders quickly |
| View specs | Click order → see ring details | All info in one place |
| Submit work | Fill data → submit | Simple 2-click process |
| Deadline timer | Green/yellow/red warnings | Know if you're on track |

**Training tip:** Let each worker **try** logging in with their own PIN and navigating the workshop page.

### 👨‍💼 Supervisor Demo (30 min)
**Focus:** Approvals, monitoring, bottleneck management

| Topic | What to show | Why it matters |
|-------|-------------|----------------|
| Approval page | `/dashboard/supervisor/approval` | Review submissions |
| Approve/Reject flow | Click through both paths | Understand rework loop |
| Remarks/notes | Add notes when rejecting | Clear communication |
| Filtering | Tab: Operasional vs Produksi | Separate concerns |
| Monitoring | `/dashboard/supervisor/monitoring` | See all orders live |
| Order detail | Click any order → full timeline | Complete history |
| Bottleneck | `/dashboard/supervisor/bottleneck` | Find delays |
| Worker accounts | `/dashboard/supervisor/accounts` | Create/manage workers |
| QR codes | `/dashboard/supervisor/qr-codes` | Generate workstation QR |

**Training tip:** Walk through all 5 approval stages so they know when to expect submissions.

### 👩‍💼 Customer Service Demo (25 min)
**Focus:** Order creation, customer management, confirmation

| Topic | What to show | Why it matters |
|-------|-------------|----------------|
| Login | `/login` as CS | Simple role-based login |
| Dashboard | Stats overview | Quick status check |
| Input Order | `/dashboard/cs/input-order` | Full order form |
| Ring specs | Pria + Wanita fields | Complete data capture |
| Pelanggan | `/dashboard/cs/pelanggan` | Customer list, order history |
| Konfirmasi stage | When order reaches konfirmasi | Know when to call customer |
| Public order form | `/order-form/[token]` | Customer self-service |

**Training tip:** Practice filling a complete order form — it has many fields.

### 👨‍🔧 Operations Staff Demo (20 min)
**Focus:** Packing, shipping, inventory

| Topic | What to show | Why it matters |
|-------|-------------|----------------|
| Find order at packing | Search → see packing form | Record packaging details |
| Delivery recording | Input courier, tracking, address | Complete shipping info |
| Order completion | Mark as delivered | Close the loop |

---

## 5. System Architecture Overview (For Technical Stakeholders)

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + @supabase/ssr |
| Realtime | Pusher |
| PDF | @react-pdf/renderer |

### Database: Key Tables & Relationships
```
cs_orders (master) ──→ stage_results (worker submissions)
                  ├──→ order_stage_transitions (stage changes)
                  ├──→ approvals (supervisor decisions)
                  ├──→ scan_events (QR audit trail)
                  ├──→ rework_logs (reject history)
                  ├──→ deliveries (shipping)
                  └──→ activity_logs (full audit)
```

### Auth Flow
```
Dashboard users ──→ /login ──→ Email + Password ──→ Supabase Auth
Workshop users  ──→ /workshop/login ──→ QR scan or PIN ──→ User lookup + signInWithPassword
```

### Stage Sequence (22 stages)
```
Operational: penerimaan_order → approval → konfirmasi → packing → pengiriman → selesai
Production:  racik_bahan → lebur_bahan → pembentukan → microset → poles → cek_kadar → qc_1 → laser → finishing → qc_2
Management:  5 approval gates between operational/production stages
```

---

## 6. Q&A Prep — Common Questions

### Q: Can workers see their own performance?
**A:** Yes — the workshop page shows their submission history. The analytics page shows per-worker metrics to supervisors.

### Q: What happens if a QR code is lost?
**A:** Workers can log in with a 6-digit PIN instead of scanning. Supervisors can generate replacement QR codes at any time.

### Q: Can an order skip stages?
**A:** No — the stage sequence is enforced by the system. Every order must pass through all 22 stages in order.

### Q: Who can see all orders?
**A:** Superadmin (full access), supervisors (their scope), CS (their own orders). Workers only see orders assigned to their current stage.

### Q: Is there a mobile version?
**A:** The system is web-based and responsive — works on phone browsers. No app store installation needed.

### Q: What if a supervisor rejects by mistake?
**A:** The order returns to the worker who can resubmit. The rejection is logged with the supervisor's name and timestamp.

### Q: Can we add more stages later?
**A:** Yes — the stage sequence is configurable in `lib/stages.ts`. Adding/removing stages requires code change + DB migration.

### Q: How is data backed up?
**A:** Supabase manages backups automatically. The database is hosted on Supabase cloud infrastructure.

---

## 7. Presentation Tips

### Before the demo
- Seed 2-3 test orders at different stages (e.g., one at `penerimaan_order`, one at `pemolesan`, one at `packing`)
- Have test accounts ready: `cs@test.com`, `supervisor@test.com`, `superadmin@test.com`
- Clear any sensitive real customer data from the demo environment

### During the demo
- **Start with the problem** — show the old process first (paper/spreadsheets)
- **Follow one order** end-to-end — it tells a story
- **Switch browser tabs/windows** to show different role perspectives
- **Make mistakes** — reject an approval to show the rework loop works
- **Show the timeline** — it's the best visual of the complete order history

### After the demo
- Share this document as reference material
- Offer hands-on practice sessions for each role group
- Collect feedback on pain points or missing features
