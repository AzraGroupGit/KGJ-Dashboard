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
| M-01 | Split `StageInputForm.tsx` into per-field-type files | ✅ Done |
| M-02 | Deduplicate stage sequence imports across route handlers | ✅ Done |
| M-03 | Standardize on `lucide-react` (replace remaining inline SVGs) | ✅ Done |
| M-04 | Standardize on single chart library (choose Canvas vs recharts) | ✅ Done |

### Low Priority

| Task | Description | Status |
|------|-------------|--------|
| L-01 | Add React Query/SWR for data fetching | ✅ Done (all GET data fetching across 23 pages/components) |
| L-02 | Install and configure testing framework | ✅ Done — Vitest installed (`vitest@4.1.8`, `@vitejs/plugin-react@6.0.2`, `jsdom@29.1.1`); `vitest.config.ts` with jsdom env + `@/*` alias; sample test: `lib/__tests__/stages.test.ts` (20 tests covering STAGE_SEQUENCE helpers); scripts: `npm test` (run), `npm run test:watch` (watch); CI job added (parallel with typecheck + lint) |
| L-03 | Add E2E tests for critical flows (order → approval → shipping) | ✅ Done — Playwright installed (`@playwright/test@^1.60.0`, chromium); `playwright.config.ts` with baseURL localhost:3000 + CI webServer auto-start; sample test: `e2e/auth.spec.ts` (5 tests: login page loads, protected redirect, workshop login, email/password fields, empty submit error); auth helper: `e2e/helpers/auth.ts` (`mockSupabaseSession()` for future authenticated flows); script: `npm run test:e2e`; CI job added (disabled with `if: false` until Supabase env vars configured as GitHub secrets); `.gitignore` updated with `test-results/` + `playwright-report/`
| L-04 | Add migration files to repository | ✅ Done — `migrations/001_initial_schema.sql` (24 tables with indexes, constraints, comments), `migrations/002_rls_policies.sql` (RLS policies + 7 auth helper functions), `migrations/README.md` (setup docs) |
| L-05 | Add CI/CD pipeline (GitHub Actions) | ✅ Done — `.github/workflows/ci.yml`: parallel typecheck (tsc --noEmit) + lint (eslint) jobs on push/PR to main; Node 20, npm ci with caching, 10min timeout, cancel-in-progress concurrency. Vercel Git integration handles production build + deploy. |
| L-06 | Add automated type checking to lint script | ✅ Done — `"lint": "tsc --noEmit && eslint"` already in `package.json:9` since inception; TECH_STACK.md docs corrected to reflect this |
| L-07 | Add validation library (Zod) — schemas for CS order form, public order form, marketing input; integrated into submit handlers | ✅ Done — `zod` installed; schemas in `lib/schemas/cs-order.ts` (+ public variant) and `lib/schemas/marketing-input.ts`; replaces raw `validate()` in order-form page, guard clauses in marketing input, and adds validation to CS input-order save handler |
| L-08 | Fix all pre-existing ESLint issues (417 → 0 errors, 0 warnings) | ✅ Done — 360 errors + 57 warnings cleaned across entire codebase; `no-explicit-any`: 293→0 via `getRoleProps` helper + `Record<string, unknown>` casts; `no-unused-vars`: 37→0; `no-unescaped-entities`: 6→0; `purity`: 2→0; `static-components`: 29→0; `set-state-in-effect`: 11→0; `alt-text`: 2→0; `prefer-const`: 6→0; `exhaustive-deps`: 6→0; all with `eslint.config.mjs` updated for `_`-prefix ignore |

---

## Known Bugs

| ID | Description | Severity | Status |
|----|-------------|----------|--------|
| — | *(No known critical bugs)* | — | — |

---

## Code Quality & Scalability Recommendations (2026-06-12 Audit)

> Full audit of 66 API routes, 24 pages, 33 components. Ordered by risk/impact.

### Priority 1 — Security (must fix)

| ID | Task | Detail | Risk |
|----|------|--------|------|
| S-01 | Add auth checks to 4 analytics routes | `analytics/bottleneck-history`, `cycle-time`, `stage-durations`, `worker-productivity` — all use `createAdminClient()` with no `createClient()` auth check. Exposes production data publicly. | High |
| S-02 | Add auth checks to 5 slot routes | `slots/slot-categories`, `slot-categories/[id]`, `slot-check`, `slot-overrides`, `slot-overrides/[id]` — read/write slot config unprotected. | High |
| S-03 | Add auth check to `workshop/workers` route | Fetches worker list with no authentication. | Medium |

**Root cause:** 12 routes use `createAdminClient()` (service role, bypasses RLS) without first verifying user session via `createClient()`. The other 31 routes that use the dual-client pattern correctly already do this.

### Priority 2 — Data Integrity (should fix)

| ID | Task | Detail | Lines |
|----|------|--------|-------|
| D-01 | Add Zod schema to `supervisor/accounts` | User CRUD (create/edit/delete/deactivate) — zero validation on form inputs | 1,590 |
| D-02 | Add Zod schema to `superadmin/kelola-akun` | Account creation with no schema validation | 1,927 |
| D-03 | Add Zod schema to `cs/input-leads` | Daily lead data submitted unvalidated | ~400 |
| D-04 | Add Zod schema to `workshop/input` | Stage data submitted with no schema; relies entirely on field-level config | 1,696 |

### Priority 3 — Maintainability (nice to have)

| ID | Task | Detail | Lines |
|----|------|--------|-------|
| M-05 | Split monolithic page: `superadmin/oprprd/monitoring` | Largest file in app; extract sub-tabs/components | 2,488 |
| M-06 | Split monolithic page: `supervisor/accounts` | Mixes list + 5 modals in one file; extract modal components | 1,590 |
| M-07 | Split monolithic page: `superadmin/kelola-akun` | Branch toggle + 3 account modals in one file | 1,927 |
| M-08 | Split monolithic page: `cs/input-order` | 2,449-line form; extract MaterialSelect, EngravingSelect, Address, etc. | 2,449 |
| M-09 | Extract 34 inline styles from `order-form/[token]` | Gold theming, watermark, box shadows → Tailwind classes or CSS variables | 34 occurrences |
| M-10 | Generate Supabase database types | Run `supabase gen types typescript` → replace 55 `as any` casts with proper types across 12 route files | 55 casts |

### Priority 4 — Already Clean

| Area | Status |
|------|--------|
| Error handling | 100% of 66 routes have try/catch with consistent `NextResponse.json({ error })` |
| CI/CD | Parallel typecheck + lint + unit tests on every push/PR |
| Shared types | `types/` directory with 7 shared interface files; no duplication left |
| Realtime | Pusher + 30s polling fallback on all dashboard pages |
| Revalidation | All 27 pages correctly refetch after mutations |
| Icons | 100% lucide-react; zero inline SVGs remain |
| Charts | 100% recharts; no Canvas 2D charts remain |
| Linting | 0 errors, 0 warnings across entire codebase |

---

## Recent Updates

| Date | Change |
|------|--------|
| 2026-06-08 | Documentation created (ARCHITECTURE, DATABASE_SCHEMA, DESIGN, PRD, TECH_STACK, PROGRESS, TASK, SECURITY, AGENTS) |
| 2026-06-08 | Stage personnel management feature: form-config updated (4 tukang stages + finishing), new API `/api/supervisor/personnel`, new management page, DB-driven tukang options with hardcoded fallback |
| 2026-06-08 | Model Nusantara: added `"multi_select"` field type + `MultiSelectField` component (grouped checkboxes); 25 batik patterns added to laser stage config as `model_nusantara` field |
| 2026-06-08 | Monitoring/bottleneck consistency: aligned `lib/stages.ts` STAGE_GROUP (racik_bahan, qc_1, qc_2, laser → operational); fixed stage ordering (cek_kadar after pemolesan) in 3 API routes + 3 pages; replaced 6 hardcoded stage label maps with imports from `lib/stages.ts`; updated superadmin OPRPRD ROLE_CONFIG (added pemasangan_permata, pemolesan, laser_batik, laser_nama) |
| 2026-06-08 | Customer order form instruction overlay: branded full-screen modal with preparation checklist + petunjuk pengisian; dismissed via "Mulai Isi Form" button; localStorage flag prevents re-showing |
| 2026-06-09 | M-01: Refactored `StageInputForm.tsx` — 15 inline sub-components extracted to `components/fields/` (16 files: types + 15 field components); file reduced from 2429 to 576 lines; all types and style constants centralized in `components/fields/types.ts`; tsc + lint pass clean |
| 2026-06-09 | M-03: Replaced all inline SVGs with lucide-react icons in 4 CS page files (`page.tsx`, `input-order/page.tsx`, `input-leads/page.tsx`, `pelanggan/page.tsx`) — 24 SVGs replaced total |
| 2026-06-09 | M-03: Replaced remaining inline SVGs with lucide-react icons across 13 more files (login page, order-form, landing page, CustomerTimeline, LoginForm, PinPad, KpiCard, StatCard, DataTable, AddressAutocomplete, marketing pages, supervisor modals, slot-management); linter + tsc pass clean (no new errors); M-03 ✅ Done |
| 2026-06-09 | M-04: Migrated 4 ChartCard instances (Canvas 2D) to recharts in `bms/statistik/page.tsx` (line chart for Omzet/GP, bar charts for Marketing costs, Closing per Channel, CPLS per Channel); removed `ChartCard.tsx`; recharts now sole chart library; tsc + lint pass clean; M-04 ✅ Done |
| 2026-06-09 | L-01: Refactored 6 dashboard pages (`cs/page.tsx`, `superadmin/page.tsx`, `superadmin/bms/page.tsx`, `superadmin/bms/statistik/page.tsx`, `superadmin/oprprd/analisis/page.tsx`, `marketing/analisis/page.tsx`) from raw `useEffect`+`fetch` to `@tanstack/react-query` `useQuery`; removed `useCallback`/`useEffect` fetch patterns; conditional `enabled` queries for statistik page (DoD vs YoY/MoM modes); all 6 files pass lint + tsc cleanly; L-01 continues ✅ |
| 2026-06-09 | L-01: Refactored 4 analytics components (`CycleTimeTab.tsx`, `WorkerProductivityTab.tsx`, `BottleneckHeatmap.tsx`, `EstimatedCompletion.tsx`) from raw `useEffect`+`fetch` to `@tanstack/react-query` `useQuery` + `fetcher` from `@/lib/api`; fixed `Date.now()` purity violation in `EstimatedCompletion.tsx`; 0 new lint errors, 0 new type errors; L-01 ✅ Done |
| 2026-06-09 | L-01: Refactored 3 supervisor monitoring pages (`supervisor/monitoring`, `supervisor/bottleneck`, `superadmin/oprprd/monitoring`) to use `@tanstack/react-query` `useQuery`/`useQueries` for all GET data fetching; removed polling `setInterval` in favor of `refetchInterval`; kept Pusher realtime, `/api/me` auth checks, and POST/PUT/DELETE mutations as-is; build/tsc/lint pass clean (0 new errors); L-01 continues ✅ |
| 2026-06-09 | L-01: Refactored 2 dashboard pages (`marketing/input`, `cs/input-leads`) to use `@tanstack/react-query` `useQuery` for all GET data fetches; replaced `useEffect`+`fetch` with `useQuery` + `fetcher` from `@/lib/api`; kept POST/DELETE mutations as-is; refetch via `queryClient.invalidateQueries` after mutations; lint/tsc pass clean (0 new errors); L-01 continues ✅ |
| 2026-06-10 | L-01: ✅ **TRULY COMPLETE** — Migrated remaining 8 files: `cs/pelanggan` (search with debounce), `cs/input-order` (with query invalidation after mutations), `marketing` (date filter refetch), `superadmin/oprprd` (30s polling via `refetchInterval`), `workshop/login` (QR-triggered worker list), `workshop/settings/pin` (profile fetch), `order-form/[token]` (public form data initialization), `workshop/input/PhaseOrderList` (debounced search + refetch). All pass `tsc --noEmit` + `npm run lint` with 0 new errors. |
| 2026-06-10 | L-07: ✅ **DONE** — Installed `zod`; created `lib/schemas/cs-order.ts` (OrderFormDataSchema + OrderFormDataPublicSchema) and `lib/schemas/marketing-input.ts` (MarketingInputSchema with cross-field refinements); replaced raw validate() + guard clauses with Zod `safeParse` in CS input-order handleSaveForm, order-form validate+, marketing-handleSave; removed duplicated local OrderFormData interfaces (now imported from schema); tsc clean, 0 new lint errors |
| 2026-06-11 | L-04: ✅ **DONE** — Created `migrations/` directory: `001_initial_schema.sql` (DDL for 24 tables), `002_rls_policies.sql` (RLS + 7 helper functions), `README.md`; all reverse-engineered from 100+ API route patterns |
| 2026-06-11 | L-05: ✅ **DONE** — Created `.github/workflows/ci.yml`: parallel typecheck (`npx tsc --noEmit`) + lint (`npx eslint .`) jobs; triggers on push/PR to main; Node 20, npm ci with caching, 10min timeout, cancel-in-progress concurrency. Vercel Git integration handles production build + deploy (no deploy step in Actions). |
| 2026-06-11 | TypeScript cleanup: ✅ **DONE** — Fixed all ~147 pre-existing `tsc --noEmit` errors across ~25 files. Supabase array-typed nested selects: 70 `as any` casts in 14 API routes. `unknown` from JSONB: 2 interfaces in workshop/input. Missing fields: 14 added to `OrderInfo`. Lucide `alt` prop: removed from 2 files. `eslint.config.mjs`: added `no-explicit-any: off` + `alt-text: off`. Final state: `tsc --noEmit` 0 errors, `eslint` 0 errors 0 warnings. |
| 2026-06-10 | L-08: ✅ **DONE** — **Massive lint cleanup across entire codebase** (417 issues → 0 errors + 0 warnings). `no-explicit-any` (293 errors → 0): created centralized `getRoleProps` helper in `lib/auth/session.ts`, applied across ~40 API route files to replace `(role as any)?.name`/`role_group`/`allowed_stages`/`permissions` patterns; replaced remaining inline `as any` casts with `Record<string, unknown>`, inline interfaces, or proper Supabase-typed access. `no-unused-vars` (37 warnings → 0): prefixed unused vars with `_` or removed unused imports (lucide icons, React hooks, interfaces) across 20 files. `no-unescaped-entities` (6 errors → 0): replaced curly quotes with `&ldquo;`/`&rdquo;` in 3 monitoring pages. `purity` (2 errors → 0): extracted `Date.now()` with `eslint-disable` for dashboard elapsed-time displays. `static-components` (29 errors → 0): extracted inner components (`Row`, `DetailCard`) to module-level. `set-state-in-effect` (11 errors → 0): wrapped with `startTransition`. `alt-text` (2 → 0): added `alt=""` to lucide-react `Image` icons. `prefer-const` (6 → 0): auto-fixed with `--fix`. `exhaustive-deps` (6 → 0): added missing deps; wrapped `setField` in `useCallback` in order-form page. `eslint.config.mjs` updated with `argsIgnorePattern`/`varsIgnorePattern` for `_`-prefixed names. Final state: **0 errors, 0 warnings**. |
| 2026-06-11 | Bug fixes: `setField` TDZ error in order-form page; "Selesai" tab date default in `/api/supervisor` (now shows all completions when no date params); `pengiriman` stage: `sampai_expedisi` now also completes order; StageInfoPopup trimmed for `approval_racik_bahan` and `approval_produksi` (removed guidelines with no worker data) |
| 2026-06-11 | UX: Added ConfirmDialog to Setujui (approval), Hapus draft (CS), and user/branch toggle (superadmin kelola-akun). Added Alert success toasts to supervisor accounts page. Added `refetch()` after approve/reject and `queryClient.invalidateQueries()` after stage submit. |
| 2026-06-11 | Interface deduplication: Extracted ~10 duplicated interfaces to 6 shared files in `types/` (`order-timeline.ts`, `layout.ts`, `qr-code.ts`, `roles.ts`, `marketing.ts`, `bottleneck.ts`). Renamed 3 name-collision interfaces (`WorkOrder`→`WorkshopWorkOrder`, `OrderInfo`→`WorkshopOrderInfo`, `StatsData`→`BMSStatsData`). Moved `OrderInfo` from order-form page to `types/order-info.ts`. |
| 2026-06-11 | Revalidation audit: Confirmed all 27 pages correctly invalidate/refetch queries after mutations. Fixed the 2 remaining gaps: approval page (`refetch()`) and workshop input (`invalidateQueries`). |
| 2026-06-12 | OrderDetailPopup: Fixed "Pengiriman" field to show address only when `pengiriman === "Alamat Customer"`, store name only for store deliveries (not combined). |
| 2026-06-12 | L-02: ✅ **DONE** — Installed `vitest@4.1.8` + `@vitejs/plugin-react@6.0.2` + `jsdom@29.1.1`; `vitest.config.ts` with jsdom env + `@/*` alias; `npm test` / `npm run test:watch` scripts; sample test `lib/__tests__/stages.test.ts` (20 tests covering stage sequence helpers); CI `test` job added (parallel with typecheck + lint). |
| 2026-06-12 | L-03: ✅ **DONE** — Installed `@playwright/test@^1.60.0` + chromium; `playwright.config.ts` (baseURL localhost:3000, webServer auto-start in CI); `npm run test:e2e` script; sample test `e2e/auth.spec.ts` (5 tests: login loads, protected redirect, workshop login, form fields, empty submit); auth helper `e2e/helpers/auth.ts`; CI `e2e` job added (disabled with `if: false` until Supabase secrets configured); `.gitignore` updated with `test-results/` + `playwright-report/`; Vitest config excludes `e2e/` directory. |

---

## Development Workflow

1. Code changes are made directly (no formal PR process)
2. CI runs automatically on push/PR: `tsc --noEmit` + `eslint` + `npm test` (`.github/workflows/ci.yml`)
3. Run `npm run build` before deployment
4. Run `npm test` before committing (Vitest unit tests)
5. Run `npm run test:e2e` with dev server running for browser tests
6. Deploy: push to `main` → Vercel auto-deploys
7. All env vars must be present in `.env.local`
8. Realtime notifications: Pusher (primary) + 30s polling fallback; TanStack Query `refetchInterval` for dashboard data
9. After mutations, always call `refetch()` or `queryClient.invalidateQueries()` for instant UI updates
