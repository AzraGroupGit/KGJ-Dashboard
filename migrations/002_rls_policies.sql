-- ============================================================================
-- Migration 002: Row Level Security Policies
-- Project: BMS-OPR-PRD ERP System
-- Database: Supabase PostgreSQL
-- Description: RLS policies for all tables + helper functions
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ════════════════════════════════════════════════════════════════════════════

-- Get the role_group of the currently authenticated user
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

-- Get the role name of the currently authenticated user
CREATE OR REPLACE FUNCTION public.get_user_role_name()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT r.name
  FROM public.users u
  JOIN public.roles r ON r.id = u.role_id
  WHERE u.id = auth.uid()
    AND u.deleted_at IS NULL
    AND u.status = 'active'
  LIMIT 1;
$$;

-- Get the branch_id of the currently authenticated user
CREATE OR REPLACE FUNCTION public.get_user_branch_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT u.branch_id
  FROM public.users u
  WHERE u.id = auth.uid()
    AND u.deleted_at IS NULL
    AND u.status = 'active'
  LIMIT 1;
$$;

-- Check if current user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid()
      AND r.name = 'superadmin'
      AND u.deleted_at IS NULL
      AND u.status = 'active'
  );
$$;

-- Check if current user has a management role
CREATE OR REPLACE FUNCTION public.is_management()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.get_user_role_group() IN ('management', 'operational', 'production');
$$;

-- Check if current user is a supervisor (operational or production)
CREATE OR REPLACE FUNCTION public.is_supervisor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.get_user_role_name() IN ('operational_supervisor', 'production_supervisor');
$$;

-- Check if current user is customer_service
CREATE OR REPLACE FUNCTION public.is_customer_service()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.get_user_role_name() = 'customer_service';
$$;

-- Check if current user is marketing
CREATE OR REPLACE FUNCTION public.is_marketing()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.get_user_role_name() = 'marketing';
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ════════════════════════════════════════════════════════════════════════════

-- ── roles: Readable by all authenticated users ──────────────────────────────
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roles are viewable by all authenticated users"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

-- ── branches: Readable by all authenticated users ───────────────────────────
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Branches are viewable by all authenticated users"
  ON branches FOR SELECT
  TO authenticated
  USING (true);

-- ── users: Self-read + superadmin/management can read all ───────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Superadmin and management can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (public.is_superadmin() OR public.is_management());

-- ── cs_orders: Scope-based read ─────────────────────────────────────────────
ALTER TABLE cs_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin can read all orders"
  ON cs_orders FOR SELECT
  TO authenticated
  USING (public.is_superadmin());

CREATE POLICY "Supervisors can read all orders"
  ON cs_orders FOR SELECT
  TO authenticated
  USING (public.is_supervisor());

CREATE POLICY "CS users read their own orders"
  ON cs_orders FOR SELECT
  TO authenticated
  USING (
    public.is_customer_service()
    AND created_by = auth.uid()
    AND deleted_at IS NULL
  );

CREATE POLICY "Marketing users can read orders for analytics"
  ON cs_orders FOR SELECT
  TO authenticated
  USING (public.is_marketing() AND deleted_at IS NULL);

CREATE POLICY "Workshop workers can read orders at their stages"
  ON cs_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.status = 'active'
        AND cs_orders.current_stage = ANY(r.allowed_stages)
    )
    AND deleted_at IS NULL
  );

-- ── slot_categories: Readable by all authenticated ──────────────────────────
ALTER TABLE slot_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Slot categories are viewable by all authenticated users"
  ON slot_categories FOR SELECT
  TO authenticated
  USING (true);

-- ── slot_overrides: Readable by all authenticated ───────────────────────────
ALTER TABLE slot_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Slot overrides are viewable by all authenticated users"
  ON slot_overrides FOR SELECT
  TO authenticated
  USING (true);

-- ── marketing_channels: Readable by all authenticated ───────────────────────
ALTER TABLE marketing_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Marketing channels are viewable by all authenticated users"
  ON marketing_channels FOR SELECT
  TO authenticated
  USING (true);

-- ── cs_inputs: CS sees own branch, management sees all ──────────────────────
ALTER TABLE cs_inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CS users read their branch inputs"
  ON cs_inputs FOR SELECT
  TO authenticated
  USING (
    public.is_customer_service()
    AND branch_id = public.get_user_branch_id()
  );

CREATE POLICY "Management and supervisors can read all CS inputs"
  ON cs_inputs FOR SELECT
  TO authenticated
  USING (public.is_superadmin() OR public.is_management());

-- ── marketing_inputs: Marketing sees own, management sees all ───────────────
ALTER TABLE marketing_inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Marketing users read their own inputs"
  ON marketing_inputs FOR SELECT
  TO authenticated
  USING (public.is_marketing() AND user_id = auth.uid());

CREATE POLICY "Management can read all marketing inputs"
  ON marketing_inputs FOR SELECT
  TO authenticated
  USING (public.is_superadmin() OR public.is_management());

-- ── stage_results: Workers see own, supervisors see all ─────────────────────
ALTER TABLE stage_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can read their own submissions"
  ON stage_results FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Supervisors and management can read all stage results"
  ON stage_results FOR SELECT
  TO authenticated
  USING (public.is_superadmin() OR public.is_supervisor());

-- ── order_stage_transitions: Readable by authenticated ──────────────────────
ALTER TABLE order_stage_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read stage transitions"
  ON order_stage_transitions FOR SELECT
  TO authenticated
  USING (true);

-- ── approvals: Readable by supervisors and management ───────────────────────
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors and management can read approvals"
  ON approvals FOR SELECT
  TO authenticated
  USING (public.is_superadmin() OR public.is_supervisor());

-- ── rework_logs: Readable by supervisors and management ─────────────────────
ALTER TABLE rework_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors and management can read rework logs"
  ON rework_logs FOR SELECT
  TO authenticated
  USING (public.is_superadmin() OR public.is_supervisor());

-- ── scan_events: Readable by supervisors and management ────────────────────
ALTER TABLE scan_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read scan events"
  ON scan_events FOR SELECT
  TO authenticated
  USING (true);

-- ── qr_codes: Readable by all authenticated ─────────────────────────────────
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "QR codes are viewable by all authenticated users"
  ON qr_codes FOR SELECT
  TO authenticated
  USING (true);

-- ── deliveries: Readable by CS and supervisors ──────────────────────────────
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read deliveries"
  ON deliveries FOR SELECT
  TO authenticated
  USING (true);

-- ── notifications: Users see their own only ─────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── activity_logs: Readable by superadmin only ──────────────────────────────
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin can read all activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (public.is_superadmin());

-- ── reports: Readable by superadmin and management ──────────────────────────
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin and management can read reports"
  ON reports FOR SELECT
  TO authenticated
  USING (public.is_superadmin() OR public.is_management());

-- ── stage_personnel: Readable by supervisors ────────────────────────────────
ALTER TABLE stage_personnel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors and management can read stage personnel"
  ON stage_personnel FOR SELECT
  TO authenticated
  USING (public.is_superadmin() OR public.is_supervisor());

-- ── material_transactions: Readable by supervisors ──────────────────────────
ALTER TABLE material_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors and management can read material transactions"
  ON material_transactions FOR SELECT
  TO authenticated
  USING (public.is_superadmin() OR public.is_supervisor());

-- ── work_instructions: Readable by all authenticated ────────────────────────
ALTER TABLE work_instructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Work instructions are viewable by all authenticated users"
  ON work_instructions FOR SELECT
  TO authenticated
  USING (true);

-- ── quality_checklist_results: Readable by supervisors ──────────────────────
ALTER TABLE quality_checklist_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors and management can read QC checklist results"
  ON quality_checklist_results FOR SELECT
  TO authenticated
  USING (public.is_superadmin() OR public.is_supervisor());

-- ── customer_confirmations: Readable by CS and supervisors ──────────────────
ALTER TABLE customer_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CS users read confirmations for their orders"
  ON customer_confirmations FOR SELECT
  TO authenticated
  USING (
    public.is_customer_service()
    AND EXISTS (
      SELECT 1 FROM public.cs_orders o
      WHERE o.id = customer_confirmations.order_id
        AND o.created_by = auth.uid()
    )
  );

CREATE POLICY "Supervisors and management can read all confirmations"
  ON customer_confirmations FOR SELECT
  TO authenticated
  USING (public.is_superadmin() OR public.is_supervisor());

-- ════════════════════════════════════════════════════════════════════════════
-- INSERT POLICIES (write operations primarily go through admin client,
-- but these policies provide defense-in-depth for anon-key writes)
-- ════════════════════════════════════════════════════════════════════════════

-- Allow users to insert their own scan events (workshop login)
CREATE POLICY "Users can insert their own scan events"
  ON scan_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow users to insert their own stage results (workshop submission)
CREATE POLICY "Workers can insert their own stage results"
  ON stage_results FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- END OF MIGRATION 002
-- ============================================================================
