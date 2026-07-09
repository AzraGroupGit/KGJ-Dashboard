-- ============================================================
-- 009_integrated_system_public.sql
-- Creates integrated-system tables in the public schema
-- (code references tables without schema prefix = public)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.legacy_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id INTEGER NOT NULL,
  kode_order VARCHAR(50) NOT NULL UNIQUE,
  nama VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  no_hp VARCHAR(30),
  alamat TEXT,
  tgl_order DATE,
  tgl_selesai DATE,
  id_status INTEGER,
  catatan TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legacy_orders_legacy_id
  ON public.legacy_orders(legacy_id);

CREATE INDEX IF NOT EXISTS idx_legacy_orders_kode_order
  ON public.legacy_orders(kode_order);

CREATE TABLE IF NOT EXISTS public.tracking_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.legacy_orders(id) ON DELETE CASCADE,
  current_stage VARCHAR(50) NOT NULL DEFAULT 'penerimaan_order',
  stage_status VARCHAR(30) NOT NULL DEFAULT 'in_progress',
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tracking_stages_order_id
  ON public.tracking_stages(order_id);

CREATE INDEX IF NOT EXISTS idx_tracking_stages_current_stage
  ON public.tracking_stages(current_stage);

CREATE INDEX IF NOT EXISTS idx_tracking_stages_assigned_to
  ON public.tracking_stages(assigned_to);

CREATE TABLE IF NOT EXISTS public.stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.legacy_orders(id) ON DELETE CASCADE,
  stage VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'completed',
  note TEXT,
  changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stage_history_order_id
  ON public.stage_history(order_id);

CREATE INDEX IF NOT EXISTS idx_stage_history_created_at
  ON public.stage_history(created_at);

CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type VARCHAR(20) NOT NULL CHECK (sync_type IN ('webhook', 'manual', 'cron')),
  orders_synced INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at
  ON public.sync_logs(created_at);
