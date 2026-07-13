-- ============================================================
-- 010_legacy_stage_data.sql
-- Extends the integrated-system (Yii2/legacy) tracking tables so
-- main-erp's workshop stage submissions can persist rich per-stage
-- form data against legacy_orders (replacing stage_results/cs_orders).
--
-- Trimmed vs stage_results: started_at/finished_at intentionally
-- omitted (cycle-time analytics deferred; created_at suffices, and
-- per-stage duration is derivable from consecutive created_at values).
-- Idempotent, additive only. No data loss, no drops.
-- ============================================================

-- Rich per-stage form JSONB (was stage_results.data)
ALTER TABLE public.stage_history
  ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Rework attempt counter per order+stage (was stage_results.attempt_number)
ALTER TABLE public.stage_history
  ADD COLUMN IF NOT EXISTS attempt_number INTEGER NOT NULL DEFAULT 1;

-- Speeds up "latest attempt for this order+stage" lookups
CREATE INDEX IF NOT EXISTS idx_stage_history_order_stage
  ON public.stage_history(order_id, stage);
