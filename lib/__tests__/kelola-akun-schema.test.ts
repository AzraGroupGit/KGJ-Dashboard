import { describe, expect, it } from "vitest";
import { SupervisorUserSchema } from "@/lib/schemas/kelola-akun";

describe("supervisor account schema", () => {
  it("menerima role supervisor customer service", () => {
    expect(
      SupervisorUserSchema.safeParse({
        username: "spv.cs",
        full_name: "SPV Customer Service",
        email: "spv.cs@example.com",
        password: "rahasia-aman",
        role: "customer_service_supervisor",
      }).success,
    ).toBe(true);
  });
});
