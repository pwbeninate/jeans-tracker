"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import useSWR from "swr";
import { fetcher, money } from "@/lib/client";
import { filterRows, sortRows, type SortDir, type SortValue } from "@/lib/table";

const STATUSES = ["active", "retired", "sold"] as const;
type Status = (typeof STATUSES)[number];

type Jean = {
  id: string;
  brand: string;
  name: string;
  fit: string | null;
  color: string | null;
  tagSize: string;
  status: Status;
  purchasePrice: number | null;
  purchaseDate: string | null;
  purchasedUsed: boolean;
  retiredDate: string | null;
  notes: string | null;
  age: { days: number; label: string } | null;
  totalWears: number;
  totalWashes: number;
  wearsSinceWash: number;
  lastWorn: string | null;
  lastWashed: string | null;
  costPerWear: number | null;
};

type Column = {
  key: string;
  label: string;
  /** Value used for sorting, and for display when `render` is absent. */
  value: (j: Jean) => SortValue;
  render?: (j: Jean) => ReactNode;
  numeric?: boolean;
  hidden?: boolean;
  total?: (rows: Jean[]) => ReactNode;
};

const DASH = "—";
const date = (iso: string | null) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : DASH;
const sum = (rows: Jean[], f: (j: Jean) => number | null) =>
  rows.reduce((n, j) => n + (f(j) ?? 0), 0);

const COLUMNS: Column[] = [
  { key: "brand", label: "Brand", value: (j) => j.brand },
  {
    key: "name",
    label: "Name",
    value: (j) => j.name,
    render: (j) => <Link href={`/jeans/${j.id}`} className="font-medium underline-offset-2 hover:underline">{j.name}</Link>,
  },
  { key: "fit", label: "Fit", value: (j) => j.fit },
  { key: "color", label: "Color", value: (j) => j.color },
  { key: "tagSize", label: "Size", value: (j) => j.tagSize },
  { key: "status", label: "Status", value: (j) => j.status, render: (j) => <span className="badge">{j.status}</span> },
  { key: "purchaseDate", label: "Purchased", value: (j) => j.purchaseDate, render: (j) => date(j.purchaseDate) },
  { key: "age", label: "Age", value: (j) => j.age?.days, render: (j) => j.age?.label ?? DASH, numeric: true },
  {
    key: "purchasePrice",
    label: "Price",
    value: (j) => j.purchasePrice,
    render: (j) => money(j.purchasePrice),
    numeric: true,
    total: (rows) => money(sum(rows, (j) => j.purchasePrice)),
  },
  { key: "totalWears", label: "Wears", value: (j) => j.totalWears, numeric: true, total: (rows) => sum(rows, (j) => j.totalWears) },
  { key: "totalWashes", label: "Washes", value: (j) => j.totalWashes, numeric: true, total: (rows) => sum(rows, (j) => j.totalWashes) },
  { key: "wearsSinceWash", label: "Since wash", value: (j) => j.wearsSinceWash, numeric: true },
  { key: "costPerWear", label: "Cost/wear", value: (j) => j.costPerWear, render: (j) => money(j.costPerWear), numeric: true },
  { key: "lastWorn", label: "Last worn", value: (j) => j.lastWorn, render: (j) => date(j.lastWorn) },
  { key: "lastWashed", label: "Last washed", value: (j) => j.lastWashed, render: (j) => date(j.lastWashed) },
  { key: "purchasedUsed", label: "Used", value: (j) => j.purchasedUsed, render: (j) => (j.purchasedUsed ? "Yes" : "No"), hidden: true },
  { key: "retiredDate", label: "Retired", value: (j) => j.retiredDate, render: (j) => date(j.retiredDate), hidden: true },
  {
    key: "notes",
    label: "Notes",
    value: (j) => j.notes,
    render: (j) => (j.notes ? <span className="block max-w-xs truncate" title={j.notes}>{j.notes}</span> : DASH),
    hidden: true,
  },
];

const searchText = (j: Jean) =>
  [j.brand, j.name, j.fit, j.color, j.tagSize, j.notes].filter(Boolean).join(" ");

const STORAGE_KEY = "jeans-table:columns";
type Sort = { key: string; dir: SortDir } | null;

export function JeansTable() {
  const { data, error, isLoading } = useSWR<Jean[]>("/api/jeans", fetcher);
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<ReadonlySet<string>>(new Set(STATUSES));
  const [sort, setSort] = useState<Sort>({ key: "brand", dir: "asc" });
  /** Per-column visibility chosen by the user; columns not listed use their default. */
  const [shown, setShown] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
      if (saved && typeof saved === "object") setShown(saved);
    } catch {
      // Unreadable saved state: keep the defaults.
    }
  }, []);

  const columns = COLUMNS.filter((c) => shown[c.key] ?? !c.hidden);

  const rows = useMemo(() => {
    const filtered = filterRows(data ?? [], { query, statuses }, searchText);
    const col = sort && COLUMNS.find((c) => c.key === sort.key);
    return col && sort ? sortRows(filtered, col.value, sort.dir) : filtered;
  }, [data, query, statuses, sort]);

  function toggleSort(key: string) {
    setSort((s) =>
      s?.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null,
    );
  }

  function toggleStatus(status: Status) {
    setStatuses((prev) => {
      const next = new Set(prev);
      if (!next.delete(status)) next.add(status);
      return next;
    });
  }

  function toggleColumn(c: Column) {
    const next = { ...shown, [c.key]: !(shown[c.key] ?? !c.hidden) };
    setShown(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable: the choice just won't persist.
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          className="input !w-64 max-w-full"
          placeholder="Search brand, name, fit, color…"
          aria-label="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex gap-1" role="group" aria-label="Status filter">
          {STATUSES.map((s) => (
            <button
              key={s}
              className={`btn capitalize ${statuses.has(s) ? "btn-primary" : ""}`}
              aria-pressed={statuses.has(s)}
              onClick={() => toggleStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <details className="relative">
          <summary className="btn cursor-pointer list-none">Columns</summary>
          <div className="card absolute left-0 z-20 mt-1 grid w-44 gap-1.5 text-sm shadow-lg">
            {COLUMNS.map((c) => (
              <label key={c.key} className="flex items-center gap-2">
                <input type="checkbox" checked={columns.includes(c)} onChange={() => toggleColumn(c)} />
                {c.label}
              </label>
            ))}
          </div>
        </details>
        {data && (
          <p className="ml-auto text-sm text-muted">
            {rows.length} of {data.length} pairs
          </p>
        )}
      </div>

      {error && <p className="text-danger">Failed to load.</p>}
      {isLoading && <p className="text-muted">Loading…</p>}
      {data && data.length === 0 && (
        <div className="card text-center text-muted">
          No jeans here yet. <Link className="underline" href="/jeans/new">Add your first pair</Link>.
        </div>
      )}

      {data && data.length > 0 && (
        <div className="card max-h-[75vh] overflow-auto !p-0">
          <table className="w-full border-collapse whitespace-nowrap text-sm">
            <thead>
              <tr>
                {columns.map((c) => {
                  const dir = sort?.key === c.key ? sort.dir : null;
                  return (
                    <th
                      key={c.key}
                      scope="col"
                      aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}
                      className="sticky top-0 z-10 border-b border-border bg-surface p-0 text-xs font-medium text-muted"
                    >
                      <button
                        className={`flex w-full items-center gap-1 px-3 py-2 hover:text-foreground ${c.numeric ? "justify-end" : ""} ${dir ? "text-foreground" : ""}`}
                        onClick={() => toggleSort(c.key)}
                      >
                        {c.label}
                        <span aria-hidden className="w-3 text-left">{dir === "asc" ? "↑" : dir === "desc" ? "↓" : ""}</span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((j) => (
                <tr key={j.id} className="border-b border-border last:border-0 hover:bg-background">
                  {columns.map((c) => (
                    <td key={c.key} className={`px-3 py-2 ${c.numeric ? "pr-7 text-right tabular-nums" : ""}`}>
                      {c.render ? c.render(j) : (c.value(j) ?? DASH)}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-8 text-center text-muted">
                    No pairs match these filters.
                  </td>
                </tr>
              )}
            </tbody>
            {rows.length > 0 && columns.some((c) => c.total) && (
              <tfoot>
                <tr className="font-medium">
                  {columns.map((c, i) => (
                    <td
                      key={c.key}
                      className={`sticky bottom-0 border-t border-border bg-surface px-3 py-2 ${c.numeric ? "pr-7 text-right tabular-nums" : ""}`}
                    >
                      {c.total ? c.total(rows) : i === 0 ? "Totals" : ""}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </>
  );
}
