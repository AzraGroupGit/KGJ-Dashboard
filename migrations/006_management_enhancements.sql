-- ============================================================================
-- Migration 006: Management Task — deadline, notes, kendala, status
-- Project: BMS-OPR-PRD ERP System
-- Description: Adds task deadline, management notes, kendala, item status,
--              approval workflow, file attachments, overdue tracking
-- ============================================================================
--
-- MUST SET: `task-attachments` Storage di Supabase Dashboard → toggle "public"
--           agar attachment bisa diakses sebagai publicUrl.
--
-- ══════════════════════════════════════════════════════════════════════════════
--
-- 1. management_task_items — overdue tracking
--
ALTER TABLE management_task_items
ADD COLUMN IF NOT EXISTS overdue_notified_at timestamptz;

COMMENT ON COLUMN management_task_items.overdue_notified_at IS 'Set when overdue notification fires; cleared on approve/selesai or deadline extension';
CREATE INDEX IF NOT EXISTS idx_mgmt_items_overdue_notified ON management_task_items(overdue_notified_at) WHERE overdue_notified_at IS NULL;

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

-- 4. Task attachments table for proof-of-work file uploads
CREATE TABLE IF NOT EXISTS management_task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES management_task_items(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_attachments_item_id ON management_task_attachments(item_id);

COMMENT ON COLUMN management_task_attachments.item_id IS 'FK to management_task_items — which subtask this file belongs to';
COMMENT ON COLUMN management_task_attachments.file_name IS 'Original filename from client upload';
COMMENT ON COLUMN management_task_attachments.file_path IS 'Storage path in task-attachments bucket';
COMMENT ON COLUMN management_task_attachments.file_size IS 'File size in bytes';
COMMENT ON COLUMN management_task_attachments.mime_type IS 'MIME type (image/jpeg, application/pdf, etc.)';

-- 5. Approval workflow: review columns on management_task_progress
ALTER TABLE management_task_progress ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);
ALTER TABLE management_task_progress ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE management_task_progress ADD COLUMN IF NOT EXISTS review_notes TEXT;

COMMENT ON COLUMN management_task_progress.reviewed_by IS 'Superadmin who approved/rejected this item';
COMMENT ON COLUMN management_task_progress.reviewed_at IS 'Timestamp of review decision';
COMMENT ON COLUMN management_task_progress.review_notes IS 'Optional notes from reviewer';
