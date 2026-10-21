import { describe, expect, it } from "vitest";
import { jeanSchema, measurementSchema, signupSchema } from "@/lib/validators";

describe("validators", () => {
  it("applies jean defaults", () => {
    const j = jeanSchema.parse({ brand: "A", name: "B", tagSize: "32x32" });
    expect(j.initialWearCount).toBe(0);
    expect(j.status).toBe("active");
  });
  it("rejects negative initial counts", () => {
    expect(
      jeanSchema.safeParse({ brand: "A", name: "B", tagSize: "32", initialWearCount: -1 }).success,
    ).toBe(false);
  });
  it("requires ISO measurement dates", () => {
    expect(measurementSchema.safeParse({ measuredOn: "1/2/24" }).success).toBe(false);
  });
  it("normalizes email and enforces password length", () => {
    expect(signupSchema.parse({ email: " A@B.com ", password: "12345678" }).email).toBe("a@b.com");
    expect(signupSchema.safeParse({ email: "a@b.com", password: "short" }).success).toBe(false);
  });
});
