# BMS-OPR-PRD ERP System

## Next.js 16 — breaking changes from your training data

- `middleware.ts` is renamed to `proxy.ts` — export a named `proxy` function, not `middleware`
- Route handler `params` is a `Promise` — must `await` it before access
- Proxy defaults to **Node.js runtime** (not Edge)
- Read `node_modules/next/dist/docs/` before writing any Next.js code

## Tech stack

- **Framework**: Next.js 16.2.4 (App Router, no `src/` dir)
- **UI**: React 19.2.4, Tailwind CSS v4 (PostCSS), Geist fonts
- **Auth/DB**: Supabase (3 client variants)
- **Build**: TypeScript 5, ESLint 9 (`eslint-config-next`)

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

## Auth & roles

- **Login roles** (form-based): `superadmin`, `customer_service`, `marketing`
- **Workshop roles** (QR-based, DB-driven): any string not in login roles
- **Supervisor roles**: `operational_supervisor`, `production_supervisor`, `supervisor`
- Session stored in **localStorage** (`lib/auth/session.ts`) + Supabase cookies
- `proxy.ts` handles auth checks and role-based redirects

## Paths & routing

- `@/*` alias maps to project root `./`
- `/dashboard/[role]/` — dashboard per role
- `/workshop/` — QR/workshop login & input
- `/api/` — ~26 API endpoint directories
- `/order-form/[token]/` — public order forms

## Key files

| File | Role |
|------|------|
| `proxy.ts` | Auth middleware (was `middleware.ts`) |
| `lib/routes.ts` | Route constants + RBAC helpers |
| `lib/auth/session.ts` | Client-side session (localStorage) |
| `lib/supabase/*.ts` | Database clients |

## Env vars required

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

## FK migration needed (SQL to run in Supabase SQL Editor)

ALTER TABLE stage_results DROP CONSTRAINT stage_results_order_id_fkey,
  ADD CONSTRAINT stage_results_order_id_fkey FOREIGN KEY (order_id) REFERENCES cs_orders(id);
ALTER TABLE order_stage_transitions DROP CONSTRAINT ost_order_id_fkey,
  ADD CONSTRAINT ost_order_id_fkey FOREIGN KEY (order_id) REFERENCES cs_orders(id);
ALTER TABLE approvals DROP CONSTRAINT approvals_order_id_fkey,
  ADD CONSTRAINT approvals_order_id_fkey FOREIGN KEY (order_id) REFERENCES cs_orders(id);
ALTER TABLE deliveries DROP CONSTRAINT deliveries_order_id_fkey,
  ADD CONSTRAINT deliveries_order_id_fkey FOREIGN KEY (order_id) REFERENCES cs_orders(id);
ALTER TABLE quality_checklist_results DROP CONSTRAINT qcr_order_id_fkey,
  ADD CONSTRAINT qcr_order_id_fkey FOREIGN KEY (order_id) REFERENCES cs_orders(id);
ALTER TABLE rework_logs DROP CONSTRAINT rework_logs_order_id_fkey,
  ADD CONSTRAINT rework_logs_order_id_fkey FOREIGN KEY (order_id) REFERENCES cs_orders(id);
ALTER TABLE scan_events DROP CONSTRAINT scan_events_order_id_fkey,
  ADD CONSTRAINT scan_events_order_id_fkey FOREIGN KEY (order_id) REFERENCES cs_orders(id);
ALTER TABLE attachments DROP CONSTRAINT attachments_order_id_fkey,
  ADD CONSTRAINT attachments_order_id_fkey FOREIGN KEY (order_id) REFERENCES cs_orders(id);
ALTER TABLE customer_confirmations DROP CONSTRAINT cc_order_id_fkey,
  ADD CONSTRAINT cc_order_id_fkey FOREIGN KEY (order_id) REFERENCES cs_orders(id);
ALTER TABLE payments DROP CONSTRAINT payments_order_id_fkey,
  ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES cs_orders(id);
ALTER TABLE material_transactions DROP CONSTRAINT mat_tx_order_id_fkey,
  ADD CONSTRAINT mat_tx_order_id_fkey FOREIGN KEY (order_id) REFERENCES cs_orders(id);
ALTER TABLE order_gemstones DROP CONSTRAINT order_gemstones_order_id_fkey,
  ADD CONSTRAINT order_gemstones_order_id_fkey FOREIGN KEY (order_id) REFERENCES cs_orders(id);
ALTER TABLE packaging_logs DROP CONSTRAINT pl_order_id_fkey,
  ADD CONSTRAINT pl_order_id_fkey FOREIGN KEY (order_id) REFERENCES cs_orders(id);
ALTER TABLE completeness_checklist DROP CONSTRAINT ccl_order_id_fkey,
  ADD CONSTRAINT ccl_order_id_fkey FOREIGN KEY (order_id) REFERENCES cs_orders(id);
ALTER TABLE certificate_logs DROP CONSTRAINT cert_order_id_fkey,
  ADD CONSTRAINT cert_order_id_fkey FOREIGN KEY (order_id) REFERENCES cs_orders(id);
ALTER TABLE handover_logs DROP CONSTRAINT hl_order_id_fkey,
  ADD CONSTRAINT hl_order_id_fkey FOREIGN KEY (order_id) REFERENCES cs_orders(id);
ALTER TABLE data_deletion_logs DROP CONSTRAINT data_deletion_logs_order_id_fkey,
  ADD CONSTRAINT data_deletion_logs_order_id_fkey FOREIGN KEY (order_id) REFERENCES cs_orders(id);

NOTIFY pgrst, 'reload schema';

## New column migrations

ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS transfer_ke_bank text;
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS kategori text;
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS jenis_cincin_features text[];
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS dari_artis_detail text;
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS gramasi_pria numeric;
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS gramasi_wanita numeric;
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS ukiran_cincin_pria text;
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS ukiran_cincin_wanita text;
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS model_bentuk_pria jsonb DEFAULT '[]'::jsonb;
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS microsetting_pria jsonb DEFAULT '[]'::jsonb;
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS detail_laser_pria jsonb DEFAULT '[]'::jsonb;
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS detail_finishing_pria jsonb DEFAULT '[]'::jsonb;
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS model_bentuk_wanita jsonb DEFAULT '[]'::jsonb;
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS microsetting_wanita jsonb DEFAULT '[]'::jsonb;
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS detail_laser_wanita jsonb DEFAULT '[]'::jsonb;
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS detail_finishing_wanita jsonb DEFAULT '[]'::jsonb;

## Enum migration (sumber_media expanded — was enum, now text)

ALTER TABLE cs_orders ALTER COLUMN sumber_media DROP DEFAULT;
ALTER TABLE cs_orders ALTER COLUMN sumber_media TYPE text USING sumber_media::text;

## Slot Management migration

CREATE TABLE IF NOT EXISTS slot_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  lead_time_min integer NOT NULL,
  lead_time_max integer,
  max_slots integer NOT NULL DEFAULT 10,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS slot_overrides (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES slot_categories(id),
  date date NOT NULL,
  added_by uuid NOT NULL REFERENCES users(id),
  note text,
  created_at timestamptz DEFAULT now()
);

INSERT INTO slot_categories (key, label, lead_time_min, lead_time_max, max_slots, sort_order) VALUES
  ('reguler', 'Reguler', 25, 30, 10, 1),
  ('cepat', 'Cepat', 14, 14, 4, 2),
  ('kilat', 'Kilat', 7, 7, 2, 3),
  ('kilat_laser_batik', 'Kilat Laser Batik', 10, 10, 2, 4),
  ('vvip', 'VVIP', 3, 3, 1, 5),
  ('revisi', 'Revisi', 14, 14, 2, 6),
  ('marketplace', 'Marketplace', 14, 14, 4, 7)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  lead_time_min = EXCLUDED.lead_time_min,
  lead_time_max = EXCLUDED.lead_time_max,
  max_slots = EXCLUDED.max_slots,
  sort_order = EXCLUDED.sort_order;

NOTIFY pgrst, 'reload schema';

## PIN migration for workshop workers

ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_attempts integer DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_locked_until timestamptz;
<!-- END:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
