-- ============================================================================
-- Migration 006: Management Task — deadline, notes, kendala, status
-- Project: BMS-OPR-PRD ERP System
-- Description: Adds task deadline, management notes, kendala, and item status
-- ============================================================================

-- 1. Add deadline to management_tasks
ALTER TABLE management_tasks ADD COLUMN IF NOT EXISTS deadline DATE;

-- 2. Add notes, kendala, and status to management_task_progress
ALTER TABLE management_task_progress ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE management_task_progress ADD COLUMN IF NOT EXISTS kendala TEXT;
ALTER TABLE management_task_progress ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 3. Backfill existing completed items to status 'selesai'
UPDATE management_task_progress SET status = 'selesai' WHERE is_completed = true AND (status IS NULL OR status = 'pending');

COMMENT ON COLUMN management_tasks.deadline IS 'Optional deadline date for the task';
COMMENT ON COLUMN management_task_progress.notes IS 'Management notes on completing this item';
COMMENT ON COLUMN management_task_progress.kendala IS 'Obstacles/problems encountered (if any)';
COMMENT ON COLUMN management_task_progress.status IS 'pending | proses | selesai';
