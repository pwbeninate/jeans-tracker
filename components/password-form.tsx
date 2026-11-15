"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { api } from "@/lib/client";

export function PasswordForm({ email }: { email: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const currentPassword = String(f.get("currentPassword"));
    const newPassword = String(f.get("newPassword"));
    setBusy(true);
    setError("");
    setDone(false);
    try {
      await api("/api/auth/password", { method: "POST", body: { currentPassword, newPassword } });
      // The change ended every session including this one, so sign this browser back in.
      const res = await signIn("credentials", { email, password: newPassword, redirect: false });
      if (res?.error) {
        router.push("/login");
        return;
      }
      form.reset();
      setDone(true);
      router.refresh();
    } catch (err) {
      const details = (err as { details?: Record<string, string[]> }).details;
      setError(details?.newPassword?.[0] ?? (err instanceof Error ? err.message : "Something went wrong"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card flex flex-col gap-3">
      <h2 className="font-medium">Change password</h2>
      <div>
        <label className="label" htmlFor="currentPassword">Current password</label>
        <input id="currentPassword" name="currentPassword" type="password" required className="input"
          autoComplete="current-password" />
      </div>
      <div>
        <label className="label" htmlFor="newPassword">New password (8+ characters)</label>
        <input id="newPassword" name="newPassword" type="password" required minLength={8} className="input"
          autoComplete="new-password" />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {done && <p className="text-sm text-muted">Password changed. Other devices have been signed out.</p>}
      <button className="btn btn-primary" disabled={busy}>Change password</button>
    </form>
  );
}
