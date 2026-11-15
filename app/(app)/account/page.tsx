import { auth } from "@/lib/auth";
import { PasswordForm } from "@/components/password-form";

export default async function AccountPage() {
  const session = await auth();
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-sm text-muted">{session?.user.email}</p>
      </div>
      <PasswordForm email={session?.user.email ?? ""} />
    </main>
  );
}
