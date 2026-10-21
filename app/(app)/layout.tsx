import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16">
      <header className="flex items-center justify-between py-5">
        <Link href="/" className="text-lg font-semibold tracking-tight">Jeans Tracker</Link>
        <div className="flex items-center gap-2 text-sm text-muted">
          <span className="hidden sm:inline">{session.user.email}</span>
          <a className="btn" href="/api/export" download>Export CSV</a>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <button className="btn">Sign out</button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
