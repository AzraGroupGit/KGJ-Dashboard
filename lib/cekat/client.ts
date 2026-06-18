// lib/cekat/client.ts
//
// Outbound service module for Cekat AI WhatsApp integration.
// Sends WhatsApp templates via Cekat's Open API.
//
// ASSUMPTIONS (confirm with Cekat before go-live):
//   - Auth: X-API-Key header with CEKAT_API_KEY
//   - Endpoint: POST {CEKAT_BASE_URL}/v1/templates/send
//   - Error responses: { error: { message: string } }
//   - Success response: { success: true, data: { conversation_id, message_id } }
//   These are isolated in buildRequest() and the response parser.

import { getTemplateId, type CekatTemplateName } from "./templates";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SendTemplateParams {
  customer_wa: string;
  template_name: CekatTemplateName;
  template_params: Record<string, string>;
  conversation_id?: string;
}

export interface SendTemplateResult {
  success: boolean;
  conversation_id?: string;
  message_id?: string;
  error?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function normalizeWa(wa: string): string {
  return wa.replace(/[^0-9]/g, "");
}

function getCredentials(): { apiKey: string; baseUrl: string } | { error: string } {
  const apiKey = process.env.CEKAT_API_KEY;
  const baseUrl = process.env.CEKAT_BASE_URL;

  if (!apiKey || !baseUrl) {
    return {
      error: `Cekat credentials not configured: missing ${!apiKey ? "CEKAT_API_KEY" : ""}${!apiKey && !baseUrl ? ", " : ""}${!baseUrl ? "CEKAT_BASE_URL" : ""}`,
    };
  }

  return { apiKey, baseUrl };
}

// ASSUMPTION: Cekat request shape — confirm against Cekat Open API docs.
// Isolate here so only this function changes when confirmed.
function buildRequest(params: SendTemplateParams, apiKey: string, baseUrl: string): Request {
  const templateId = getTemplateId(params.template_name);
  const normalizedWa = normalizeWa(params.customer_wa);

  // ASSUMPTION: Cekat expects these exact field names and auth header.
  // Confirm: is it X-API-Key or Authorization: Bearer? Is the body shape correct?
  const body = JSON.stringify({
    template_id: templateId,
    to: normalizedWa,
    parameters: params.template_params,
    conversation_id: params.conversation_id,
  });

  return new Request(`${baseUrl}/v1/templates/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body,
  });
}

// ASSUMPTION: Cekat success response shape — confirm against real API response.
function parseSuccessResponse(json: Record<string, unknown>): SendTemplateResult {
  // ASSUMPTION: response.data contains conversation_id and message_id
  const data = json.data as Record<string, unknown> | undefined;
  return {
    success: true,
    conversation_id: data?.conversation_id as string | undefined,
    message_id: data?.message_id as string | undefined,
  };
}

// ASSUMPTION: Cekat error response shape — confirm against real API response.
function parseErrorResponse(json: Record<string, unknown>, status: number): SendTemplateResult {
  const err = json.error as { message?: string } | undefined;
  return {
    success: false,
    error: err?.message ?? `Cekat API returned HTTP ${status}`,
  };
}

// ── Main Export ────────────────────────────────────────────────────────────────

export async function sendTemplate(
  params: SendTemplateParams,
): Promise<SendTemplateResult> {
  const creds = getCredentials();
  if ("error" in creds) {
    return { success: false, error: creds.error };
  }

  const req = buildRequest(params, creds.apiKey, creds.baseUrl);

  try {
    const res = await fetch(req);
    const json = (await res.json()) as Record<string, unknown>;

    if (!res.ok) {
      return parseErrorResponse(json, res.status);
    }

    return parseSuccessResponse(json);
  } catch (err) {
    // Network error, DNS failure, etc.
    const message = err instanceof Error ? err.message : "Unknown network error";
    return { success: false, error: `Cekat request failed: ${message}` };
  }
}
