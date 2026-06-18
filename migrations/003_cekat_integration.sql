-- ============================================================================
-- Migration 003: Cekat AI WhatsApp Integration
-- Project: BMS-OPR-PRD ERP System
-- Database: Supabase PostgreSQL
-- Description: Conversation tracking and webhook idempotency for Cekat integration
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- 1. cekat_conversations — Links Cekat WhatsApp conversations to ERP orders
--
-- One order can have multiple conversations (retries, re-engagement).
-- conversation_state tracks where the conversation is in the automation flow.
-- updated_at is managed manually in app code (consistent with all other tables
-- in this project — no trigger exists on any table).
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE cekat_conversations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           UUID NOT NULL REFERENCES cs_orders(id) ON DELETE CASCADE,
  conversation_id    TEXT NOT NULL UNIQUE,
  customer_wa        TEXT NOT NULL,
  -- ASSUMPTION: conversation_state values are tentative; confirm against Cekat's
  -- actual automation flow before locking these values.
  conversation_state TEXT NOT NULL DEFAULT 'created',
  last_template      TEXT,
  last_message_at    TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cc_order_id ON cekat_conversations(order_id);
CREATE INDEX idx_cc_customer_wa ON cekat_conversations(customer_wa);
CREATE INDEX idx_cc_state ON cekat_conversations(conversation_state);

COMMENT ON TABLE cekat_conversations IS 'Links Cekat WhatsApp conversations to ERP orders';
COMMENT ON COLUMN cekat_conversations.conversation_state IS 'created | confirming | paying | shipping | completed';
COMMENT ON COLUMN cekat_conversations.last_template IS 'Last Cekat template sent (e.g. order_detail)';
COMMENT ON COLUMN cekat_conversations.customer_wa IS 'Normalized WA number (digits only, no leading + or spaces)';

-- ════════════════════════════════════════════════════════════════════════════
-- 2. cekat_webhook_events — Idempotency log + audit trail
--
-- Every webhook received from Cekat is recorded here. The UNIQUE constraint
-- on event_id prevents duplicate processing (Cekat may retry webhooks).
-- raw_payload stores the full original body for debugging and replay.
--
-- matched_order_id uses ON DELETE SET NULL (not CASCADE) because this is
-- an audit log — events should survive order deletion for traceability.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE cekat_webhook_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         TEXT NOT NULL UNIQUE,
  event_type       TEXT NOT NULL,
  conversation_id  TEXT,
  raw_payload      JSONB NOT NULL,
  parsed_message   JSONB,
  -- ASSUMPTION: matched_order_id is set by matching conversation_id to
  -- cekat_conversations. If no match, remains NULL (unmatched event).
  matched_order_id UUID REFERENCES cs_orders(id) ON DELETE SET NULL,
  processed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  status           TEXT NOT NULL DEFAULT 'processed'
);

CREATE INDEX idx_cwe_event_id ON cekat_webhook_events(event_id);
CREATE INDEX idx_cwe_conversation ON cekat_webhook_events(conversation_id);
CREATE INDEX idx_cwe_processed ON cekat_webhook_events(processed_at);

COMMENT ON TABLE cekat_webhook_events IS 'Idempotency log for Cekat webhook events. UNIQUE(event_id) prevents duplicates.';
COMMENT ON COLUMN cekat_webhook_events.status IS 'processed | duplicate | error';
COMMENT ON COLUMN cekat_webhook_events.raw_payload IS 'Full original webhook JSON body for debugging';

-- ════════════════════════════════════════════════════════════════════════════
-- 3. RLS Policies (following migration 002 convention)
--
-- NOTE: These tables are accessed exclusively via admin client (service role)
-- in API routes, which bypasses RLS. Policies below are defense-in-depth and
-- forward-looking (future dashboard may display conversation history).
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE cekat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cekat_webhook_events ENABLE ROW LEVEL SECURITY;

-- SELECT: Management and supervisors can view conversation/message history
CREATE POLICY "Management and supervisors can view conversations"
  ON cekat_conversations FOR SELECT
  USING (
    public.get_user_role_group() IN ('management', 'operational')
  );

CREATE POLICY "Management and supervisors can view webhook events"
  ON cekat_webhook_events FOR SELECT
  USING (
    public.get_user_role_group() IN ('management', 'operational')
  );

-- INSERT/UPDATE/DELETE: Admin client only (service role key, bypasses RLS).
-- No policies needed — admin client has full access regardless of RLS.
