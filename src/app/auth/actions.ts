"use server";
import { trackingPath } from "@/lib/tracking";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, isConfigured } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/auth";
export type AuthState = { error?: string; success?: string };
export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  if (!isConfigured())
    return { error: "Admin sign-in is not available yet. Please contact the business owner." };
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!z.email().safeParse(email).success || !password || password.length > 256)
    return { error: "Enter your email and password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Unable to sign in. Check your credentials or try again later." };
  redirect(trackingPath(form.get("returnTo")) ?? "/admin");
}
export async function logout() {
  if (isConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw new Error("Unable to sign out. Please try again.");
  }
  redirect("/login");
}
export async function resetPassword(_: AuthState, form: FormData): Promise<AuthState> {
  if (!isConfigured())
    return { error: "Password reset is not available yet. Please contact the business owner." };
  const email = String(form.get("email") ?? "").trim();
  if (!z.email().safeParse(email).success) return { error: "Enter a valid email address." };
  let origin: string;
  try {
    origin = siteOrigin();
  } catch {
    return { error: "Password reset is unavailable. Please contact the business owner." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback`,
  });
  if (error) return { error: "Unable to send a reset email. Please try again later." };
  return {
    success: "If this email has an account, a password reset link has been sent. Check your inbox.",
  };
}
export async function updatePassword(_: AuthState, form: FormData): Promise<AuthState> {
  if (!isConfigured()) return { error: "Account access is unavailable." };
  const password = String(form.get("password") ?? "");
  if (password.length < 12 || password.length > 128)
    return { error: "Use a password between 12 and 128 characters." };
  if (password !== form.get("confirm")) return { error: "Passwords do not match." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your link has expired. Request a new password reset link." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error)
    return {
      error: "Unable to save this password. Choose a different password or request a new link.",
    };
  const { data: member } = await supabase
    .from("staff_members")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  redirect(member ? (member.role === "driver" ? "/driver-account" : "/admin") : "/passenger");
}
