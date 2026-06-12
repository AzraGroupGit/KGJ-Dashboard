// types/marketing.ts

export interface MarketingInput {
  id: string;
  channel: string;
  biaya_marketing: number;
  lead_serius: number;
  lead_all: number;
  closing: number;
  notes: string | null;
  input_date: string;
  created_at: string;
  cs_user_id?: string | null;
  cs_user_name?: string | null;
  users?: {
    full_name: string;
    email: string;
  };
}

export interface AnalyticsData {
  summary: {
    totalBiayaMarketing: number;
    totalLeadSerius: number;
    totalLeadAll: number;
    totalClosing: number;
    roi: number;
    crSerius: number;
    crAll: number;
    cpls: number;
    cpla: number;
    cac: number;
    totalInputs: number;
  };
  channelMetrics: Array<{
    channel: string;
    biayaMarketing: number;
    leadSerius: number;
    leadAll: number;
    closing: number;
    roi: number;
    crSerius: number;
    crAll: number;
    cpls: number;
    cpla: number;
    cac: number;
    totalInputs: number;
  }>;
  recommendations: Array<{
    type: "increase" | "decrease" | "warning" | "improve";
    channel: string;
    reason: string;
    action: string;
  }>;
}
