"use client";

import { upload } from "@vercel/blob/client";
import { useState } from "react";
import { api, ApiError, resizeImage, today } from "@/lib/client";

export function PhotoUpload({ jeanId, onUploaded }: { jeanId: string; onUploaded: () => void }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const files = f.getAll("files").filter((v): v is File => v instanceof File && v.size > 0);
    if (!files.length) return;
    const takenOn = String(f.get("takenOn"));
    const caption = String(f.get("caption") || "") || null;

    setBusy(true);
    setError("");
    try {
      for (const [i, file] of files.entries()) {
        setProgress(files.length > 1 ? `Uploading ${i + 1} of ${files.length}…` : "Uploading…");
        const { blob, width, height } = await resizeImage(file);
        const base = file.name.replace(/\.[^.]*$/, "").replace(/[^\w-]+/g, "-").slice(0, 60) || "photo";
        const stored = await upload(`jeans/${jeanId}/${base}.jpg`, blob, {
          access: "public",
          contentType: "image/jpeg",
          handleUploadUrl: `/api/jeans/${jeanId}/photos/upload`,
        });
        await api(`/api/jeans/${jeanId}/photos`, {
          method: "POST",
          body: { url: stored.url, pathname: stored.pathname, takenOn, caption, width, height },
        });
        onUploaded();
      }
      form.reset();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  return (
    <form onSubmit={onSubmit} className="card flex flex-wrap items-end gap-3">
      <div className="min-w-48 flex-1">
        <label className="label" htmlFor="files">Photos</label>
        <input id="files" name="files" type="file" accept="image/*" multiple required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="takenOn">Taken</label>
        <input id="takenOn" name="takenOn" type="date" required defaultValue={today()} className="input" />
      </div>
      <div className="min-w-40 flex-1">
        <label className="label" htmlFor="caption">Caption</label>
        <input id="caption" name="caption" placeholder="front, back, honeycombs…" className="input" />
      </div>
      <button className="btn btn-primary" disabled={busy}>{busy ? progress : "Upload"}</button>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </form>
  );
}
