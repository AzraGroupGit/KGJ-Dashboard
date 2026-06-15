# Changelog

Archived completed items from `TASK.md`. See that file for active and pending work.

---

## 2026-06-13

**Page splitting:**
- **M-05** — Split `superadmin/oprprd/monitoring` (2,486→326L, 87% reduction). Extracted to `_components/`: `shared.tsx` (760L, types/constants/formatters/9 UI components), `OverviewTab.tsx` (569L), `ProduksiTab.tsx` (309L), `OperasionalTab.tsx` (581L).
- **M-06** — Split `supervisor/accounts` (1,615→594L, 63% reduction). Extracted 5 modals to `_components/`: `CreateModal.tsx` (208L), `EditModal.tsx` (173L), `PasswordModal.tsx` (130L), `DeactivateModal.tsx` (131L), `DeleteModal.tsx` (116L) + `shared.tsx` (298L).
- **M-07** — Split `superadmin/kelola-akun` (1,968→855L, 57% reduction). Extracted to `_components/`: `shared.tsx` (290L, types/constants/helpers), `UserTypePicker.tsx` (60L), `BmsUserForm.tsx` (129L), `SupervisorUserForm.tsx` (116L), `OprprdUserForm.tsx` (140L), `BranchForm.tsx` (112L).
- **M-08** — Split `cs/input-order` (2,449→587L, 76% reduction). Extracted to `_components/`: `shared.tsx` (245L, draft/helpers/form-mappers), `OrderFormFields.tsx` (1,069L), `RefImageUpload.tsx` (80L), `FormStatusBadge.tsx` (44L), `CopyLinkButton.tsx` (33L).

**`as any` cleanup (M-10):**
- **M-10** — Replaced 13 `as any` casts across 5 files with proper types (`SlotCategory[]`, `SlotOverride[]`, `UnifiedUser[]`, `RoleOPRPRD[]`, `Branch[]`, `Record<string, unknown>[]`, inline shaped types). 53 casts remain — all Supabase nested-relation patterns (`(row as any).orders?.field`) that are inherent SDK type system limitations requiring query-specific intersection types.

**Security (S-01–S-03):**
- **S-01** — Added auth checks (`createClient()` + session) to 4 analytics routes: `bottleneck-history`, `cycle-time`, `stage-durations`, `worker-productivity`.
- **S-02** — Added auth check to `slot-check` route.
- **S-03** — `workshop/workers` skipped: QR token-based auth is valid by design.

**Data integrity (D-01–D-04):**
- **D-01** — Added 3 Zod schemas (`CreateAccountSchema`, `EditAccountSchema`, `ResetPasswordSchema`) to `supervisor/accounts` create/edit/password handlers.
- **D-02** — Added 6 Zod schemas (BMS/OPRPRD/Supervisor × create/edit) to `superadmin/kelola-akun` save handlers.
- **D-03** — Added `LeadInputSchema` with cross-field `closing ≤ lead_masuk` refinement to `cs/input-leads`.
- **D-04** — Skipped for `workshop/input`: StageInputForm already has field-driven `validate()` from server config.

**Maintainability:**
- **M-10** — `types/supabase.ts` created with 24 table Row interfaces + `Database` type. Cast replacement of 55 `as any` patterns is deferred (📋 Backlog).

---

## 2026-06-12

**Testing (L-02–L-03):**
- **L-02** — Vitest installed. `vitest.config.ts` with jsdom env + `@/*` alias. 20 unit tests in `lib/__tests__/stages.test.ts`. Scripts: `npm test`, `npm run test:watch`.
- **L-03** — Playwright installed (chromium). `playwright.config.ts` with localhost:3000 + CI webServer auto-start. 5 E2E tests in `e2e/auth.spec.ts`. CI job disabled (`if: false`) until Supabase env vars configured.

**Maintainability:**
- **M-09** — Extracted 34 inline styles from `order-form/[token]` to Tailwind classes or CSS variables (3 remain: 2 dynamic watermark URLs + 1 conditional submit button).

**Bug fixes:**
- OrderDetailPopup "Pengiriman": Now shows store name for store deliveries, address only when `pengiriman === "Alamat Customer"`.

---

## 2026-06-11

**Migrations & CI/CD (L-04–L-05):**
- **L-04** — Migration files: `migrations/001_initial_schema.sql` (24 tables), `migrations/002_rls_policies.sql` (7 helper functions + policies), `migrations/README.md`.
- **L-05** — `.github/workflows/ci.yml`: parallel typecheck + lint + unit tests on push/PR to main. Vercel Git integration for deploy.

**Code quality (L-06, L-08, TypeScript):**
- **L-06** — Confirmed `"lint": "tsc --noEmit && eslint"` already in `package.json`.
- **L-08** — ESLint: 417 issues → 0 errors, 0 warnings. `getRoleProps` helper replaced ~100+ `(role as any)` patterns. `no-explicit-any` off + `alt-text` off for intentional patterns.
- **TypeScript cleanup** — 147 `tsc --noEmit` errors → 0. Supabase nested selects, JSONB data, missing interface fields all resolved.

**Interface deduplication:**
- ~10 duplicated interfaces extracted to 6 shared files in `types/`: `order-timeline.ts`, `layout.ts`, `qr-code.ts`, `roles.ts`, `marketing.ts`, `bottleneck.ts`.

**Revalidation audit:**
- `refetch()` after approve/reject, `queryClient.invalidateQueries()` after stage submit on all 27 pages.

**Bug fixes:**
- `setField` TDZ error in `order-form/[token]/page.tsx`
- "Selesai" tab on supervisor monitoring: date filter now only applies when params explicitly passed
- `approval_racik_bahan` / `approval_produksi` StageInfoPopup: Trimmed to only show backed-by-data items
- `KEY_LABELS` missing 8 field labels in DataViewer; `_url` fields now shown as clickable links
- `sampai_expedisi` on pengiriman stage now sets `current_stage = "selesai"`

**UX improvements:**
- Confirm dialogs added to: Setujui (approval page), Hapus draft (CS input-order), user/branch status toggle (superadmin kelola-akun)
- Alert toasts added to supervisor accounts page for create/edit/delete/deactivate success feedback
- Realtime revalidation: approval page + workshop input refresh instantly after mutations

---

## 2026-06-10

**Data fetching (L-01):**
- TanStack React Query now used for GET data fetching across 8 final pages: `cs/pelanggan`, `cs/input-order`, `marketing`, `superadmin/oprprd`, `workshop/login`, `workshop/settings/pin`, `order-form/[token]`, `workshop/input/PhaseOrderList`.

**Validation (L-07):**
- Zod installed. Schemas in `lib/schemas/cs-order.ts` (+ public variant) and `lib/schemas/marketing-input.ts`. Replaces raw `validate()` in order-form page, guard clauses in marketing input, and adds validation to CS input-order save handler.

---

## 2026-06-09

**Data fetching (L-01):**
- TanStack React Query refactored into 15 dashboard pages.

**Code quality (M-01, M-03, M-04):**
- **M-01** — Split `StageInputForm.tsx` into per-field-type files (16 files: types + 15 field components in `components/fields/`). Reduced from 2,429 to 576 lines.
- **M-03** — Standardized all icons on `lucide-react`; zero inline SVGs remain.
- **M-04** — Standardized all charts on `recharts`; `ChartCard.tsx` (Canvas 2D) removed.

---

## 2026-06-08

**Sprint priorities completed:**
- P0: Authentication system (form + QR + PIN login)
- P0: Order creation & management (CS)
- P0: 20-stage production workflow
- P0: Supervisor approval system
- P0: Monitoring dashboard
- P1: Public order form (token-based)
- P1: Slot management
- P1: Marketing tools
- P1: Notification system (Pusher realtime)
- P1: Stage personnel management (tukang assignment per stage)
- P2: Analytics (cycle time, productivity, bottleneck)
- P2: Reports (BMS + OPRPRD)
- P2: PDF generation (A5 landscape Form Tukang)
- P2: Model Nusantara batik patterns selection (multi-select grouped checkboxes)

**Feature backlog (M-02):**
- **M-02** — Deduplicated stage sequence imports across route handlers; centralized to `lib/stages.ts`.

**Documentation:**
- Created: ARCHITECTURE, DATABASE_SCHEMA, DESIGN, PRD, TECH_STACK, PROGRESS, TASK, SECURITY, AGENTS.
- Monitoring/bottleneck consistency: Groups aligned (racik_bahan/qc_1/qc_2/laser → operational); stage ordering fixed.
- Customer order form overlay added.
