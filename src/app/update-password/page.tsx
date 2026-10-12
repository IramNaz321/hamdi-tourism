import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { AuthForm } from "@/components/auth-form";
import { createClient, isConfigured } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function Update() {
  if (!isConfigured()) redirect("/login");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/reset-password");
  return (
    <AuthShell title="Choose your password" description="Secure your account with a new password.">
      <AuthForm mode="update" />
    </AuthShell>
  );
}
