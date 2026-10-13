"use server";
import { authErrorMessage } from "@/lib/auth-errors";
import { accountRoute } from "@/lib/account-route";
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
  let destination: string;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: authErrorMessage(error) };
    if (!data.user?.email_confirmed_at) return { error: "Confirm your email before signing in." };
    const { data: member, error: membershipError } = await supabase
      .from("staff_members")
      .select("role,active")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (membershipError)
      return {
        error:
          "Signed in, but account permissions could not be verified. Please contact the business owner.",
      };
    destination = trackingPath(form.get("returnTo")) ?? accountRoute(member);
  } catch {
    return { error: "The sign-in service could not be reached. Please try again later." };
  }
  redirect(destination);
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
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback`,
    });
    if (error)
      return {
        error:
          "Password reset could not be requested. Wait a few minutes and try again, or contact the business owner.",
      };
  } catch {
    return { error: "The password reset service could not be reached. Please try again later." };
  }
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
  const { data: member, error: membershipError } = await supabase
    .from("staff_members")
    .select("role,active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (membershipError)
    return {
      error:
        "Password saved, but account permissions could not be verified. Please sign in again or contact the business owner.",
    };
  redirect(member ? accountRoute(member) : "/passenger");
}
