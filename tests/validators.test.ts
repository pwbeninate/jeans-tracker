import { describe, expect, it } from "vitest";
import { jeanSchema, measurementSchema, photoPatchSchema, photoSchema, signupSchema } from "@/lib/validators";

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
  it("validates photo registrations", () => {
    const ok = { url: "https://x.public.blob.vercel-storage.com/a.jpg", pathname: "a.jpg", takenOn: "2025-01-01" };
    expect(photoSchema.safeParse(ok).success).toBe(true);
    expect(photoSchema.safeParse({ ...ok, url: "not a url" }).success).toBe(false);
    expect(photoSchema.safeParse({ ...ok, takenOn: "Jan 1" }).success).toBe(false);
  });
  it("only allows setting a photo as cover, not unsetting", () => {
    expect(photoPatchSchema.safeParse({ isCover: true }).success).toBe(true);
    expect(photoPatchSchema.safeParse({ isCover: false }).success).toBe(false);
  });
});
