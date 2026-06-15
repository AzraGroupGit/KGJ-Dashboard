# Task Management

> Active and pending work only. Completed items are archived in `CHANGELOG.md`.

---

## Legend

| Status         | Meaning                  |
| -------------- | ------------------------ |
| 🔄 In Progress | Being actively worked on |
| 📋 Backlog     | Planned but not started  |
| ⏸️ Deferred     | Postponed (low priority) |

---

## Backlog

| ID   | Task                                                  | Detail                                                            | Status  |
| ---- | ----------------------------------------------------- | ----------------------------------------------------------------- | ------- |
| M-10 | Replace `as any` casts with Supabase DB types         | 55 `as any` casts remain; `types/supabase.ts` already generated   | ✅ Partial — 13 page/API-level casts replaced with proper types; 53 remain (Supabase nested-relation SDK type limitations — requires query-specific intersection types) |
| M-07 | Split monolithic page: `superadmin/kelola-akun`       | Branch toggle + 3 account modals in one file (1,927 lines)        | ✅ Done — extracted to `_components/`: `shared.tsx` (290L, types/constants/helpers), `UserTypePicker.tsx` (60L), `BmsUserForm.tsx` (129L), `SupervisorUserForm.tsx` (116L), `OprprdUserForm.tsx` (140L), `BranchForm.tsx` (112L); `page.tsx` reduced 57% (1,968→855L) |
| M-08 | Split monolithic page: `cs/input-order`               | 2,449-line form; extract MaterialSelect, EngravingSelect, etc.    | ✅ Done — extracted to `_components/`: `shared.tsx` (245L, draft/helpers/mappers), `OrderFormFields.tsx` (1,069L), `RefImageUpload.tsx` (80L), `FormStatusBadge.tsx` (44L), `CopyLinkButton.tsx` (33L); `page.tsx` reduced 76% (2,449→587L) |

---

## Known Bugs

| ID  | Description | Severity | Status |
| --- | ----------- | -------- | ------ |
| —   | _(None)_    | —        | —      |

---

## Current State (Reference)

| Area           | Status                                                      |
| -------------- | ----------------------------------------------------------- |
| Error handling | 100% of 66 routes have try/catch                            |
| CI/CD          | Parallel typecheck + lint + unit tests on every push/PR     |
| Shared types   | `types/` directory with 7 shared interface files            |
| Realtime       | Pusher + 30s polling fallback on all dashboard pages        |
| Revalidation   | All 27 pages correctly refetch after mutations              |
| Icons          | 100% lucide-react; zero inline SVGs                         |
| Charts         | 100% recharts; no Canvas 2D charts                          |
| Linting        | 0 errors, 0 warnings across entire codebase                 |
| TypeScript     | 0 `tsc --noEmit` errors                                     |

---

## Recent Activity

| Date       | Key Changes |
| ---------- | ----------- |
| 2026-06-08 | All P0–P2 features completed; documentation created |
| 2026-06-09 | M-01/M-03/M-04 completed; L-01 TanStack Query in 15 pages |
| 2026-06-10 | L-01 complete (8 more pages); L-07 Zod schemas |
| 2026-06-11 | L-04 migrations, L-05 CI/CD, TS/ESLint cleanup (0 errors), bug fixes, UX improvements, interface dedup, revalidation audit |
| 2026-06-12 | L-02 Vitest, L-03 Playwright, M-09 inline styles |
| 2026-06-13 | S-01/S-02 security fixes, D-01/D-02/D-03 Zod schemas, M-05/M-06/M-07/M-08 page splitting, M-10 `as any` cleanup (13 resolved, 53 remain — Supabase SDK limitation) |

---

## Development Workflow

1. CI runs on push/PR: `tsc --noEmit` + `eslint` + `npm test`
2. Run `npm run lint` + `npm test` before committing
3. Run `npm run test:e2e` with dev server running for browser tests
4. Deploy: push to `main` → Vercel auto-deploys
5. Realtime: Pusher (primary) + 30s polling fallback; TanStack Query `refetchInterval`
6. After mutations, call `refetch()` or `queryClient.invalidateQueries()`
