"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/client";

export type JeanValues = {
  brand?: string; name?: string; fit?: string | null; color?: string | null;
  tagSize?: string; purchasePrice?: number | null; purchaseDate?: string | null;
  purchasedUsed?: boolean; initialWashCount?: number; initialWearCount?: number;
  status?: string; retiredDate?: string | null; notes?: string | null;
};

export function JeanForm({ id, initial = {} }: { id?: string; initial?: JeanValues }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setFieldErrors({});
    const f = new FormData(e.currentTarget);
    const str = (k: string) => String(f.get(k) ?? "").trim() || null;
    const num = (k: string) => (str(k) == null ? null : Number(str(k)));
    const body = {
      brand: str("brand"), name: str("name"), fit: str("fit"), color: str("color"),
      tagSize: str("tagSize"), purchasePrice: num("purchasePrice"),
      purchaseDate: str("purchaseDate"), purchasedUsed: f.get("purchasedUsed") === "on",
      initialWashCount: num("initialWashCount") ?? 0, initialWearCount: num("initialWearCount") ?? 0,
      status: str("status") ?? "active", retiredDate: str("retiredDate"), notes: str("notes"),
    };
    try {
      const saved = await api<{ id: string }>(id ? `/api/jeans/${id}` : "/api/jeans", {
        method: id ? "PATCH" : "POST", body,
      });
      router.push(`/jeans/${saved.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors((err.details as Record<string, string[]>) ?? {});
      }
      setBusy(false);
    }
  }

  const field = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} className="input"
        defaultValue={(initial as Record<string, unknown>)[name] as string ?? ""} {...props} />
      {fieldErrors[name] && <p className="mt-1 text-xs text-danger">{fieldErrors[name][0]}</p>}
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="card grid gap-4 sm:grid-cols-2">
      {field("brand", "Brand", { required: true })}
      {field("name", "Model / name", { required: true })}
      {field("tagSize", "Tag size (e.g. 32x32)", { required: true })}
      {field("fit", "Fit")}
      {field("color", "Color / wash")}
      {field("purchasePrice", "Purchase price", { type: "number", step: "0.01", min: 0 })}
      {field("purchaseDate", "Purchase date", { type: "date" })}
      <div>
        <label className="label" htmlFor="status">Status</label>
        <select id="status" name="status" className="input" defaultValue={initial.status ?? "active"}>
          <option value="active">Active</option>
          <option value="retired">Retired</option>
          <option value="sold">Sold</option>
        </select>
      </div>
      {field("initialWearCount", "Wears before tracking", { type: "number", min: 0, defaultValue: initial.initialWearCount ?? 0 })}
      {field("initialWashCount", "Washes before tracking", { type: "number", min: 0, defaultValue: initial.initialWashCount ?? 0 })}
      {field("retiredDate", "Retired / sold date", { type: "date" })}
      <label className="flex items-center gap-2 self-end text-sm">
        <input type="checkbox" name="purchasedUsed" defaultChecked={initial.purchasedUsed} /> Bought used
      </label>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={3} className="input" defaultValue={initial.notes ?? ""} />
      </div>
      {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn btn-primary" disabled={busy}>{id ? "Save changes" : "Add jeans"}</button>
        <button type="button" className="btn" onClick={() => router.back()}>Cancel</button>
      </div>
    </form>
  );
}
