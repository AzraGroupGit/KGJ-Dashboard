-- ============================================================
-- 016_fix_stage_personnel_unique.sql
-- Changes UNIQUE(user_id, stage) → UNIQUE(user_id, stage, sub_type)
-- so laser stage can have both batik and nama assignments.
-- ============================================================

ALTER TABLE public.stage_personnel
  DROP CONSTRAINT IF EXISTS stage_personnel_user_id_stage_key;

ALTER TABLE public.stage_personnel
  ADD UNIQUE(user_id, stage, sub_type);
