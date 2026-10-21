import { describe, expect, it } from "vitest";
import { ageOf, coverFor, deltaFromOriginal, statsFor } from "@/lib/derive";

const jean = {
  purchasePrice: "120.00",
  purchaseDate: "2024-01-15",
  initialWashCount: 2,
  initialWearCount: 10,
};

describe("ageOf", () => {
  it("formats years and months", () => {
    expect(ageOf("2024-01-15", "2025-04-20")?.label).toBe("1y 3m");
  });
  it("does not count a partial month", () => {
    expect(ageOf("2024-01-15", "2024-02-14")?.label).toBe("30d");
  });
  it("returns null without a purchase date", () => {
    expect(ageOf(null)).toBeNull();
  });
});

describe("statsFor", () => {
  it("includes initial counts in totals", () => {
    const s = statsFor(jean, ["2025-01-01", "2025-01-02"], ["2025-01-03"]);
    expect(s.totalWears).toBe(12);
    expect(s.totalWashes).toBe(3);
  });
  it("counts wears after the last wash", () => {
    const s = statsFor(jean, ["2025-01-01", "2025-01-05"], ["2025-01-03"]);
    expect(s.wearsSinceWash).toBe(1);
    expect(s.lastWashed).toBe("2025-01-03");
    expect(s.lastWorn).toBe("2025-01-05");
  });
  it("computes cost per wear", () => {
    expect(statsFor(jean, ["2025-01-01", "2025-01-02"], []).costPerWear).toBe(10);
  });
});

describe("deltaFromOriginal", () => {
  const base = {
    waist: 32, rise: null, inseam: 32, thigh: null, knee: null, legOpening: null, hip: null,
    measuredOn: "2024-01-15", isOriginal: true,
  };
  it("computes latest minus original", () => {
    const latest = { ...base, waist: 31.5, isOriginal: false, measuredOn: "2025-01-01" };
    const d = deltaFromOriginal(base, latest);
    expect(d?.waist).toBe(-0.5);
    expect(d?.rise).toBeNull();
  });
  it("is null when only the original exists", () => {
    expect(deltaFromOriginal(base, base)).toBeNull();
  });
});

describe("coverFor", () => {
  const at = (takenOn: string, isCover = false, created = "2025-01-01T00:00:00Z") =>
    ({ takenOn, isCover, createdAt: new Date(created) });
  it("prefers the chosen cover", () => {
    const cover = at("2024-01-01", true);
    expect(coverFor([at("2025-06-01"), cover])).toBe(cover);
  });
  it("falls back to the most recent photo", () => {
    const newest = at("2025-06-01");
    expect(coverFor([at("2024-01-01"), newest, at("2025-01-01")])).toBe(newest);
  });
  it("breaks same-day ties by upload time", () => {
    const later = at("2025-06-01", false, "2025-06-01T12:00:00Z");
    expect(coverFor([at("2025-06-01"), later])).toBe(later);
  });
  it("is null without photos", () => {
    expect(coverFor([])).toBeNull();
  });
});
