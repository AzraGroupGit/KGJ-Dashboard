# BMS-OPR-PRD ERP System

## Next.js 16 — breaking changes from your training data

- `middleware.ts` renamed to `proxy.ts` — export a named `proxy` function, not `middleware`
- Route handler `params` is a `Promise` — must `await` it before access
- Proxy defaults to **Node.js runtime** (not Edge)
- Read `node_modules/next/dist/docs/` before writing any Next.js code

## Tech stack

- **Framework**: Next.js 16.2.4 (App Router, no `src/` dir)
- **UI**: React 19.2.4, Tailwind CSS v4 (PostCSS), Geist fonts
- **Auth/DB**: Supabase (3 client variants, `@supabase/ssr` for cookie-based SSR)
- **Realtime**: Pusher (`pusher-js` client + `pusher` server)
- **Build**: TypeScript 5, ESLint 9 (`eslint-config-next`)
- **PDF**: `@react-pdf/renderer`

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint only |

No typecheck script exists — run `npx tsc --noEmit` manually.

## Supabase clients (3 variants)

| File | When to use | Key |
|------|-------------|-----|
| `lib/supabase/client.ts` | Browser components (`"use client"`) | Anon key |
| `lib/supabase/server.ts` | Server Components / Route Handlers | Cookie-based SSR |
| `lib/supabase/admin.ts` | Server-only admin ops | Service role key |

`lib/supabase/server.ts` uses `@supabase/ssr` and `cookies()` from `next/headers`. `cookies()` is async — must `await`.

## Auth & roles

- **Login roles** (form-based, defined in `lib/auth/session.ts`): `superadmin`, `customer_service`, `marketing`
- **Workshop roles** (QR/PIN-based, DB-driven): any string not in login roles — detected by exclusion (`isWorkshopRole`)
- **Supervisor roles**: `operational_supervisor`, `production_supervisor`, `supervisor`
- Dashboard session stored in **localStorage** (`lib/auth/session.ts`: `getClientUser`/`setClientUser`/`clearClientUser`)
- Supabase manages its own session via cookies
- `proxy.ts` handles auth checks and role-based redirects; **excludes `/api/*`** from matcher

## Routing

- `@/*` alias maps to project root `./`
- `/dashboard/[role]/` — per-role dashboards (cs, marketing, superadmin, supervisor)
- `/workshop/` — QR/PIN login, input, PIN settings
- `/api/` — 31 API endpoint directories (auth, cs, marketing, production, slots, pusher, etc.)
- `/order-form/[token]/` — public order forms (token-based, no auth)
- `lib/routes.ts` is the centralized route constant source — never hardcode paths

## Key files

| File | Role |
|------|------|
| `proxy.ts` | Auth middleware (was `middleware.ts`) |
| `lib/routes.ts` | Route constants + RBAC helpers |
| `lib/auth/session.ts` | Client-side session (localStorage) + role definitions |
| `lib/supabase/*.ts` | Database clients |
| `lib/pusher/client.ts` | Pusher realtime client |
| `lib/pusher/server.ts` | Pusher server trigger |
| `lib/notifications.ts` | Notification helpers (DB + Pusher) |
| `lib/stages.ts` | Stage sequence (production flow) |
| `types/cs-orders.ts` | Shared CsOrder type |

## Env vars required

| Variable | Used in |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase clients |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | All Supabase clients |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client |
| `NEXT_PUBLIC_APP_URL` | Redirects / links |
| `NEXT_PUBLIC_PUSHER_KEY` | Pusher client + server |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Pusher client + server |
| `PUSHER_APP_ID` | Pusher server |
| `PUSHER_SECRET` | Pusher server |

## Database migrations

Schema migrations are tracked in `AGENTS.md` as raw SQL. Key migrations applied to Supabase:
- FK constraints across 17 child tables were re-pointed from `orders(id)` → `cs_orders(id)` (run FK migration SQL in Supabase SQL Editor)
- 15 new columns on `cs_orders` (ring-specific fields, JSONB arrays)
- `sumber_media` column changed from enum → text
- Slot management tables: `slot_categories` + `slot_overrides`
- PIN columns on `users`: `pin_hash`, `pin_attempts`, `pin_locked_until`
