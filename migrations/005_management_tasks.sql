-- ============================================================================
-- Migration 005: Management Task Monitoring
-- Project: BMS-OPR-PRD ERP System
-- Database: Supabase PostgreSQL
-- Description: Private task checklists for managers, with SuperAdmin notes.
-- Each manager owns their own tasks and items — not shared across roles.
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- 1. management_tasks — Task categories owned by a manager
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE management_tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mt_user_id ON management_tasks(user_id);

COMMENT ON TABLE management_tasks IS 'Task categories owned by individual managers';
COMMENT ON COLUMN management_tasks.user_id IS 'Manager who owns this task category';

-- ════════════════════════════════════════════════════════════════════════════
-- 2. management_task_items — Checklist items under a task
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE management_task_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES management_tasks(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_mti_task_id ON management_task_items(task_id);

COMMENT ON TABLE management_task_items IS 'Checklist items belonging to a management task';

-- ════════════════════════════════════════════════════════════════════════════
-- 3. management_task_progress — Per-item completion + SuperAdmin notes
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE management_task_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id      UUID NOT NULL REFERENCES management_task_items(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  admin_notes  TEXT,

  UNIQUE(item_id, user_id)
);

CREATE INDEX idx_mtp_item_user ON management_task_progress(item_id, user_id);

COMMENT ON TABLE management_task_progress IS 'Per-item completion state + SuperAdmin notes';
COMMENT ON COLUMN management_task_progress.user_id IS 'Manager who owns this progress record (matches task owner)';

-- ════════════════════════════════════════════════════════════════════════════
-- 4. Helper Functions (replicated from 002 for self-contained execution)
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_user_role_group()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT r.role_group
  FROM public.users u
  JOIN public.roles r ON r.id = u.role_id
  WHERE u.id = auth.uid()
    AND u.deleted_at IS NULL
    AND u.status = 'active'
  LIMIT 1;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. RLS Policies
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE management_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE management_task_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE management_task_progress ENABLE ROW LEVEL SECURITY;

-- Manager: SELECT/INSERT/UPDATE/DELETE own tasks only
CREATE POLICY "Managers manage own tasks"
  ON management_tasks FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Manager: items under own tasks
CREATE POLICY "Managers manage own task items"
  ON management_task_items FOR ALL
  USING (
    task_id IN (SELECT id FROM management_tasks WHERE user_id = auth.uid())
  );

-- Manager: progress on own items
CREATE POLICY "Managers manage own progress"
  ON management_task_progress FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Management: SELECT all for monitoring
CREATE POLICY "Management can view all tasks"
  ON management_tasks FOR SELECT
  USING (public.get_user_role_group() = 'management');

CREATE POLICY "Management can view all items"
  ON management_task_items FOR SELECT
  USING (public.get_user_role_group() = 'management');

CREATE POLICY "Management can view all progress"
  ON management_task_progress FOR SELECT
  USING (public.get_user_role_group() = 'management');

-- Management: UPDATE admin_notes only (SuperAdmin notes)
CREATE POLICY "Management can update admin notes"
  ON management_task_progress FOR UPDATE
  USING (public.get_user_role_group() = 'management');
