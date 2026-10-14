import { reportAccessFailure } from "@/lib/access-diagnostics";
import { trackingPath } from "@/lib/tracking";
import { AuthShell } from "@/components/auth-shell";
import { AuthForm } from "@/components/auth-form";
import { redirect } from "next/navigation";
import { accountRoute } from "@/lib/account-route";
import { createClient, isConfigured } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; next?: string }>;
}) {
  const { notice, next } = await searchParams;
  const returnTo = trackingPath(next);
  if (isConfigured() && notice !== "invalid-link") {
    const client = await createClient();
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (!error && user?.email_confirmed_at) {
      if (returnTo) redirect(returnTo);
      const membership = await client
        .from("staff_members")
        .select("role,active")
        .eq("user_id", user.id)
        .maybeSingle();
      if (membership.error) {
        reportAccessFailure("staff-login", membership.error);
        redirect("/access-pending?notice=permissions-unavailable");
      }
      redirect(membership.data ? accountRoute(membership.data) : "/access-pending");
    }
  }
  return (
    <AuthShell title="Welcome back" description="Sign in to manage your journeys, team and fleet.">
      {notice === "unconfirmed" && (
        <p role="alert" className="notice mb-5">
          Confirm your email using your invitation or confirmation link before accessing the staff
          portal.
        </p>
      )}
      {notice === "invalid-link" && (
        <p role="alert" className="notice error mb-5">
          This link is invalid or has expired. Ask for a new invitation or password reset link.
        </p>
      )}
      <AuthForm mode="login" configured={isConfigured()} returnTo={returnTo ?? undefined} />
    </AuthShell>
  );
}
