import { describe, expect, it } from "vitest";
import { compareValues, filterRows, sortRows } from "@/lib/table";

describe("compareValues", () => {
  it("orders numbers numerically", () => {
    expect(compareValues(9, 10)).toBeLessThan(0);
  });
  it("orders strings case-insensitively with embedded numbers", () => {
    expect(compareValues("apc", "Levi's")).toBeLessThan(0);
    expect(compareValues("W9", "W10")).toBeLessThan(0);
  });
  it("orders ISO dates chronologically", () => {
    expect(compareValues("2024-12-31", "2025-01-01")).toBeLessThan(0);
  });
});

describe("sortRows", () => {
  const rows = [
    { id: "a", n: 2 as number | null },
    { id: "b", n: null },
    { id: "c", n: 10 },
    { id: "d", n: 2 },
  ];
  const ids = (r: typeof rows) => r.map((x) => x.id).join("");

  it("sorts ascending with blanks last", () => {
    expect(ids(sortRows(rows, (r) => r.n, "asc"))).toBe("adcb");
  });
  it("sorts descending with blanks still last and ties in original order", () => {
    expect(ids(sortRows(rows, (r) => r.n, "desc"))).toBe("cadb");
  });
  it("treats empty strings as blank", () => {
    const s = [{ v: "" }, { v: "b" }, { v: "a" }];
    expect(sortRows(s, (r) => r.v, "asc").map((r) => r.v)).toEqual(["a", "b", ""]);
  });
  it("does not mutate the input", () => {
    sortRows(rows, (r) => r.n, "desc");
    expect(ids(rows)).toBe("abcd");
  });
});

describe("filterRows", () => {
  const rows = [
    { status: "active", text: "Levi's 501 indigo" },
    { status: "retired", text: "Levi's 505 black" },
    { status: "active", text: "APC Petit Standard indigo" },
  ];
  const all = new Set(["active", "retired", "sold"]);
  const text = (r: (typeof rows)[number]) => r.text;

  it("returns everything for an empty query", () => {
    expect(filterRows(rows, { query: "  ", statuses: all }, text)).toHaveLength(3);
  });
  it("requires every term, ignoring case", () => {
    expect(filterRows(rows, { query: "LEVI indigo", statuses: all }, text)).toEqual([rows[0]]);
  });
  it("filters by status", () => {
    expect(filterRows(rows, { query: "", statuses: new Set(["retired"]) }, text)).toEqual([rows[1]]);
  });
  it("combines status and query", () => {
    expect(filterRows(rows, { query: "levi", statuses: new Set(["active"]) }, text)).toEqual([rows[0]]);
  });
});
