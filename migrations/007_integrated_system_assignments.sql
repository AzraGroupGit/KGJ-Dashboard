-- Migration: Add assigned_to to tracking_stages for worker assignment
-- Date: 2026-07-07

ALTER TABLE integrated_system.tracking_stages
  ADD COLUMN IF NOT EXISTS assigned_to UUID
  REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tracking_stages_assigned_to
  ON integrated_system.tracking_stages(assigned_to);
