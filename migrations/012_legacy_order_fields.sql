-- ============================================================
-- 012_legacy_order_fields.sql
-- Adds Yii2 order detail columns to legacy_orders that were being
-- sent in the webhook/sync payloads but silently discarded.
--
-- The komponen JSONB array contains per-ring specs (size, material,
-- finishing, gemstone, engraving text, etc.) — the key source for
-- populating ring-spec fields that currently show null/—.
-- ============================================================

ALTER TABLE public.legacy_orders
  ADD COLUMN IF NOT EXISTS no_nota VARCHAR(50);

ALTER TABLE public.legacy_orders
  ADD COLUMN IF NOT EXISTS alamat_lengkap TEXT;

ALTER TABLE public.legacy_orders
  ADD COLUMN IF NOT EXISTS tgl_deadline_tukang DATE;

ALTER TABLE public.legacy_orders
  ADD COLUMN IF NOT EXISTS total_harga DECIMAL(15,2);

ALTER TABLE public.legacy_orders
  ADD COLUMN IF NOT EXISTS harga_final DECIMAL(15,2);

ALTER TABLE public.legacy_orders
  ADD COLUMN IF NOT EXISTS order_down_payment DECIMAL(15,2);

ALTER TABLE public.legacy_orders
  ADD COLUMN IF NOT EXISTS berat_cincin_pria DECIMAL(8,3);

ALTER TABLE public.legacy_orders
  ADD COLUMN IF NOT EXISTS berat_cincin_wanita DECIMAL(8,3);

ALTER TABLE public.legacy_orders
  ADD COLUMN IF NOT EXISTS komponen JSONB NOT NULL DEFAULT '[]'::jsonb;
