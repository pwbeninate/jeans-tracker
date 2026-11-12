export type SortDir = "asc" | "desc";
export type SortValue = string | number | boolean | null | undefined;

const isBlank = (v: SortValue) => v == null || v === "";

/** Ascending comparison of two non-blank values. */
export function compareValues(a: SortValue, b: SortValue): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

/** Stable sort into a new array. Blank values go last in both directions. */
export function sortRows<T>(rows: T[], value: (row: T) => SortValue, dir: SortDir): T[] {
  const sign = dir === "asc" ? 1 : -1;
  return rows
    .map((row, i) => ({ row, i, v: value(row) }))
    .sort((x, y) => {
      const xb = isBlank(x.v);
      const yb = isBlank(y.v);
      if (xb || yb) return xb === yb ? x.i - y.i : xb ? 1 : -1;
      return sign * compareValues(x.v, y.v) || x.i - y.i;
    })
    .map((e) => e.row);
}

/** Keeps rows whose status is selected and whose search text contains every term of the query. */
export function filterRows<T extends { status: string }>(
  rows: T[],
  filter: { query: string; statuses: ReadonlySet<string> },
  searchText: (row: T) => string,
): T[] {
  const terms = filter.query.toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter((row) => {
    if (!filter.statuses.has(row.status)) return false;
    if (terms.length === 0) return true;
    const text = searchText(row).toLowerCase();
    return terms.every((t) => text.includes(t));
  });
}
