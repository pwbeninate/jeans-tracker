"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { api, fetcher, money, today } from "@/lib/client";

type Jean = {
  id: string;
  brand: string;
  name: string;
  tagSize: string;
  status: "active" | "retired" | "sold";
  purchasePrice: number | null;
  age: { days: number; label: string } | null;
  totalWears: number;
  totalWashes: number;
  wearsSinceWash: number;
  lastWorn: string | null;
  costPerWear: number | null;
  coverUrl: string | null;
};

export default function CollectionPage() {
  const [status, setStatus] = useState("active");
  const [sort, setSort] = useState("lastWorn");
  const qs = new URLSearchParams({ sort, ...(status ? { status } : {}) });
  const { data, error, isLoading, mutate } = useSWR<Jean[]>(`/api/jeans?${qs}`, fetcher);

  async function quickLog(id: string, kind: "wears" | "washes") {
    const body = kind === "wears" ? { wornOn: today() } : { washedOn: today() };
    await api(`/api/jeans/${id}/${kind}`, { method: "POST", body });
    mutate();
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status filter">
            <option value="active">Active</option>
            <option value="retired">Retired</option>
            <option value="sold">Sold</option>
            <option value="">All</option>
          </select>
          <select className="input !w-auto" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            <option value="lastWorn">Last worn</option>
            <option value="wears">Most worn</option>
            <option value="age">Oldest</option>
            <option value="name">Name</option>
          </select>
        </div>
        <Link href="/jeans/new" className="btn btn-primary">+ Add jeans</Link>
      </div>

      {error && <p className="text-danger">Failed to load.</p>}
      {isLoading && <p className="text-muted">Loading…</p>}
      {data && data.length === 0 && (
        <div className="card text-center text-muted">
          No jeans here yet. <Link className="underline" href="/jeans/new">Add your first pair</Link>.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((j) => (
          <div key={j.id} className="card flex flex-col gap-3">
            <Link href={`/jeans/${j.id}`} className="block">
              {j.coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={j.coverUrl} alt="" loading="lazy" className="mb-3 aspect-[4/3] w-full rounded-lg object-cover" />
              )}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted">{j.brand}</p>
                  <p className="font-medium">{j.name}</p>
                </div>
                <span className="badge">{j.tagSize}</span>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <Stat label="Wears" value={j.totalWears} />
                <Stat label="Since wash" value={j.wearsSinceWash} />
                <Stat label="Age" value={j.age?.label ?? "—"} />
              </dl>
              <p className="mt-2 text-xs text-muted">
                {j.totalWashes} washes · {j.costPerWear != null ? `${money(j.costPerWear)}/wear` : "no price"}
                {j.status !== "active" && ` · ${j.status}`}
              </p>
            </Link>
            {j.status === "active" && (
              <div className="flex gap-2">
                <button className="btn flex-1" onClick={() => quickLog(j.id, "wears")}>Wore today</button>
                <button className="btn flex-1" onClick={() => quickLog(j.id, "washes")}>Washed today</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-lg font-semibold">{value}</dd>
    </div>
  );
}
