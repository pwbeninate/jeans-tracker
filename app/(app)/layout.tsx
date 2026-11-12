import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 has-[[data-wide]]:max-w-[96rem]">
      <header className="flex flex-wrap items-center justify-between gap-3 py-5">
        <div className="flex items-center gap-4 whitespace-nowrap">
          <Link href="/" className="text-lg font-semibold tracking-tight">Jeans Tracker</Link>
          <nav className="flex gap-3 text-sm text-muted">
            <Link href="/" className="hover:text-foreground">Collection</Link>
            <Link href="/table" className="hover:text-foreground">Table</Link>
          </nav>
        </div>
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
