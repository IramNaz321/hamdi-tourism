import { reportAccessFailure } from "@/lib/access-diagnostics";
import "server-only";
import { redirect } from "next/navigation";
import { createClient, isConfigured } from "@/lib/supabase/server";
export async function requireDriver() {
  if (!isConfigured()) redirect("/login");
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  if (!user.email_confirmed_at) redirect("/login?notice=unconfirmed");
  const { data: member, error: membershipError } = await supabase
    .from("staff_members")
    .select("role,active,display_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (membershipError) {
    reportAccessFailure("driver", membershipError);
    redirect("/access-pending?notice=permissions-unavailable");
  }
  if (!member?.active) redirect("/access-pending");
  if (member.role !== "driver") redirect("/admin");
  return { supabase, member };
}
