-- ============================================================================
-- Migration 001: Initial Database Schema
-- Project: BMS-OPR-PRD ERP System
-- Database: Supabase PostgreSQL
-- Description: Complete schema for all 24 production tables
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- EXTENSIONS
-- ════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ════════════════════════════════════════════════════════════════════════════
-- 1. roles — Role definitions for all user types
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE roles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  role_group    TEXT NOT NULL DEFAULT 'production',
  description   TEXT,
  allowed_stages TEXT[],
  permissions   JSONB DEFAULT '{"can_read": true, "can_insert": false, "can_update": false, "can_delete": false}'::jsonb
);

COMMENT ON TABLE roles IS 'Role definitions — login roles (superadmin, customer_service, marketing), supervisor roles (operational_supervisor, production_supervisor), and workshop worker roles';
COMMENT ON COLUMN roles.role_group IS 'management | operational | production | marketing | customer_service';

-- ════════════════════════════════════════════════════════════════════════════
-- 2. branches — Business branches
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE branches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  address     TEXT NOT NULL DEFAULT '',
  phone       TEXT,
  email       TEXT,
  pic         TEXT,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE branches IS 'Business branch locations';

-- ════════════════════════════════════════════════════════════════════════════
-- 3. users — All system users (login, supervisor, workshop workers)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE users (
  id          UUID PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT NOT NULL,
  username    TEXT UNIQUE,
  phone       TEXT,
  pin_hash    TEXT,
  role_id     UUID NOT NULL REFERENCES roles(id),
  branch_id   UUID REFERENCES branches(id),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  last_login  TIMESTAMPTZ,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_branch_id ON users(branch_id);
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;

COMMENT ON TABLE users IS 'All system users. id matches Supabase auth.users.id. PIN is bcrypt-hashed for workshop login via QR/PIN.';
COMMENT ON COLUMN users.email IS 'Real email for dashboard users; dummy @noreply.kodagede.id for workers without email';

-- ════════════════════════════════════════════════════════════════════════════
-- 4. cs_orders — Primary order table (replaces legacy "orders")
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE cs_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number      TEXT NOT NULL UNIQUE,
  form_token        TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  created_by        UUID NOT NULL REFERENCES users(id),
  branch_id         UUID REFERENCES branches(id),

  -- Pipeline status
  form_status       TEXT NOT NULL DEFAULT 'pending' CHECK (form_status IN ('pending', 'submitted', 'reviewed', 'converted')),
  submitted_at      TIMESTAMPTZ,
  reviewed_at       TIMESTAMPTZ,
  reviewed_by       UUID REFERENCES users(id),
  promoted_to_order_id UUID,

  -- Dates
  tgl_chat          DATE NOT NULL,
  tgl_order         DATE NOT NULL,
  tgl_acara         DATE,
  deadline          DATE,
  acara             TEXT,
  kebutuhan_acara   TEXT,

  -- Order classification
  kategori          TEXT,
  order_via         TEXT,
  order_via_channel TEXT CHECK (order_via_channel IN ('online', 'offline')),
  sumber_media      TEXT,
  sumber_detail     TEXT,
  kgj_instagram_account TEXT,
  kgj_instagram_account_custom TEXT,
  dari_artis        BOOLEAN DEFAULT false,
  dari_artis_detail TEXT,

  -- Pricing
  harga             NUMERIC,
  dp_amount         NUMERIC,

  -- Customer
  customer_name         TEXT NOT NULL,
  customer_wa           TEXT,
  customer_email        TEXT,
  customer_instagram    TEXT,

  -- Shipping address
  alamat_pengiriman TEXT,
  kelurahan         TEXT,
  kecamatan         TEXT,
  kabupaten_kota    TEXT,
  provinsi          TEXT,
  kodepos           TEXT,

  -- Ring specs — Pria
  alat_ukur             TEXT,
  gramasi_pria          NUMERIC,
  ukuran_pria           TEXT,
  ukiran_pria           TEXT,
  ukiran_cincin_pria    TEXT,
  jenis_cincin_pria     TEXT,
  model_bentuk_pria     TEXT[],
  microsetting_pria     TEXT[],
  detail_laser_pria     TEXT[],
  detail_finishing_pria TEXT[],

  -- Ring specs — Wanita
  gramasi_wanita          NUMERIC,
  ukuran_wanita           TEXT,
  ukiran_wanita           TEXT,
  ukiran_cincin_wanita    TEXT,
  jenis_cincin_wanita     TEXT,
  jenis_cincin_features   TEXT[],
  model_bentuk_wanita     TEXT[],
  microsetting_wanita     TEXT[],
  detail_laser_wanita     TEXT[],
  detail_finishing_wanita TEXT[],

  -- Shared specs
  font              TEXT,
  laser_position    TEXT CHECK (laser_position IN ('dalam', 'luar', 'dalam_luar')),
  reference_image_pria_url  TEXT,
  reference_image_wanita_url TEXT,

  -- Logistics
  pengiriman        TEXT,
  box               TEXT,
  transfer_ke_bank  TEXT,
  keterangan_tambahan TEXT,

  -- Stage tracking
  current_stage     TEXT,
  status            TEXT CHECK (status IN ('in_progress', 'waiting_approval', 'completed', 'cancelled', 'rework')),
  completed_at      TIMESTAMPTZ,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cs_orders_created_by ON cs_orders(created_by);
CREATE INDEX idx_cs_orders_branch_id ON cs_orders(branch_id);
CREATE INDEX idx_cs_orders_current_stage ON cs_orders(current_stage) WHERE deleted_at IS NULL;
CREATE INDEX idx_cs_orders_status ON cs_orders(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_cs_orders_form_token ON cs_orders(form_token);
CREATE INDEX idx_cs_orders_tgl_order ON cs_orders(tgl_order);
CREATE INDEX idx_cs_orders_deleted ON cs_orders(deleted_at) WHERE deleted_at IS NOT NULL;

COMMENT ON TABLE cs_orders IS 'Primary order tracking table. Replaces legacy "orders" table. Follows 20-stage BMS production sequence.';

-- ════════════════════════════════════════════════════════════════════════════
-- 5. slot_categories — Production slot capacity by order category
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE slot_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key             TEXT NOT NULL UNIQUE,
  max_slots       INTEGER NOT NULL DEFAULT 10,
  lead_time_min   INTEGER,
  lead_time_max   INTEGER,
  is_active       BOOLEAN DEFAULT true,
  sort_order      INTEGER DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE slot_categories IS 'Order category slot configuration. key referenced by cs_orders.kategori.';

-- ════════════════════════════════════════════════════════════════════════════
-- 6. slot_overrides — Per-date slot capacity overrides
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE slot_overrides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     UUID NOT NULL REFERENCES slot_categories(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  added_by        UUID NOT NULL REFERENCES users(id),
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, date)
);

CREATE INDEX idx_slot_overrides_date ON slot_overrides(date);

COMMENT ON TABLE slot_overrides IS 'Per-date overrides for slot category max_slots';

-- ════════════════════════════════════════════════════════════════════════════
-- 7. marketing_channels — Marketing channel definitions
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE marketing_channels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE marketing_channels IS 'Marketing channel list (e.g., Instagram, Google Ads, TikTok)';

-- ════════════════════════════════════════════════════════════════════════════
-- 8. cs_inputs — CS daily lead input per branch
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE cs_inputs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id   UUID NOT NULL REFERENCES branches(id),
  user_id     UUID NOT NULL REFERENCES users(id),
  input_date  DATE NOT NULL,
  lead_masuk  INTEGER NOT NULL DEFAULT 0,
  closing     INTEGER NOT NULL DEFAULT 0,
  omset       INTEGER DEFAULT 0,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(branch_id, input_date)
);

CREATE INDEX idx_cs_inputs_user_id ON cs_inputs(user_id);
CREATE INDEX idx_cs_inputs_input_date ON cs_inputs(input_date);

COMMENT ON TABLE cs_inputs IS 'CS daily lead/closing/omset input per branch per date';

-- ════════════════════════════════════════════════════════════════════════════
-- 9. marketing_inputs — Marketing channel input data
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE marketing_inputs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel         TEXT NOT NULL,
  user_id         UUID NOT NULL REFERENCES users(id),
  input_date      DATE NOT NULL,
  biaya_marketing INTEGER NOT NULL DEFAULT 0,
  lead_serius     INTEGER NOT NULL DEFAULT 0,
  lead_all        INTEGER NOT NULL DEFAULT 0,
  closing         INTEGER NOT NULL DEFAULT 0,
  notes           TEXT,
  cs_input_id     UUID REFERENCES cs_inputs(id),
  cs_user_id      UUID REFERENCES users(id),
  roi             NUMERIC NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketing_inputs_user_id ON marketing_inputs(user_id);
CREATE INDEX idx_marketing_inputs_input_date ON marketing_inputs(input_date);

COMMENT ON TABLE marketing_inputs IS 'Marketing channel performance data per date';
COMMENT ON COLUMN marketing_inputs.roi IS 'Calculated: ((omset - biaya) / biaya) * 100';

-- ════════════════════════════════════════════════════════════════════════════
-- 10. stage_results — Worker stage submissions
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE stage_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES cs_orders(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  stage           TEXT NOT NULL,
  attempt_number  INTEGER NOT NULL DEFAULT 1,
  data            JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes           TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stage_results_order_id ON stage_results(order_id);
CREATE INDEX idx_stage_results_user_id ON stage_results(user_id);
CREATE INDEX idx_stage_results_stage ON stage_results(stage);
CREATE INDEX idx_stage_results_order_stage ON stage_results(order_id, stage);

COMMENT ON TABLE stage_results IS 'Worker stage submissions. data is JSONB — schema varies per stage. attempt_number auto-increments per order+stage.';

-- ════════════════════════════════════════════════════════════════════════════
-- 11. order_stage_transitions — Stage change history
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE order_stage_transitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES cs_orders(id) ON DELETE CASCADE,
  from_stage      TEXT,
  to_stage        TEXT NOT NULL,
  transitioned_by UUID NOT NULL REFERENCES users(id),
  reason          TEXT,
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ost_order_id ON order_stage_transitions(order_id);
CREATE INDEX idx_ost_transitioned_at ON order_stage_transitions(transitioned_at);

COMMENT ON TABLE order_stage_transitions IS 'Every stage change (advance, rework, complete) logged with user, timestamp, reason';
COMMENT ON COLUMN order_stage_transitions.from_stage IS 'NULL for the initial transition into penerimaan_order';

-- ════════════════════════════════════════════════════════════════════════════
-- 12. approvals — Supervisor approve/reject decisions
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE approvals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES cs_orders(id) ON DELETE CASCADE,
  approver_id     UUID NOT NULL REFERENCES users(id),
  stage           TEXT NOT NULL,
  decision        TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  remarks         TEXT,
  stage_result_id UUID REFERENCES stage_results(id),
  decided_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_approvals_order_id ON approvals(order_id);
CREATE INDEX idx_approvals_approver_id ON approvals(approver_id);
CREATE INDEX idx_approvals_stage ON approvals(stage);
CREATE INDEX idx_approvals_decision ON approvals(decision);

COMMENT ON TABLE approvals IS 'Supervisor approval/rejection records. stage=production stage being approved (not the approval_ gate).';

-- ════════════════════════════════════════════════════════════════════════════
-- 13. rework_logs — Rework/rollback history
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE rework_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES cs_orders(id) ON DELETE CASCADE,
  from_stage  TEXT NOT NULL,
  to_stage    TEXT NOT NULL,
  reason      TEXT NOT NULL,
  severity    TEXT NOT NULL DEFAULT 'minor' CHECK (severity IN ('major', 'minor')),
  logged_by   UUID NOT NULL REFERENCES users(id),
  logged_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rework_logs_order_id ON rework_logs(order_id);

COMMENT ON TABLE rework_logs IS 'Tracks all rework events — cek_kadar failures, supervisor rejections, konfirmasi not_approved';

-- ════════════════════════════════════════════════════════════════════════════
-- 14. scan_events — QR scan audit trail
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE scan_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES cs_orders(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  stage_result_id UUID REFERENCES stage_results(id),
  stage           TEXT NOT NULL,
  action          TEXT NOT NULL CHECK (action IN ('open', 'submit', 'edit', 'read', 'delete', 'reject')),
  device_info     TEXT DEFAULT 'Web Dashboard',
  ip_address      TEXT,
  scanned_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scan_events_order_id ON scan_events(order_id);
CREATE INDEX idx_scan_events_user_id ON scan_events(user_id);
CREATE INDEX idx_scan_events_scanned_at ON scan_events(scanned_at);

COMMENT ON TABLE scan_events IS 'Audit log of every QR scan or stage action in the workshop';

-- ════════════════════════════════════════════════════════════════════════════
-- 15. qr_codes — Workstation QR code registry
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE qr_codes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id           UUID NOT NULL REFERENCES roles(id),
  workstation_name  TEXT NOT NULL,
  location          TEXT,
  qr_token          TEXT NOT NULL UNIQUE,
  qr_payload        TEXT NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expired_at        TIMESTAMPTZ
);

CREATE INDEX idx_qr_codes_role_id ON qr_codes(role_id);
CREATE INDEX idx_qr_codes_token ON qr_codes(qr_token);
CREATE INDEX idx_qr_codes_active ON qr_codes(is_active) WHERE is_active = true;

COMMENT ON TABLE qr_codes IS 'Workstation QR codes — token format: QR-{random hex}. One per role/workstation.';

-- ════════════════════════════════════════════════════════════════════════════
-- 16. deliveries — Shipping/delivery tracking
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE deliveries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES cs_orders(id) ON DELETE CASCADE,
  delivery_method   TEXT,
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'dispatched', 'delivered', 'failed')),
  courier_name      TEXT,
  tracking_number   TEXT,
  recipient_name    TEXT,
  recipient_phone   TEXT,
  delivery_address  TEXT,
  confirmed_by      UUID REFERENCES users(id),
  dispatched_at     TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  failed_at         TIMESTAMPTZ,
  failure_reason    TEXT,
  notes             TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deliveries_order_id ON deliveries(order_id);
CREATE INDEX idx_deliveries_status ON deliveries(status);

COMMENT ON TABLE deliveries IS 'Shipping and delivery tracking per order';

-- ════════════════════════════════════════════════════════════════════════════
-- 17. notifications — User notifications (Pusher realtime + DB persistence)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  link        TEXT,
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

COMMENT ON TABLE notifications IS 'User notifications stored in DB and pushed via Pusher private-user-{userId}';

-- ════════════════════════════════════════════════════════════════════════════
-- 18. activity_logs — Full audit trail
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

COMMENT ON TABLE activity_logs IS 'Global audit log — login, CRUD, approvals, scan events';

-- ════════════════════════════════════════════════════════════════════════════
-- 19. reports — Generated report records
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('monthly', 'quarterly', 'yearly')),
  period        TEXT NOT NULL,
  file_url      TEXT,
  file_size     INTEGER,
  status        TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  generated_by  UUID NOT NULL REFERENCES users(id),
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_type_period ON reports(type, period);
CREATE INDEX idx_reports_generated_by ON reports(generated_by);

COMMENT ON TABLE reports IS 'BMS/OPRPRD generated reports stored in Supabase Storage';

-- ════════════════════════════════════════════════════════════════════════════
-- 20. stage_personnel — Worker to stage assignment
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE stage_personnel (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stage       TEXT NOT NULL,
  person_code TEXT NOT NULL,
  sub_type    TEXT,
  sort_order  INTEGER DEFAULT 0,
  UNIQUE(user_id, stage)
);

CREATE INDEX idx_stage_personnel_stage ON stage_personnel(stage);
CREATE INDEX idx_stage_personnel_stage_subtype ON stage_personnel(stage, sub_type);

COMMENT ON TABLE stage_personnel IS 'Maps workers to production stages. sub_type for laser: batik | nama. person_code: short code (e.g., PR, RZ).';

-- ════════════════════════════════════════════════════════════════════════════
-- 21. material_transactions — Material usage per order
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE material_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES cs_orders(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  amount      NUMERIC NOT NULL DEFAULT 0,
  gramasi     NUMERIC,
  created_by  UUID NOT NULL REFERENCES users(id),
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_material_transactions_order_id ON material_transactions(order_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE material_transactions IS 'Material consumption tracking per order (e.g., gold, silver usage)';

-- ════════════════════════════════════════════════════════════════════════════
-- 22. work_instructions — Stage-specific work parameters
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE work_instructions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage       TEXT NOT NULL,
  parameters  JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active   BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_work_instructions_stage ON work_instructions(stage) WHERE is_active = true;

COMMENT ON TABLE work_instructions IS 'Stage-specific work parameters (e.g., shrinkage_buffer_percent, max_shrinkage_percent)';

-- ════════════════════════════════════════════════════════════════════════════
-- 23. quality_checklist_results — QC checklist per stage submission
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE quality_checklist_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES cs_orders(id) ON DELETE CASCADE,
  stage_result_id UUID NOT NULL REFERENCES stage_results(id) ON DELETE CASCADE,
  check_key       TEXT NOT NULL,
  passed          BOOLEAN NOT NULL DEFAULT false,
  recorded_by     UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qcr_stage_result_id ON quality_checklist_results(stage_result_id);
CREATE INDEX idx_qcr_order_id ON quality_checklist_results(order_id);

COMMENT ON TABLE quality_checklist_results IS 'Per-item QC checklist results — one row per check_key per stage submission';

-- ════════════════════════════════════════════════════════════════════════════
-- 24. customer_confirmations — Customer confirmation records
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE customer_confirmations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID NOT NULL REFERENCES cs_orders(id) ON DELETE CASCADE,
  stage_result_id     UUID REFERENCES stage_results(id),
  confirmation_type   TEXT,
  confirmation_method TEXT,
  confirmation_status TEXT,
  rejection_reason    TEXT,
  change_requests     TEXT,
  photos_sent_at      TIMESTAMPTZ,
  confirmed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cc_order_id ON customer_confirmations(order_id);

COMMENT ON TABLE customer_confirmations IS 'Customer confirmation/rejection records for QC and final delivery stages';

-- ============================================================================
-- END OF MIGRATION 001
-- ============================================================================
