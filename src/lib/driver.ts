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
  const { data: member, error: membershipError } = await supabase
    .from("staff_members")
    .select("role,active,display_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (membershipError) throw new Error("Unable to verify driver access.");
  if (!member?.active) redirect("/access-pending");
  if (member.role !== "driver") redirect("/admin");
  return { supabase, member };
}
