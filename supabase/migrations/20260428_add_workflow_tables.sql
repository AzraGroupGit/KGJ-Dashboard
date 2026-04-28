-- =============================================================================
-- Migration: Workflow support tables for 20-stage production flow
-- Date: 2026-04-28
-- New tables: quality_checklist_results, certificate_logs, customer_confirmations,
--             completeness_checklist, packaging_logs, handover_logs
-- Altered:    orders (rhodium_specification, store_arrival_date,
--                      customer_notified_at, picked_up_at)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. QUALITY CHECKLIST RESULTS
--    Used by qc_1, qc_2, qc_3 stages to store per-item pass/fail results.
-- -----------------------------------------------------------------------------
CREATE TABLE public.quality_checklist_results (
  id              uuid    NOT NULL DEFAULT gen_random_uuid(),
  order_id        uuid    NOT NULL,
  stage_result_id uuid    NOT NULL,
  check_key       character varying NOT NULL,
  passed          boolean NOT NULL DEFAULT false,
  notes           text,
  recorded_by     uuid    NOT NULL,
  created_at      timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT quality_checklist_results_pkey    PRIMARY KEY (id),
  CONSTRAINT qcr_order_id_fkey       FOREIGN KEY (order_id)        REFERENCES public.orders(id),
  CONSTRAINT qcr_stage_result_id_fkey FOREIGN KEY (stage_result_id) REFERENCES public.stage_results(id),
  CONSTRAINT qcr_recorded_by_fkey   FOREIGN KEY (recorded_by)     REFERENCES public.users(id)
);
CREATE INDEX idx_qcr_stage_result_id ON public.quality_checklist_results (stage_result_id);
CREATE INDEX idx_qcr_order_id        ON public.quality_checklist_results (order_id);

-- -----------------------------------------------------------------------------
-- 2. CERTIFICATE LOGS
--    Gemstone / ring certificate verification records captured at qc_1.
-- -----------------------------------------------------------------------------
CREATE TABLE public.certificate_logs (
  id                 uuid    NOT NULL DEFAULT gen_random_uuid(),
  order_id           uuid    NOT NULL,
  stage_result_id    uuid    NOT NULL,
  certificate_type   character varying NOT NULL,   -- 'gemstone', 'ring', 'gia', etc.
  certificate_number character varying,
  issuing_body       character varying,
  is_verified        boolean NOT NULL DEFAULT false,
  notes              text,
  created_at         timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT certificate_logs_pkey          PRIMARY KEY (id),
  CONSTRAINT cert_order_id_fkey      FOREIGN KEY (order_id)        REFERENCES public.orders(id),
  CONSTRAINT cert_stage_result_fkey  FOREIGN KEY (stage_result_id) REFERENCES public.stage_results(id)
);
CREATE INDEX idx_cert_stage_result_id ON public.certificate_logs (stage_result_id);

-- -----------------------------------------------------------------------------
-- 3. CUSTOMER CONFIRMATIONS
--    CS records the customer's response at konfirmasi_awal (and optionally
--    at other confirmation points). confirmation_status drives order routing.
-- -----------------------------------------------------------------------------
CREATE TABLE public.customer_confirmations (
  id                  uuid    NOT NULL DEFAULT gen_random_uuid(),
  order_id            uuid    NOT NULL,
  stage_result_id     uuid,
  confirmation_type   character varying NOT NULL DEFAULT 'initial'
    CHECK (confirmation_type IN ('initial', 'final')),
  confirmation_method character varying
    CHECK (confirmation_method IN ('whatsapp', 'email', 'in_person', 'phone')),
  photos_sent_at      timestamp with time zone,
  confirmation_status character varying NOT NULL DEFAULT 'pending'
    CHECK (confirmation_status IN ('pending', 'approved', 'rejected', 'request_changes')),
  rejection_reason    text,
  change_requests     jsonb DEFAULT '{}'::jsonb,
  confirmed_at        timestamp with time zone,
  processed_by        uuid    NOT NULL,
  created_at          timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT customer_confirmations_pkey      PRIMARY KEY (id),
  CONSTRAINT cc_order_id_fkey    FOREIGN KEY (order_id)        REFERENCES public.orders(id),
  CONSTRAINT cc_stage_result_fkey FOREIGN KEY (stage_result_id) REFERENCES public.stage_results(id),
  CONSTRAINT cc_processed_by_fkey FOREIGN KEY (processed_by)   REFERENCES public.users(id)
);
CREATE INDEX idx_cc_order_id ON public.customer_confirmations (order_id);

-- -----------------------------------------------------------------------------
-- 4. COMPLETENESS CHECKLIST
--    Per-item checklist for the kelengkapan stage (documents, packaging).
-- -----------------------------------------------------------------------------
CREATE TABLE public.completeness_checklist (
  id              uuid    NOT NULL DEFAULT gen_random_uuid(),
  order_id        uuid    NOT NULL,
  stage_result_id uuid    NOT NULL,
  item_key        character varying NOT NULL,
  checked         boolean NOT NULL DEFAULT false,
  notes           text,
  recorded_by     uuid    NOT NULL,
  created_at      timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT completeness_checklist_pkey      PRIMARY KEY (id),
  CONSTRAINT ccl_order_id_fkey    FOREIGN KEY (order_id)        REFERENCES public.orders(id),
  CONSTRAINT ccl_stage_result_fkey FOREIGN KEY (stage_result_id) REFERENCES public.stage_results(id),
  CONSTRAINT ccl_recorded_by_fkey FOREIGN KEY (recorded_by)     REFERENCES public.users(id)
);
CREATE INDEX idx_ccl_stage_result_id ON public.completeness_checklist (stage_result_id);

-- -----------------------------------------------------------------------------
-- 5. PACKAGING LOGS
--    Box type, gift type, and price-list version captured at kelengkapan.
-- -----------------------------------------------------------------------------
CREATE TABLE public.packaging_logs (
  id                  uuid    NOT NULL DEFAULT gen_random_uuid(),
  order_id            uuid    NOT NULL,
  stage_result_id     uuid    NOT NULL,
  box_type            character varying,
  gift_type           character varying,
  price_list_version  character varying,
  notes               text,
  created_at          timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT packaging_logs_pkey       PRIMARY KEY (id),
  CONSTRAINT pl_order_id_fkey    FOREIGN KEY (order_id)        REFERENCES public.orders(id),
  CONSTRAINT pl_stage_result_fkey FOREIGN KEY (stage_result_id) REFERENCES public.stage_results(id)
);

-- -----------------------------------------------------------------------------
-- 6. HANDOVER LOGS
--    Tracks physical custody transfers at the pengiriman stage.
--    delivery_to_store = courier brings to our store, store_to_customer = customer pickup/delivery.
-- -----------------------------------------------------------------------------
CREATE TABLE public.handover_logs (
  id                         uuid    NOT NULL DEFAULT gen_random_uuid(),
  order_id                   uuid    NOT NULL,
  handover_type              character varying NOT NULL
    CHECK (handover_type IN ('delivery_to_store', 'store_to_customer')),
  from_user_id               uuid,
  to_user_id                 uuid,
  handover_form_attachment_id uuid,
  notes                      text,
  created_at                 timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT handover_logs_pkey         PRIMARY KEY (id),
  CONSTRAINT hl_order_id_fkey     FOREIGN KEY (order_id)                    REFERENCES public.orders(id),
  CONSTRAINT hl_from_user_fkey    FOREIGN KEY (from_user_id)                REFERENCES public.users(id),
  CONSTRAINT hl_to_user_fkey      FOREIGN KEY (to_user_id)                  REFERENCES public.users(id),
  CONSTRAINT hl_attachment_fkey   FOREIGN KEY (handover_form_attachment_id) REFERENCES public.attachments(id)
);
CREATE INDEX idx_hl_order_id ON public.handover_logs (order_id);

-- -----------------------------------------------------------------------------
-- 7. ALTER orders — finishing and delivery tracking columns
-- -----------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS rhodium_specification  character varying,
  ADD COLUMN IF NOT EXISTS store_arrival_date     date,
  ADD COLUMN IF NOT EXISTS customer_notified_at   timestamp with time zone,
  ADD COLUMN IF NOT EXISTS picked_up_at           timestamp with time zone;

-- -----------------------------------------------------------------------------
-- RLS (enable; configure policies to match existing role-group rules)
-- -----------------------------------------------------------------------------
ALTER TABLE public.quality_checklist_results  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_confirmations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completeness_checklist     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packaging_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handover_logs              ENABLE ROW LEVEL SECURITY;
