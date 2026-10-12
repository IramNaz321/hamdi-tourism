import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { logout } from "@/app/auth/actions";
import { createClient, isConfigured } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function DriverAccount() {
  if (!isConfigured()) redirect("/login");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: member, error } = await supabase
    .from("staff_members")
    .select("role,active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error("Unable to verify account access.");
  if (!member?.active) redirect("/access-pending");
  if (member.role !== "driver") redirect("/admin");
  return (
    <AuthShell
      title="Driver account"
      description="Your driver account is registered. Contact the operations team for your assignments and journey instructions."
    >
      <form action={logout}>
        <button className="button w-full">Sign out</button>
      </form>
    </AuthShell>
  );
}
