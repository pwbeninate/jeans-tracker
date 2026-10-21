"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { api } from "@/lib/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password"));
    try {
      if (mode === "signup") {
        await api("/api/auth/signup", {
          method: "POST",
          body: { email, password, name: String(f.get("name") || "") || undefined },
        });
      }
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) throw new Error("Invalid email or password");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">
        {mode === "login" ? "Sign in" : "Create your account"}
      </h1>
      <form onSubmit={onSubmit} className="card flex flex-col gap-3">
        {mode === "signup" && (
          <div>
            <label className="label" htmlFor="name">Name (optional)</label>
            <input id="name" name="name" className="input" autoComplete="name" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className="input" autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password (8+ characters)</label>
          <input id="password" name="password" type="password" required minLength={8} className="input"
            autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button className="btn btn-primary" disabled={busy}>
          {mode === "login" ? "Sign in" : "Sign up"}
        </button>
      </form>
      <p className="text-sm text-muted">
        {mode === "login" ? (
          <>No account? <Link className="underline" href="/signup">Sign up</Link></>
        ) : (
          <>Have an account? <Link className="underline" href="/login">Sign in</Link></>
        )}
      </p>
    </main>
  );
}
