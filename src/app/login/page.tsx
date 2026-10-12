import { AuthShell } from "@/components/auth-shell";
import { AuthForm } from "@/components/auth-form";
import { isConfigured } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  return (
    <AuthShell title="Welcome back" description="Sign in to manage your journeys, team and fleet.">
      {notice === "invalid-link" && (
        <p role="alert" className="notice error mb-5">
          This link is invalid or has expired. Ask for a new invitation or password reset link.
        </p>
      )}
      <AuthForm mode="login" configured={isConfigured()} />
    </AuthShell>
  );
}
