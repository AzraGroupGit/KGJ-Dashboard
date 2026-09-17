import { describe, expect, it } from "vitest";
import { canAccessPath, getDashboardPath } from "@/lib/routes";

describe("customer service supervisor role", () => {
  it("mengarah ke dashboard supervisor", () => {
    expect(getDashboardPath("customer_service_supervisor")).toBe(
      "/dashboard/supervisor/bottleneck",
    );
  });

  it("hanya dapat mengakses dashboard supervisor", () => {
    expect(
      canAccessPath(
        "customer_service_supervisor",
        "/dashboard/supervisor/approval",
      ),
    ).toBe(true);
    expect(
      canAccessPath(
        "customer_service_supervisor",
        "/dashboard/management",
      ),
    ).toBe(false);
  });
});
