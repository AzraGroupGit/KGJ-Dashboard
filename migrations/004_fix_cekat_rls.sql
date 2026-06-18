-- ============================================================================
-- Migration 004: Fix Cekat RLS Policies — correct role-based SELECT access
-- Project: BMS-OPR-PRD ERP System
-- Database: Supabase PostgreSQL
-- Description: Drops the overly-restrictive 003 policies and replaces them
--              with policies granting SELECT to:
--                - customer_service (specific role name)
--                - customer_care (specific role name — NOT the whole operational group)
--                - entire management role_group (superadmin + both supervisors)
-- ============================================================================

-- Drop existing policies from migration 003
DROP POLICY IF EXISTS "Management and supervisors can view conversations"
  ON cekat_conversations;
DROP POLICY IF EXISTS "Management and supervisors can view webhook events"
  ON cekat_webhook_events;

-- ── cekat_conversations ─────────────────────────────────────────────────────

CREATE POLICY "Authorized roles can view conversations"
  ON cekat_conversations FOR SELECT
  USING (
    public.get_user_role_name() IN ('customer_service', 'customer_care')
    OR public.get_user_role_group() = 'management'
  );

-- ── cekat_webhook_events ────────────────────────────────────────────────────

CREATE POLICY "Authorized roles can view webhook events"
  ON cekat_webhook_events FOR SELECT
  USING (
    public.get_user_role_name() IN ('customer_service', 'customer_care')
    OR public.get_user_role_group() = 'management'
  );

-- INSERT/UPDATE/DELETE: Admin client only (service role key, bypasses RLS).
-- No policies needed — admin client has full access regardless of RLS.
