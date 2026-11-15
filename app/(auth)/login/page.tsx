import { AuthForm } from "@/components/auth-form";
import { signupOpen } from "@/lib/signup";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <AuthForm mode="login" signupOpen={signupOpen()} />;
}
