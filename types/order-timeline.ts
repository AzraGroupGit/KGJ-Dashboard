// types/order-timeline.ts

export interface StageResult {
  id: string;
  stage: string;
  finished_at: string;
  users?: { full_name: string } | null;
}

export interface Transition {
  from_stage: string | null;
  to_stage: string;
  transitioned_at: string;
}

export interface Delivery {
  delivery_method: string | null;
  status: string | null;
  courier_name: string | null;
  tracking_number: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
}
