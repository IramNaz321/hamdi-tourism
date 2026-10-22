import { AuthShell } from "@/components/auth-shell";
import { AuthForm } from "@/components/auth-form";
import { isConfigured } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default function Reset() {
  return (
    <AuthShell
      title="Reset your password"
      description="We’ll email you a secure link to reset your password."
    >
      <AuthForm mode="reset" configured={isConfigured()} />
    </AuthShell>
  );
}
