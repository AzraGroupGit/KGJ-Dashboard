-- =============================================================================
-- Migration: Payment tracking, Material tracking, Stage transitions,
--            Delivery records, Gemstone relational data, Worker assignment
-- Date: 2026-04-28
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. PAYMENTS
--    Structured financial record per order (DP, pelunasan, refund, adjustment).
--    orders.total_price and dp_amount added so balance can be calculated.
-- -----------------------------------------------------------------------------

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS total_price   bigint CHECK (total_price >= 0),
  ADD COLUMN IF NOT EXISTS dp_amount     bigint CHECK (dp_amount   >= 0);

CREATE TABLE public.payments (
  id            uuid          NOT NULL DEFAULT gen_random_uuid(),
  order_id      uuid          NOT NULL,
  type          character varying NOT NULL
    CHECK (type IN ('dp', 'pelunasan', 'refund', 'adjustment')),
  amount        bigint        NOT NULL CHECK (amount > 0),
  method        character varying NOT NULL
    CHECK (method IN ('cash', 'transfer_bank', 'qris', 'other')),
  reference_no  character varying,            -- bank ref / QRIS trace ID
  paid_at       timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  received_by   uuid          NOT NULL,        -- cashier / CS who took payment
  verified_by   uuid,                          -- supervisor who confirmed
  verified_at   timestamp with time zone,
  notes         text,
  created_at    timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT payments_pkey          PRIMARY KEY (id),
  CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id)     REFERENCES public.orders(id),
  CONSTRAINT payments_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.users(id),
  CONSTRAINT payments_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id)
);

CREATE INDEX idx_payments_order_id ON public.payments (order_id);
CREATE INDEX idx_payments_paid_at  ON public.payments (paid_at);


-- -----------------------------------------------------------------------------
-- 2. MATERIAL TRANSACTIONS
--    Tracks physical gold / alloy / gemstone movement per stage.
--    transaction_type:
--      input   – material received at this stage (e.g. raw gold into racik_bahan)
--      output  – material passed to next stage (post-forming weight)
--      waste   – scrap / filings recorded
--      return  – customer-supplied material returned
-- -----------------------------------------------------------------------------

CREATE TABLE public.material_transactions (
  id                uuid          NOT NULL DEFAULT gen_random_uuid(),
  order_id          uuid          NOT NULL,
  stage             character varying NOT NULL
    CHECK (stage IN (
      'penerimaan_order', 'racik_bahan', 'lebur_bahan',
      'pembentukan_cincin', 'pemasangan_permata', 'pemolesan',
      'finishing', 'qc_1', 'qc_2', 'qc_3'
    )),
  stage_result_id   uuid,
  transaction_type  character varying NOT NULL
    CHECK (transaction_type IN ('input', 'output', 'waste', 'return')),
  material_type     character varying NOT NULL
    CHECK (material_type IN ('gold', 'silver', 'platinum', 'alloy', 'gemstone', 'other')),
  karat             numeric CHECK (karat >= 0 AND karat <= 24),
  weight_grams      numeric       NOT NULL CHECK (weight_grams > 0),
  supplier          character varying,         -- vendor or "customer" if customer-supplied
  notes             text,
  recorded_by       uuid          NOT NULL,
  recorded_at       timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at        timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT material_transactions_pkey              PRIMARY KEY (id),
  CONSTRAINT mat_tx_order_id_fkey       FOREIGN KEY (order_id)        REFERENCES public.orders(id),
  CONSTRAINT mat_tx_stage_result_id_fkey FOREIGN KEY (stage_result_id) REFERENCES public.stage_results(id),
  CONSTRAINT mat_tx_recorded_by_fkey    FOREIGN KEY (recorded_by)     REFERENCES public.users(id)
);

CREATE INDEX idx_material_tx_order_id ON public.material_transactions (order_id);
CREATE INDEX idx_material_tx_stage    ON public.material_transactions (stage);


-- -----------------------------------------------------------------------------
-- 3. ORDER STAGE TRANSITIONS
--    Immutable log of every stage change — who moved it, when, and why.
--    from_stage is NULL for the initial penerimaan_order entry.
-- -----------------------------------------------------------------------------

CREATE TABLE public.order_stage_transitions (
  id               uuid          NOT NULL DEFAULT gen_random_uuid(),
  order_id         uuid          NOT NULL,
  from_stage       character varying
    CHECK (from_stage IS NULL OR from_stage IN (
      'penerimaan_order', 'qc_awal', 'racik_bahan', 'lebur_bahan',
      'pembentukan_cincin', 'pemasangan_permata', 'pemolesan',
      'qc_1', 'konfirmasi_awal', 'finishing', 'laser', 'qc_2',
      'pelunasan', 'kelengkapan', 'qc_3', 'packing', 'pengiriman', 'selesai'
    )),
  to_stage         character varying NOT NULL
    CHECK (to_stage IN (
      'penerimaan_order', 'qc_awal', 'racik_bahan', 'lebur_bahan',
      'pembentukan_cincin', 'pemasangan_permata', 'pemolesan',
      'qc_1', 'konfirmasi_awal', 'finishing', 'laser', 'qc_2',
      'pelunasan', 'kelengkapan', 'qc_3', 'packing', 'pengiriman', 'selesai'
    )),
  transitioned_by  uuid          NOT NULL,
  reason           text,                        -- required when going backwards (rework)
  transitioned_at  timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT order_stage_transitions_pkey            PRIMARY KEY (id),
  CONSTRAINT ost_order_id_fkey    FOREIGN KEY (order_id)        REFERENCES public.orders(id),
  CONSTRAINT ost_transitioned_by_fkey FOREIGN KEY (transitioned_by) REFERENCES public.users(id)
);

CREATE INDEX idx_ost_order_id         ON public.order_stage_transitions (order_id);
CREATE INDEX idx_ost_transitioned_at  ON public.order_stage_transitions (transitioned_at);


-- -----------------------------------------------------------------------------
-- 4. DELIVERIES
--    One record per delivery attempt. Supports re-attempts (no UNIQUE on order_id).
--    status: pending → dispatched → delivered | failed | returned
-- -----------------------------------------------------------------------------

CREATE TABLE public.deliveries (
  id               uuid          NOT NULL DEFAULT gen_random_uuid(),
  order_id         uuid          NOT NULL,
  delivery_method  character varying NOT NULL
    CHECK (delivery_method IN (
      'pickup_store', 'courier_local', 'courier_intercity',
      'in_house_delivery', 'other'
    )),
  status           character varying NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'dispatched', 'delivered', 'failed', 'returned')),
  courier_name     character varying,
  tracking_number  character varying,
  recipient_name   character varying,
  recipient_phone  character varying,
  delivery_address text,
  dispatched_at    timestamp with time zone,
  delivered_at     timestamp with time zone,
  failed_at        timestamp with time zone,
  failure_reason   text,
  prepared_by      uuid,                        -- packing/ops staff
  confirmed_by     uuid,                        -- supervisor sign-off
  notes            text,
  created_at       timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT deliveries_pkey             PRIMARY KEY (id),
  CONSTRAINT deliveries_order_id_fkey    FOREIGN KEY (order_id)     REFERENCES public.orders(id),
  CONSTRAINT deliveries_prepared_by_fkey FOREIGN KEY (prepared_by)  REFERENCES public.users(id),
  CONSTRAINT deliveries_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES public.users(id)
);

CREATE INDEX idx_deliveries_order_id ON public.deliveries (order_id);
CREATE INDEX idx_deliveries_status   ON public.deliveries (status);


-- -----------------------------------------------------------------------------
-- 5. ORDER GEMSTONES
--    Replaces the gemstone_info JSONB array on orders with a proper table.
--    source: 'customer' = brought in by customer, 'store' = supplied by us.
--    orders.gemstone_info is kept for now and can be retired after data migration.
-- -----------------------------------------------------------------------------

CREATE TABLE public.order_gemstones (
  id            uuid          NOT NULL DEFAULT gen_random_uuid(),
  order_id      uuid          NOT NULL,
  gemstone_type character varying NOT NULL,    -- diamond, ruby, sapphire, emerald, etc.
  shape         character varying,             -- round, oval, princess, marquise, etc.
  weight_ct     numeric       CHECK (weight_ct > 0),    -- carats
  weight_grams  numeric       CHECK (weight_grams > 0), -- grams (if weighed locally)
  clarity       character varying,             -- IF, VVS1, VVS2, VS1, VS2, SI1, SI2, I1…
  color         character varying,             -- D-Z scale or fancy color name
  quantity      integer       NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  source        character varying NOT NULL DEFAULT 'customer'
    CHECK (source IN ('customer', 'store')),
  certificate_no character varying,            -- GIA / IGI / HRD cert number
  notes         text,
  created_at    timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT order_gemstones_pkey          PRIMARY KEY (id),
  CONSTRAINT order_gemstones_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

CREATE INDEX idx_order_gemstones_order_id ON public.order_gemstones (order_id);


-- -----------------------------------------------------------------------------
-- 6. WORKER ASSIGNMENT
--    Adds assignment fields to stage_results so supervisors can pre-assign
--    a production worker before the work starts.
--    assigned_to  – the worker expected to perform this stage
--    assigned_by  – the supervisor who made the assignment
--    assigned_at  – when the assignment was made
-- -----------------------------------------------------------------------------

ALTER TABLE public.stage_results
  ADD COLUMN IF NOT EXISTS assigned_to  uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS assigned_by  uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS assigned_at  timestamp with time zone;

CREATE INDEX idx_stage_results_assigned_to ON public.stage_results (assigned_to);


-- -----------------------------------------------------------------------------
-- Row-level security (RLS) placeholders — enable and configure policies to
-- match your existing RLS setup on orders, stage_results, etc.
-- -----------------------------------------------------------------------------

ALTER TABLE public.payments                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_stage_transitions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_gemstones          ENABLE ROW LEVEL SECURITY;
