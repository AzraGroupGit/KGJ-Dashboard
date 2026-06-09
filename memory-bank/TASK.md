# Task Management

> This file tracks development tasks, priorities, and ownership for the BMS-OPR-PRD ERP system.

---

## Legend

| Status | Meaning |
|--------|---------|
| ✅ Done | Completed and deployed |
| 🔄 In Progress | Being actively worked on |
| 📋 Backlog | Planned but not started |
| ❌ Cancelled | No longer needed |

---

## Current Sprint Priorities

| Priority | Task | Status |
|----------|------|--------|
| P0 | Authentication system (form + QR + PIN) | ✅ Done |
| P0 | Order creation & management (CS) | ✅ Done |
| P0 | 20-stage production workflow | ✅ Done |
| P0 | Supervisor approval system | ✅ Done |
| P0 | Monitoring dashboard | ✅ Done |
| P1 | Public order form (token-based) | ✅ Done |
| P1 | Slot management | ✅ Done |
| P1 | Marketing tools | ✅ Done |
| P1 | Notification system (Pusher) | ✅ Done |
| P2 | Analytics (cycle time, productivity, bottleneck) | ✅ Done |
| P2 | Reports (BMS + OPRPRD) | ✅ Done |
| P2 | PDF generation | ✅ Done |
| P1 | Stage personnel management (tukang assignment per stage) | ✅ Done |
| P2 | Model Nusantara batik patterns selection (multi-select grouped checkboxes) | ✅ Done |

---

## Feature Backlog

### High Priority

| Task | Description | Status |
|------|-------------|--------|
| — | *(All P0-P1 features implemented)* | ✅ |

### Medium Priority

| Task | Description | Status |
|------|-------------|--------|
| M-01 | Split `StageInputForm.tsx` into per-field-type files | 📋 Backlog |
| M-02 | Deduplicate stage sequence imports across route handlers | 📋 Backlog |
| M-03 | Standardize on `lucide-react` (replace remaining inline SVGs) | 📋 Backlog |
| M-04 | Standardize on single chart library (choose Canvas vs recharts) | 📋 Backlog |

### Low Priority

| Task | Description | Status |
|------|-------------|--------|
| L-01 | Add React Query/SWR for data fetching | 📋 Backlog |
| L-02 | Install and configure testing framework | 📋 Backlog |
| L-03 | Add E2E tests for critical flows (order → approval → shipping) | 📋 Backlog |
| L-04 | Add migration files to repository | 📋 Backlog |
| L-05 | Add CI/CD pipeline (GitHub Actions) | 📋 Backlog |
| L-06 | Add automated type checking to lint script | 📋 Backlog |
| L-07 | Add form library (React Hook Form) | 📋 Backlog |

---

## Known Bugs

| ID | Description | Severity | Status |
|----|-------------|----------|--------|
| — | *(No known critical bugs)* | — | — |

---

## Recent Updates

| Date | Change |
|------|--------|
| 2026-06-08 | Documentation created (ARCHITECTURE, DATABASE_SCHEMA, DESIGN, PRD, TECH_STACK, PROGRESS, TASK, SECURITY, AGENTS) |
| 2026-06-08 | Stage personnel management feature: form-config updated (4 tukang stages + finishing), new API `/api/supervisor/personnel`, new management page, DB-driven tukang options with hardcoded fallback |
| 2026-06-08 | Model Nusantara: added `"multi_select"` field type + `MultiSelectField` component (grouped checkboxes); 25 batik patterns added to laser stage config as `model_nusantara` field |
| 2026-06-08 | Monitoring/bottleneck consistency: aligned `lib/stages.ts` STAGE_GROUP (racik_bahan, qc_1, qc_2, laser → operational); fixed stage ordering (cek_kadar after pemolesan) in 3 API routes + 3 pages; replaced 6 hardcoded stage label maps with imports from `lib/stages.ts`; updated superadmin OPRPRD ROLE_CONFIG (added pemasangan_permata, pemolesan, laser_batik, laser_nama) |
| 2026-06-08 | Customer order form instruction overlay: branded full-screen modal with preparation checklist + petunjuk pengisian; dismissed via "Mulai Isi Form" button; localStorage flag prevents re-showing |

---

## Development Workflow

1. Code changes are made directly (no formal PR process)
2. Run `npm run build` before deployment
3. Run `npx tsc --noEmit` for type checking
4. Run `npm run lint` for linting
5. Test manually before deploying
6. All env vars must be present in `.env.local`
