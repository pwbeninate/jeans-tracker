import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { signupOpen } from "@/lib/signup";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  if (!signupOpen()) redirect("/login");
  return <AuthForm mode="signup" signupOpen />;
}
