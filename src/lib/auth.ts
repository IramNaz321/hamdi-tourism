import "server-only";
import { redirect } from "next/navigation";
import { createClient, isConfigured } from "@/lib/supabase/server";
import { cache } from "react";
import { configuredSiteOrigin } from "@/lib/site-origin";
import type { Role } from "@/lib/entities";
export const requireStaff = cache(async function requireStaff() {
  if (!isConfigured()) redirect("/login?notice=unconfigured");
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  if (!user.email_confirmed_at) redirect("/login?notice=unconfirmed");
  const { data: member, error } = await supabase
    .from("staff_members")
    .select("user_id, organization_id, role, display_name, active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error("Unable to verify account access. Please contact the account owner.");
  if (!member?.active) redirect("/access-pending");
  if (member.role === "driver") redirect("/driver-account");
  if (!["owner", "manager", "dispatcher", "viewer"].includes(member.role))
    redirect("/access-pending");
  return {
    supabase,
    user,
    member: member as {
      user_id: string;
      organization_id: string;
      role: Role;
      display_name: string;
      active: boolean;
    },
  };
});
export async function requireOwner() {
  const context = await requireStaff();
  if (context.member.role !== "owner") redirect("/admin?notice=owner-only");
  return context;
}
export function siteOrigin() {
  const origin = configuredSiteOrigin(process.env);
  if (!origin)
    throw new Error(
      "The website address is missing or invalid. Configure an HTTPS origin or the local development address.",
    );
  return origin;
}
