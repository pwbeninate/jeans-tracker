import { describe, expect, it } from "vitest";
import {
  jeanPatchSchema,
  measurementPatchSchema,
  washPatchSchema,
  wearPatchSchema,
  jeanSchema, measurementSchema, photoPatchSchema, photoSchema, passwordChangeSchema, signupSchema } from "@/lib/validators";

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

describe("new passwords", () => {
  it("rejects passwords bcrypt would truncate", () => {
    expect(signupSchema.safeParse({ email: "a@b.co", password: "x".repeat(73) }).success).toBe(false);
    expect(signupSchema.safeParse({ email: "a@b.co", password: "é".repeat(37) }).success).toBe(false);
    expect(signupSchema.safeParse({ email: "a@b.co", password: "x".repeat(72) }).success).toBe(true);
  });
  it("applies the same rule when changing a password", () => {
    const r = passwordChangeSchema.safeParse({ currentPassword: "old", newPassword: "x".repeat(73) });
    expect(r.success).toBe(false);
  });
});

describe("patch schemas", () => {
  it("leave omitted fields out instead of filling in defaults", () => {
    expect(jeanPatchSchema.parse({ notes: "x" })).toEqual({ notes: "x" });
    expect(measurementPatchSchema.parse({ waist: 30 })).toEqual({ waist: 30 });
  });
  it("still accept the fields that have create-time defaults", () => {
    expect(jeanPatchSchema.parse({ status: "sold", initialWearCount: 3 })).toEqual({
      status: "sold",
      initialWearCount: 3,
    });
    expect(measurementPatchSchema.parse({ isOriginal: true })).toEqual({ isOriginal: true });
  });
  it("reject an empty body", () => {
    for (const s of [jeanPatchSchema, measurementPatchSchema, washPatchSchema, wearPatchSchema]) {
      expect(s.safeParse({}).success).toBe(false);
    }
  });
  it("keep create-time defaults on the create schemas", () => {
    expect(jeanSchema.parse({ brand: "A", name: "B", tagSize: "32" })).toMatchObject({
      status: "active",
      purchasedUsed: false,
      initialWashCount: 0,
      initialWearCount: 0,
    });
  });
});
