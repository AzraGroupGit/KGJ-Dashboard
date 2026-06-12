# Database Migrations

BMS-OPR-PRD ERP System — Supabase PostgreSQL schema migrations.

> **Important:** These migration files were reverse-engineered from the production codebase (API route handlers, TypeScript types, and component patterns). They document the inferred schema — the actual production schema may differ slightly. Verify before applying to production.

---

## Files

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | Complete DDL for all 24 tables with indexes, constraints, comments |
| `002_rls_policies.sql` | Row Level Security policies + 7 helper functions |

---

## Tables (24 total)

| # | Table | Purpose |
|---|-------|---------|
| 1 | `roles` | Role definitions (login roles, supervisors, workshop workers) |
| 2 | `branches` | Business branch locations |
| 3 | `users` | All system users (FK matches Supabase auth.users.id) |
| 4 | `cs_orders` | Primary order tracking (50+ columns, 20-stage workflow) |
| 5 | `slot_categories` | Production slot capacity per order category |
| 6 | `slot_overrides` | Per-date slot capacity overrides |
| 7 | `marketing_channels` | Marketing channel definitions |
| 8 | `cs_inputs` | CS daily lead/closing/omset per branch |
| 9 | `marketing_inputs` | Marketing channel performance data |
| 10 | `stage_results` | Worker stage submissions (jsonb data per stage) |
| 11 | `order_stage_transitions` | Stage change history (advance/rework/complete) |
| 12 | `approvals` | Supervisor approve/reject decisions |
| 13 | `rework_logs` | Rework/rollback event log |
| 14 | `scan_events` | QR scan audit trail |
| 15 | `qr_codes` | Workstation QR code registry |
| 16 | `deliveries` | Shipping/delivery tracking |
| 17 | `notifications` | User notifications (Pusher realtime + DB persistence) |
| 18 | `activity_logs` | Global audit log |
| 19 | `reports` | Generated report records (BMS/OPRPRD) |
| 20 | `stage_personnel` | Worker-to-stage assignment mapping |
| 21 | `material_transactions` | Material usage tracking per order |
| 22 | `work_instructions` | Stage-specific work parameters |
| 23 | `quality_checklist_results` | Per-item QC checklist results |
| 24 | `customer_confirmations` | Customer confirmation/rejection records |

---

## Key Design Decisions

1. **UUIDs as PKs** — all tables use `gen_random_uuid()` defaults
2. **Soft deletes** — `users` and `cs_orders` use `deleted_at` nullable timestamptz
3. **JSONB for flexible data** — `stage_results.data`, `roles.permissions`, `activity_logs.old_data/new_data`
4. **No attachments/payments tables** — attachment URLs stored in `cs_orders`; payments embedded in `cs_orders.harga`/`dp_amount`
5. **Dual FK pattern** — `users.id` matches Supabase `auth.users.id` (not auto-generated)
6. **RLS enabled** — all SELECT operations filtered by role; writes go through admin client (service role key)

---

## How to Apply

### Option A: Supabase SQL Editor
1. Open Supabase Dashboard → SQL Editor
2. Run `001_initial_schema.sql` first
3. Run `002_rls_policies.sql` second
4. Verify all 24 tables exist: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`

### Option B: Supabase CLI
```bash
# Link project (first time)
supabase link --project-ref <project-ref>

# Apply migrations
supabase db push

# Or use migration system
supabase migration new initial_schema
# Copy content of 001_initial_schema.sql into the generated file
supabase migration new rls_policies
# Copy content of 002_rls_policies.sql into the generated file
supabase db push
```

### Option C: psql
```bash
psql "postgresql://postgres:<password>@<host>:5432/postgres" -f migrations/001_initial_schema.sql
psql "postgresql://postgres:<password>@<host>:5432/postgres" -f migrations/002_rls_policies.sql
```

---

## After Applying

1. Verify `stage_personnel` table exists (required for personnel management feature)
2. Verify all 8 env vars are set in `.env.local`
3. Run `npm run build` to verify no breaking changes
4. Insert seed data for roles and slot_categories as needed
5. Create superadmin user via Supabase dashboard or `/api/users` endpoint

---

## Warning

**Do not run these on an existing production database without reviewing.** These files are reverse-engineered and:
- May include columns that don't exist yet or may miss columns
- Use `IF NOT EXISTS`-style safety in many places but not everywhere
- Do not include data migration for the legacy `orders` table

For production use, compare against the actual schema first: run `SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position;` in your Supabase SQL Editor.
