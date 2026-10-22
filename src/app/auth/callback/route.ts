import { type NextRequest } from "next/server";
import { localRedirect } from "@/lib/local-redirect";
import { createClient, isConfigured } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (isConfigured() && code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error)
      return localRedirect(
        request.nextUrl.searchParams.get("next") === "/passenger"
          ? "/passenger"
          : "/update-password",
      );
  }
  return localRedirect("/login?notice=invalid-link");
}
