"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { MeasurementChart } from "@/components/measurement-chart";
import { PhotoUpload } from "@/components/photo-upload";
import { api, ApiError, fetcher, money, today } from "@/lib/client";
import { DIMENSIONS } from "@/lib/validators";

type Detail = {
  id: string; brand: string; name: string; fit: string | null; color: string | null;
  tagSize: string; purchasePrice: number | null; purchaseDate: string | null;
  status: string; notes: string | null; purchasedUsed: boolean;
  age: { label: string } | null; totalWears: number; totalWashes: number;
  wearsSinceWash: number; lastWorn: string | null; lastWashed: string | null;
  costPerWear: number | null;
  shrinkage: Record<string, number | null> | null;
  coverUrl: string | null; photoCount: number;
};
type M = { id: string; measuredOn: string; isOriginal: boolean; notes: string | null } & Record<string, unknown>;
type Photo = { id: string; url: string; takenOn: string; caption: string | null; isCover: boolean };
type Log = { id: string; notes: string | null; method?: string | null; wornOn?: string; washedOn?: string };

const LABEL: Record<string, string> = {
  waist: "Waist", rise: "Rise", inseam: "Inseam", thigh: "Thigh",
  knee: "Knee", legOpening: "Opening", hip: "Hip",
};

export default function JeanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<"measurements" | "washes" | "wears" | "photos">("measurements");
  const { data: jean, error, mutate } = useSWR<Detail>(`/api/jeans/${id}`, fetcher);

  if (error) return <p className="text-danger">Not found. <Link className="underline" href="/">Back</Link></p>;
  if (!jean) return <p className="text-muted">Loading…</p>;

  async function remove() {
    if (!confirm("Delete this pair and all its logs?")) return;
    await api(`/api/jeans/${id}`, { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <Link href="/" className="text-sm text-muted">← Collection</Link>
      <div className="mb-4 mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-4">
          {jean.coverUrl && (
            <button onClick={() => setTab("photos")} aria-label="View photos" className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={jean.coverUrl} alt="" className="h-24 w-18 rounded-lg border border-border object-cover" />
            </button>
          )}
          <div>
            <p className="text-sm text-muted">{jean.brand}</p>
            <h1 className="text-2xl font-semibold">{jean.name} <span className="badge align-middle">{jean.tagSize}</span></h1>
            <p className="text-sm text-muted">
              {[jean.fit, jean.color, jean.status !== "active" && jean.status, jean.purchasedUsed && "bought used"]
                .filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link className="btn" href={`/jeans/${id}/edit`}>Edit</Link>
          <button className="btn btn-danger" onClick={remove}>Delete</button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {[
          ["Age", jean.age?.label ?? "—"], ["Wears", jean.totalWears], ["Washes", jean.totalWashes],
          ["Since wash", jean.wearsSinceWash], ["Paid", money(jean.purchasePrice)],
          ["Per wear", money(jean.costPerWear)],
        ].map(([k, v]) => (
          <div key={k as string} className="card !p-3">
            <p className="text-xs text-muted">{k}</p>
            <p className="text-lg font-semibold">{v}</p>
          </div>
        ))}
      </div>
      {jean.notes && <p className="card mb-4 whitespace-pre-wrap text-sm">{jean.notes}</p>}

      <div className="mb-3 flex gap-1 border-b border-border">
        {(["measurements", "washes", "wears", "photos"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm capitalize ${tab === t ? "border-b-2 border-accent font-medium" : "text-muted"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "measurements" && <Measurements id={id} shrinkage={jean.shrinkage} onChange={mutate} />}
      {tab === "washes" && <LogTab id={id} kind="washes" onChange={mutate} />}
      {tab === "wears" && <LogTab id={id} kind="wears" onChange={mutate} />}
      {tab === "photos" && <Photos id={id} onChange={mutate} />}
    </>
  );
}

function Measurements({ id, shrinkage, onChange }: {
  id: string; shrinkage: Record<string, number | null> | null; onChange: () => void;
}) {
  const { data, mutate } = useSWR<M[]>(`/api/jeans/${id}/measurements`, fetcher);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      measuredOn: f.get("measuredOn"), isOriginal: f.get("isOriginal") === "on",
      notes: String(f.get("notes") || "") || null,
    };
    for (const d of DIMENSIONS) {
      const v = String(f.get(d) || "");
      body[d] = v ? Number(v) : null;
    }
    try {
      await api(`/api/jeans/${id}/measurements`, { method: "POST", body });
      setOpen(false);
      setError("");
      mutate();
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed");
    }
  }

  async function setOriginal(m: M) {
    await api(`/api/measurements/${m.id}`, { method: "PATCH", body: { isOriginal: true } });
    mutate();
    onChange();
  }
  async function del(m: M) {
    if (!confirm("Delete this measurement?")) return;
    await api(`/api/measurements/${m.id}`, { method: "DELETE" });
    mutate();
    onChange();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <button className="btn btn-primary" onClick={() => setOpen(!open)}>
          {open ? "Close" : "+ Add measurements"}
        </button>
      </div>
      {open && (
        <form onSubmit={add} className="card grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="label" htmlFor="measuredOn">Date</label>
            <input id="measuredOn" name="measuredOn" type="date" required defaultValue={today()} className="input" />
          </div>
          {DIMENSIONS.map((d) => (
            <div key={d}>
              <label className="label" htmlFor={d}>{LABEL[d]} (in)</label>
              <input id={d} name={d} type="number" step="0.01" min="0" className="input" />
            </div>
          ))}
          <label className="flex items-center gap-2 self-end text-sm">
            <input type="checkbox" name="isOriginal" /> As purchased
          </label>
          <div className="col-span-2 sm:col-span-4">
            <label className="label" htmlFor="mnotes">Notes</label>
            <input id="mnotes" name="notes" className="input" />
          </div>
          {error && <p className="col-span-full text-sm text-danger">{error}</p>}
          <div className="col-span-full"><button className="btn btn-primary">Save</button></div>
        </form>
      )}

      {data && data.length === 0 && <p className="text-sm text-muted">No measurements yet.</p>}
      {data && data.length > 0 && (
        <>
          <div className="card overflow-x-auto !p-0">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="p-3">Date</th>
                  {DIMENSIONS.map((d) => <th key={d} className="p-3">{LABEL[d]}</th>)}
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {data.map((m) => (
                  <tr key={m.id} className="border-t border-border align-top">
                    <td className="p-3 whitespace-nowrap">
                      {m.measuredOn}
                      {m.isOriginal && <span className="badge ml-2">original</span>}
                      {m.notes && <p className="text-xs text-muted">{m.notes}</p>}
                    </td>
                    {DIMENSIONS.map((d) => <td key={d} className="p-3">{(m[d] as number | null) ?? "—"}</td>)}
                    <td className="p-3 whitespace-nowrap text-right">
                      {!m.isOriginal && <button className="btn mr-1" onClick={() => setOriginal(m)}>Set original</button>}
                      <button className="btn btn-danger" onClick={() => del(m)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {shrinkage && (
                  <tr className="border-t border-border bg-background font-medium">
                    <td className="p-3">Change vs original</td>
                    {DIMENSIONS.map((d) => (
                      <td key={d} className="p-3">
                        {shrinkage[d] == null ? "—" : `${shrinkage[d]! > 0 ? "+" : ""}${shrinkage[d]}`}
                      </td>
                    ))}
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {data.length > 1 && (
            <div className="card"><MeasurementChart rows={data} dims={DIMENSIONS} /></div>
          )}
        </>
      )}
    </div>
  );
}

function LogTab({ id, kind, onChange }: { id: string; kind: "washes" | "wears"; onChange: () => void }) {
  const dateKey = kind === "washes" ? "washedOn" : "wornOn";
  const { data, mutate } = useSWR<Log[]>(`/api/jeans/${id}/${kind}`, fetcher);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const body: Record<string, unknown> = {
      [dateKey]: f.get("date"), notes: String(f.get("notes") || "") || null,
    };
    if (kind === "washes") body.method = String(f.get("method") || "") || null;
    await api(`/api/jeans/${id}/${kind}`, { method: "POST", body });
    form.reset();
    mutate();
    onChange();
  }
  async function del(l: Log) {
    await api(`/api/${kind}/${l.id}`, { method: "DELETE" });
    mutate();
    onChange();
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={add} className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="date">Date</label>
          <input id="date" name="date" type="date" required defaultValue={today()} className="input" />
        </div>
        {kind === "washes" && (
          <div>
            <label className="label" htmlFor="method">Method</label>
            <input id="method" name="method" placeholder="machine, hand, soak…" className="input" />
          </div>
        )}
        <div className="min-w-40 flex-1">
          <label className="label" htmlFor="lnotes">Notes</label>
          <input id="lnotes" name="notes" className="input" />
        </div>
        <button className="btn btn-primary">Log {kind === "washes" ? "wash" : "wear"}</button>
      </form>
      {data && data.length === 0 && <p className="text-sm text-muted">Nothing logged yet.</p>}
      <ul className="card divide-y divide-border !p-0">
        {data?.map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-3 p-3 text-sm">
            <div>
              <span className="font-medium">{l[dateKey]}</span>
              {l.method && <span className="badge ml-2">{l.method}</span>}
              {l.notes && <span className="ml-2 text-muted">{l.notes}</span>}
            </div>
            <button className="btn btn-danger" onClick={() => del(l)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Photos({ id, onChange }: { id: string; onChange: () => void }) {
  const { data, mutate } = useSWR<Photo[]>(`/api/jeans/${id}/photos`, fetcher);
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open == null) dialog.current?.close();
    else if (!dialog.current?.open) dialog.current?.showModal();
  }, [open]);

  function refresh() {
    mutate();
    onChange();
  }
  async function setCover(p: Photo) {
    await api(`/api/photos/${p.id}`, { method: "PATCH", body: { isCover: true } });
    refresh();
  }
  async function del(p: Photo) {
    if (!confirm("Delete this photo?")) return;
    await api(`/api/photos/${p.id}`, { method: "DELETE" });
    setOpen(null);
    refresh();
  }

  const current = open != null ? data?.[open] : undefined;
  const step = (d: number) => data && setOpen((i) => (i == null ? i : (i + d + data.length) % data.length));

  return (
    <div className="flex flex-col gap-4">
      <PhotoUpload jeanId={id} onUploaded={refresh} />
      {data && data.length === 0 && <p className="text-sm text-muted">No photos yet.</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {data?.map((p, i) => (
          <figure key={p.id} className="card flex flex-col gap-2 !p-2">
            <button onClick={() => setOpen(i)} aria-label={`Open photo from ${p.takenOn}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.caption ?? ""} loading="lazy" className="aspect-[3/4] w-full rounded-lg object-cover" />
            </button>
            <figcaption className="flex items-center justify-between gap-2 text-sm">
              <span>
                <span className="font-medium">{p.takenOn}</span>
                {p.isCover && <span className="badge ml-2">cover</span>}
                {p.caption && <span className="block text-xs text-muted">{p.caption}</span>}
              </span>
              {!p.isCover && <button className="btn" onClick={() => setCover(p)}>Set cover</button>}
            </figcaption>
          </figure>
        ))}
      </div>

      <dialog
        ref={dialog}
        onClose={() => setOpen(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") step(-1);
          if (e.key === "ArrowRight") step(1);
        }}
        className="m-auto max-h-[95vh] max-w-[95vw] rounded-xl bg-surface p-3 text-foreground backdrop:bg-black/70"
      >
        {current && (
          <div className="flex flex-col gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.url} alt={current.caption ?? ""} className="max-h-[80vh] w-auto rounded-lg object-contain" />
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                <span className="font-medium">{current.takenOn}</span>
                {current.caption && <span className="ml-2 text-muted">{current.caption}</span>}
              </span>
              <div className="flex gap-2">
                {data!.length > 1 && <button className="btn" onClick={() => step(-1)}>← Newer</button>}
                {data!.length > 1 && <button className="btn" onClick={() => step(1)}>Older →</button>}
                <button className="btn btn-danger" onClick={() => del(current)}>Delete</button>
                <button className="btn" onClick={() => setOpen(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
