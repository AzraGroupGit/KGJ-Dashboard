-- ============================================================
-- 011_legacy_orphan_tables.sql
-- Legacy (Yii2) equivalents of the cs_orders-scoped auxiliary tables
-- that main-erp's workshop write path uses: rework_logs, deliveries,
-- quality_checklist_results. Parallel tables keyed to legacy_orders so
-- nothing from the workshop flow is lost. Additive, idempotent.
--
-- quality_checklist_results referenced stage_results(id); the legacy
-- equivalent references stage_history(id) (the new home for submissions,
-- see 010_legacy_stage_data.sql).
-- ============================================================

-- Rework events (cek_kadar fail, supervisor reject, konfirmasi not_approved)
CREATE TABLE IF NOT EXISTS public.legacy_rework_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES public.legacy_orders(id) ON DELETE CASCADE,
  from_stage  TEXT NOT NULL,
  to_stage    TEXT NOT NULL,
  reason      TEXT NOT NULL,
  severity    TEXT NOT NULL DEFAULT 'minor' CHECK (severity IN ('major', 'minor')),
  logged_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  logged_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_legacy_rework_logs_order_id
  ON public.legacy_rework_logs(order_id);

-- Shipping / delivery tracking
CREATE TABLE IF NOT EXISTS public.legacy_deliveries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES public.legacy_orders(id) ON DELETE CASCADE,
  delivery_method   TEXT,
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'dispatched', 'delivered', 'failed')),
  courier_name      TEXT,
  tracking_number   TEXT,
  recipient_name    TEXT,
  recipient_phone   TEXT,
  delivery_address  TEXT,
  confirmed_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  dispatched_at     TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  failed_at         TIMESTAMPTZ,
  failure_reason    TEXT,
  notes             TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_legacy_deliveries_order_id
  ON public.legacy_deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_legacy_deliveries_status
  ON public.legacy_deliveries(status);

-- Per-item QC checklist results (one row per check_key per submission)
CREATE TABLE IF NOT EXISTS public.legacy_quality_checklist_results (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES public.legacy_orders(id) ON DELETE CASCADE,
  stage_history_id  UUID NOT NULL REFERENCES public.stage_history(id) ON DELETE CASCADE,
  check_key         TEXT NOT NULL,
  passed            BOOLEAN NOT NULL DEFAULT false,
  recorded_by       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_legacy_qcr_stage_history_id
  ON public.legacy_quality_checklist_results(stage_history_id);
CREATE INDEX IF NOT EXISTS idx_legacy_qcr_order_id
  ON public.legacy_quality_checklist_results(order_id);
