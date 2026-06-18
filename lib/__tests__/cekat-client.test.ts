import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendTemplate } from "@/lib/cekat/client";

// ── Helpers ────────────────────────────────────────────────────────────────────

function setEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

function mockFetchResponse(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

beforeEach(() => {
  setEnv("CEKAT_API_KEY", "ck_test_key");
  setEnv("CEKAT_BASE_URL", "https://api.cekat.ai");
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("sendTemplate", () => {
  it("returns error when CEKAT_API_KEY is missing", async () => {
    setEnv("CEKAT_API_KEY", undefined);
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await sendTemplate({
      customer_wa: "6281234567890",
      template_name: "order_created",
      template_params: { name: "Test" },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("CEKAT_API_KEY");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("returns error when CEKAT_BASE_URL is missing", async () => {
    setEnv("CEKAT_BASE_URL", undefined);

    const result = await sendTemplate({
      customer_wa: "6281234567890",
      template_name: "order_created",
      template_params: { name: "Test" },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("CEKAT_BASE_URL");
  });

  it("returns error when both credentials are missing", async () => {
    setEnv("CEKAT_API_KEY", undefined);
    setEnv("CEKAT_BASE_URL", undefined);

    const result = await sendTemplate({
      customer_wa: "6281234567890",
      template_name: "order_created",
      template_params: { name: "Test" },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("CEKAT_API_KEY");
    expect(result.error).toContain("CEKAT_BASE_URL");
  });

  it("returns success with mapped fields on 2xx response", async () => {
    const mockFetch = mockFetchResponse({
      data: { conversation_id: "conv_abc", message_id: "msg_123" },
    }, 200);
    vi.stubGlobal("fetch", mockFetch);

    const result = await sendTemplate({
      customer_wa: "6281234567890",
      template_name: "order_created",
      template_params: { customer_name: "Budi" },
    });

    expect(result.success).toBe(true);
    expect(result.conversation_id).toBe("conv_abc");
    expect(result.message_id).toBe("msg_123");
  });

  it("returns error on 4xx Cekat response", async () => {
    const mockFetch = mockFetchResponse({
      error: { message: "Template not found" },
    }, 404);
    vi.stubGlobal("fetch", mockFetch);

    const result = await sendTemplate({
      customer_wa: "6281234567890",
      template_name: "order_created",
      template_params: {},
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Template not found");
  });

  it("returns error on 5xx Cekat response", async () => {
    const mockFetch = mockFetchResponse({}, 500);
    vi.stubGlobal("fetch", mockFetch);

    const result = await sendTemplate({
      customer_wa: "6281234567890",
      template_name: "order_created",
      template_params: {},
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("HTTP 500");
  });

  it("returns error on network failure, does not throw", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    const result = await sendTemplate({
      customer_wa: "6281234567890",
      template_name: "order_created",
      template_params: {},
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Network error");
  });

  it("normalizes customer_wa before building request", async () => {
    let capturedBody: string | null = null;
    const mockFetch = vi.fn().mockImplementation(async (req: Request) => {
      capturedBody = await req.text();
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: { conversation_id: "conv_x", message_id: "msg_y" } }),
      };
    });
    vi.stubGlobal("fetch", mockFetch);

    await sendTemplate({
      customer_wa: "+62 812-3456-7890",
      template_name: "order_created",
      template_params: { name: "Test" },
    });

    expect(capturedBody).not.toBeNull();
    const parsed = JSON.parse(capturedBody!);
    expect(parsed.to).toBe("6281234567890");
  });

  it(`sends the expected auth header and request body shape`, async () => {
    let capturedReq: Request | null = null;
    const mockFetch = vi.fn().mockImplementation(async (req: Request) => {
      capturedReq = req;
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: { conversation_id: "conv_z", message_id: "msg_w" } }),
      };
    });
    vi.stubGlobal("fetch", mockFetch);

    await sendTemplate({
      customer_wa: "6281234567890",
      template_name: "order_created",
      template_params: { customer_name: "Budi", order_number: "CS-001" },
      conversation_id: "conv_existing",
    });

    expect(capturedReq).not.toBeNull();
    expect(capturedReq!.url).toContain("/v1/templates/send");
    expect(capturedReq!.headers.get("X-API-Key")).toBe("ck_test_key");
    expect(capturedReq!.headers.get("Content-Type")).toBe("application/json");

    const body = JSON.parse(await capturedReq!.text());
    // ASSUMPTION: template_id, to, parameters, conversation_id — confirm with Cekat
    expect(body.template_id).toBeDefined();
    expect(body.to).toBe("6281234567890");
    expect(body.parameters).toEqual({ customer_name: "Budi", order_number: "CS-001" });
    expect(body.conversation_id).toBe("conv_existing");
  });

  it("documents that Cekat response without data wrapper results in undefined fields", async () => {
    // ASSUMPTION: Cekat wraps results in a `data` object.
    // If Cekat returns flat JSON instead, conversation_id/message_id will be undefined.
    const mockFetch = mockFetchResponse({
      success: true,
      conversation_id: "conv_no_data",
      message_id: "msg_no_data",
    }, 200);
    vi.stubGlobal("fetch", mockFetch);

    const result = await sendTemplate({
      customer_wa: "6281234567890",
      template_name: "shipping_update",
      template_params: {},
    });

    expect(result.success).toBe(true);
    expect(result.conversation_id).toBeUndefined();
    expect(result.message_id).toBeUndefined();
  });
});
