import "server-only";
import { redirect } from "next/navigation";
import { createClient, isConfigured } from "@/lib/supabase/server";
import type { Role } from "@/lib/entities";
export async function requireStaff() {
  if (!isConfigured()) redirect("/login?notice=unconfigured");
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const { data: member, error } = await supabase
    .from("staff_members")
    .select("user_id, organization_id, role, display_name, active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error("Unable to verify account access. Please contact the account owner.");
  if (!member?.active) redirect("/access-pending");
  if (member.role === "driver") redirect("/driver-account");
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
}
export async function requireOwner() {
  const context = await requireStaff();
  if (context.member.role !== "owner") redirect("/admin?notice=owner-only");
  return context;
}
export function siteOrigin() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) throw new Error("The website address has not been configured.");
  const url = new URL(raw);
  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))
  )
    throw new Error("The website address must use HTTPS.");
  return url.origin;
}
