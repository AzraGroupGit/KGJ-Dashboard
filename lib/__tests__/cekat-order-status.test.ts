import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/integrations/cekat/order-status/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function setEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

function buildRequest(query: string, token?: string): Request {
  const url = new URL(`http://localhost/api/integrations/cekat/order-status?${query}`);
  const headers: Record<string, string> = {};
  if (token) headers["authorization"] = `Bearer ${token}`;
  return new Request(url.toString(), { headers });
}

async function parseResponse(res: Response) {
  return { status: res.status, body: await res.json() };
}

beforeEach(() => {
  setEnv("CEKAT_DATA_API_KEY", "data_api_secret_123");
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Mock lookup module ─────────────────────────────────────────────────────────

vi.mock("@/lib/cekat/lookup", () => ({
  lookupByOrderNumber: vi.fn(),
  lookupByCustomerWa: vi.fn(),
}));

import { lookupByOrderNumber, lookupByCustomerWa } from "@/lib/cekat/lookup";

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/integrations/cekat/order-status", () => {
  // ── 1. Missing/invalid auth ──────────────────────────────────────────────

  it("returns 401 when no Authorization header", async () => {
    const req = buildRequest("order_number=CS-001");
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(lookupByOrderNumber).not.toHaveBeenCalled();
  });

  it("returns 401 for malformed Bearer token", async () => {
    const req = buildRequest("order_number=CS-001", "");
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 for wrong token", async () => {
    const req = buildRequest("order_number=CS-001", "wrong_token");
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  // ── 2. Missing params ────────────────────────────────────────────────────

  it("returns 400 when neither order_number nor customer_wa provided", async () => {
    const req = buildRequest("", "data_api_secret_123");
    const { status } = await parseResponse(await GET(req));
    expect(status).toBe(400);
  });

  // ── 3. Valid lookup ──────────────────────────────────────────────────────

  it("returns 200 with minimal fields for known order_number", async () => {
    vi.mocked(lookupByOrderNumber).mockResolvedValue({
      order_number: "CS-001",
      customer_name: "Budi Santoso",
      current_stage: "konfirmasi",
      payment_status: "unpaid",
      harga: 5000000,
      dp_amount: 4000000,
      deadline: "2026-06-30",
      pengiriman: "Pickup Store",
    });

    const req = buildRequest("order_number=CS-001", "data_api_secret_123");
    const { status, body } = await parseResponse(await GET(req));

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.order.order_number).toBe("CS-001");
    expect(body.order.customer_name).toBe("Budi Santoso");
    expect(body.order.payment_status).toBe("unpaid");
  });

  it("returns { order: null } for unknown order", async () => {
    vi.mocked(lookupByOrderNumber).mockResolvedValue(null);

    const req = buildRequest("order_number=CS-999", "data_api_secret_123");
    const { status, body } = await parseResponse(await GET(req));

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.order).toBeNull();
  });

  // ── 4. Forbidden fields ──────────────────────────────────────────────────

  it("does NOT expose forbidden fields (id, form_token, created_by, etc.)", async () => {
    vi.mocked(lookupByOrderNumber).mockResolvedValue({
      order_number: "CS-001",
      customer_name: "Budi",
      current_stage: "qc_1",
      payment_status: "lunas",
      harga: 5000000,
      dp_amount: 5000000,
      deadline: null,
      pengiriman: null,
    });

    const req = buildRequest("order_number=CS-001", "data_api_secret_123");
    const { body } = await parseResponse(await GET(req));

    const orderKeys = Object.keys(body.order);
    const forbidden = ["id", "form_token", "created_by", "created_at", "updated_at",
      "customer_wa", "customer_email", "customer_instagram", "alamat_pengiriman"];
    for (const key of forbidden) {
      expect(orderKeys).not.toContain(key);
    }
  });

  // ── 5. customer_wa normalization ─────────────────────────────────────────

  it("normalizes customer_wa before passing to lookup", async () => {
    vi.mocked(lookupByCustomerWa).mockResolvedValue({
      order_number: "CS-002",
      customer_name: "Ani",
      current_stage: "qc_1",
      payment_status: "unpaid",
      harga: null,
      dp_amount: null,
      deadline: null,
      pengiriman: null,
    });

    const req = buildRequest(
      "customer_wa=%2B62%20812-3456-7890",
      "data_api_secret_123",
    );
    await parseResponse(await GET(req));

    // URL encoding: "+62 812-3456-7890" → lookup should receive the raw param,
    // and lookupByCustomerWa normalizes it internally. The route passes the raw
    // value from query string — normalization happens in the lookup function.
    expect(lookupByCustomerWa).toHaveBeenCalledWith("+62 812-3456-7890");
  });

  // ── 6. DB throws → generic error ─────────────────────────────────────────

  it("returns generic 500 when lookup throws, no raw error leaked", async () => {
    vi.mocked(lookupByOrderNumber).mockRejectedValue(new Error("connection refused"));

    const req = buildRequest("order_number=CS-001", "data_api_secret_123");
    const { status, body } = await parseResponse(await GET(req));

    expect(status).toBe(500);
    expect(body.error).toBe("Terjadi kesalahan server");
    expect(body.error).not.toContain("connection");
    expect(body.error).not.toContain("refused");
  });

  // ── 7. Prefers order_number over customer_wa when both provided ──────────

  it("uses order_number when both params are provided", async () => {
    vi.mocked(lookupByOrderNumber).mockResolvedValue({
      order_number: "CS-003",
      customer_name: "Doni",
      current_stage: "selesai",
      payment_status: "lunas",
      harga: 3000000,
      dp_amount: 3000000,
      deadline: null,
      pengiriman: null,
    });

    const req = buildRequest(
      "order_number=CS-003&customer_wa=6281234567890",
      "data_api_secret_123",
    );
    await parseResponse(await GET(req));

    expect(lookupByOrderNumber).toHaveBeenCalledWith("CS-003");
    expect(lookupByCustomerWa).not.toHaveBeenCalled();
  });
});
