// types/supabase.ts
// Database types for Supabase — mirrors the actual schema (24 tables).
// Generated from DATABASE_SCHEMA.md for type-safe queries across the project.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      cs_orders: {
        Row: CsOrderRow;
        Insert: Omit<CsOrderRow, "id" | "created_at" | "updated_at" | "order_number"> & Partial<Pick<CsOrderRow, "id" | "created_at" | "updated_at" | "order_number">>;
        Update: Partial<CsOrderRow>;
        Relationships: Array<{
          foreignKeyName: "cs_orders_branch_id_fkey"; columns: ["branch_id"]; referencedRelation: "branches"; referencedColumns: ["id"];
        } | {
          foreignKeyName: "cs_orders_created_by_fkey"; columns: ["created_by"]; referencedRelation: "users"; referencedColumns: ["id"];
        }>;
      };
      stage_results: {
        Row: StageResultRow;
        Insert: Omit<StageResultRow, "id" | "submitted_at"> & Partial<Pick<StageResultRow, "id" | "submitted_at">>;
        Update: Partial<StageResultRow>;
        Relationships: Array<{
          foreignKeyName: "stage_results_order_id_fkey"; columns: ["order_id"]; referencedRelation: "cs_orders"; referencedColumns: ["id"];
        } | {
          foreignKeyName: "stage_results_submitted_by_fkey"; columns: ["submitted_by"]; referencedRelation: "users"; referencedColumns: ["id"];
        }>;
      };
      order_stage_transitions: {
        Row: TransitionRow;
        Insert: Omit<TransitionRow, "id" | "transitioned_at"> & Partial<Pick<TransitionRow, "id" | "transitioned_at">>;
        Update: Partial<TransitionRow>;
        Relationships: Array<{
          foreignKeyName: "order_stage_transitions_order_id_fkey"; columns: ["order_id"]; referencedRelation: "cs_orders"; referencedColumns: ["id"];
        } | {
          foreignKeyName: "order_stage_transitions_transitioned_by_fkey"; columns: ["transitioned_by"]; referencedRelation: "users"; referencedColumns: ["id"];
        }>;
      };
      approvals: {
        Row: ApprovalRow;
        Insert: Omit<ApprovalRow, "id" | "decided_at"> & Partial<Pick<ApprovalRow, "id" | "decided_at">>;
        Update: Partial<ApprovalRow>;
        Relationships: Array<{
          foreignKeyName: "approvals_order_id_fkey"; columns: ["order_id"]; referencedRelation: "cs_orders"; referencedColumns: ["id"];
        } | {
          foreignKeyName: "approvals_approver_id_fkey"; columns: ["approver_id"]; referencedRelation: "users"; referencedColumns: ["id"];
        }>;
      };
      scan_events: {
        Row: ScanEventRow;
        Insert: Omit<ScanEventRow, "id" | "created_at"> & Partial<Pick<ScanEventRow, "id" | "created_at">>;
        Update: Partial<ScanEventRow>;
        Relationships: Array<{
          foreignKeyName: "scan_events_order_id_fkey"; columns: ["order_id"]; referencedRelation: "cs_orders"; referencedColumns: ["id"];
        } | {
          foreignKeyName: "scan_events_user_id_fkey"; columns: ["user_id"]; referencedRelation: "users"; referencedColumns: ["id"];
        }>;
      };
      notifications: {
        Row: NotificationRow;
        Insert: Omit<NotificationRow, "id" | "created_at"> & Partial<Pick<NotificationRow, "id" | "created_at">>;
        Update: Partial<NotificationRow>;
        Relationships: Array<{
          foreignKeyName: "notifications_user_id_fkey"; columns: ["user_id"]; referencedRelation: "users"; referencedColumns: ["id"];
        }>;
      };
      deliveries: {
        Row: DeliveryRow;
        Insert: Omit<DeliveryRow, "id"> & Partial<Pick<DeliveryRow, "id">>;
        Update: Partial<DeliveryRow>;
        Relationships: Array<{
          foreignKeyName: "deliveries_order_id_fkey"; columns: ["order_id"]; referencedRelation: "cs_orders"; referencedColumns: ["id"];
        }>;
      };
      attachments: {
        Row: AttachmentRow;
        Insert: Omit<AttachmentRow, "id" | "created_at"> & Partial<Pick<AttachmentRow, "id" | "created_at">>;
        Update: Partial<AttachmentRow>;
        Relationships: Array<{
          foreignKeyName: "attachments_order_id_fkey"; columns: ["order_id"]; referencedRelation: "cs_orders"; referencedColumns: ["id"];
        }>;
      };
      payments: {
        Row: PaymentRow;
        Insert: Omit<PaymentRow, "id"> & Partial<Pick<PaymentRow, "id">>;
        Update: Partial<PaymentRow>;
        Relationships: Array<{
          foreignKeyName: "payments_order_id_fkey"; columns: ["order_id"]; referencedRelation: "cs_orders"; referencedColumns: ["id"];
        }>;
      };
      rework_logs: {
        Row: ReworkLogRow;
        Insert: Omit<ReworkLogRow, "id" | "created_at"> & Partial<Pick<ReworkLogRow, "id" | "created_at">>;
        Update: Partial<ReworkLogRow>;
        Relationships: Array<{
          foreignKeyName: "rework_logs_order_id_fkey"; columns: ["order_id"]; referencedRelation: "cs_orders"; referencedColumns: ["id"];
        }>;
      };
      activity_logs: {
        Row: ActivityLogRow;
        Insert: Omit<ActivityLogRow, "id" | "created_at"> & Partial<Pick<ActivityLogRow, "id" | "created_at">>;
        Update: Partial<ActivityLogRow>;
        Relationships: Array<{
          foreignKeyName: "activity_logs_order_id_fkey"; columns: ["order_id"]; referencedRelation: "cs_orders"; referencedColumns: ["id"];
        }>;
      };
      users: {
        Row: UserRow;
        Insert: Omit<UserRow, "id" | "created_at"> & Partial<Pick<UserRow, "id" | "created_at">>;
        Update: Partial<UserRow>;
        Relationships: Array<{
          foreignKeyName: "users_role_id_fkey"; columns: ["role_id"]; referencedRelation: "roles"; referencedColumns: ["id"];
        }>;
      };
      roles: {
        Row: RoleRow;
        Insert: Omit<RoleRow, "id"> & Partial<Pick<RoleRow, "id">>;
        Update: Partial<RoleRow>;
        Relationships: [];
      };
      branches: {
        Row: BranchRow;
        Insert: Omit<BranchRow, "id"> & Partial<Pick<BranchRow, "id">>;
        Update: Partial<BranchRow>;
        Relationships: [];
      };
      slot_categories: {
        Row: SlotCategoryRow;
        Insert: Omit<SlotCategoryRow, "id"> & Partial<Pick<SlotCategoryRow, "id">>;
        Update: Partial<SlotCategoryRow>;
        Relationships: [];
      };
      slot_overrides: {
        Row: SlotOverrideRow;
        Insert: Omit<SlotOverrideRow, "id" | "created_at"> & Partial<Pick<SlotOverrideRow, "id" | "created_at">>;
        Update: Partial<SlotOverrideRow>;
        Relationships: Array<{
          foreignKeyName: "slot_overrides_slot_category_id_fkey"; columns: ["slot_category_id"]; referencedRelation: "slot_categories"; referencedColumns: ["id"];
        }>;
      };
      qr_codes: {
        Row: QrCodeRow;
        Insert: Omit<QrCodeRow, "id" | "created_at"> & Partial<Pick<QrCodeRow, "id" | "created_at">>;
        Update: Partial<QrCodeRow>;
        Relationships: Array<{
          foreignKeyName: "qr_codes_role_id_fkey"; columns: ["role_id"]; referencedRelation: "roles"; referencedColumns: ["id"];
        }>;
      };
      marketing_inputs: {
        Row: MarketingInputRow;
        Insert: Omit<MarketingInputRow, "id" | "created_at"> & Partial<Pick<MarketingInputRow, "id" | "created_at">>;
        Update: Partial<MarketingInputRow>;
        Relationships: [];
      };
      marketing_channels: {
        Row: MarketingChannelRow;
        Insert: Omit<MarketingChannelRow, "id" | "created_at"> & Partial<Pick<MarketingChannelRow, "id" | "created_at">>;
        Update: Partial<MarketingChannelRow>;
        Relationships: [];
      };
      cs_inputs: {
        Row: CsInputRow;
        Insert: Omit<CsInputRow, "id"> & Partial<Pick<CsInputRow, "id">>;
        Update: Partial<CsInputRow>;
        Relationships: [];
      };
      reports: {
        Row: ReportRow;
        Insert: Omit<ReportRow, "id" | "generated_at"> & Partial<Pick<ReportRow, "id" | "generated_at">>;
        Update: Partial<ReportRow>;
        Relationships: Array<{
          foreignKeyName: "reports_generated_by_fkey"; columns: ["generated_by"]; referencedRelation: "users"; referencedColumns: ["id"];
        }>;
      };
      stage_personnel: {
        Row: StagePersonnelRow;
        Insert: Omit<StagePersonnelRow, "id"> & Partial<Pick<StagePersonnelRow, "id">>;
        Update: Partial<StagePersonnelRow>;
        Relationships: Array<{
          foreignKeyName: "stage_personnel_user_id_fkey"; columns: ["user_id"]; referencedRelation: "users"; referencedColumns: ["id"];
        }>;
      };
      material_transactions: {
        Row: MaterialTransactionRow;
        Insert: Omit<MaterialTransactionRow, "id" | "created_at"> & Partial<Pick<MaterialTransactionRow, "id" | "created_at">>;
        Update: Partial<MaterialTransactionRow>;
        Relationships: Array<{
          foreignKeyName: "material_transactions_order_id_fkey"; columns: ["order_id"]; referencedRelation: "cs_orders"; referencedColumns: ["id"];
        }>;
      };
      work_instructions: {
        Row: WorkInstructionRow;
        Insert: Omit<WorkInstructionRow, "id"> & Partial<Pick<WorkInstructionRow, "id">>;
        Update: Partial<WorkInstructionRow>;
        Relationships: [];
      };
      quality_checklist_results: {
        Row: QualityChecklistResultRow;
        Insert: Omit<QualityChecklistResultRow, "id" | "created_at"> & Partial<Pick<QualityChecklistResultRow, "id" | "created_at">>;
        Update: Partial<QualityChecklistResultRow>;
        Relationships: [];
      };
      customer_confirmations: {
        Row: CustomerConfirmationRow;
        Insert: Omit<CustomerConfirmationRow, "id" | "created_at"> & Partial<Pick<CustomerConfirmationRow, "id" | "created_at">>;
        Update: Partial<CustomerConfirmationRow>;
        Relationships: [];
      };
    };
    Enums: Record<string, never>;
  };
}

// ── Row Types ─────────────────────────────────────────────────────────────────

export interface CsOrderRow {
  id: string;
  order_number: string;
  form_token: string | null;
  created_by: string | null;
  branch_id: string | null;
  form_status: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  promoted_to_order_id: string | null;
  current_stage: string | null;
  status: string | null;
  completed_at: string | null;
  deleted_at: string | null;
  tgl_chat: string | null;
  tgl_order: string | null;
  tgl_acara: string | null;
  deadline: string | null;
  acara: string | null;
  kebutuhan_acara: string | null;
  kategori: string | null;
  order_via: string | null;
  order_via_channel: string | null;
  sumber_media: string | null;
  sumber_detail: string | null;
  kgj_instagram_account: string | null;
  kgj_instagram_account_custom: string | null;
  dari_artis: boolean | null;
  dari_artis_detail: string | null;
  harga: number | null;
  dp_amount: number | null;
  customer_name: string | null;
  customer_wa: string | null;
  customer_email: string | null;
  customer_instagram: string | null;
  alamat_pengiriman: string | null;
  kelurahan: string | null;
  kecamatan: string | null;
  kabupaten_kota: string | null;
  provinsi: string | null;
  kodepos: string | null;
  alat_ukur: string | null;
  gramasi_pria: number | null;
  ukuran_pria: string | null;
  ukiran_pria: string | null;
  ukiran_cincin_pria: string | null;
  jenis_cincin_pria: string | null;
  model_bentuk_pria: string[] | null;
  microsetting_pria: string[] | null;
  detail_laser_pria: string[] | null;
  detail_finishing_pria: string[] | null;
  gramasi_wanita: number | null;
  ukuran_wanita: string | null;
  ukiran_wanita: string | null;
  ukiran_cincin_wanita: string | null;
  jenis_cincin_wanita: string | null;
  jenis_cincin_features: string[] | null;
  model_bentuk_wanita: string[] | null;
  microsetting_wanita: string[] | null;
  detail_laser_wanita: string[] | null;
  detail_finishing_wanita: string[] | null;
  font: string | null;
  laser_position: string | null;
  pengiriman: string | null;
  box: string | null;
  transfer_ke_bank: string | null;
  keterangan_tambahan: string | null;
  reference_image_pria_url: string | null;
  reference_image_wanita_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface StageResultRow {
  id: string;
  order_id: string;
  stage: string;
  submitted_by: string | null;
  attempt_number: number;
  data: Json;
  submitted_at: string;
  notes: string | null;
}

export interface TransitionRow {
  id: string;
  order_id: string;
  from_stage: string;
  to_stage: string;
  transitioned_by: string | null;
  reason: string | null;
  transitioned_at: string;
}

export interface ApprovalRow {
  id: string;
  order_id: string;
  approver_id: string | null;
  stage: string;
  decision: string;
  remarks: string | null;
  stage_result_id: string | null;
  decided_at: string;
}

export interface ScanEventRow {
  id: string;
  order_id: string;
  user_id: string | null;
  stage: string;
  action: string;
  qr_code_id: string | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface DeliveryRow {
  id: string;
  order_id: string;
  courier: string | null;
  tracking_number: string | null;
  address: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
}

export interface AttachmentRow {
  id: string;
  order_id: string;
  file_url: string;
  file_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface PaymentRow {
  id: string;
  order_id: string;
  amount: number;
  payment_method: string | null;
  paid_at: string | null;
}

export interface ReworkLogRow {
  id: string;
  order_id: string;
  stage: string;
  reason: string;
  requested_by: string | null;
  created_at: string;
}

export interface ActivityLogRow {
  id: string;
  order_id: string;
  user_id: string | null;
  action: string;
  details: Json | null;
  created_at: string;
}

export interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  pin: string | null;
  role_id: string | null;
  branch_id: string | null;
  status: string;
  last_login: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface RoleRow {
  id: string;
  name: string;
  role_group: string;
  description: string | null;
  allowed_stages: string[] | null;
  permissions: Json | null;
}

export interface BranchRow {
  id: string;
  name: string;
  code: string;
}

export interface SlotCategoryRow {
  id: string;
  kategori: string;
  label: string;
  lead_time_days: number;
  max_slots: number;
}

export interface SlotOverrideRow {
  id: string;
  slot_category_id: string;
  date: string;
  override_max_slots: number;
  created_at: string;
}

export interface QrCodeRow {
  id: string;
  name: string;
  role_id: string | null;
  token: string;
  created_by: string | null;
  created_at: string;
}

export interface MarketingInputRow {
  id: string;
  channel_id: string | null;
  cs_user_id: string | null;
  inputs: Json;
  created_by: string | null;
  created_at: string;
}

export interface MarketingChannelRow {
  id: string;
  name: string;
  created_at: string;
}

export interface CsInputRow {
  id: string;
  branch_id: string | null;
  user_id: string | null;
  lead_masuk: number;
  closing: number;
  omset: number;
}

export interface ReportRow {
  id: string;
  title: string;
  type: string;
  period: string;
  file_url: string | null;
  file_size: number | null;
  status: string;
  generated_by: string | null;
  generated_at: string;
}

export interface StagePersonnelRow {
  id: string;
  user_id: string;
  stage: string;
  person_code: string;
  sub_type: string | null;
  sort_order: number;
}

export interface MaterialTransactionRow {
  id: string;
  order_id: string;
  type: string;
  amount: number;
  gramasi: number | null;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface WorkInstructionRow {
  id: string;
  stage: string;
  parameters: Json;
  is_active: boolean;
}

export interface QualityChecklistResultRow {
  id: string;
  order_id: string;
  stage_result_id: string | null;
  check_key: string;
  passed: boolean;
  recorded_by: string | null;
  created_at: string;
}

export interface CustomerConfirmationRow {
  id: string;
  order_id: string;
  stage_result_id: string | null;
  confirmation_type: string | null;
  confirmation_method: string | null;
  confirmation_status: string | null;
  rejection_reason: string | null;
  change_requests: string | null;
  photos_sent_at: string | null;
  confirmed_at: string | null;
  created_at: string;
}

// ── Commonly Used Nested Select Types ─────────────────────────────────────────

export type CsOrderWithUser = CsOrderRow & { users: UserRow | null };

export type StageResultWithUser = StageResultRow & { users: UserRow | null };

export type ApprovalWithUser = ApprovalRow & { users: UserRow | null };
