import { describe, expect, it } from "vitest";
import { canAccessPath, getDashboardPath, isWorkshopRole } from "@/lib/routes";

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

describe("retired CS and marketing dashboards", () => {
  it("does not give retired roles a dashboard or workshop access", () => {
    expect(getDashboardPath("customer_service")).toBeNull();
    expect(getDashboardPath("marketing")).toBeNull();
    expect(isWorkshopRole("customer_service")).toBe(false);
    expect(canAccessPath("marketing", "/workshop/input")).toBe(false);
  });
});
