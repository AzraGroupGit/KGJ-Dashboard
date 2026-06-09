# Database Schema

**Platform:** Supabase (PostgreSQL)
**Note:** This document is inferred from API route handlers and type definitions, as no migration files or schema definitions are checked into the repository. Actual schema may vary slightly from what is documented here.

---

## Core Tables

### `cs_orders` — Primary order table

The main order tracking table. Uses the 20-stage BMS production sequence.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `order_number` | `text` | Format: `CS-YYYYMMDD-NNN` (auto-generated) |
| `form_token` | `text` | Unique token for public order form access |
| `created_by` | `uuid` | FK → `users.id` |
| `branch_id` | `uuid?` | FK → `branches.id` |
| `form_status` | `text` | `pending` \| `submitted` \| `reviewed` \| `converted` |
| `submitted_at` | `timestamptz?` | |
| `reviewed_at` | `timestamptz?` | |
| `reviewed_by` | `uuid?` | FK → `users.id` |
| `promoted_to_order_id` | `uuid?` | FK → legacy `orders.id` |
| `current_stage` | `text` | Current stage key from 20-stage sequence |
| `status` | `text` | `in_progress` \| `waiting_approval` \| `completed` \| `cancelled` |
| `completed_at` | `timestamptz?` | |
| `deleted_at` | `timestamptz?` | Soft delete |
| `tgl_chat` | `date` | |
| `tgl_order` | `date` | Order date |
| `tgl_acara` | `date?` | Event date |
| `deadline` | `date?` | Deadline |
| `acara` | `text?` | Event name |
| `kebutuhan_acara` | `text?` | Event requirements |
| `kategori` | `text?` | `reguler` \| `cepat` \| `kilat` \| `kilat_laser_batik` \| `vvip` \| `revisi` \| `marketplace` |
| `order_via` | `text?` | Order source |
| `order_via_channel` | `text?` | `online` \| `offline` |
| `sumber_media` | `text?` | Media source |
| `sumber_detail` | `text?` | Source detail |
| `kgj_instagram_account` | `text?` | |
| `kgj_instagram_account_custom` | `text?` | |
| `dari_artis` | `boolean?` | From artist |
| `dari_artis_detail` | `text?` | |
| `harga` | `numeric?` | |
| `dp_amount` | `numeric?` | Down payment |
| `customer_name` | `text` | |
| `customer_wa` | `text?` | WhatsApp number |
| `customer_email` | `text?` | |
| `customer_instagram` | `text?` | |
| `alamat_pengiriman` | `text?` | |
| `kelurahan` | `text?` | |
| `kecamatan` | `text?` | |
| `kabupaten_kota` | `text?` | |
| `provinsi` | `text?` | |
| `kodepos` | `text?` | |
| `alat_ukur` | `text?` | Measuring tool |
| `gramasi_pria` | `numeric?` | Male ring weight |
| `ukuran_pria` | `text?` | |
| `ukiran_pria` | `text?` | |
| `ukiran_cincin_pria` | `text?` | |
| `jenis_cincin_pria` | `text?` | |
| `model_bentuk_pria` | `text[]` | |
| `microsetting_pria` | `text[]` | |
| `detail_laser_pria` | `text[]` | |
| `detail_finishing_pria` | `text[]` | |
| `gramasi_wanita` | `numeric?` | Female ring weight |
| `ukuran_wanita` | `text?` | |
| `ukiran_wanita` | `text?` | |
| `ukiran_cincin_wanita` | `text?` | |
| `jenis_cincin_wanita` | `text?` | |
| `jenis_cincin_features` | `text[]` | |
| `model_bentuk_wanita` | `text[]` | |
| `microsetting_wanita` | `text[]` | |
| `detail_laser_wanita` | `text[]` | |
| `detail_finishing_wanita` | `text[]` | |
| `font` | `text?` | Engraving font |
| `laser_position` | `text?` | `dalam` \| `luar` \| `dalam_luar` |
| `pengiriman` | `text?` | Delivery method |
| `box` | `text?` | Box type |
| `transfer_ke_bank` | `text?` | Bank transfer info |
| `keterangan_tambahan` | `text?` | Additional notes |
| `reference_image_pria_url` | `text?` | Supabase Storage URL |
| `reference_image_wanita_url` | `text?` | Supabase Storage URL |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

### `orders` — Legacy order table

Older order table with a different stage sequence that includes extra stages (`kelengkapan`, `qc_3`, `pelunasan`). Still referenced for backward compatibility. `cs_orders` is the primary table.

---

## Child Tables (FK to `cs_orders.id`)

### `stage_results` — Worker stage submissions

Records each submission by a worker for a production stage.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `order_id` | `uuid` | FK → `cs_orders.id` |
| `stage` | `text` | Stage key |
| `submitted_by` | `uuid` | FK → `users.id` |
| `attempt_number` | `integer` | Auto-increment per stage per order |
| `data` | `jsonb` | Stage-specific form data (varies by stage) |
| `submitted_at` | `timestamptz` | |
| `notes` | `text?` | Worker notes |

### `order_stage_transitions` — Stage change history

Every time an order moves from one stage to another.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `order_id` | `uuid` | FK → `cs_orders.id` |
| `from_stage` | `text` | |
| `to_stage` | `text` | |
| `transitioned_by` | `uuid` | FK → `users.id` |
| `reason` | `text?` | |
| `transitioned_at` | `timestamptz` | |

### `approvals` — Supervisor decisions

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `order_id` | `uuid` | FK → `cs_orders.id` |
| `approver_id` | `uuid` | FK → `users.id` |
| `stage` | `text` | The production stage that was approved/rejected |
| `decision` | `text` | `approved` \| `rejected` |
| `remarks` | `text?` | |
| `stage_result_id` | `uuid?` | FK → `stage_results.id` |
| `decided_at` | `timestamptz` | |

### `scan_events` — QR scan audit trail

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `order_id` | `uuid` | FK → `cs_orders.id` |
| `user_id` | `uuid` | FK → `users.id` |
| `stage` | `text` | |
| `action` | `text` | `start` \| `complete` |
| `qr_code_id` | `uuid?` | FK → `qr_codes.id` |
| `created_at` | `timestamptz` | |

### `notifications` — User notifications

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `users.id` |
| `title` | `text` | |
| `message` | `text` | |
| `type` | `text` | `info` \| `success` \| `warning` \| `error` |
| `link` | `text?` | Deep link URL |
| `is_read` | `boolean?` | Default `false` |
| `created_at` | `timestamptz` | |

### `deliveries` — Shipping information

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `order_id` | `uuid` | FK → `cs_orders.id` |
| `courier` | `text?` | |
| `tracking_number` | `text?` | |
| `address` | `text?` | |
| `shipped_at` | `timestamptz?` | |
| `delivered_at` | `timestamptz?` | |

### `attachments` — File attachments

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `order_id` | `uuid` | FK → `cs_orders.id` |
| `file_url` | `text` | Supabase Storage URL |
| `file_type` | `text?` | |
| `uploaded_by` | `uuid` | FK → `users.id` |
| `created_at` | `timestamptz` | |

### `payments` — Payment records

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `order_id` | `uuid` | FK → `cs_orders.id` |
| `amount` | `numeric` | |
| `payment_method` | `text?` | |
| `paid_at` | `timestamptz?` | |

### `rework_logs` — Rework/rejection history

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `order_id` | `uuid` | FK → `cs_orders.id` |
| `stage` | `text` | |
| `reason` | `text` | |
| `requested_by` | `uuid` | FK → `users.id` |
| `created_at` | `timestamptz` | |

### `activity_logs` — Full audit trail

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `order_id` | `uuid` | FK → `cs_orders.id` |
| `user_id` | `uuid` | FK → `users.id` |
| `action` | `text` | |
| `details` | `jsonb?` | |
| `created_at` | `timestamptz` | |

---

## Auth & User Tables

### `users` — All system users

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK (matches Supabase Auth.users.id) |
| `email` | `text` | |
| `full_name` | `text` | |
| `username` | `text?` | For workshop PIN login |
| `pin` | `text` | bcrypt-hashed PIN for workshop login |
| `role_id` | `uuid` | FK → `roles.id` |
| `branch_id` | `uuid?` | FK → `branches.id` |
| `status` | `text` | `active` \| `inactive` |
| `last_login` | `timestamptz?` | |
| `deleted_at` | `timestamptz?` | Soft delete |
| `created_at` | `timestamptz` | |

### `roles` — Role definitions

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `name` | `text` | Role key (e.g., `customer_service`, `racik_bahan`) |
| `role_group` | `text` | `management` \| `operational` \| `production` \| `marketing` \| `customer_service` |
| `description` | `text?` | |
| `allowed_stages` | `text[]` | Stages this role can work on |
| `permissions` | `jsonb` | `{ can_read, can_insert, can_update, can_delete }` |

### `branches` — Business branches

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `name` | `text` | |
| `code` | `text` | Unique branch code |

---

## Slot Management Tables

### `slot_categories` — Order category slot configuration

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `kategori` | `text` | Category key |
| `label` | `text` | Display name |
| `lead_time_days` | `integer` | |
| `max_slots` | `integer` | Default max orders per day |

### `slot_overrides` — Per-date slot overrides

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `slot_category_id` | `uuid` | FK → `slot_categories.id` |
| `date` | `date` | |
| `override_max_slots` | `integer` | Override value |
| `created_at` | `timestamptz` | |

---

## QR & Workshop Tables

### `qr_codes` — Workstation QR codes

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `name` | `text` | Workstation name |
| `role_id` | `uuid` | FK → `roles.id` (links to role/stage) |
| `token` | `text` | QR token value |
| `created_by` | `uuid` | FK → `users.id` |
| `created_at` | `timestamptz` | |

---

## Marketing Tables

### `marketing_inputs` — Marketing channel input data

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `channel_id` | `uuid` | FK → `marketing_channels.id` |
| `cs_user_id` | `uuid?` | FK → `users.id` |
| `inputs` | `jsonb` | Input data |
| `created_by` | `uuid` | FK → `users.id` |
| `created_at` | `timestamptz` | |

### `marketing_channels` — Marketing channels

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `name` | `text` | |
| `created_at` | `timestamptz` | |

### `cs_inputs` — CS daily lead input data

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `branch_id` | `uuid?` | FK → `branches.id` |
| `user_id` | `uuid` | FK → `users.id` |
| `lead_masuk` | `integer` | |
| `closing` | `integer` | |
| `omset` | `numeric` | |

---

## Reports Tables

### `reports` — Generated reports

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `type` | `text` | |
| `period` | `text` | Monthly/quarterly/yearly |
| `data` | `jsonb` | Report data |
| `created_by` | `uuid` | FK → `users.id` |
| `created_at` | `timestamptz` | |

---

## Relationships Diagram

```
cs_orders ──── order_stage_transitions
    │              (stage change history)
    ├──── stage_results
    │      (worker submissions per stage)
    ├──── approvals
    │      (supervisor approve/reject)
    ├──── scan_events
    │      (QR scan audit trail)
    ├──── rework_logs
    │      (rejection history)
    ├──── deliveries
    │      (shipping info)
    ├──── attachments
    │      (file uploads → Supabase Storage)
    ├──── payments
    ├──── activity_logs
    └──── notifications
             (via user_id)
```

---

## Known Schema Notes

- `cs_orders.id` is the primary FK target for most child tables — NOT `orders.id`
- The `orders` table is a legacy table with different stage sequence
- All timestamp columns use `timestamptz` (with timezone)
- Soft deletes use `deleted_at` nullable timestamptz column pattern
- User status uses `status` text column with values `active`/`inactive`
- `stage_results.data` is `jsonb` — schema varies per stage
- `permissions` in `roles` table is `jsonb` — structure `{ can_read, can_insert, can_update, can_delete }`
- No explicit migration files exist in the repository; schema is managed via Supabase dashboard or external tooling
