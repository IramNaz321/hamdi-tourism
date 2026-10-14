import { reportAccessFailure } from "@/lib/access-diagnostics";
import { BrandLogo } from "@/components/brand-logo";
import { PassengerAuthForm } from "@/components/passenger-forms";
import { redirect } from "next/navigation";
import { accountRoute } from "@/lib/account-route";
import { createClient, isConfigured } from "@/lib/supabase/server";
import { passengerReturnPath } from "@/lib/passenger-validation";
export default async function PassengerLogin({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string; notice?: string }>;
}) {
  const params = await searchParams;
  // Recovery must stay reachable even when the browser already has a session.
  if (isConfigured() && params.mode !== "recovery") {
    const client = await createClient();
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (!error && user?.email_confirmed_at) {
      const { data: member, error: membershipError } = await client
        .from("staff_members")
        .select("role,active")
        .eq("user_id", user.id)
        .maybeSingle();
      if (membershipError) {
        reportAccessFailure("passenger-login", membershipError);
        redirect("/access-pending?notice=permissions-unavailable");
      }
      redirect(member ? accountRoute(member) : passengerReturnPath(params.next));
    }
  }
  return (
    <main className="max-w-lg mx-auto p-6 py-16 space-y-6">
      <BrandLogo />
      <h1 className="text-3xl font-semibold">
        {params.mode === "recovery" ? "Recover your account" : "Passenger sign in"}
      </h1>
      {params.notice && (
        <p className="notice">
          Account access or verification is unavailable. Please retry or contact support.
        </p>
      )}
      <PassengerAuthForm
        mode={params.mode === "recovery" ? "recovery" : "login"}
        configured={isConfigured()}
        next={passengerReturnPath(params.next)}
      />
    </main>
  );
}
