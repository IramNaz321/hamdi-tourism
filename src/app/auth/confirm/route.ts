import { type NextRequest } from "next/server";
import { localRedirect } from "@/lib/local-redirect";
import { createClient, isConfigured } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (
    isConfigured() &&
    token_hash &&
    (type === "invite" || type === "recovery" || type === "signup" || type === "email")
  ) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error)
      return localRedirect(
        type === "signup" || type === "email" ? "/passenger" : "/update-password",
      );
  }
  return localRedirect("/login?notice=invalid-link");
}
