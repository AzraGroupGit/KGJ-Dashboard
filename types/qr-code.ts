// types/qr-code.ts

export interface Role {
  id: string;
  name: string;
  role_group: string;
  description: string | null;
  allowed_stages: string[];
  permissions?: Record<string, boolean>;
}

export interface QRCode {
  id: string;
  role_id: string;
  role_name?: string;
  role_group?: string;
  allowed_stages: string[];
  workstation_name: string;
  location: string | null;
  qr_token: string;
  qr_payload: string;
  is_active: boolean;
  generated_at: string;
  expired_at: string | null;
}
